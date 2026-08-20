import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
    /** Short-lived bearer token used to call the FastAPI backend. */
    accessToken?: string;
  }
  interface User { role: Role }
}

// next-auth re-exports the token type from @auth/core, so the augmentation has
// to be declared on both module paths to reach the callback signatures.
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    email?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    email?: string | null;
  }
}
