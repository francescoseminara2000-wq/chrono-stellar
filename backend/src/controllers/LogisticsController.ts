import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { 
    formatDateInRome, 
    getHourInRome, 
    getDayOfWeekInRome, 
    addDaysInRome 
} from '../utils/date';
import { WhatsAppService } from '../services/WhatsAppService';
import { EmailService } from '../services/EmailService';

export class LogisticsController {
    
    // Public: Get available dates for checkout
    async getAvailableDates(req: Request, res: Response) {
        try {
            const { method, city } = req.query;

            if (method !== 'DELIVERY' && method !== 'PICKUP') {
                return res.status(400).json({ error: "Metodo di consegna non valido. Deve essere 'DELIVERY' o 'PICKUP'." });
            }

            const now = new Date();
            const hourInRome = getHourInRome(now);
            
            // Fetch settings for configured cutoff hours
            const settings = await prisma.storeSettings.findUnique({ where: { id: 1 } });
            const pickupCutoff = settings?.pickupCutoffHour ?? 12;
            const deliveryCutoff = settings?.deliveryCutoffHour ?? 12;
            const cutoffHour = method === 'PICKUP' ? pickupCutoff : deliveryCutoff;
            
            // If current time in Rome is past cutoff, shift start date to tomorrow
            const startFrom = hourInRome >= cutoffHour ? addDaysInRome(now, 1) : now;
            
            // Fetch all global closures
            const globalClosures = await prisma.logisticsClosure.findMany({
                where: { type: 'GLOBAL' }
            });
            const globalClosedDates = new Set(globalClosures.map(c => c.date));

            const daysOfWeekIt = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
            const monthsIt = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

            const availableDates: Array<{ date: string; label: string }> = [];

            if (method === 'PICKUP') {
                // For Shop Pickup, we scan the next 5 days
                let daysChecked = 0;
                let candidatesFound = 0;
                
                while (candidatesFound < 5 && daysChecked < 30) {
                    const candidateDate = addDaysInRome(startFrom, daysChecked);
                    const dateStr = formatDateInRome(candidateDate);
                    
                    if (!globalClosedDates.has(dateStr)) {
                        const dayOfWeek = getDayOfWeekInRome(candidateDate);
                        
                        // Formatta l'etichetta in italiano
                        const partsFormatter = new Intl.DateTimeFormat('en-US', {
                            timeZone: 'Europe/Rome',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                        const parts = partsFormatter.formatToParts(candidateDate);
                        const dayNum = parseInt(parts.find(p => p.type === 'day')!.value, 10);
                        const monthNum = parseInt(parts.find(p => p.type === 'month')!.value, 10) - 1;
                        
                        let label = `${daysOfWeekIt[dayOfWeek]}, ${dayNum} ${monthsIt[monthNum]}`;
                        const todayStr = formatDateInRome(now);
                        const tomorrowStr = formatDateInRome(addDaysInRome(now, 1));
                        
                        if (dateStr === todayStr) {
                            label = `Oggi (${label})`;
                        } else if (dateStr === tomorrowStr) {
                            label = `Domani (${label})`;
                        }

                        availableDates.push({ date: dateStr, label });
                        candidatesFound++;
                    }
                    daysChecked++;
                }
            } else {
                // Method is DELIVERY
                if (!city) {
                    return res.status(400).json({ error: "Il Comune è richiesto per calcolare le date di consegna." });
                }

                const zone = await prisma.deliveryZone.findFirst({
                    where: { city: String(city), isActive: true }
                });

                if (!zone) {
                    return res.status(404).json({ error: "Zona di consegna non trovata o non attiva." });
                }

                // Fetch zone-specific closures
                const zoneClosures = await prisma.logisticsClosure.findMany({
                    where: { type: 'ZONE', deliveryZoneId: zone.id }
                });
                const zoneClosedDates = new Set(zoneClosures.map(c => c.date));

                // Parse active delivery days (default: 1,2,3,4,5,6 - Mon to Sat)
                const deliveryDays = zone.deliveryDays
                    ? zone.deliveryDays.split(',').map(Number)
                    : [1, 2, 3, 4, 5, 6];

                let daysChecked = 0;
                let candidatesFound = 0;

                while (candidatesFound < 10 && daysChecked < 60) {
                    const candidateDate = addDaysInRome(startFrom, daysChecked);
                    const dateStr = formatDateInRome(candidateDate);

                    // Skip if global closure or zone-specific closure
                    if (!globalClosedDates.has(dateStr) && !zoneClosedDates.has(dateStr)) {
                        const dayOfWeek = getDayOfWeekInRome(candidateDate);

                        // Check if this weekday is active for delivery
                        if (deliveryDays.includes(dayOfWeek)) {
                            const partsFormatter = new Intl.DateTimeFormat('en-US', {
                                timeZone: 'Europe/Rome',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            });
                            const parts = partsFormatter.formatToParts(candidateDate);
                            const dayNum = parseInt(parts.find(p => p.type === 'day')!.value, 10);
                            const monthNum = parseInt(parts.find(p => p.type === 'month')!.value, 10) - 1;

                            let label = `${daysOfWeekIt[dayOfWeek]}, ${dayNum} ${monthsIt[monthNum]}`;
                            const todayStr = formatDateInRome(now);
                            const tomorrowStr = formatDateInRome(addDaysInRome(now, 1));
                            
                            if (dateStr === todayStr) {
                                label = `Oggi (${label})`;
                            } else if (dateStr === tomorrowStr) {
                                label = `Domani (${label})`;
                            }

                            availableDates.push({ date: dateStr, label });
                            candidatesFound++;
                        }
                    }
                    daysChecked++;
                }
            }

            res.json(availableDates);
        } catch (error: any) {
            console.error('Error calculating available dates:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Admin: List all closures
    async listClosures(req: Request, res: Response) {
        try {
            const closures = await prisma.logisticsClosure.findMany({
                include: { deliveryZone: true },
                orderBy: { date: 'asc' }
            });
            res.json(closures);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Admin: Create a closure and detect conflicts
    async createClosure(req: Request, res: Response) {
        try {
            const { date, type, deliveryZoneId } = req.body;

            if (!date || !type) {
                return res.status(400).json({ error: "Data e tipo di blocco sono obbligatori." });
            }

            // Create the closure
            const closure = await prisma.logisticsClosure.create({
                data: {
                    date,
                    type,
                    deliveryZoneId: type === 'ZONE' ? Number(deliveryZoneId) : null
                },
                include: {
                    deliveryZone: true
                }
            });

            // Proactive warning for existing orders
            // Query active orders on this date
            const activeOrders = await prisma.order.findMany({
                where: {
                    scheduledDate: date,
                    status: { in: ['PENDING', 'WEIGHING_COMPLETED', 'OUT_FOR_DELIVERY'] }
                }
            });

            let affectedOrders = activeOrders;

            if (type === 'ZONE' && closure.deliveryZone) {
                // Filter delivery orders that are in the affected zone's city
                const city = closure.deliveryZone.city.toLowerCase();
                affectedOrders = activeOrders.filter(o => 
                    o.deliveryMethod === 'DELIVERY' && 
                    o.shippingAddress && 
                    o.shippingAddress.toLowerCase().includes(city)
                );
            }

            // If there are affected orders, create an admin notification
            if (affectedOrders.length > 0) {
                const orderIdsStr = affectedOrders.map(o => `#${o.id}`).join(', ');
                const zoneInfo = type === 'GLOBAL' ? 'Globale' : `Comune: ${closure.deliveryZone?.city}`;
                const notificationMessage = `Il blocco logistico inserito per il ${date} (${zoneInfo}) impatta ${affectedOrders.length} ordini attivi: ${orderIdsStr}. Contatta i clienti per riprogrammare.`;
                
                await prisma.notification.create({
                    data: {
                        type: 'LOGISTICS_CONFLICT',
                        title: 'Conflitto Blocco Logistico',
                        message: notificationMessage
                    }
                });
            }

            res.status(201).json({
                closure,
                affectedOrdersCount: affectedOrders.length,
                affectedOrders: affectedOrders.map(o => ({ id: o.id, customerName: o.customerName, customerPhone: o.customerPhone, deliveryMethod: o.deliveryMethod }))
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                return res.status(400).json({ error: "Esiste già un blocco logistico configurato per questa data e zona." });
            }
            console.error('Error creating closure:', error);
            res.status(400).json({ error: error.message });
        }
    }

    // Admin: Delete a closure
    async deleteClosure(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ error: "ID blocco non valido." });
            }

            await prisma.logisticsClosure.delete({
                where: { id }
            });

            res.json({ message: "Blocco logistico rimosso con successo." });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // Admin: Define/vary appointment date/time for an order
    async updateOrderSchedule(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const { scheduledDate, scheduledTime } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: "ID ordine non valido." });
            }

            const updatedOrder = await prisma.order.update({
                where: { id },
                data: {
                    scheduledDate,
                    scheduledTime
                },
                include: {
                    items: {
                        include: { product: true }
                    }
                }
            });

            // Trigger notification about schedule change
            if (updatedOrder.customerPhone || updatedOrder.customerEmail) {
                const customerName = updatedOrder.customerName || 'Cliente';
                const formattedDate = scheduledDate ? scheduledDate.split('-').reverse().join('/') : '';
                const timeStr = scheduledTime ? ` alle ${scheduledTime}` : '';
                
                // WhatsApp
                const whatsAppService = WhatsAppService.getInstance();
                const waStatus = whatsAppService.getStatus();
                const textMessage = `Ciao ${customerName}, l'orario del tuo ordine #${updatedOrder.id} è stato programmato per il ${formattedDate}${timeStr}. A presto!`;
                
                if (waStatus.isConnected && updatedOrder.customerPhone) {
                    try {
                        await whatsAppService.sendMessage(updatedOrder.customerPhone, textMessage);
                    } catch (waError) {
                        console.error('Failed to send schedule update WA:', waError);
                    }
                }

                // Email
                if (updatedOrder.customerEmail) {
                    try {
                        const emailService = new EmailService();
                        const emailSubject = `Programmazione Ordine #${updatedOrder.id} - Chrono Stellar`;
                        const emailHtml = `
                            <p>Ciao ${customerName},</p>
                            <p>Ti informiamo che la consegna/ritiro del tuo ordine <strong>#${updatedOrder.id}</strong> è stata pianificata per il giorno:</p>
                            <div style="background-color: #f8faf7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; font-size: 16px;">
                                <strong>Data:</strong> ${formattedDate}<br>
                                <strong>Orario:</strong> ${scheduledTime || 'Da concordare'}
                            </div>
                            <p>A presto,<br>Il Team di Chrono Stellar</p>
                        `;
                        await emailService.sendMail(updatedOrder.customerEmail, emailSubject, emailHtml);
                    } catch (emailError) {
                        console.error('Failed to send schedule update Email:', emailError);
                    }
                }
            }

            res.json(updatedOrder);
        } catch (error: any) {
            console.error('Error updating order schedule:', error);
            res.status(400).json({ error: error.message });
        }
    }

    // Admin: Get logistics dashboard grouping orders
    async getLogisticsDashboard(req: Request, res: Response) {
        try {
            // Get active zones to help match cities
            const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });
            const zoneCities = zones.map(z => z.city.toLowerCase());

            // Get active orders
            const orders = await prisma.order.findMany({
                where: {
                    status: { in: ['PENDING', 'WEIGHING_COMPLETED', 'OUT_FOR_DELIVERY'] }
                },
                include: {
                    items: {
                        include: { product: true }
                    }
                },
                orderBy: [
                    { scheduledDate: 'asc' },
                    { scheduledTime: 'asc' }
                ]
            });

            // Grouping structure: Record<date, Record<city, Order[]>>
            const grouped: Record<string, Record<string, any[]>> = {};

            orders.forEach(order => {
                const dateKey = order.scheduledDate || 'Non Pianificato';
                
                let cityKey = 'Ritiro in Negozio';
                if (order.deliveryMethod === 'DELIVERY' && order.shippingAddress) {
                    const addressLower = order.shippingAddress.toLowerCase();
                    // Try to find matching city in delivery zones
                    const matchedCity = zones.find(z => addressLower.includes(z.city.toLowerCase()));
                    if (matchedCity) {
                        cityKey = matchedCity.city;
                    } else {
                        // Fallback: extract last word or check CAP
                        // Check if standard formatting CAP City exists
                        const match = order.shippingAddress.match(/-\s*\d{5}\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)$/);
                        if (match && match[1]) {
                            cityKey = match[1].trim();
                        } else {
                            cityKey = 'Altro / Non Specificato';
                        }
                    }
                }

                if (!grouped[dateKey]) {
                    grouped[dateKey] = {};
                }
                if (!grouped[dateKey][cityKey]) {
                    grouped[dateKey][cityKey] = [];
                }
                
                grouped[dateKey][cityKey].push(order);
            });

            // Convert grouped record to sorted array format for frontend
            // [ { date: '2026-06-19', groups: [ { city: 'Valmadrera', orders: [...] } ] } ]
            const result = Object.entries(grouped).map(([date, citiesRecord]) => {
                const groups = Object.entries(citiesRecord).map(([city, ordersList]) => ({
                    city,
                    orders: ordersList
                }));
                return {
                    date,
                    groups
                };
            });

            res.json(result);
        } catch (error: any) {
            console.error('Error generating logistics dashboard:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
