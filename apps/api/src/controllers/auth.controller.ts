import { AuditLog, User, VerificationToken } from "@qodinger/knot-database";
import * as crypto from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { AuditLogger } from "../core/audit-logger.js";
import { EmailService } from "../infra/email-service.js";
import { safeCompare } from "../utils/crypto.js";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:5052";

export const AuthController = {
  requestMagicLink: async (
    request: FastifyRequest<{ Body: { email: string } }>,
    reply: FastifyReply,
  ) => {
    const { email } = request.body;
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to DB
    await VerificationToken.create({
      identifier: email,
      token,
      expires,
    });

    const magicLink = `${DASHBOARD_URL}/login/verify?token=${token}&email=${encodeURIComponent(email)}`;

    // Send Email via Gmail SMTP
    const emailResult = await EmailService.sendMagicLink({
      to: email,
      magicLink,
    });

    if (!emailResult.success) {
      request.server.log.error(
        emailResult.error,
        `❌ Failed to send magic link to ${email}`,
      );
      return reply.code(500).send({
        error: "Unable to send magic link",
        message:
          "We encountered an issue sending your login email. Please try again later or contact support.",
      });
    }

    request.server.log.info(`✉️ Magic link sent to: ${email}`);

    return { success: true, message: "Magic link sent" };
  },

  verifyMagicLink: async (
    request: FastifyRequest<{ Body: { email: string; token: string } }>,
    reply: FastifyReply,
  ) => {
    const { email, token } = request.body;

    const vt = await VerificationToken.findOne({
      identifier: email,
      token,
      expires: { $gt: new Date() },
    });

    if (!vt) {
      return reply.code(401).send({ error: "Invalid or expired token" });
    }

    // Delete token after use
    await VerificationToken.deleteOne({ _id: vt._id });

    // Identify user by email
    const oauthId = `email:${email}`;
    let user = await User.findOne({ oauthId });

    if (!user) {
      user = await User.create({
        oauthId,
        email,
        emailVerified: true,
        creditBalance: parseFloat(process.env.WELCOME_CREDIT_AMOUNT || "5.00"),
        welcomeBonusClaimed: true,
        referralCode:
          "REF_" + crypto.randomBytes(4).toString("hex").toUpperCase(),
      });
      request.server.log.info(
        `👤 New User Identity created via Email: ${email}`,
      );

      // Audit log
      await AuditLogger.account(
        user._id.toString(),
        "created",
        request as any,
        {
          email,
        },
      );
      await AuditLogger.auth(user._id.toString(), "login", request as any, {
        method: "magic_link",
      });
    } else {
      // Mark email as verified for existing users
      if (!user.emailVerified) {
        await User.updateOne(
          { _id: user._id },
          { $set: { emailVerified: true } },
        );
        user.emailVerified = true;
        request.server.log.info(`✅ Email verified for: ${email}`);
        await AuditLogger.auth(
          user._id.toString(),
          "email_verified",
          request as any,
        );
      }
      // Log login
      await AuditLogger.auth(user._id.toString(), "login", request as any, {
        method: "magic_link",
      });
    }

    return {
      success: true,
      oauthId,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  },

  sendVerificationEmail: async (
    request: FastifyRequest<{ Body: { email: string } }>,
    reply: FastifyReply,
  ) => {
    const { email } = request.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return {
        success: true,
        message: "If the email exists, a verification link has been sent",
      };
    }

    if (user.emailVerified) {
      return reply.code(400).send({
        error: "Email already verified",
        message: "This email is already verified. Please login.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save or update verification token
    await VerificationToken.deleteMany({ identifier: email });
    await VerificationToken.create({
      identifier: email,
      token,
      expires,
    });

    const verificationLink = `${DASHBOARD_URL}/login/verify?token=${token}&email=${encodeURIComponent(email)}`;

    // Send Email via Gmail SMTP
    const emailResult = await EmailService.sendVerificationEmail({
      to: email,
      verificationLink,
    });

    if (!emailResult.success) {
      request.server.log.error(
        emailResult.error,
        `❌ Failed to send verification email to ${email}`,
      );
      return reply.code(500).send({
        error: "Unable to send verification email",
        message:
          "We encountered an issue sending your verification email. Please try again later.",
      });
    }

    request.server.log.info(`✉️ Verification email sent to: ${email}`);

    return { success: true, message: "Verification email sent" };
  },

  getCurrentUser: async (request: FastifyRequest, reply: FastifyReply) => {
    const oauthId = request.headers["x-oauth-id"] as string;
    const internalSecret = request.headers["x-internal-secret"] as string;

    if (
      !oauthId ||
      !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
    ) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = await User.findOne({ oauthId });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    return {
      email: user.email,
      emailVerified: user.emailVerified,
      creditBalance: user.creditBalance,
      createdAt: user.createdAt,
    };
  },

  getUserAuditLogs: async (
    request: FastifyRequest<{
      Querystring: { limit: number; offset: number; category?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const oauthId = request.headers["x-oauth-id"] as string;
    const internalSecret = request.headers["x-internal-secret"] as string;

    if (
      !oauthId ||
      !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
    ) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = await User.findOne({ oauthId });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    const { limit, offset, category } = request.query;

    const logs = await AuditLogger.getUserLogs(user._id.toString(), {
      limit,
      offset,
      category: category as any,
    });

    const total = await AuditLog.countDocuments({
      userId: user._id,
      ...(category ? { category } : {}),
    });

    return {
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    };
  },

  linkOAuthProvider: async (
    request: FastifyRequest<{
      Body: {
        email: string;
        provider: string;
        providerId: string;
        image?: string;
      };
    }>,
    _reply: FastifyReply,
  ) => {
    const { email, provider, providerId, image } = request.body;

    const emailOauthId = `email:${email}`;
    const providerOauthId = `${provider}:${providerId}`;

    let user = await User.findOne({ oauthId: emailOauthId });

    if (!user) {
      user = await User.findOne({ oauthId: providerOauthId });
    }

    if (!user) {
      user = await User.create({
        oauthId: emailOauthId,
        email,
        image,
        emailVerified: true,
        creditBalance: parseFloat(process.env.WELCOME_CREDIT_AMOUNT || "5.00"),
        welcomeBonusClaimed: true,
        referralCode:
          "REF_" + crypto.randomBytes(4).toString("hex").toUpperCase(),
      });
      request.server.log.info(`👤 New User created via OAuth: ${email}`);
    } else {
      // Always update image on login so it stays fresh
      if (image && image !== user.image) {
        await User.findByIdAndUpdate(user._id, { $set: { image } });
        user.image = image;
      }
      if (user.oauthId === emailOauthId) {
        request.server.log.info(
          `🔗 Linked ${provider} to existing email account: ${email}`,
        );
      } else {
        request.server.log.info(
          `🔗 Using existing ${provider} account for: ${email}`,
        );
      }
    }

    return {
      success: true,
      oauthId: user.oauthId,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  },
};
