const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting CRM database to a clean state...');
  
  // 1. Delete dependent tables
  await prisma.activity.deleteMany({});
  await prisma.followUp.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.savedFilter.deleteMany({});
  await prisma.calendarSync.deleteMany({});
  
  // 2. Delete all leads
  await prisma.lead.deleteMany({});
  
  // 3. Delete all users except the admin
  const adminEmail = 'ramyaa1304@gmail.com';
  await prisma.user.deleteMany({
    where: {
      email: {
        not: adminEmail
      }
    }
  });

  console.log('Database cleanup finished successfully! All tables cleaned except Admin user.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
