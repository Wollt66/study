import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { validate } from '../middleware/validate';
import { authenticate, authenticateInternal } from '../middleware/auth';
import { createTaskSchema, updateTaskSchema, updateStatusSchema } from '../schemas/taskSchemas';

export function createTaskRouter(): Router {
  const router = Router();
  const controller = new TaskController();

  router.post('/', authenticate, validate(createTaskSchema, 'body'), controller.create);
  router.put('/:id', authenticate, validate(updateTaskSchema, 'body'), controller.update);
  router.delete('/:id', authenticate, controller.remove);
  router.get('/', authenticate, controller.list);
  router.get('/:id', authenticate, controller.get);
  router.patch('/:id/status', authenticate, validate(updateStatusSchema, 'body'), controller.updateStatus);
  router.get('/health', controller.health);

  // 内部聚合接口（供 tracking-service / report-service 调用）
  router.get('/internal/count-by-status', authenticateInternal, controller.countByStatus);

  return router;
}
