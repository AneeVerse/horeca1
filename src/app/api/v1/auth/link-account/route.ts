import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/auth';

/**
 * POST /api/v1/auth/link-account
 * Verify credentials for another account and create a bidirectional link.
 * No signIn() is called — current session is untouched.
 */
export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password are required' },
      { status: 400 }
    );
  }

  // Can't link to yourself
  if (email === ctx.email) {
    return NextResponse.json(
      { success: false, error: 'Cannot link your own account' },
      { status: 400 }
    );
  }

  // Verify the target account credentials
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, role: true, password: true, isActive: true },
  });

  if (!targetUser || !targetUser.password || !targetUser.isActive) {
    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  const isValid = await bcrypt.compare(password, targetUser.password);
  if (!isValid) {
    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  // Only vendor accounts can be linked
  if (targetUser.role !== 'vendor') {
    return NextResponse.json(
      { success: false, error: 'Only vendor accounts can be linked' },
      { status: 400 }
    );
  }

  // Check if already linked
  const existing = await prisma.linkedAccount.findUnique({
    where: { userId_linkedUserId: { userId: ctx.userId, linkedUserId: targetUser.id } },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'This account is already linked' },
      { status: 409 }
    );
  }

  // Create bidirectional links in a transaction
  await prisma.$transaction([
    prisma.linkedAccount.create({
      data: { userId: ctx.userId, linkedUserId: targetUser.id },
    }),
    prisma.linkedAccount.create({
      data: { userId: targetUser.id, linkedUserId: ctx.userId },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.fullName,
      role: targetUser.role,
    },
  });
});
