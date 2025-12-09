import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "./db";

// HuggingFace OAuth provider configuration
const HuggingFace = {
  id: "huggingface",
  name: "Hugging Face",
  type: "oidc" as const,
  issuer: "https://huggingface.co",
  authorization: {
    params: { scope: "openid profile" },
  },
  profile(profile: HuggingFaceProfile) {
    return {
      id: profile.sub,
      name: profile.preferred_username ?? profile.name,
      email: profile.email,
      image: profile.picture,
    };
  },
  clientId: process.env.AUTH_HUGGINGFACE_ID,
  clientSecret: process.env.AUTH_HUGGINGFACE_SECRET,
};

interface HuggingFaceProfile {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  picture?: string;
}

export const authConfig: NextAuthConfig = {
  providers: [HuggingFace],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.id || account?.provider !== "huggingface") {
        return false;
      }

      // Upsert user in database by auth_subject (stable HF user identifier)
      try {
        await prisma.users.upsert({
          where: { auth_subject: account.providerAccountId },
          update: {
            email: user.email,
            auth_provider: account.provider,
          },
          create: {
            id: user.id,
            email: user.email,
            auth_provider: account.provider,
            auth_subject: account.providerAccountId,
            is_banned: false,
          },
        });
      } catch (error) {
        console.error("Failed to upsert user:", error);
        return false;
      }

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // On initial sign in, use the HuggingFace account ID as the stable identifier
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      } else if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
