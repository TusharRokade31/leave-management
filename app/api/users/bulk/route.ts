import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/welcomeemail';
import { parse } from 'csv-parse/sync';
import { authenticateToken } from '@/lib/auth';


// Generate random password
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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const resetExisting = formData.get('resetExisting') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const fileContent = await file.text();
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = {
      success: [] as string[],
      failed: [] as { email: string; reason: string }[],
      reset: [] as string[],
    };

    // Process each user
    for (const record of records) {
        const { name, email, role } = record as { name: string; email: string; role: string; reason: string };


      if (!name || !email) {
        results.failed.push({
          email: email || 'unknown',
          reason: 'Missing name or email',
        });
        continue;
      }

      try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        const tempPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        if (existingUser) {
          if (resetExisting) {
            // Reset existing user's password
            await prisma.user.update({
              where: { email },
              data: { password: hashedPassword },
            });

            await sendWelcomeEmail(email, name, tempPassword);
            results.reset.push(email);
          } else {
            results.failed.push({
              email,
              reason: 'User already exists',
            });
          }
        } else {
          // Create new user
          await prisma.user.create({
            data: {
              name,
              email,
              password: hashedPassword,
              role: role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE',
            },
          });

          await sendWelcomeEmail(email, name, tempPassword);
          results.success.push(email);
        }
      } catch (error) {
        console.error(`Error processing ${email}:`, error);
        results.failed.push({
          email,
          reason: 'Processing error',
        });
      }
    }

    return NextResponse.json({
      message: 'Bulk user creation completed',
      results,
    });
  } catch (error) {
    console.error('Bulk creation error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);

    // Only managers should be able to fetch the full employee list
    if (authUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(employees);
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}