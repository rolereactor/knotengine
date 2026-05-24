import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5050";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
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
          oauthId = (user as { oauthId: string }).oauthId;
        } else if (
          account?.provider === "google" ||
          account?.provider === "github"
        ) {
          const userEmail = user.email;
          if (userEmail) {
            try {
              const res = await fetch(`${API_BASE_URL}/v1/auth/link-oauth`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: userEmail,
                  provider: account.provider,
                  providerId: user.id as string,
                  image: user.image ?? undefined,
                }),
              });
              if (res.ok) {
                const data = await res.json();
                oauthId = data.oauthId;
                console.log(`[Auth] Account linked: ${oauthId}`);
              } else {
                oauthId = `email:${userEmail}`;
              }
            } catch (e) {
              console.error("[Auth] Failed to link OAuth account:", e);
              oauthId = `email:${userEmail}`;
            }
          } else {
            oauthId = `${account.provider}:${user.id}`;
          }
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
          }
        } else {
          // No specific switch requested — check if current active merchant still exists
          const currentStillExists = merchants.find(
            (m: { id: string }) => m.id === token.merchantId,
          );
          if (!currentStillExists && merchants.length > 0) {
            token.merchantId = merchants[0].id;
          } else if (merchants.length === 0) {
            token.merchantId = undefined;
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
        !token.merchantId &&
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
      session.user.merchantId = token.merchantId as string;
      session.user.oauthId = token.oauthId as string;
      session.user.merchants =
        (token.merchants as typeof session.user.merchants) || [];
      session.user.apiKey = token.apiKey as string;
      session.user.twoFactorRequired = token.twoFactorRequired || false;
      session.user.twoFactorVerified = token.twoFactorVerified || false;
      session.user.referralCode = token.referralCode as string;
      session.user.referralEarningsUsd = token.referralEarningsUsd as number;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
