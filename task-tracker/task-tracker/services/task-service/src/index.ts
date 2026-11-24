import { createApp } from './app';
import { getDatabase } from './utils/database';
import { startOutboxRetryWorker } from './services/outboxRetry';

const PORT = parseInt(process.env.PORT || '3002', 10);
getDatabase();
startOutboxRetryWorker();
const app = createApp();
app.listen(PORT, () => {
  console.log(`task-service listening on http://localhost:${PORT}`);
});
