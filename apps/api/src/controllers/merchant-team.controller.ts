import { FastifyReply, FastifyRequest } from "fastify";
import { Merchant, MerchantMember, User } from "@qodinger/knot-database";
import { Types } from "mongoose";
import * as crypto from "crypto";
import { AuditLogger } from "../core/audit-logger.js";
import { escapeRegExp } from "../middleware/auth.middleware.js";
import { getPlanLimits, checkPlanLimit } from "@qodinger/knot-types";
import { EmailService } from "../infra/email-service.js";

type RoleType = "owner" | "admin" | "developer" | "viewer" | "billing";

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

  if (!oauthId || internalSecret !== process.env.INTERNAL_SECRET) {
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }

  const user = await User.findOne({
    oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
  });
  if (!user) {
    reply.code(404).send({ error: "User not found" });
    return null;
  }

  const merchantId = request.params.merchantId;
  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant) {
    reply.code(404).send({ error: "Merchant not found" });
    return null;
  }

  if (!merchant.isActive || merchant.isDeleted) {
    reply.code(403).send({
      error: "Merchant account suspended",
      code: "MERCHANT_SUSPENDED",
    });
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
    reply.code(403).send({ error: "Access denied" });
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

  inviteMember: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
      Body: { email: string; role: RoleType };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { email, role } = (request as any).body;
    const { merchant, membership: requesterMembership, user } = ctx;

    if (role === "owner") {
      return reply.code(400).send({
        error: "Cannot invite as owner. Use transfer ownership instead.",
      });
    }

    if (
      requesterMembership.role !== "owner" &&
      requesterMembership.role !== "admin"
    ) {
      return reply
        .code(403)
        .send({ error: "Only owners and admins can invite members" });
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
      return reply.code(403).send({
        error: `Team seat limit reached for ${merchant.plan} plan (${limits.maxTeamSeats} max). Upgrade to add more members.`,
        code: "LIMIT_EXCEEDED",
        limit: limits.maxTeamSeats,
        current: currentSeatCount,
      });
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
        return reply.code(409).send({ error: "User is already a member" });
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

      return reply.code(409).send({ error: "Pending invite already exists" });
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

    await AuditLogger.account(
      user._id.toString(),
      "member_invited",
      request as any,
      { merchantId: merchant.merchantId, email, role },
    );

    return {
      success: true,
      message: `Invite sent to ${email}`,
    };
  },

  updateMemberRole: async (
    request: FastifyRequest<{
      Params: { merchantId: string; memberId: string };
      Body: { role: RoleType; reason?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { role, reason } = (request as any).body;
    const { merchant, membership: requesterMembership, user } = ctx;

    if (requesterMembership.role !== "owner") {
      return reply.code(403).send({ error: "Only owners can change roles" });
    }

    const targetMembership = await MerchantMember.findById(
      request.params.memberId,
    );
    if (!targetMembership) {
      return reply.code(404).send({ error: "Member not found" });
    }

    if (targetMembership.merchantId.toString() !== merchant._id.toString()) {
      return reply
        .code(400)
        .send({ error: "Member does not belong to this merchant" });
    }

    if (role === "owner") {
      return reply.code(400).send({
        error: "Cannot promote to owner. Use transfer ownership instead.",
      });
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

    await AuditLogger.account(
      user._id.toString(),
      "role_updated",
      request as any,
      {
        merchantId: merchant.merchantId,
        memberId: targetMembership._id.toString(),
        from: oldRole,
        to: role,
        reason,
      },
    );

    return { success: true };
  },

  removeMember: async (
    request: FastifyRequest<{
      Params: { merchantId: string; memberId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant, membership: requesterMembership, user } = ctx;
    const memberId = request.params.memberId;

    if (memberId === requesterMembership._id.toString()) {
      return reply.code(400).send({
        error:
          "Cannot remove yourself. Transfer ownership or contact another owner.",
      });
    }

    if (requesterMembership.role !== "owner") {
      return reply.code(403).send({ error: "Only owners can remove members" });
    }

    const targetMembership = await MerchantMember.findById(memberId);
    if (!targetMembership) {
      return reply.code(404).send({ error: "Member not found" });
    }

    if (targetMembership.merchantId.toString() !== merchant._id.toString()) {
      return reply
        .code(400)
        .send({ error: "Member does not belong to this merchant" });
    }

    if (targetMembership.role === "owner") {
      const ownerCount = await countOwners(merchant._id);
      if (ownerCount === 1) {
        return reply.code(400).send({
          error: "Cannot remove the last owner. Transfer ownership first.",
        });
      }
    }

    await MerchantMember.deleteOne({ _id: memberId });

    await AuditLogger.account(
      user._id.toString(),
      "member_removed",
      request as any,
      {
        merchantId: merchant.merchantId,
        removedMemberId: memberId,
        removedRole: targetMembership.role,
      },
    );

    return { success: true };
  },

  transferOwnership: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
      Body: { newOwnerId: string; reason?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { newOwnerId, reason } = (request as any).body;
    const { merchant, membership: requesterMembership, user } = ctx;

    if (requesterMembership.role !== "owner") {
      return reply
        .code(403)
        .send({ error: "Only owners can transfer ownership" });
    }

    const newOwnerMembership = await MerchantMember.findById(newOwnerId);
    if (!newOwnerMembership) {
      return reply.code(404).send({ error: "Target member not found" });
    }

    if (newOwnerMembership.merchantId.toString() !== merchant._id.toString()) {
      return reply
        .code(400)
        .send({ error: "Target member does not belong to this merchant" });
    }

    if (!newOwnerMembership.accepted) {
      return reply
        .code(400)
        .send({ error: "Target member has not accepted invite" });
    }

    if (newOwnerMembership.userId.toString() === user._id.toString()) {
      return reply.code(400).send({ error: "Cannot transfer to yourself" });
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
        request as any,
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

  acceptInvite: async (
    request: FastifyRequest<{
      Body: { inviteToken: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply, false);
    if (!ctx) return;

    const { inviteToken } = (request as any).body;
    const { user } = ctx;

    const membership = await MerchantMember.findOne({
      inviteToken,
      accepted: false,
      inviteExpiresAt: { $gt: new Date() },
    });

    if (!membership) {
      return reply.code(404).send({ error: "Invalid or expired invite" });
    }

    if (
      membership.userId &&
      membership.userId.toString() !== user._id.toString()
    ) {
      return reply
        .code(403)
        .send({ error: "This invite belongs to another user" });
    }

    membership.userId = user._id;
    membership.accepted = true;
    membership.acceptedAt = new Date();
    membership.inviteToken = undefined;
    await membership.save();

    await AuditLogger.account(
      user._id.toString(),
      "invite_accepted",
      request as any,
      {
        merchantId: (await Merchant.findById(membership.merchantId))
          ?.merchantId,
      },
    );

    return {
      success: true,
      merchantId: (await Merchant.findById(membership.merchantId))?.merchantId,
    };
  },

  leaveMerchant: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant, membership, user } = ctx;

    if (membership.role === "owner") {
      const ownerCount = await countOwners(merchant._id);
      if (ownerCount === 1) {
        return reply.code(400).send({
          error: "Cannot leave as the last owner. Transfer ownership first.",
        });
      }
    }

    await MerchantMember.deleteOne({ _id: membership._id });

    await AuditLogger.account(
      user._id.toString(),
      "member_left",
      request as any,
      { merchantId: merchant.merchantId },
    );

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
      return reply.code(404).send({ error: "No merchants found" });
    }

    const defaultMembership = memberships[0];
    return {
      merchantId: (defaultMembership.merchantId as any).merchantId,
      name: (defaultMembership.merchantId as any).name,
      role: defaultMembership.role,
    };
  },

  setDefaultMerchant: async (
    request: FastifyRequest<{
      Body: { merchantId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchantId } = (request as any).body;
    const { user } = ctx;

    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return reply.code(404).send({ error: "Merchant not found" });
    }

    const membership = await MerchantMember.findOne({
      merchantId: merchant._id,
      userId: user._id,
      accepted: true,
    });

    if (!membership) {
      return reply
        .code(403)
        .send({ error: "You are not a member of this merchant" });
    }

    await User.findByIdAndUpdate(user._id, {
      defaultMerchantId: merchantId,
      lastActiveMerchantId: merchantId,
    });

    return { success: true, merchantId };
  },
};
