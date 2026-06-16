const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'noreply@ortofruttabutti.it';
    const password = 'AdminOrtofrutta2026!'; // Generic secure password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'ADMIN',
            password: hashedPassword,
            name: 'Admin Centrale',
            isEmailVerified: true
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Admin Centrale',
            role: 'ADMIN',
            isEmailVerified: true,
            notificationPreference: 'EMAIL',
            phone: '+39 0000000000',
            street: 'Via Roma',
            civic: '1',
            city: 'Milano',
            zipCode: '20100'
        },
    });

    console.log(`Admin user created/updated!`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${user.role}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
