// src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';

const router = Router();

// ✅ Cambia '/summary' por '/'
router.get('/', authenticateToken, require2FA, getDashboardSummary);

export default router;