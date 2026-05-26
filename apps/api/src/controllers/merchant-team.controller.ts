import { FastifyReply } from "fastify";
import { Merchant, MerchantMember, User } from "@qodinger/knot-database";
import { Types } from "mongoose";
import * as crypto from "crypto";
import { AuditLogger } from "../core/audit-logger.js";
import { escapeRegExp } from "../middleware/auth.middleware.js";
import { getPlanLimits, checkPlanLimit } from "@qodinger/knot-types";
import { EmailService } from "../infra/email-service.js";
import { safeCompare } from "../utils/crypto.js";
import { apiError } from "../utils/api-error.js";
import { RedisClient } from "../infra/redis-client.js";

interface AuthContext {
  user: any;
  merchant: any;
  membership: any;
}

async function resolveAuth(
  request: any,
  reply: FastifyReply,
  requireAccepted = true,
): Promise<AuthContext | null> {
  const oauthId = request.headers["x-oauth-id"] as string;
  const internalSecret = request.headers["x-internal-secret"] as string;

  if (
    !oauthId ||
    !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
  ) {
    apiError(reply, 401, "unauthorized", "Authentication required.");
    return null;
  }

  const user = await User.findOne({
    oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
  });
  if (!user) {
    apiError(reply, 404, "user_not_found", "No user found for this identity.");
    return null;
  }

  const merchantId = request.params.merchantId;
  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant) {
    apiError(
      reply,
      404,
      "merchant_not_found",
      "No merchant found with that ID.",
    );
    return null;
  }

  if (!merchant.isActive || merchant.isDeleted) {
    apiError(
      reply,
      403,
      "merchant_suspended",
      "This merchant account is suspended.",
    );
    return null;
  }

  let membership = await MerchantMember.findOne({
    merchantId: merchant._id,
    userId: user._id,
    ...(requireAccepted ? { accepted: true } : {}),
  });

  // Lazy migration: if no membership exists but this user is the merchant owner,
  // auto-create the owner record (handles merchants created before team system)
  if (!membership && merchant.userId?.toString() === user._id.toString()) {
    membership = await MerchantMember.create({
      merchantId: merchant._id,
      userId: user._id,
      role: "owner",
      accepted: true,
      acceptedAt: new Date(),
    });
  }

  if (!membership) {
    apiError(
      reply,
      403,
      "forbidden",
      "You do not have access to this merchant.",
    );
    return null;
  }

  return { user, merchant, membership };
}

async function countOwners(merchantMongoId: Types.ObjectId): Promise<number> {
  return MerchantMember.countDocuments({
    merchantId: merchantMongoId,
    role: "owner",
    accepted: true,
  });
}

export const MerchantTeamController = {
  getMembers: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const members = await MerchantMember.find({
      merchantId: ctx.merchant._id,
    }).populate("userId", "email oauthId image");

    return {
      members: members.map((m: any) => ({
        id: m._id.toString(),
        userId: m.userId ? (m.userId as any)._id.toString() : null,
        email: m.userId ? (m.userId as any).email : m.email,
        image: m.userId ? ((m.userId as any).image ?? null) : null,
        role: m.role,
        accepted: m.accepted,
        invitedAt: m.invitedAt,
        acceptedAt: m.acceptedAt,
        roleHistory: m.roleHistory || [],
        isSelf: m._id.toString() === ctx.membership._id.toString(),
      })),
    };
  },

  inviteMember: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { email, role } = request.body;
    const { merchant, membership: requesterMembership, user } = ctx;

    // Idempotency: prevent duplicate invite emails on network retries
    const idempotencyKey = request.headers["idempotency-key"] as
      | string
      | undefined;
    if (idempotencyKey) {
      const cacheKey = `idempotency:team_invite:${merchant._id}:${idempotencyKey}`;
      const cached = await RedisClient.get<object>(cacheKey);
      if (cached) {
        return reply.header("Idempotent-Replayed", "true").send(cached);
      }
    }

    if (role === "owner") {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Cannot invite as owner. Use transfer ownership instead.",
        "role",
      );
    }

    if (
      requesterMembership.role !== "owner" &&
      requesterMembership.role !== "admin"
    ) {
      return apiError(
        reply,
        403,
        "forbidden",
        "Only owners and admins can invite members.",
      );
    }

    const currentSeatCount = await MerchantMember.countDocuments({
      merchantId: merchant._id,
      accepted: true,
    });
    const limits = getPlanLimits(merchant.plan);
    const seatCheck = checkPlanLimit(
      merchant.plan,
      "maxTeamSeats",
      currentSeatCount,
    );
    if (!seatCheck.allowed) {
      return apiError(
        reply,
        403,
        "plan_limit_reached",
        `Team seat limit reached for the ${merchant.plan} plan (${limits.maxTeamSeats} max). Upgrade to add more members.`,
      );
    }

    const existingMember = await MerchantMember.findOne({
      merchantId: merchant._id,
      $or: [
        { email: email.toLowerCase() },
        { userId: (await User.findOne({ email: email.toLowerCase() }))?._id },
      ],
    });

    if (existingMember) {
      if (existingMember.accepted) {
        return apiError(
          reply,
          409,
          "conflict",
          "This user is already a member of the merchant.",
        );
      }

      if (
        existingMember.inviteExpiresAt &&
        existingMember.inviteExpiresAt < new Date()
      ) {
        const newToken = crypto.randomBytes(32).toString("hex");
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        existingMember.inviteToken = newToken;
        existingMember.inviteExpiresAt = newExpiresAt;
        existingMember.invitedBy = user._id;
        existingMember.role = role;
        await existingMember.save();

        return {
          success: true,
          message: `Invite refreshed for ${email}`,
          refreshed: true,
        };
      }

      return apiError(
        reply,
        409,
        "conflict",
        "A pending invite already exists for this email address.",
      );
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await MerchantMember.create({
      merchantId: merchant._id,
      email: email.toLowerCase(),
      role,
      inviteToken,
      inviteExpiresAt,
      invitedBy: user._id,
      accepted: false,
    });

    // Send invite email (non-blocking)
    const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:5052";
    EmailService.sendTeamInvite({
      to: email.toLowerCase(),
      merchantName: merchant.name || "Merchant",
      inviteToken,
      invitedBy: user.email || "A team member",
      role,
      dashboardUrl,
    }).catch((err) => console.error("Failed to send invite email:", err));

    await AuditLogger.account(user._id.toString(), "member_invited", request, {
      merchantId: merchant.merchantId,
      email,
      role,
    });

    const responseBody = {
      success: true,
      message: `Invite sent to ${email}`,
    };

    if (idempotencyKey) {
      const cacheKey = `idempotency:team_invite:${merchant._id}:${idempotencyKey}`;
      RedisClient.set(cacheKey, responseBody, 86400).catch(() => {});
    }

    return responseBody;
  },

  updateMemberRole: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { role, reason } = request.body;
    const { merchant, membership: requesterMembership, user } = ctx;

    if (requesterMembership.role !== "owner") {
      return apiError(
        reply,
        403,
        "forbidden",
        "Only owners can change member roles.",
      );
    }

    const targetMembership = await MerchantMember.findById(
      request.params.memberId,
    );
    if (!targetMembership) {
      return apiError(
        reply,
        404,
        "team_member_not_found",
        "No member found with that ID.",
      );
    }

    if (targetMembership.merchantId.toString() !== merchant._id.toString()) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "This member does not belong to your merchant.",
        "member_id",
      );
    }

    if (role === "owner") {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Cannot promote to owner. Use transfer ownership instead.",
        "role",
      );
    }

    const oldRole = targetMembership.role;
    targetMembership.role = role;
    targetMembership.roleHistory.push({
      from: oldRole,
      to: role,
      changedBy: user._id,
      changedAt: new Date(),
      reason,
    });
    await targetMembership.save();

    await AuditLogger.account(user._id.toString(), "role_updated", request, {
      merchantId: merchant.merchantId,
      memberId: targetMembership._id.toString(),
      from: oldRole,
      to: role,
      reason,
    });

    return { success: true };
  },

  removeMember: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, membership: requesterMembership, user } = ctx;
    const memberId = request.params.memberId;

    if (memberId === requesterMembership._id.toString()) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Cannot remove yourself. Transfer ownership or use the leave endpoint.",
      );
    }

    if (requesterMembership.role !== "owner") {
      return apiError(
        reply,
        403,
        "forbidden",
        "Only owners can remove members.",
      );
    }

    const targetMembership = await MerchantMember.findById(memberId);
    if (!targetMembership) {
      return apiError(
        reply,
        404,
        "team_member_not_found",
        "No member found with that ID.",
      );
    }

    if (targetMembership.merchantId.toString() !== merchant._id.toString()) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "This member does not belong to your merchant.",
        "member_id",
      );
    }

    if (targetMembership.role === "owner") {
      const ownerCount = await countOwners(merchant._id);
      if (ownerCount === 1) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "Cannot remove the last owner. Transfer ownership first.",
        );
      }
    }

    await MerchantMember.deleteOne({ _id: memberId });

    await AuditLogger.account(user._id.toString(), "member_removed", request, {
      merchantId: merchant.merchantId,
      removedMemberId: memberId,
      removedRole: targetMembership.role,
    });

    return { success: true };
  },

  transferOwnership: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { newOwnerId, reason } = request.body;
    const { merchant, membership: requesterMembership, user } = ctx;

    if (requesterMembership.role !== "owner") {
      return apiError(
        reply,
        403,
        "forbidden",
        "Only owners can transfer ownership.",
      );
    }

    const newOwnerMembership = await MerchantMember.findById(newOwnerId);
    if (!newOwnerMembership) {
      return apiError(
        reply,
        404,
        "team_member_not_found",
        "No member found with that ID.",
        "new_owner_id",
      );
    }

    if (newOwnerMembership.merchantId.toString() !== merchant._id.toString()) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "This member does not belong to your merchant.",
        "new_owner_id",
      );
    }

    if (!newOwnerMembership.accepted) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "The target member has not accepted their invite yet.",
        "new_owner_id",
      );
    }

    if (newOwnerMembership.userId.toString() === user._id.toString()) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Cannot transfer ownership to yourself.",
        "new_owner_id",
      );
    }

    const session = await Merchant.startSession();
    session.startTransaction();

    try {
      const oldRole = requesterMembership.role;
      requesterMembership.role = "admin";
      requesterMembership.roleHistory.push({
        from: oldRole,
        to: "admin",
        changedBy: user._id,
        changedAt: new Date(),
        reason: reason || "Ownership transferred",
      });
      await requesterMembership.save({ session });

      const newOwnerOldRole = newOwnerMembership.role;
      newOwnerMembership.role = "owner";
      newOwnerMembership.roleHistory.push({
        from: newOwnerOldRole,
        to: "owner",
        changedBy: user._id,
        changedAt: new Date(),
        reason: reason || "Ownership transferred",
      });
      await newOwnerMembership.save({ session });

      await session.commitTransaction();

      await AuditLogger.account(
        user._id.toString(),
        "ownership_transferred",
        request,
        {
          merchantId: merchant.merchantId,
          from: user._id.toString(),
          to: newOwnerMembership.userId.toString(),
          reason,
        },
      );

      return {
        success: true,
        message: "Ownership transferred successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  acceptInvite: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply, false);
    if (!ctx) return;

    const { inviteToken } = request.body;
    const { user } = ctx;

    const membership = await MerchantMember.findOne({
      inviteToken,
      accepted: false,
      inviteExpiresAt: { $gt: new Date() },
    });

    if (!membership) {
      return apiError(
        reply,
        404,
        "not_found",
        "Invalid or expired invite token.",
        "invite_token",
      );
    }

    if (
      membership.userId &&
      membership.userId.toString() !== user._id.toString()
    ) {
      return apiError(
        reply,
        403,
        "forbidden",
        "This invite belongs to a different user.",
      );
    }

    membership.userId = user._id;
    membership.accepted = true;
    membership.acceptedAt = new Date();
    membership.inviteToken = undefined;
    await membership.save();

    await AuditLogger.account(user._id.toString(), "invite_accepted", request, {
      merchantId: (await Merchant.findById(membership.merchantId))?.merchantId,
    });

    return {
      success: true,
      merchantId: (await Merchant.findById(membership.merchantId))?.merchantId,
    };
  },

  leaveMerchant: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, membership, user } = ctx;

    if (membership.role === "owner") {
      const ownerCount = await countOwners(merchant._id);
      if (ownerCount === 1) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "Cannot leave as the last owner. Transfer ownership first.",
        );
      }
    }

    await MerchantMember.deleteOne({ _id: membership._id });

    await AuditLogger.account(user._id.toString(), "member_left", request, {
      merchantId: merchant.merchantId,
    });

    return { success: true, message: "You have left the merchant" };
  },

  getDefaultMerchant: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { user } = ctx;

    if (user.defaultMerchantId) {
      const membership = await MerchantMember.findOne({
        merchantId: (
          await Merchant.findOne({ merchantId: user.defaultMerchantId })
        )?._id,
        userId: user._id,
        accepted: true,
      });

      if (membership) {
        const merchant = await Merchant.findById(membership.merchantId);
        return {
          merchantId: merchant?.merchantId,
          name: merchant?.name,
          role: membership.role,
        };
      }
    }

    const memberships = await MerchantMember.find({
      userId: user._id,
      accepted: true,
    })
      .populate("merchantId")
      .sort({ role: 1, "merchantId.createdAt": -1 });

    if (memberships.length === 0) {
      return apiError(
        reply,
        404,
        "merchant_not_found",
        "No merchants found for this user.",
      );
    }

    const defaultMembership = memberships[0];
    return {
      merchantId: (defaultMembership.merchantId as any).merchantId,
      name: (defaultMembership.merchantId as any).name,
      role: defaultMembership.role,
    };
  },

  setDefaultMerchant: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchantId } = request.body;
    const { user } = ctx;

    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return apiError(
        reply,
        404,
        "merchant_not_found",
        "No merchant found with that ID.",
        "merchant_id",
      );
    }

    const membership = await MerchantMember.findOne({
      merchantId: merchant._id,
      userId: user._id,
      accepted: true,
    });

    if (!membership) {
      return apiError(
        reply,
        403,
        "forbidden",
        "You are not a member of this merchant.",
      );
    }

    await User.findByIdAndUpdate(user._id, {
      defaultMerchantId: merchantId,
      lastActiveMerchantId: merchantId,
    });

    return { success: true, merchantId };
  },
};
