import { FastifyReply } from "fastify";
import { Notification } from "@qodinger/knot-database";
import { apiError } from "../../utils/api-error.js";

export const MerchantNotificationController = {
  getNotifications: async (request: any, _reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(_reply, 401, "unauthorized", "Authentication required.");

    const { limit, offset, invoiceId } = request.query;

    const query: Record<string, unknown> = {
      merchantId: merchant._id,
    };

    if (invoiceId) {
      query["meta.invoiceId"] = invoiceId;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      merchantId: merchant._id,
      isRead: false,
    });

    return {
      data: notifications,
      unreadCount,
    };
  },
  markAllNotificationsRead: async (request: any, _reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(_reply, 401, "unauthorized", "Authentication required.");

    await Notification.updateMany(
      { merchantId: merchant._id, isRead: false },
      { $set: { isRead: true } },
    );

    return { success: true };
  },
  markNotificationRead: async (request: any, _reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(_reply, 401, "unauthorized", "Authentication required.");

    const { id } = request.params;

    await Notification.findOneAndUpdate(
      { _id: id, merchantId: merchant._id },
      { $set: { isRead: true } },
    );

    return { success: true };
  },
};
