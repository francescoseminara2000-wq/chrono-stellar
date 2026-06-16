import { PrismaClient, UnitType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create Users
    const user = await prisma.user.upsert({
        where: { email: 'cliente@test.com' },
        update: {},
        create: {
            email: 'cliente@test.com',
            name: 'Mario Rossi',
        },
    });

    // Create Admin User
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@butti.com' },
        update: {},
        create: {
            email: 'admin@butti.com',
            name: 'Alessandra Admin',
            password: hashedAdminPassword,
            role: 'ADMIN',
        },
    });
    console.log({ admin });

    // Create Products
    const products = [
        {
            name: 'Anguria (Intera)',
            description: 'Dolce e succosa, perfetta per l\'estate. Venduta a peso, prezzo stimato per frutto di 4-6kg.',
            priceCents: 99, // 0.99 al KG
            unitType: UnitType.KG,
            isVariableWeight: true,
            stepAmount: 1,
            seasonalTips: 'Ottima per macedonie o frullati rinfrescanti. Conservare in frigo dopo il taglio.',
            imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=800&auto=format&fit=crop',
            isAvailable: true
        },
        {
            name: 'Mele Fuji',
            description: 'Croccanti e dolcissime, ideali per bambini e torte.',
            priceCents: 250, // 2.50 al KG
            unitType: UnitType.KG,
            isVariableWeight: true,
            stepAmount: 0.5,
            seasonalTips: 'Perfette cotte al forno con un pizzico di cannella.',
            imageUrl: 'https://images.unsplash.com/photo-1567306301408-9b74779a11af?q=80&w=800&auto=format&fit=crop',
            isAvailable: true
        },
        {
            name: 'Uova (Pacco da 6)',
            description: 'Uova fresche da allevamento a terra locale. Tuorlo giallo arancio intenso.',
            priceCents: 380, // 3.80 a pacco
            unitType: UnitType.BOX,
            isVariableWeight: false,
            stepAmount: 1,
            seasonalTips: 'Ideali per pasta fresca o frittate spumose.',
            imageUrl: 'https://images.unsplash.com/photo-1582722878654-02fd5f9ca90d?q=80&w=800&auto=format&fit=crop',
            isAvailable: true
        },
        {
            name: 'Zucchine Scure',
            description: 'Tengre e dolci, raccolte stamattina.',
            priceCents: 180,
            unitType: UnitType.KG,
            isVariableWeight: true,
            stepAmount: 0.5,
            seasonalTips: 'Provatele grigliate o crude in insalata tagliate a julienne.',
            imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop',
            isAvailable: true
        }
    ];

    for (const p of products) {
        await prisma.product.create({
            data: p,
        });
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
