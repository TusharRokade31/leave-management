import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a manager user
  const hashedPassword = await bcrypt.hash('Manager@123', 10);
  
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      name: 'Admin Manager',
      email: 'manager@example.com',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  console.log('✅ Manager created:', manager.email);
  
  // Create an employee user
  const empPassword = await bcrypt.hash('Employee@123', 10);
  
  const employee = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {},
    create: {
      name: 'Test Employee',
      email: 'employee@example.com',
      password: empPassword,
      role: 'EMPLOYEE',
    },
  });

  console.log('✅ Employee created:', employee.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });