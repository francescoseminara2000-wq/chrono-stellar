import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
    const res = await prisma.pushSubscription.deleteMany({
        where: { userId: null }
    });
    console.log('Deleted null-user subscriptions:', res.count);
    await prisma.$disconnect();
}

cleanup();
