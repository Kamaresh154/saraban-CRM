const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'kamaresh15.4@gmail.com';
  console.log(`Verifying user: ${email}`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('User not found');
    return process.exitCode = 2;
  }

  if (user.emailVerified) {
    console.log('User already verified');
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null },
    });
    console.log('User verification status set to true');
  }

  // Print current status
  const refreshed = await prisma.user.findUnique({ where: { email } });
  console.log('Current emailVerified:', refreshed.emailVerified);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
