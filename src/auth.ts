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
          const client = prisma as any;
          const link = await client.linkedAccount.findUnique({
            where: { switchToken: credentials.switchToken as string },
            include: {
              linkedUser: {
                select: { id: true, email: true, fullName: true, role: true, image: true, isActive: true },
              },
            },
          });

          if (!link || !link.linkedUser.isActive) return null;

          // Rotate the switch token (one-time use)
          await client.linkedAccount.update({
            where: { id: link.id },
            data: { switchToken: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2) },
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
        // For admin users, resolve team role at sign-in time (stored in JWT, no per-request DB query)
        if (token.role === 'admin') {
          const membership = await prisma.adminTeamMember.findUnique({
            where: { userId: token.id as string },
            select: { role: true },
          });
          token.adminTeamRole = membership?.role ?? 'owner';
        }
      }
      // Re-fetch role from DB when session.update() is called (e.g. after vendor approval)
      if (trigger === 'update' && token.id) {
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (freshUser) {
          token.role = freshUser.role;
          if (freshUser.role === 'admin') {
            const membership = await prisma.adminTeamMember.findUnique({
              where: { userId: token.id as string },
              select: { role: true },
            });
            token.adminTeamRole = membership?.role ?? 'owner';
          } else {
            token.adminTeamRole = undefined;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        if (token.adminTeamRole) {
          (session.user as { adminTeamRole?: string }).adminTeamRole = token.adminTeamRole as string;
        }
      }
      return session;
    },
  },

  pages: {
    signIn: '/', // Frontend handles auth UI via overlays
  },
});
