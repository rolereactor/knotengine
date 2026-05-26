import { FastifyReply } from "fastify";
import { FloatManager } from "../core/float-manager.js";
import { apiError } from "../utils/api-error.js";

export const FloatController = {
  getStats: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    // Only allow admin or enterprise users to view float stats
    if (merchant.plan !== "enterprise") {
      return apiError(
        reply,
        403,
        "plan_limit_reached",
        "This feature requires the Enterprise plan.",
      );
    }

    try {
      const stats = await FloatManager.getInstance().getFloatStats();
      return reply.send(stats);
    } catch (error) {
      console.error("Float stats error:", error);
      return apiError(
        reply,
        500,
        "internal_error",
        "Failed to get float statistics.",
      );
    }
  },

  investFloat: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    // Only allow admin users
    if (merchant.plan !== "enterprise") {
      return apiError(
        reply,
        403,
        "plan_limit_reached",
        "This feature requires the Enterprise plan.",
      );
    }

    try {
      const result = await FloatManager.getInstance().investFloat();
      return reply.send(result);
    } catch (error) {
      console.error("Float investment error:", error);
      return apiError(reply, 500, "internal_error", "Failed to invest float.");
    }
  },

  getHealth: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    // Only allow admin users
    if (merchant.plan !== "enterprise") {
      return apiError(
        reply,
        403,
        "plan_limit_reached",
        "This feature requires the Enterprise plan.",
      );
    }

    try {
      const health = await FloatManager.getInstance().getHealthMetrics();
      return reply.send(health);
    } catch (error) {
      console.error("Float health error:", error);
      return apiError(
        reply,
        500,
        "internal_error",
        "Failed to get float health.",
      );
    }
  },

  emergencyWithdraw: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    // Only allow admin users
    if (merchant.plan !== "enterprise") {
      return apiError(
        reply,
        403,
        "plan_limit_reached",
        "This feature requires the Enterprise plan.",
      );
    }

    try {
      const result = await FloatManager.getInstance().emergencyWithdraw();
      return reply.send(result);
    } catch (error) {
      console.error("Emergency withdrawal error:", error);
      return apiError(
        reply,
        500,
        "internal_error",
        "Failed to execute emergency withdrawal.",
      );
    }
  },
};
