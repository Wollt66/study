import express, { Express } from 'express';
import { createTaskRouter } from './routes/taskRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware, createLogger } from '@task-tracker/shared';

export function createApp(): Express {
  const app = express();
  const logger = createLogger('task-service', process.env.LOG_LEVEL || 'info');
  app.use(express.json());
  app.use(requestIdMiddleware(logger));
  app.use('/api/tasks', createTaskRouter());
  app.use(errorHandler);
  return app;
}
