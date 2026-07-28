import { Request, Response } from 'express';
import { WhatsAppService } from '../services/WhatsAppService';

export class WhatsAppController {

    getStatus(req: Request, res: Response) {
        const service = WhatsAppService.getInstance();
        res.json(service.getStatus());
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
