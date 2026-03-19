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

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        fullName: input.fullName,
        phone: input.phone,
        role: input.role || 'customer',
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

    emitEvent('UserRegistered', {
      userId: user.id,
      email: user.email,
      role: user.role,
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
