import app from './app';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function main() {
    try {
        // Connect to DB
        await prisma.$connect();
        console.log('Connected to database');

        const PORT = Number(process.env.PORT) || 3001;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT} (all interfaces)`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();
