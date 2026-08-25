import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SignJWT } from "jose";
import { canUseGoogleAccount, isAdminEmail, resolveRole } from "@/lib/auth-access";
import { computeEffectivePermissions, ALL_PERMISSIONS } from "@/lib/permissions";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

const DEVELOPMENT_SECRET = "tnp-local-development-secret-change-before-production";

// Resolved lazily rather than at module load: `next build` evaluates this
// module with NODE_ENV=production and no secret available, so throwing here
// would break the production image build.
function authSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  return process.env.NODE_ENV === "production" ? undefined : DEVELOPMENT_SECRET;
}

function googleClientId() {
  const id = (process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID)?.trim();
  return id || undefined;
}

function googleClientSecret() {
  const secret = (process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET)?.trim();
  return secret || undefined;
}

function requireAuthSecret() {
  const secret = authSecret();
  if (!secret) throw new Error("AUTH_SECRET must be set in production.");
  return secret;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret(),
  trustHost: true,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({
      clientId: googleClientId(),
      clientSecret: googleClientSecret(),
      // The seed inserts administrator rows from ADMIN_EMAILS before anyone has
      // signed in, so an administrator's first Google sign-in always meets an
      // existing user row that has no linked Account. Auth.js refuses to link
      // those by default and fails with OAuthAccountNotLinked. Linking on email
      // is safe here because Google is the only provider and the signIn callback
      // below rejects an address Google has not verified.
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    async signIn({ profile, user }) {
      const email = (profile?.email ?? user.email)?.toLowerCase();
      if (!canUseGoogleAccount(email)) return false;
      // Guards the account linking enabled above: without proof that Google
      // verified the address, linking would let one account claim another's row.
      if (profile && profile.email_verified === false) return false;

      // Reject suspended/inactive user accounts
      if (email) {
        const existing = await db.user.findUnique({
          where: { email },
          select: { isActive: true },
        });
        if (existing && existing.isActive === false) {
          return false;
        }
      }

      // Reconcile the stored role on every sign-in if listed in ADMIN_EMAILS
      if (isAdminEmail(email)) {
        await db.user.updateMany({ where: { email }, data: { role: "ADMIN" } });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.email = user.email ?? token.email;
      }

      if (token.email && isAdminEmail(token.email)) {
        token.role = "ADMIN";
        token.isActive = true;
      } else if (token.id) {
        // Query user's current role, title, active status, and permissions from DB
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, title: true, customPermissions: true, isActive: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.title = dbUser.title;
          token.isActive = dbUser.isActive;
          token.customPermissions = dbUser.customPermissions;
        } else {
          token.role = resolveRole(token.email);
          token.isActive = true;
        }
      } else {
        token.role = resolveRole(token.email);
        token.isActive = true;
      }

      const effective = computeEffectivePermissions(
        token.role,
        token.customPermissions ?? [],
        token.email,
      );
      token.effectivePermissions = effective;

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role as Role;
      session.user.title = token.title;
      session.user.isActive = token.isActive !== false;
      session.user.customPermissions = token.customPermissions ?? [];
      session.user.effectivePermissions = token.effectivePermissions ?? [];

      session.accessToken = await new SignJWT({
        sub: token.id,
        email: token.email,
        role: token.role,
        title: token.title,
        isActive: token.isActive !== false,
        customPermissions: token.customPermissions ?? [],
        permissions: token.effectivePermissions ?? [],
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(new TextEncoder().encode(requireAuthSecret()));
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const role = resolveRole(user.email);
      const email = user.email?.toLowerCase().trim();
      let customPermissions: string[] = [];

      if (email) {
        // Check if user is an existing team member
        const teamMember = await db.teamMember.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (teamMember) {
          try {
            const setting = await db.systemSetting.findUnique({
              where: { key: "placement_team_default_permissions" },
            });
            if (setting && setting.value) {
              const parsed = JSON.parse(setting.value);
              if (Array.isArray(parsed)) {
                customPermissions = parsed.filter((p) =>
                  (ALL_PERMISSIONS as readonly string[]).includes(p)
                );
              }
            } else {
              customPermissions = [
                "companies:read",
                "jobs:read",
                "jobs:manage",
                "applications:read",
                "applications:manage",
                "students:read",
                "announcements:manage",
                "analytics:view",
              ];
            }
          } catch {
            // fallback
          }
        }
      }

      if (role !== "STUDENT" || customPermissions.length > 0) {
        await db.user.update({
          where: { id: user.id },
          data: {
            role: role !== "STUDENT" ? role : undefined,
            customPermissions: customPermissions.length > 0 ? customPermissions : undefined,
          },
        });
      }
    },
  },
});
