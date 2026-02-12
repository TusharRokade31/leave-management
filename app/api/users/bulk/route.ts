import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/welcomeemail';
import { parse } from 'csv-parse/sync';
import { authenticateToken } from '@/lib/auth';

// 1. Define the interface for the CSV row to fix TypeScript errors
interface CSVUserRecord {
  name?: string;
  fullname?: string;
  email?: string;
  role?: string;
}

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

    const fileContent = await file.text();
    
    // The columns function here ensures all headers become lowercase
    const records = parse(fileContent, {
      columns: (header: string[]) => 
        header.map(h => h.toLowerCase().trim()), 
      skip_empty_lines: true,
      trim: true,
      bom: true, 
    }) as CSVUserRecord[]; // 2. Cast the result to our interface

    const results = {
      success: [] as string[],
      failed: [] as { email: string; reason: string }[],
      reset: [] as string[],
    };

    for (const record of records) {
      // 3. Logic simplified: headers are already lowercase thanks to the parser config
      const name = record.name || record.fullname;
      const email = record.email;
      const role = (record.role || 'EMPLOYEE').toUpperCase().trim();

      if (!name || !email) {
        results.failed.push({
          email: email || 'Row ' + (records.indexOf(record) + 1),
          reason: 'Missing name or email (Required headers: name, email)',
        });
        continue;
      }

      try {
        const emailLower = email.toLowerCase().trim();
        
        const existingUser = await prisma.user.findUnique({
          where: { email: emailLower },
        });

        const tempPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        if (existingUser) {
          if (resetExisting) {
            await prisma.user.update({
              where: { email: emailLower },
              data: { 
                password: hashedPassword,
                name: name.trim() 
              },
            });

            await sendWelcomeEmail(emailLower, name, tempPassword);
            results.reset.push(emailLower);
          } else {
            results.failed.push({
              email: emailLower,
              reason: 'User already exists',
            });
          }
        } else {
          await prisma.user.create({
            data: {
              name: name.trim(),
              email: emailLower,
              password: hashedPassword,
              role: role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE',
            },
          });

          await sendWelcomeEmail(emailLower, name, tempPassword);
          results.success.push(emailLower);
        }
      } catch (error) {
        console.error(`Error processing ${email}:`, error);
        results.failed.push({
          email: email || 'unknown',
          reason: 'Database processing error',
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
      { error: 'CSV Parsing Error: Please check your file format.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateToken(req);

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