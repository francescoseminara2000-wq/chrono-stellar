import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Public visit logger
router.post('/track', AnalyticsController.trackVisit);

// Admin dashboard analytics overview
router.get('/admin/overview', authenticateToken, requireAdmin, AnalyticsController.getOverview);

export default router;
