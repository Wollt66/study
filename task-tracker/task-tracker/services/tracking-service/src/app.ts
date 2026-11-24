import express, { Express } from 'express';
import { createTrackingRouter } from './routes/trackingRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware, createLogger } from '@task-tracker/shared';

export function createApp(): Express {
  const app = express();
  const logger = createLogger('tracking-service', process.env.LOG_LEVEL || 'info');
  app.use(express.json());
  app.use(requestIdMiddleware(logger));
  app.use('/api/tracking', createTrackingRouter());
  app.use(errorHandler);
  return app;
}
