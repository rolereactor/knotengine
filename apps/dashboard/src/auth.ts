import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5050";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      id: "magic-link",
      name: "Magic Link",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.token) return null;

        try {
          const res = await fetch(`${API_BASE_URL}/v1/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              token: credentials.token,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          if (data.success) {
            return {
              id: data.oauthId,
              email: data.email,
              oauthId: data.oauthId,
            };
          }
        } catch (error) {
          console.error("[Auth] Magic Link verification failed:", error);
        }

        return null;
      },
    }),
  ],

  // Enable debug logs to see exact session failure reasons
  debug: process.env.NODE_ENV === "development",

  // Explicitly set secret to ensure middleware can always decode the JWT
  secret: process.env.AUTH_SECRET,

  callbacks: {
    /**
     * Called after a successful OAuth sign-in.
     * On first login, creates a Merchant account via the API and saves
     * the generated API key in the JWT so all dashboard requests can use it.
     */
    async jwt({ token, user, account, trigger, session }) {
      // Helper to fresh fetch merchants
      const fetchMerchants = async (oauthId: string) => {
        try {
          console.log(`[Auth] Syncing merchants for oauthId: ${oauthId}`);
          const lookupRes = await fetch(
            `${API_BASE_URL}/v1/merchants/by-oauth/${encodeURIComponent(oauthId)}`,
            { headers: { "x-internal-secret": INTERNAL_SECRET! } },
          );
          if (lookupRes.ok) return await lookupRes.json();
          if (lookupRes.status === 404) return [];
        } catch (e) {
          console.error("Fetch merchants failed", e);
        }
        return [];
      };

      // 1. Initial Login
      if (trigger === "signIn" || (account && user)) {
        let oauthId = token.oauthId as string;

        if (account?.provider === "magic-link") {
          // @ts-expect-error - oauthId is custom field on user returned from authorize
          oauthId = user.oauthId;
        }

        if (oauthId) {
          token.oauthId = oauthId;
          const merchants = await fetchMerchants(oauthId);

          if (merchants.length === 0) {
            console.log(
              `[Auth] No merchants found. User must create first merchant manually.`,
            );
            token.hasNoMerchants = true;
          } else {
            token.hasNoMerchants = false;
          }

          token.merchants = merchants.map(
            (m: {
              id: string;
              merchantId: string;
              name?: string;
              twoFactorEnabled?: boolean;
              referralCode?: string;
              referralEarningsUsd?: number;
            }) => ({
              id: m.id, // now always mid_... public ID
              merchantId: m.id,
              name: m.name || "Untitled Merchant",
              twoFactorEnabled: m.twoFactorEnabled || false,
              referralCode: m.referralCode,
              referralEarningsUsd: m.referralEarningsUsd || 0,
            }),
          );

          if (merchants.length > 0) {
            if (!token.merchantId) token.merchantId = merchants[0].id;
            if (!token.publicMerchantId)
              token.publicMerchantId = merchants[0].id;

            const activeMerchant =
              merchants.find(
                (m: { id: string }) => m.id === token.merchantId,
              ) || merchants[0];

            token.referralCode = activeMerchant.referralCode;
            token.referralEarningsUsd = activeMerchant.referralEarningsUsd || 0;
            token.twoFactorRequired = activeMerchant.twoFactorEnabled || false;
            token.twoFactorVerified = false;
          }
        }
      }

      // 2. Session Update (Triggered by client update())
      if (trigger === "update" && token.oauthId) {
        // Refresh list to pick up new creations
        const merchants = await fetchMerchants(token.oauthId as string);
        token.hasNoMerchants = merchants.length === 0;
        token.merchants = merchants.map(
          (m: {
            id: string;
            merchantId: string;
            name?: string;
            logoUrl?: string;
            twoFactorEnabled?: boolean;
            referralCode?: string;
            referralEarningsUsd?: number;
          }) => ({
            id: m.id,
            merchantId: m.id,
            name: m.name || "Untitled Merchant",
            twoFactorEnabled: m.twoFactorEnabled || false,
            referralCode: m.referralCode,
            referralEarningsUsd: m.referralEarningsUsd || 0,
          }),
        );

        // Switch active ID if requested and valid
        if (session?.merchantId) {
          const isValid = merchants.find(
            (m: { id: string }) => m.id === session.merchantId,
          );
          if (isValid) {
            token.merchantId = session.merchantId;
            token.publicMerchantId = session.merchantId; // id is already mid_...
          }
        } else {
          // No specific switch requested — check if current active merchant still exists
          const currentStillExists = merchants.find(
            (m: { id: string }) => m.id === token.merchantId,
          );
          if (!currentStillExists && merchants.length > 0) {
            token.merchantId = merchants[0].id;
            token.publicMerchantId = merchants[0].id;
          } else if (currentStillExists) {
            token.publicMerchantId = currentStillExists.id;
          } else if (merchants.length === 0) {
            token.merchantId = undefined;
            token.publicMerchantId = undefined;
          }
        }

        // Sync active merchant referral data (AFTER switching IDs)
        const finalActive = merchants.find(
          (m: { id: string }) => m.id === token.merchantId,
        );
        if (finalActive) {
          token.referralCode = finalActive.referralCode;
          token.referralEarningsUsd = finalActive.referralEarningsUsd || 0;
        }

        if (session?.apiKey) {
          token.apiKey = session.apiKey;
        }

        // Handle 2FA verification flag from client
        if (session?.twoFactorVerified === true) {
          token.twoFactorVerified = true;
        }

        // Refresh 2FA status from merchant data
        if (token.merchantId) {
          const activeMerchant = merchants.find(
            (m: { id: string; twoFactorEnabled?: boolean }) =>
              m.id === token.merchantId,
          );
          token.twoFactorRequired = activeMerchant?.twoFactorEnabled || false;
        }
      }

      // 3. Proactive Refresh (If missing critical data but allowed)
      if (
        !token.publicMerchantId &&
        !token.hasNoMerchants &&
        token.oauthId &&
        trigger !== "update"
      ) {
        const merchants = await fetchMerchants(token.oauthId as string);
        if (merchants.length === 0) {
          token.hasNoMerchants = true;
        } else {
          token.hasNoMerchants = false;
          const activeId = token.merchantId || merchants[0].id;
          const activeMerchant =
            merchants.find((m: { id: string }) => m.id === activeId) ||
            merchants[0];

          token.merchantId = activeMerchant.id;
          token.publicMerchantId = activeMerchant.id; // id is always mid_... now
          token.referralCode = activeMerchant.referralCode;
          token.referralEarningsUsd = activeMerchant.referralEarningsUsd || 0;
          token.merchants = merchants.map(
            (m: {
              id: string;
              merchantId: string;
              name?: string;
              twoFactorEnabled?: boolean;
              referralCode?: string;
              referralEarningsUsd?: number;
            }) => ({
              id: m.id,
              merchantId: m.id,
              name: m.name || "Untitled Merchant",
              twoFactorEnabled: m.twoFactorEnabled || false,
              referralCode: m.referralCode,
              referralEarningsUsd: m.referralEarningsUsd || 0,
            }),
          );
        }
      }

      return token;
    },

    /** Expose merchant data to the client session */
    async session({ session, token }) {
      session.user.merchantId = token.merchantId as string; // mid_... public ID
      // @ts-expect-error - Custom public ID field
      session.user.publicMerchantId = token.merchantId as string; // same value now
      session.user.oauthId = token.oauthId as string;
      // @ts-expect-error - NextAuth session user type doesn't include merchants by default
      session.user.merchants = token.merchants || [];
      session.user.apiKey = token.apiKey as string;
      // @ts-expect-error - 2FA fields
      session.user.twoFactorRequired = token.twoFactorRequired || false;
      // @ts-expect-error - 2FA fields
      session.user.twoFactorVerified = token.twoFactorVerified || false;
      // @ts-expect-error - Referral fields
      session.user.referralCode = token.referralCode as string;
      // @ts-expect-error - Referral fields
      session.user.referralEarningsUsd = token.referralEarningsUsd as number;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
