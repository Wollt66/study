import express, { Express } from 'express';
import { createReportRouter } from './routes/reportRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware, createLogger } from '@task-tracker/shared';

export function createApp(): Express {
  const app = express();
  const logger = createLogger('report-service', process.env.LOG_LEVEL || 'info');
  app.use(express.json());
  app.use(requestIdMiddleware(logger));
  app.use('/api/reports', createReportRouter());
  app.use(errorHandler);
  return app;
}
