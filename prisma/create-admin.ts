import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@shivfurniture.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if admin already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists:', email);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
