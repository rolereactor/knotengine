import { AuditLog } from "@qodinger/knot-database";
import { FastifyRequest } from "fastify";

export type AuditCategory =
  | "auth"
  | "account"
  | "security"
  | "billing"
  | "settings";

export interface AuditLogData {
  userId: string;
  merchantId?: string;
  action: string;
  category: AuditCategory;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 📋 Audit Logger
 * Tracks all account changes and security events for compliance.
 */
export const AuditLogger = {
  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await AuditLog.create({
        userId: data.userId,
        merchantId: data.merchantId,
        action: data.action,
        category: data.category,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
      });
    } catch (error) {
      console.error("Audit logging failed:", error);
      // Don't throw - audit logging failures shouldn't break main functionality
    }
  },

  /**
   * Log authentication event
   */
  async auth(
    userId: string,
    action:
      | "login"
      | "logout"
      | "login_failed"
      | "password_reset"
      | "email_verified",
    request?: FastifyRequest,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const descriptions: Record<string, string> = {
      login: "User logged in successfully",
      logout: "User logged out",
      login_failed: "Failed login attempt",
      password_reset: "Password reset requested",
      email_verified: "Email address verified",
    };

    await this.log({
      userId,
      action,
      category: "auth",
      description: descriptions[action],
      ipAddress: request?.ip,
      userAgent: request?.headers["user-agent"] as string,
      metadata,
    });
  },

  /**
   * Log account event
   */
  async account(
    userId: string,
    action:
      | "created"
      | "updated"
      | "deleted"
      | "merchant_created"
      | "merchant_deleted"
      | "member_invited"
      | "member_removed"
      | "role_updated"
      | "ownership_transferred"
      | "invite_accepted"
      | "member_left",
    request?: FastifyRequest,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const descriptions: Record<string, string> = {
      created: "User account created",
      updated: "User account updated",
      deleted: "User account deleted",
      merchant_created: "Merchant account created",
      merchant_deleted: "Merchant account deleted",
      member_invited: "Team member invited",
      member_removed: "Team member removed",
      role_updated: "Team member role updated",
      ownership_transferred: "Merchant ownership transferred",
      invite_accepted: "Team invite accepted",
      member_left: "Member left merchant",
    };

    await this.log({
      userId,
      merchantId: (metadata as any)?.merchantId,
      action,
      category: "account",
      description: descriptions[action],
      ipAddress: request?.ip,
      userAgent: request?.headers["user-agent"] as string,
      metadata,
    });
  },

  /**
   * Log security event
   */
  async security(
    userId: string,
    action:
      | "2fa_enabled"
      | "2fa_disabled"
      | "2fa_backup_used"
      | "api_key_generated"
      | "api_key_revoked"
      | "api_key_rotated"
      | "suspicious_activity"
      | "ip_allowlist_updated",
    request?: FastifyRequest,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const descriptions: Record<string, string> = {
      "2fa_enabled": "Two-factor authentication enabled",
      "2fa_disabled": "Two-factor authentication disabled",
      "2fa_backup_used": "2FA backup code used",
      api_key_generated: "New API key generated",
      api_key_revoked: "API key revoked",
      api_key_rotated: "API key rotated",
      suspicious_activity: "Suspicious activity detected",
      ip_allowlist_updated: "IP allowlist configuration updated",
    };

    await this.log({
      userId,
      merchantId: (metadata as any)?.merchantId,
      action,
      category: "security",
      description: descriptions[action],
      ipAddress: request?.ip,
      userAgent: request?.headers["user-agent"] as string,
      metadata,
    });
  },

  /**
   * Log billing event
   */
  async billing(
    userId: string,
    action:
      | "topup"
      | "subscription_charged"
      | "plan_changed"
      | "credit_used"
      | "refund",
    request?: FastifyRequest,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const descriptions: Record<string, string> = {
      topup: "Account topped up",
      subscription_charged: "Subscription fee charged",
      plan_changed: "Subscription plan changed",
      credit_used: "Credits used for payment",
      refund: "Refund processed",
    };

    await this.log({
      userId,
      merchantId: (metadata as any)?.merchantId,
      action,
      category: "billing",
      description: descriptions[action],
      ipAddress: request?.ip,
      userAgent: request?.headers["user-agent"] as string,
      metadata,
    });
  },

  /**
   * Log settings event
   */
  async settings(
    userId: string,
    action:
      | "profile_updated"
      | "webhook_updated"
      | "wallet_updated"
      | "preferences_updated",
    request?: FastifyRequest,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const descriptions: Record<string, string> = {
      profile_updated: "Profile settings updated",
      webhook_updated: "Webhook configuration updated",
      wallet_updated: "Wallet configuration updated",
      preferences_updated: "User preferences updated",
    };

    await this.log({
      userId,
      merchantId: (metadata as any)?.merchantId,
      action,
      category: "settings",
      description: descriptions[action],
      ipAddress: request?.ip,
      userAgent: request?.headers["user-agent"] as string,
      metadata,
    });
  },

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      category?: AuditCategory;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<import("@qodinger/knot-database").IAuditLog[]> {
    const query: Record<string, unknown> = { userId };

    if (options?.category) {
      query.category = options.category;
    }

    if (options?.startDate || options?.endDate) {
      query.createdAt = {};
      if (options?.startDate) {
        (query.createdAt as Record<string, Date>).$gte = options.startDate;
      }
      if (options?.endDate) {
        (query.createdAt as Record<string, Date>).$lte = options.endDate;
      }
    }

    return AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit || 50)
      .skip(options?.offset || 0);
  },

  /**
   * Get audit logs for a merchant
   */
  async getMerchantLogs(
    merchantId: string,
    options?: {
      limit?: number;
      offset?: number;
      category?: AuditCategory;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<import("@qodinger/knot-database").IAuditLog[]> {
    const query: Record<string, unknown> = { merchantId };

    if (options?.category) {
      query.category = options.category;
    }

    if (options?.startDate || options?.endDate) {
      query.createdAt = {};
      if (options?.startDate) {
        (query.createdAt as Record<string, Date>).$gte = options.startDate;
      }
      if (options?.endDate) {
        (query.createdAt as Record<string, Date>).$lte = options.endDate;
      }
    }

    return AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit || 50)
      .skip(options?.offset || 0);
  },
};
