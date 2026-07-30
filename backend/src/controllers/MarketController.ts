import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class MarketController {
    // Get all markets. Seed default ones if empty.
    async list(req: Request, res: Response) {
        try {
            let markets = await prisma.itinerantMarket.findMany({
                orderBy: { dayNum: 'asc' }
            });

            if (markets.length === 0) {
                console.log('Seeding default itinerant markets...');
                const defaultMarkets = [
                    {
                        dayNum: 1,
                        dayName: 'Lunedì',
                        location: 'Magreglio',
                        province: 'CO',
                        details: 'Piazza Roma / Centro',
                        hours: '08:00 - 13:00',
                        description: 'Il nostro inizio settimana nel cuore del Triangolo Lariano. Trovate frutta fresca di stagione e verdure selezionate a pochi passi dalla piazza centrale.',
                        googleMapsUrl: 'https://maps.google.com/?q=Magreglio',
                        imageUrl: 'https://images.unsplash.com/photo-1488459718432-01055e67e1f5?q=80&w=800&auto=format&fit=crop'
                    },
                    {
                        dayNum: 2,
                        dayName: 'Martedì',
                        location: 'Malgrate',
                        province: 'LC',
                        details: 'Zona Lungolago / Piazza Garibaldi',
                        hours: '08:00 - 13:00',
                        description: 'Un mercato panoramico proprio in riva al lago di Como. I migliori ortaggi e specialità ortofrutticole vi aspettano a Malgrate.',
                        googleMapsUrl: 'https://maps.google.com/?q=Malgrate',
                        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop'
                    },
                    {
                        dayNum: 3,
                        dayName: 'Mercoledì',
                        location: 'Santa Maria Hoè',
                        province: 'LC',
                        details: 'Piazza Padre Fausto Tentorio',
                        hours: '08:00 - 13:00',
                        description: 'Nel cuore della Brianza lecchese, portiamo la freschezza quotidiana direttamente sulla tavola di Santa Maria Hoè.',
                        googleMapsUrl: 'https://maps.google.com/?q=Santa+Maria+Hoe',
                        imageUrl: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=800&auto=format&fit=crop'
                    },
                    {
                        dayNum: 4,
                        dayName: 'Giovedì',
                        location: 'Valmadrera',
                        province: 'LC',
                        details: 'Area Mercato, Via Casnedi',
                        hours: '08:00 - 13:00',
                        description: 'Uno dei nostri appuntamenti più grandi e storici della settimana. Banco fornitissimo con primizie freschissime e offerte speciali.',
                        googleMapsUrl: 'https://maps.google.com/?q=Valmadrera+Via+Casnedi',
                        imageUrl: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?q=80&w=800&auto=format&fit=crop'
                    },
                    {
                        dayNum: 5,
                        dayName: 'Venerdì',
                        location: 'Vederio Inferiore',
                        province: 'LC',
                        details: 'Area Mercato Comunale',
                        hours: '08:00 - 13:00',
                        description: 'Il venerdì ci trovate a Vederio Inferiore, pronti per servirvi le nostre cassette cariche di gusto e benessere per il fine settimana.',
                        googleMapsUrl: 'https://maps.google.com/?q=Vederio+Inferiore+LC',
                        imageUrl: 'https://images.unsplash.com/photo-1473081556163-2a17de81fc97?q=80&w=800&auto=format&fit=crop'
                    },
                    {
                        dayNum: 6,
                        dayName: 'Sabato',
                        location: 'Caponago',
                        province: 'MB',
                        details: 'Piazza della Pace',
                        hours: '08:00 - 13:00',
                        description: 'La spesa del sabato mattina a Caponago, nella provincia di Monza e Brianza. La freschezza di Ortofrutta Butti a km 0 per il pranzo domenicale.',
                        googleMapsUrl: 'https://maps.google.com/?q=Caponago+Piazza+della+Pace',
                        imageUrl: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?q=80&w=800&auto=format&fit=crop'
                    }
                ];

                for (const m of defaultMarkets) {
                    await prisma.itinerantMarket.create({ data: m });
                }

                markets = await prisma.itinerantMarket.findMany({
                    orderBy: { dayNum: 'asc' }
                });
            }

            res.json(markets);
        } catch (error: any) {
            console.error('[MarketController] Error listing markets:', error);
            res.status(500).json({ error: 'Failed to fetch markets' });
        }
    }

    // Create a new market
    async create(req: Request, res: Response) {
        try {
            const { dayNum, dayName, location, province, details, hours, description, googleMapsUrl, imageUrl } = req.body;

            const newMarket = await prisma.itinerantMarket.create({
                data: {
                    dayNum: parseInt(dayNum, 10),
                    dayName,
                    location,
                    province,
                    details,
                    hours,
                    description,
                    googleMapsUrl,
                    imageUrl
                }
            });

            res.status(201).json(newMarket);
        } catch (error: any) {
            console.error('[MarketController] Error creating market:', error);
            res.status(500).json({ error: 'Failed to create market' });
        }
    }

    // Update an existing market
    async update(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id, 10);
            const { dayNum, dayName, location, province, details, hours, description, googleMapsUrl, imageUrl } = req.body;

            const updatedMarket = await prisma.itinerantMarket.update({
                where: { id },
                data: {
                    dayNum: dayNum ? parseInt(dayNum, 10) : undefined,
                    dayName,
                    location,
                    province,
                    details,
                    hours,
                    description,
                    googleMapsUrl,
                    imageUrl
                }
            });

            res.json(updatedMarket);
        } catch (error: any) {
            console.error('[MarketController] Error updating market:', error);
            res.status(500).json({ error: 'Failed to update market' });
        }
    }

    // Delete a market
    async delete(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id, 10);
            await prisma.itinerantMarket.delete({ where: { id } });
            res.json({ success: true });
        } catch (error: any) {
            console.error('[MarketController] Error deleting market:', error);
            res.status(500).json({ error: 'Failed to delete market' });
        }
    }
}
