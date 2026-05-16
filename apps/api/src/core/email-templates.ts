import dedent from "dedent";

/**
 * 📧 Email Templates
 * Centralized HTML templates for all system emails sent via Resend.
 */

export const EmailTemplates = {
  /**
   * 🪄 Magic Link Login Email
   */
  getMagicLinkHtml: (magicLink: string) => dedent`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>Sign in to KnotEngine</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

        :root {
          color-scheme: only light;
        }

        @media only screen and (max-width: 600px) {
          .container {
            padding: 20px 10px !important;
          }
          .card {
            padding: 32px 24px !important;
            border-radius: 16px !important;
          }
          .title {
            font-size: 20px !important;
          }
          .button {
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #18181b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f4f5;">
        <tr>
          <td align="center" class="container" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="max-width: 440px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 20px; overflow: hidden;">

              <!-- Brand Header -->
              <tr>
                <td align="center" style="padding: 32px 0 24px 0;">
                  <div style="font-size: 24px; font-weight: 900; letter-spacing: 0.15em; color: #18181b; text-transform: uppercase;">
                    KNOT<span style="color: #6366f1;">ENGINE</span>
                  </div>
                </td>
              </tr>

              <!-- Hero Section -->
              <tr>
                <td align="center" style="padding: 0 32px 32px 32px; text-align: center;">
                  <h1 class="title" style="color: #18181b; font-size: 22px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: -0.02em; line-height: 1.2;">
                    Your dashboard is ready.
                  </h1>
                  <p style="color: #71717a; font-size: 15px; line-height: 1.5; margin: 0 0 28px 0;">
                    Securely sign in to your workspace to manage global payments and settlements.
                  </p>

                  <!-- CTA Button -->
                  <div style="margin-bottom: 32px;">
                    <a href="${magicLink}" class="button" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: -0.01em;">
                      Sign in to Dashboard
                    </a>
                  </div>

                  <div style="height: 1px; background-color: #e4e4e7; margin-bottom: 24px; width: 100%;"></div>

                  <p style="color: #71717a; font-size: 12px; line-height: 1.6; margin: 0 auto; max-width: 300px;">
                    This link expires in 15 minutes.<br>
                    Safely ignore this if you did not request it.
                  </p>
                </td>
              </tr>

              <!-- Minimal Footer -->
              <tr>
                <td align="center" style="padding: 20px 0; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
                  <p style="color: #71717a; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
                    &copy; ${new Date().getFullYear()} KnotEngine
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,

  /**
   * ✅ Email Verification Email
   */
  getVerificationEmailHtml: (
    verificationLink: string,
    _email: string,
  ) => dedent`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
      <title>Verify your email - KnotEngine</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

        :root {
          color-scheme: dark;
          supported-color-schemes: dark;
        }

        @media only screen and (max-width: 600px) {
          .container {
            padding: 20px 10px !important;
          }
          .card {
            padding: 32px 24px !important;
            border-radius: 16px !important;
          }
          .title {
            font-size: 20px !important;
          }
          .button {
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #ffffff;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #050505;">
        <tr>
          <td align="center" class="container" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="max-width: 440px; background-color: #0c0c0c; border: 1px solid #1a1a1a; border-radius: 20px; overflow: hidden;">

              <!-- Brand Header -->
              <tr>
                <td align="center" style="padding: 32px 0 24px 0;">
                  <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.15em; color: #ffffff; text-transform: uppercase;">
                    KNOT<span style="color: #6366f1;">ENGINE</span>
                  </div>
                </td>
              </tr>

              <!-- Hero Section -->
              <tr>
                <td align="center" style="padding: 0 32px 32px 32px; text-align: center;">
                  <h1 class="title" style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: -0.02em; line-height: 1.2;">
                    Verify your email
                  </h1>
                  <p style="color: #888888; font-size: 15px; line-height: 1.5; margin: 0 0 28px 0;">
                    Thanks for joining KnotEngine! Click below to verify your email address and activate your account.
                  </p>

                  <!-- CTA Button -->
                  <div style="margin-bottom: 32px;">
                    <a href="${verificationLink}" class="button" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: -0.01em;">
                      Verify Email
                    </a>
                  </div>

                  <div style="height: 1px; background-color: #1a1a1a; margin-bottom: 24px; width: 100%;"></div>

                  <p style="color: #4c4c4c; font-size: 12px; line-height: 1.6; margin: 0; max-width: 300px; margin: 0 auto;">
                    This link expires in 24 hours.<br>
                    If you didn't create an account, safely ignore this email.
                  </p>
                </td>
              </tr>

              <!-- Minimal Footer -->
              <tr>
                <td align="center" style="padding: 20px 0; background-color: #090909; border-top: 1px solid #1a1a1a;">
                  <p style="color: #333333; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
                    &copy; ${new Date().getFullYear()} KnotEngine
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,

  /**
   * 💰 Payment Notification Email
   */
  getPaymentNotificationHtml: (params: {
    merchantName: string;
    invoiceId: string;
    amount: string;
    currency: string;
    status: "received" | "confirmed" | "expired" | "overpaid";
    checkoutUrl?: string;
  }) => {
    const statusColors: Record<string, string> = {
      received: "#6366f1",
      confirmed: "#10b981",
      expired: "#ef4444",
      overpaid: "#f59e0b",
    };

    const statusIcons: Record<string, string> = {
      received: "💳",
      confirmed: "✅",
      expired: "⏰",
      overpaid: "💎",
    };

    return dedent`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Notification - KnotEngine</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          :root { color-scheme: dark; supported-color-schemes: dark; }
          @media only screen and (max-width: 600px) {
            .container { padding: 20px 10px !important; }
            .card { padding: 32px 24px !important; border-radius: 16px !important; }
            .title { font-size: 20px !important; }
            .amount-box { width: 100% !important; box-sizing: border-box !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; color: #ffffff;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #050505;">
          <tr>
            <td align="center" class="container" style="padding: 40px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="max-width: 440px; background-color: #0c0c0c; border: 1px solid #1a1a1a; border-radius: 20px; overflow: hidden;">
                
                <!-- Brand Header -->
                <tr>
                  <td align="center" style="padding: 32px 0 24px 0;">
                    <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.15em; color: #ffffff; text-transform: uppercase;">
                      KNOT<span style="color: #6366f1;">ENGINE</span>
                    </div>
                  </td>
                </tr>

                <!-- Status Icon -->
                <tr>
                  <td align="center" style="padding: 0 32px 16px 32px;">
                    <div style="font-size: 48px;">${statusIcons[params.status]}</div>
                  </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                  <td align="center" style="padding: 0 32px 32px 32px; text-align: center;">
                    <h1 class="title" style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 12px 0;">
                      Payment ${params.status === "received" ? "Received" : params.status === "confirmed" ? "Confirmed" : params.status === "overpaid" ? "Overpaid" : "Expired"}
                    </h1>
                    <p style="color: #888888; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0;">
                      Hi ${params.merchantName || "Merchant"},<br/>
                      A new payment notification has been received.
                    </p>

                    <!-- Amount Box -->
                    <div class="amount-box" style="background-color: #1a1a1a; border: 1px solid ${statusColors[params.status]}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <div style="font-size: 28px; font-weight: 700; color: ${statusColors[params.status]}; margin-bottom: 8px;">
                        ${params.amount} ${params.currency}
                      </div>
                      <div style="font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 0.05em;">
                        Invoice: ${params.invoiceId}
                      </div>
                    </div>

                    ${
                      params.checkoutUrl
                        ? `
                    <div style="margin-bottom: 24px;">
                      <a href="${params.checkoutUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        View Invoice
                      </a>
                    </div>
                    `
                        : ""
                    }

                    <div style="height: 1px; background-color: #1a1a1a; margin-bottom: 24px; width: 100%;"></div>

                    <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 0;">
                      This is an automated notification from KnotEngine.<br/>
                      Login to your dashboard for more details.
                    </p>
                  </td>
                </tr>

                <!-- Minimal Footer -->
                <tr>
                  <td align="center" style="padding: 20px 0; background-color: #090909; border-top: 1px solid #1a1a1a;">
                    <p style="color: #333333; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
                      &copy; ${new Date().getFullYear()} KnotEngine
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  },

  /**
   * 🔒 Security Alert Email
   */
  getSecurityAlertHtml: (params: {
    merchantName: string;
    action: string;
    description: string;
    ipAddress?: string;
    timestamp: string;
  }) => dedent`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert - KnotEngine</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        :root { color-scheme: dark; supported-color-schemes: dark; }
        @media only screen and (max-width: 600px) {
          .container { padding: 20px 10px !important; }
          .card { padding: 32px 24px !important; border-radius: 16px !important; }
          .title { font-size: 20px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; color: #ffffff;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #050505;">
        <tr>
          <td align="center" class="container" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="max-width: 440px; background-color: #0c0c0c; border: 1px solid #1a1a1a; border-radius: 20px; overflow: hidden;">
              
              <!-- Brand Header -->
              <tr>
                <td align="center" style="padding: 32px 0 24px 0;">
                  <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.15em; color: #ffffff; text-transform: uppercase;">
                    KNOT<span style="color: #ef4444;">ENGINE</span>
                  </div>
                </td>
              </tr>

              <!-- Alert Icon -->
              <tr>
                <td align="center" style="padding: 0 32px 16px 32px;">
                  <div style="font-size: 48px;">🔒</div>
                </td>
              </tr>

              <!-- Hero Section -->
              <tr>
                <td align="center" style="padding: 0 32px 32px 32px; text-align: center;">
                  <h1 class="title" style="color: #ef4444; font-size: 22px; font-weight: 700; margin: 0 0 12px 0;">
                    Security Alert
                  </h1>
                  <p style="color: #888888; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0;">
                    Hi ${params.merchantName || "Merchant"},<br/>
                    ${params.description}
                  </p>

                  <!-- Alert Details -->
                  <div style="background-color: #1a1a1a; border: 1px solid #ef4444; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;">
                    <div style="font-size: 12px; color: #666666; margin-bottom: 8px;">Action</div>
                    <div style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 12px;">${params.action}</div>
                    
                    ${
                      params.ipAddress
                        ? `
                    <div style="font-size: 12px; color: #666666; margin-bottom: 8px;">IP Address</div>
                    <div style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 12px;">${params.ipAddress}</div>
                    `
                        : ""
                    }
                    
                    <div style="font-size: 12px; color: #666666; margin-bottom: 8px;">Timestamp</div>
                    <div style="font-size: 14px; font-weight: 600; color: #ffffff;">${params.timestamp}</div>
                  </div>

                  <div style="margin-bottom: 24px;">
                    <a href="${process.env.DASHBOARD_URL || "http://localhost:5052"}/dashboard/activity" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
                      View Activity Log
                    </a>
                  </div>

                  <div style="height: 1px; background-color: #1a1a1a; margin-bottom: 24px; width: 100%;"></div>

                  <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 0;">
                    If you didn't perform this action, please secure your account immediately.<br/>
                    Contact support if you need assistance.
                  </p>
                </td>
              </tr>

              <!-- Minimal Footer -->
              <tr>
                <td align="center" style="padding: 20px 0; background-color: #090909; border-top: 1px solid #1a1a1a;">
                  <p style="color: #333333; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
                    &copy; ${new Date().getFullYear()} KnotEngine
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,

  /**
   * 💳 Billing Notification Email
   */
  getBillingNotificationHtml: (params: {
    merchantName: string;
    type:
      | "subscription_charged"
      | "payment_received"
      | "low_balance"
      | "plan_changed";
    amount?: string;
    plan?: string;
    description: string;
  }) => {
    const typeConfig: Record<
      string,
      { title: string; color: string; icon: string }
    > = {
      subscription_charged: {
        title: "Subscription Charged",
        color: "#6366f1",
        icon: "💳",
      },
      payment_received: {
        title: "Payment Received",
        color: "#10b981",
        icon: "💰",
      },
      low_balance: {
        title: "Low Balance Warning",
        color: "#f59e0b",
        icon: "⚠️",
      },
      plan_changed: { title: "Plan Changed", color: "#6366f1", icon: "📊" },
    };

    const config = typeConfig[params.type];

    return dedent`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Billing Notification - KnotEngine</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          :root { color-scheme: dark; supported-color-schemes: dark; }
          @media only screen and (max-width: 600px) {
            .container { padding: 20px 10px !important; }
            .card { padding: 32px 24px !important; border-radius: 16px !important; }
            .title { font-size: 20px !important; }
            .amount-box { width: 100% !important; box-sizing: border-box !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; color: #ffffff;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #050505;">
          <tr>
            <td align="center" class="container" style="padding: 40px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="max-width: 440px; background-color: #0c0c0c; border: 1px solid #1a1a1a; border-radius: 20px; overflow: hidden;">
                
                <!-- Brand Header -->
                <tr>
                  <td align="center" style="padding: 32px 0 24px 0;">
                    <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.15em; color: #ffffff; text-transform: uppercase;">
                      KNOT<span style="color: #6366f1;">ENGINE</span>
                    </div>
                  </td>
                </tr>

                <!-- Icon -->
                <tr>
                  <td align="center" style="padding: 0 32px 16px 32px;">
                    <div style="font-size: 48px;">${config.icon}</div>
                  </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                  <td align="center" style="padding: 0 32px 32px 32px; text-align: center;">
                    <h1 class="title" style="color: ${config.color}; font-size: 22px; font-weight: 700; margin: 0 0 12px 0;">
                      ${config.title}
                    </h1>
                    <p style="color: #888888; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0;">
                      Hi ${params.merchantName || "Merchant"},<br/>
                      ${params.description}
                    </p>

                    ${
                      params.amount
                        ? `
                    <div class="amount-box" style="background-color: #1a1a1a; border: 1px solid ${config.color}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <div style="font-size: 28px; font-weight: 700; color: ${config.color}; margin-bottom: 8px;">
                        $${params.amount}
                      </div>
                      ${params.plan ? `<div style="font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 0.05em;">${params.plan} Plan</div>` : ""}
                    </div>
                    `
                        : ""
                    }

                    <div style="margin-bottom: 24px;">
                      <a href="${process.env.DASHBOARD_URL || "http://localhost:5052"}/dashboard/billing" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        View Billing
                      </a>
                    </div>

                    <div style="height: 1px; background-color: #1a1a1a; margin-bottom: 24px; width: 100%;"></div>

                    <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 0;">
                      This is an automated notification from KnotEngine.<br/>
                      Login to your dashboard for more details.
                    </p>
                  </td>
                </tr>

                <!-- Minimal Footer -->
                <tr>
                  <td align="center" style="padding: 20px 0; background-color: #090909; border-top: 1px solid #1a1a1a;">
                    <p style="color: #333333; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
                      &copy; ${new Date().getFullYear()} KnotEngine
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  },
};
