import { Router } from 'express';
import { TrackingController } from '../controllers/trackingController';
import { validate } from '../middleware/validate';
import { authenticate, authenticateInternal } from '../middleware/auth';
import { recordCompletionSchema, recordStatusLogSchema } from '../schemas/trackingSchemas';

export function createTrackingRouter(): Router {
  const router = Router();
  const controller = new TrackingController();

  router.post('/completions', authenticateInternal, validate(recordCompletionSchema, 'body'), controller.recordCompletion);
  router.get('/completions', authenticate, controller.listCompletions);
  router.get('/progress', authenticate, controller.getProgress);
  router.post('/status-logs', authenticateInternal, validate(recordStatusLogSchema, 'body'), controller.recordStatusLog);
  router.get('/status-logs', authenticate, controller.listStatusLogs);
  router.get('/health', controller.health);

  // 内部接口（供 report-service 按时间范围获取完成事件）
  router.get('/internal/completions', authenticateInternal, controller.internalCompletions);

  return router;
}
