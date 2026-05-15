import { z } from "zod";
import {
  stripHtmlTags,
  limitLength,
  isValidEmail,
  MAX_TEXT_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_URL_LENGTH,
} from "@qodinger/knot-types";

const sanitizeAndLimit = (val: string) =>
  limitLength(stripHtmlTags(val), MAX_TEXT_LENGTH);
const sanitizeEmail = (val: string) => {
  const sanitized = limitLength(
    stripHtmlTags(val).toLowerCase().trim(),
    MAX_EMAIL_LENGTH,
  );
  return sanitized;
};

export const merchantSettingsSchema = z.object({
  merchantId: z.string().optional(),
  businessName: z
    .string()
    .min(1, "Merchant name is required")
    .max(MAX_TEXT_LENGTH, `Name must be ${MAX_TEXT_LENGTH} characters or less`)
    .transform(sanitizeAndLimit)
    .refine((val) => val.length > 0, {
      message: "Merchant name is required",
    }),
  businessEmail: z
    .string()
    .email("Invalid email address")
    .max(
      MAX_EMAIL_LENGTH,
      `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
    )
    .or(z.literal(""))
    .transform(sanitizeEmail)
    .refine((val) => !val || isValidEmail(val), {
      message: "Invalid email format",
    }),
  logoUrl: z.string().optional(),
  returnUrl: z
    .string()
    .max(MAX_URL_LENGTH, `URL must be ${MAX_URL_LENGTH} characters or less`)
    .optional()
    .transform((val) =>
      val ? limitLength(stripHtmlTags(val), MAX_URL_LENGTH) : undefined,
    ),
  theme: z.enum(["light", "dark", "system"]),
  brandColor: z
    .string()
    .max(7, "Invalid hex color format")
    .optional()
    .transform((val) => (val ? limitLength(stripHtmlTags(val), 7) : undefined)),
  brandingEnabled: z.boolean(),
  removeBranding: z.boolean(),
  brandingAlignment: z.enum(["left", "center"]).optional(),
  webhookUrl: z
    .string()
    .url("Invalid URL")
    .max(MAX_URL_LENGTH, `URL must be ${MAX_URL_LENGTH} characters or less`)
    .optional()
    .transform((val) =>
      val ? limitLength(stripHtmlTags(val), MAX_URL_LENGTH) : undefined,
    ),
  webhookSecret: z.string().optional(),
  feeResponsibility: z.enum(["merchant", "client"]),
  invoiceExpirationMinutes: z.number().min(15).max(43200),
  underpaymentTolerancePercentage: z.number().min(0).max(10),
  bip21Enabled: z.boolean(),
  enabledCurrencies: z.array(z.string()),
  plan: z.enum(["starter", "professional", "enterprise"]).optional(),
});

export type MerchantSettings = z.infer<typeof merchantSettingsSchema>;

export const webhookSchema = z.object({
  webhookUrl: z
    .string()
    .url("Invalid URL")
    .max(MAX_URL_LENGTH, `URL must be ${MAX_URL_LENGTH} characters or less`)
    .or(z.literal(""))
    .transform((val) =>
      val ? limitLength(stripHtmlTags(val), MAX_URL_LENGTH) : "",
    ),
  webhookEvents: z.array(z.string()),
});

export type WebhookFormData = z.infer<typeof webhookSchema>;

export interface TwoFASetupData {
  secret: string;
  qrCode: string;
}
