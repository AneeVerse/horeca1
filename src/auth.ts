import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Disable rate limiting in development to avoid 429 during testing
  ...(process.env.NODE_ENV === 'development' && { rateLimit: false }),
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60,  // Refresh token every 24h
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        switchToken: { label: 'Switch Token', type: 'text' },
      },
      async authorize(credentials) {
        // ── Switch token flow (account switcher) ──
        if (credentials?.switchToken) {
          const link = await prisma.linkedAccount.findUnique({
            where: { switchToken: credentials.switchToken as string },
            include: {
              linkedUser: {
                select: { id: true, email: true, fullName: true, role: true, image: true, isActive: true },
              },
            },
          });

          if (!link || !link.linkedUser.isActive) return null;

          // Rotate the switch token (one-time use)
          await prisma.linkedAccount.update({
            where: { id: link.id },
            data: { switchToken: crypto.randomUUID() },
          });

          return {
            id: link.linkedUser.id,
            email: link.linkedUser.email,
            name: link.linkedUser.fullName,
            role: link.linkedUser.role,
            image: link.linkedUser.image,
          };
        }

        // ── Normal email/password flow ──
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            password: true,
            fullName: true,
            role: true,
            image: true,
            isActive: true,
          },
        });

        if (!user || !user.password || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'customer';
      }
      // Re-fetch role from DB when session.update() is called (e.g. after vendor approval)
      if (trigger === 'update' && token.id) {
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (freshUser) token.role = freshUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/', // Frontend handles auth UI via overlays
  },
});
