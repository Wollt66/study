import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

export function createReportRouter(): Router {
  const router = Router();
  const controller = new ReportController();

  router.get('/summary', authenticate, controller.summary);
  router.get('/daily', authenticate, controller.daily);
  router.get('/weekly', authenticate, controller.weekly);
  router.get('/monthly', authenticate, controller.monthly);
  router.get('/trend', authenticate, controller.trend);
  router.get('/health', controller.health);

  return router;
}
