const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('SUCCESS: PostgreSQL is running and connected!');
    const users = await prisma.user.count();
    console.log('Total users in DB:', users);
  } catch (err) {
    console.error('ERROR: Could not connect to PostgreSQL!');
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

