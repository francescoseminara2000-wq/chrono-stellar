const http = require('http');

async function testFlow() {
    console.log('Testing Registration...');
    const regRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Tester',
            email: 'test.tester@example.com',
            password: 'password123',
            phone: '+39 1234567890',
            street: 'Via Roma',
            civic: '1',
            city: 'Milan',
            zipCode: '20100'
        })
    });

    const regData = await regRes.json();
    console.log('Registration Response:', regRes.status, regData);

    console.log('\nTesting Login without verification...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'test.tester@example.com',
            password: 'password123'
        })
    });

    const loginData = await loginRes.json();
    console.log('Login Response:', loginRes.status, loginData);

    console.log('\nTesting Forgot Password...');
    const forgotRes = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'test.tester@example.com'
        })
    });
    const forgotData = await forgotRes.json();
    console.log('Forgot Password Response:', forgotRes.status, forgotData);
}

testFlow().catch(console.error);
