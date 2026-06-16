import { Request, Response } from 'express';
import { StatsService } from '../services/StatsService';

const statsService = new StatsService();

export class StatsController {
    async getStats(req: Request, res: Response) {
        try {
            const { period } = req.query;
            const stats = await statsService.getAdminStats(period as string || 'last7days');
            res.json(stats);
        } catch (error: any) {
            console.error('[StatsController] Error fetching stats:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
