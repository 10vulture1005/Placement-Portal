import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SignJWT } from "jose";
import { canUseGoogleAccount, resolveRole } from "@/lib/auth-access";
import { db } from "@/lib/db";

const DEVELOPMENT_SECRET = "tnp-local-development-secret-change-before-production";

// Resolved lazily rather than at module load: `next build` evaluates this
// module with NODE_ENV=production and no secret available, so throwing here
// would break the production image build.
function authSecret() {
  return (
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : DEVELOPMENT_SECRET)
  );
}

function requireAuthSecret() {
  const secret = authSecret();
  if (!secret) throw new Error("AUTH_SECRET must be set in production.");
  return secret;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret(),
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({
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

      // Reconcile the stored role on every sign-in so that editing
      // ADMIN_EMAILS both grants and revokes access. New users are handled by
      // the createUser event, which runs after the adapter inserts the row.
      await db.user.updateMany({ where: { email }, data: { role: resolveRole(email) } });
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.email = user.email ?? token.email;
      }
      // Recomputed on every request so removing an address from ADMIN_EMAILS
      // takes effect immediately instead of lingering until the session expires.
      token.role = resolveRole(token.email);
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.accessToken = await new SignJWT({
        sub: token.id,
        email: token.email,
        role: token.role,
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
      if (role !== "STUDENT") {
        await db.user.update({ where: { id: user.id }, data: { role } });
      }
    },
  },
});
