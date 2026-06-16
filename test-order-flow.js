const http = require('http');

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFullFlow() {
    const randomEmail = `test.user.${Date.now()}@example.com`;
    console.log(`[1] Testing Registration for ${randomEmail}...`);

    // 1. Register
    const regRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Order Tester',
            email: randomEmail,
            password: 'password123',
            phone: '+39 1234567890',
            street: 'Via Nazioni Unite',
            civic: '42',
            city: 'Rome',
            zipCode: '00100'
        })
    });

    const regData = await regRes.json();
    console.log('Registration Response:', regRes.status, regData);

    const userId = regData.userId;
    if (!userId) {
        console.error('Registration failed to return userId');
        return;
    }

    // Since we need to be logged in and verified to create an order, we will bypass the validation
    // by directly creating an order using the API without auth if possible, or by updating the DB.
    // For simplicity, I'll update the user directly in the DB to be verified and then login.
    console.log('[2] Manually verifying user in DB...');
    const { PrismaClient } = require('./backend/node_modules/@prisma/client');
    const prisma = new PrismaClient();
    await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true }
    });

    console.log('[3] Logging in...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: randomEmail,
            password: 'password123'
        })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginRes.status);
    const token = loginData.token;

    console.log('[4] Creating an order...');
    const orderRes = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            items: [
                { id: 1, quantity: 2, priceAtTime: 1500, requiresWeight: false, originalWeight: null }
            ],
            shippingCost: 500,
            estimatedTotal: 3500,
            deliveryDate: '2026-03-01T12:00:00Z',
            deliveryZoneId: 1,
            shippingAddress: 'Via Nazioni Unite 42, Rome',
            notes: '',
            customerName: 'Order Tester',
            customerEmail: randomEmail,
            customerPhone: '+39 1234567890',
            paymentMethod: 'COD'
        })
    });
    const orderData = await orderRes.json();
    console.log('Order Response:', orderRes.status, orderData);

    await prisma.$disconnect();
}

testFullFlow().catch(console.error);
