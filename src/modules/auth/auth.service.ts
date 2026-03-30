import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import type { Role } from '@prisma/client';
import { Errors } from '@/middleware/errorHandler';

interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: Role;
  pincode?: string;
  businessName?: string;
  gstNumber?: string;
}

export class AuthService {
  async signup(input: SignupInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.email },
          ...(input.phone ? [{ phone: input.phone }] : []),
        ],
      },
    });

    if (existing) {
      throw Errors.duplicate(
        existing.email === input.email ? 'Email' : 'Phone'
      );
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    // All users start as 'customer' — vendors get promoted after admin approval
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        fullName: input.fullName,
        phone: input.phone,
        role: 'customer',
        pincode: input.pincode,
        businessName: input.businessName,
        gstNumber: input.gstNumber,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        pincode: true,
        businessName: true,
      },
    });

    // If user applied as vendor, create a Vendor record (unverified, inactive)
    // Admin will review and approve via /admin/approvals
    if (input.role === 'vendor') {
      const businessName = input.businessName || input.fullName;
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + user.id.slice(0, 8);

      await prisma.vendor.create({
        data: {
          userId: user.id,
          businessName,
          slug,
          isVerified: false,
          isActive: false,
        },
      });
    }

    emitEvent('UserRegistered', {
      userId: user.id,
      email: user.email,
      role: input.role || 'customer',
    });

    return user;
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        pincode: true,
        businessName: true,
        gstNumber: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) throw Errors.notFound('User');
    return user;
  }

  async updateProfile(
    userId: string,
    data: Partial<{
      fullName: string;
      phone: string;
      pincode: string;
      businessName: string;
      gstNumber: string;
      image: string;
    }>
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        pincode: true,
        businessName: true,
        gstNumber: true,
        image: true,
      },
    });
  }
}
