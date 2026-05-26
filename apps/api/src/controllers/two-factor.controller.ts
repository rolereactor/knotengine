import { User } from "@qodinger/knot-database";
import * as crypto from "crypto";
import { FastifyReply } from "fastify";
import { generateSecret, generateURI, verifySync } from "otplib";
import * as QRCode from "qrcode";
import { apiError } from "../utils/api-error.js";

export const TwoFactorController = {
  setup: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    const user = merchant.userId ? await User.findById(merchant.userId) : null;
    if (!user)
      return apiError(
        reply,
        400,
        "invalid_request",
        "User identity not found.",
      );

    if (user.twoFactorEnabled) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Two-factor authentication is already enabled. Disable it first to reconfigure.",
      );
    }

    // Generate a new TOTP secret
    const secret = generateSecret();
    const merchantName = merchant.name || "KnotEngine Merchant";
    const issuer = "KnotEngine";

    // Build the otpauth URI
    const otpauthUrl = generateURI({
      secret,
      issuer,
      label: merchantName,
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Save the secret temporarily (not yet enabled)
    await User.findByIdAndUpdate(user._id, {
      $set: { twoFactorSecret: secret },
    });

    request.server.log.info(
      `🔐 2FA setup initiated for merchant: ${merchant._id}`,
    );

    return reply.code(200).send({
      secret,
      qrCode: qrCodeDataUrl,
      otpauthUrl,
      message:
        "Scan the QR code with your authenticator app, then verify with a code to enable 2FA.",
    });
  },

  enable: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    const user = merchant.userId ? await User.findById(merchant.userId) : null;
    if (!user)
      return apiError(
        reply,
        400,
        "invalid_request",
        "User identity not found.",
      );

    if (user.twoFactorEnabled) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Two-factor authentication is already enabled.",
      );
    }

    if (!user.twoFactorSecret) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "No 2FA setup in progress. Call /2fa/setup first to generate a secret.",
      );
    }

    const { code } = request.body;

    // Verify the TOTP code against the saved secret
    const result = verifySync({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!result.valid) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Invalid verification code. Please try again.",
      );
    }

    // Generate 5 one-time-use backup codes
    const backupCodes = Array.from({ length: 5 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase(),
    );

    // Hash backup codes before persisting
    const hashedBackupCodes = backupCodes.map((c) =>
      crypto.createHash("sha256").update(c).digest("hex"),
    );

    // Enable 2FA
    await User.findByIdAndUpdate(user._id, {
      $set: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    console.info(`🔐 2FA enabled for merchant: ${merchant._id}`);

    return reply.code(200).send({
      enabled: true,
      backupCodes,
      message:
        "Two-factor authentication is now active. Save these backup codes securely — they will not be shown again.",
    });
  },

  validate: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    const user = merchant.userId ? await User.findById(merchant.userId) : null;
    if (!user)
      return apiError(
        reply,
        400,
        "invalid_request",
        "User identity not found.",
      );

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Two-factor authentication is not enabled on this account.",
      );
    }

    const { code } = request.body;

    // 1. Try standard TOTP verification
    const result = verifySync({
      token: code,
      secret: user.twoFactorSecret,
      // It's possible to skip verifySync if secret is somehow invalid type, but it should be string.
    });

    if (result.valid) {
      return reply.code(200).send({ valid: true });
    }

    // 2. Try backup code verification
    const codeHash = crypto
      .createHash("sha256")
      .update(code.toUpperCase())
      .digest("hex");

    const backupCodes = user.twoFactorBackupCodes || [];
    const backupIndex = backupCodes.findIndex((bc) => bc === codeHash);

    if (backupIndex !== -1) {
      // Remove the used backup code
      const updatedCodes = [...backupCodes];
      updatedCodes.splice(backupIndex, 1);

      await User.findByIdAndUpdate(user._id, {
        $set: { twoFactorBackupCodes: updatedCodes },
      });

      console.warn(
        `⚠️ Backup code used for merchant: ${merchant._id}. ${updatedCodes.length} codes remaining.`,
      );

      return reply.code(200).send({
        valid: true,
        usedBackupCode: true,
        remainingBackupCodes: updatedCodes.length,
      });
    }

    return apiError(reply, 401, "unauthorized", "Invalid verification code.");
  },

  disable: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    const user = merchant.userId ? await User.findById(merchant.userId) : null;
    if (!user)
      return apiError(
        reply,
        400,
        "invalid_request",
        "User identity not found.",
      );

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Two-factor authentication is not currently enabled.",
      );
    }

    const { code } = request.body;

    // Verify the TOTP code before allowing disable
    const result = verifySync({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!result.valid) {
      return apiError(
        reply,
        401,
        "unauthorized",
        "Invalid code. You must verify your identity to disable 2FA.",
      );
    }

    // Disable 2FA and clean up secrets
    await User.findByIdAndUpdate(user._id, {
      $set: {
        twoFactorEnabled: false,
      },
      $unset: {
        twoFactorSecret: 1,
        twoFactorBackupCodes: 1,
      },
    });

    console.info(`🔐 2FA disabled for merchant: ${merchant._id}`);

    return reply.code(200).send({
      enabled: false,
      message: "Two-factor authentication has been disabled.",
    });
  },

  getStatus: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    const user = merchant.userId ? await User.findById(merchant.userId) : null;

    return reply.code(200).send({
      enabled: user?.twoFactorEnabled === true,
    });
  },
};
