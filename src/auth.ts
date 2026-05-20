import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { loadActiveContext, type ActiveContext } from '@/lib/activeContext';

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

        const record = await prisma.otpCode.findFirst({
          where: usePhone
            ? { phone, used: false, expiresAt: { gt: new Date() } }
            : { email: loginEmail, used: false, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        });
        if (!record || record.code !== code) return null;

        await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });

        let user = usePhone
          ? await prisma.user.findUnique({
              where: { phone },
              select: { id: true, email: true, fullName: true, role: true, image: true, isActive: true },
            })
          : await prisma.user.findUnique({
              where: { email: loginEmail },
              select: { id: true, email: true, fullName: true, role: true, image: true, isActive: true },
            });

        if (useEmail && !user) return null;

        if (!user && usePhone) {
          const fullName = String(credentials?.fullName ?? '').trim() || phone;
          const businessName = String(credentials?.businessName ?? '').trim() || null;
          const rawEmail = String(credentials?.email ?? '').trim().toLowerCase();
          const email = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;
          const role = credentials?.role === 'vendor' ? 'vendor' : 'customer';

          const emailTaken = email
            ? !!(await prisma.user.findUnique({ where: { email }, select: { id: true } }))
            : false;
          const finalEmail = emailTaken ? null : email;

          const rawPassword = String(credentials?.password ?? '');
          const passwordHash = rawPassword.length >= 6 ? await bcrypt.hash(rawPassword, 10) : null;

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

    // ── Phone-or-email + password ── (legacy linkedAccount switchToken path
    //    is kept for one release cycle so existing client code does not break;
    //    the new BusinessAccount switcher uses POST /api/v1/auth/switch-business-account.)
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Phone or email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        switchToken: { label: 'Switch Token', type: 'text' },
      },
      async authorize(credentials) {
        // Legacy switch-token flow (LinkedAccount). Removed when Step C drops the table.
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
    async jwt({ token, user, trigger, session: updatePayload }) {
      // First sign-in or fresh login
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'customer';
        if (token.role === 'admin') {
          const adminMembership = await prisma.adminTeamMember.findUnique({
            where: { userId: token.id as string },
            select: { role: true },
          });
          token.adminTeamRole = adminMembership?.role ?? 'owner';
        }
        // Pick the primary BusinessAccount + primary Outlet (V2.2)
        const active = await loadActiveContext(token.id as string, null, null);
        applyActiveContext(token, active);
      }

      // Session.update({ activeBusinessAccountId, activeOutletId }) — used by switch endpoints
      if (trigger === 'update' && token.id) {
        const u = (updatePayload ?? {}) as { activeBusinessAccountId?: string; activeOutletId?: string };
        const targetAccountId = u.activeBusinessAccountId ?? (token.activeBusinessAccountId as string | undefined) ?? null;
        const targetOutletId = u.activeOutletId ?? (token.activeOutletId as string | undefined) ?? null;
        const active = await loadActiveContext(token.id as string, targetAccountId, targetOutletId);
        applyActiveContext(token, active);

        // Refresh role + adminTeamRole on update too
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (freshUser) {
          token.role = freshUser.role;
          if (freshUser.role === 'admin') {
            const adminMembership = await prisma.adminTeamMember.findUnique({
              where: { userId: token.id as string },
              select: { role: true },
            });
            token.adminTeamRole = adminMembership?.role ?? 'owner';
          } else {
            token.adminTeamRole = undefined;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.id as string;
        u.role = token.role as string;
        if (token.adminTeamRole) u.adminTeamRole = token.adminTeamRole as string;
        if (token.hcidDisplay) u.hcidDisplay = token.hcidDisplay as string;
        if (token.activeBusinessAccountId) u.activeBusinessAccountId = token.activeBusinessAccountId as string;
        if (token.activeBusinessAccountType) u.activeBusinessAccountType = token.activeBusinessAccountType as Record<string, boolean>;
        if (token.activeOutletId) u.activeOutletId = token.activeOutletId as string;
        if (token.permissions) u.permissions = token.permissions as string[];
        if (token.availableAccounts) u.availableAccounts = token.availableAccounts as unknown[];
        if (typeof token.availableAccountsTruncated === 'boolean') u.availableAccountsTruncated = token.availableAccountsTruncated;
        if (typeof token.totalAccountCount === 'number') u.totalAccountCount = token.totalAccountCount;
      }
      return session;
    },
  },

  pages: {
    signIn: '/',
  },
});

// ─── helpers ────────────────────────────────────────────────────────────

function applyActiveContext(token: Record<string, unknown>, active: ActiveContext | null) {
  if (!active) {
    delete token.activeBusinessAccountId;
    delete token.activeBusinessAccountType;
    delete token.activeOutletId;
    delete token.permissions;
    delete token.availableAccounts;
    delete token.availableAccountsTruncated;
    delete token.totalAccountCount;
    return;
  }
  token.hcidDisplay = active.hcidDisplay;
  token.activeBusinessAccountId = active.activeBusinessAccountId;
  token.activeBusinessAccountType = active.activeBusinessAccountType;
  token.activeOutletId = active.activeOutletId;
  token.permissions = active.permissions;
  token.availableAccounts = active.availableAccounts;
  token.availableAccountsTruncated = active.availableAccountsTruncated;
  token.totalAccountCount = active.totalAccountCount;
}
