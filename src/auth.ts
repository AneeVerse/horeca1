import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

function vendorSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `${base}-${Date.now().toString(36)}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...(process.env.NODE_ENV === 'development' && { rateLimit: false }),
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  providers: [
    // ── OTP (phone or email) — customers, vendors, team members ──────────
    Credentials({
      id: 'otp',
      name: 'OTP',
      credentials: {
        phone: {},
        loginEmail: {},
        code: {},
        fullName: {},
        businessName: {},
        email: {},
        password: {},
        role: {},
        isRegister: {},
      },
      async authorize(credentials) {
        const phone = String(credentials?.phone ?? '').replace(/\D/g, '').replace(/^91/, '');
        const loginEmail = String(credentials?.loginEmail ?? '').trim().toLowerCase();
        const code = String(credentials?.code ?? '').trim();
        const isRegister = credentials?.isRegister === 'true' || credentials?.isRegister === true;
        if (!code) return null;

        const usePhone = !!phone;
        const useEmail = !usePhone && !isRegister && !!loginEmail;
        if (!usePhone && !useEmail) return null;

        // Verify OTP against the chosen identifier
        const record = await prisma.otpCode.findFirst({
          where: usePhone
            ? { phone, used: false, expiresAt: { gt: new Date() } }
            : { email: loginEmail, used: false, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        });
        if (!record || record.code !== code) return null;

        await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });

        // Find existing user by whichever identifier was used
        let user = usePhone
          ? await prisma.user.findUnique({
              where: { phone },
              select: { id: true, email: true, fullName: true, role: true, image: true, isActive: true },
            })
          : await prisma.user.findUnique({
              where: { email: loginEmail },
              select: { id: true, email: true, fullName: true, role: true, image: true, isActive: true },
            });

        // Email-OTP login requires an existing account (no auto-register via email)
        if (useEmail && !user) return null;

        if (!user && usePhone) {
          // No account yet — create one automatically.
          // Register form provides fullName/businessName/email/role; login form falls back to phone-only account.
          const fullName = String(credentials?.fullName ?? '').trim() || phone;
          const businessName = String(credentials?.businessName ?? '').trim() || null;
          const rawEmail = String(credentials?.email ?? '').trim().toLowerCase();
          const email = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;
          const role = credentials?.role === 'vendor' ? 'vendor' : 'customer';

          // If email is provided but already used by another account, skip it rather than fail
          const emailTaken = email
            ? !!(await prisma.user.findUnique({ where: { email }, select: { id: true } }))
            : false;
          const finalEmail = emailTaken ? null : email;

          // Optional password set during registration — usable with phone or email
          const rawPassword = String(credentials?.password ?? '');
          const passwordHash = rawPassword.length >= 6
            ? await bcrypt.hash(rawPassword, 10)
            : null;

          user = await prisma.user.create({
            data: {
              phone,
              fullName,
              businessName,
              email: finalEmail,
              password: passwordHash,
              role,
              isActive: true,
            },
            select: { id: true, email: true, fullName: true, role: true, image: true, isActive: true },
          });

          if (role === 'vendor') {
            await prisma.vendor.create({
              data: {
                userId: user.id,
                businessName: businessName ?? fullName,
                slug: vendorSlug(businessName ?? fullName),
                isActive: false,
                isVerified: false,
              },
            });
          }
        }

        if (!user || !user.isActive) return null;

        return { id: user.id, email: user.email ?? undefined, name: user.fullName, role: user.role, image: user.image ?? undefined };
      },
    }),

    // ── Phone-or-email + password — team members, admins, registered users
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Phone or email', type: 'text' },
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
          await prisma.linkedAccount.update({
            where: { id: link.id },
            data: { switchToken: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2) },
          });
          return { id: link.linkedUser.id, email: link.linkedUser.email ?? undefined, name: link.linkedUser.fullName, role: link.linkedUser.role, image: link.linkedUser.image ?? undefined };
        }

        // ── Phone or email + password flow ──
        const identifier = String(credentials?.email ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!identifier || !password) return null;

        const looksEmail = identifier.includes('@');
        const phoneDigits = identifier.replace(/\D/g, '').replace(/^91/, '');

        const user = looksEmail
          ? await prisma.user.findUnique({
              where: { email: identifier.toLowerCase() },
              select: { id: true, email: true, password: true, fullName: true, role: true, image: true, isActive: true },
            })
          : (phoneDigits.length === 10
              ? await prisma.user.findUnique({
                  where: { phone: phoneDigits },
                  select: { id: true, email: true, password: true, fullName: true, role: true, image: true, isActive: true },
                })
              : null);

        if (!user || !user.password || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email ?? undefined, name: user.fullName, role: user.role, image: user.image ?? undefined };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'customer';
        if (token.role === 'admin') {
          const membership = await prisma.adminTeamMember.findUnique({
            where: { userId: token.id as string },
            select: { role: true },
          });
          token.adminTeamRole = membership?.role ?? 'owner';
        }
      }
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
    signIn: '/',
  },
});
