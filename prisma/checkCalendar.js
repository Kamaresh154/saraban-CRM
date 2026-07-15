const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'kamaresh15.4@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found:', email);
    return process.exitCode = 2;
  }
  const sync = await prisma.calendarSync.findFirst({ where: { userId: user.id } });
  console.log('User:', user.email, 'id:', user.id);
  console.log('CalendarSync record:', sync);
}

main().finally(() => prisma.$disconnect());
