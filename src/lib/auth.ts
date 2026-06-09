import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface User {
    role: import("@prisma/client").Role;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: import("@prisma/client").Role;
    };
  }
  interface JWT {
    role: import("@prisma/client").Role;
    id: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await prisma.usuario.findUnique({
            where: { email: credentials.email as string, activo: true },
          });

          if (!user) return null;

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!valid) return null;

          return {
            id: user.id,
            name: user.nombre,
            email: user.email,
            role: user.role,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
});
