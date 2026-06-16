import { Request, Response } from 'express';
import { WhatsAppService } from '../services/WhatsAppService';

export class WhatsAppController {

    getStatus(req: Request, res: Response) {
        const service = WhatsAppService.getInstance();
        res.json(service.getStatus());
    }
}
