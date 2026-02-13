import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/welcomeemail';

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    if (!authUser || authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized: Manager access required' }, { status: 403 });
    }

    const { name, email, role } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const tempPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'EMPLOYEE',
      },
    });

    await sendWelcomeEmail(email, name, tempPassword);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("POST Error:", error.message);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);
    if (!authUser || authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, name, endDate } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // --- STRIP TIMESTAMP & LOCK PERSISTENCE ---
    // We force the incoming string to UTC Midnight.
    // This removes time components so it behaves strictly as a date.
    let validatedDate: Date | null = null;
    if (endDate) {
      const d = new Date(endDate); // Parses YYYY-MM-DD
      if (!isNaN(d.getTime())) {
        // Force to UTC Midnight: effectively removing the timestamp for persistence
        validatedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        name: name,
        // Using conditional spread to only update endDate if it was provided
        ...(endDate !== undefined && { endDate: validatedDate }),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("PATCH Error:", error.message);
    return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
  }
}