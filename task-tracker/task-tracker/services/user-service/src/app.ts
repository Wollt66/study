import express, { Express } from 'express';
import { createUserRouter } from './routes/userRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware, createLogger } from '@task-tracker/shared';

export function createApp(): Express {
  const app = express();
  const logger = createLogger('user-service', process.env.LOG_LEVEL || 'info');

  app.use(express.json());
  app.use(requestIdMiddleware(logger));
  app.use('/api/users', createUserRouter());
  app.use(errorHandler);

  return app;
}
