import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  if (await prisma.hub.count()) return console.log('Hub already seeded');
  const hub = await prisma.hub.create({ data: {
    name: 'Kiambu Central Solar Hub', operatorPhone: '+254700000000',
    occupiedCrates: 120, solarPowerWatts: 3840, batteryPercentage: 87, pcmHoursRemaining: 9.5,
  }});
  console.log('Seeded hub', hub.id);
})().finally(() => prisma.$disconnect());
