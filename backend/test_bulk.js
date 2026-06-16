require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function run() {
    try {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!admin) {
            console.log('No admin found');
            return;
        }

        const token = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET || 'super-secret-key-change-me', { expiresIn: '7d' });
        console.log('Got token');

        const res = await fetch('http://127.0.0.1:3001/api/admin/products/bulk', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ids: [1], data: { isAvailable: true } })
        });
        const data = await res.json();
        console.log('Response:', res.status, data);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}


run();
