import { Request, Response } from 'express';
import { WhatsAppService } from '../services/WhatsAppService';

export class WhatsAppController {

    async getStatus(req: Request, res: Response) {
        const service = WhatsAppService.getInstance();
        const status = await service.checkOrPromoteReady();
        res.json(status);
    }

    async getLogs(req: Request, res: Response) {
        const service = WhatsAppService.getInstance();
        const status = await service.checkOrPromoteReady();
        res.json({
            status,
            logs: service.getLogs()
        });
    }

    async testSend(req: Request, res: Response) {
        const { phone, message } = req.body;
        if (!phone) {
            return res.status(400).json({ error: 'Numero di telefono obbligatorio' });
        }
        try {
            const service = WhatsAppService.getInstance();
            const result = await service.sendTestMessage(phone, message);
            res.json({
                success: true,
                message: `Messaggio di test inviato con successo a ${phone}!`,
                result,
                logs: service.getLogs().slice(0, 5)
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message || 'Errore durante l\'invio del messaggio di test',
                logs: WhatsAppService.getInstance().getLogs().slice(0, 5)
            });
        }
    }

    async reset(req: Request, res: Response) {
        try {
            const service = WhatsAppService.getInstance();
            const result = await service.resetConnection();
            res.json(result);
        } catch (error: any) {
            console.error('[WhatsAppController] Reset error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
