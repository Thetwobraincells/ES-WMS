const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const drivers = await p.user.findMany({
    where: { role: 'DRIVER' },
    select: { id: true, name: true, mobile: true, role: true }
  });
  console.log('Drivers:', JSON.stringify(drivers, null, 2));
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
