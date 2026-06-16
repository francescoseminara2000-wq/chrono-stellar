import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const subs = await prisma.pushSubscription.count();
        console.log('Push Subscriptions:', subs);

        const users = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        console.log('Admin users:', users.length);

        const productsWithBadUrls = await prisma.product.findMany({
            where: {
                imageUrl: { contains: '192.168' }
            },
            select: { id: true, name: true, imageUrl: true }
        });
        console.log('Products with hardcoded IP:', JSON.stringify(productsWithBadUrls, null, 2));

        const productsWithPort3000 = await prisma.product.findMany({
            where: {
                imageUrl: { contains: ':3000' }
            },
            select: { id: true, name: true, imageUrl: true }
        });
        console.log('Products with port 3000:', JSON.stringify(productsWithPort3000, null, 2));

    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
