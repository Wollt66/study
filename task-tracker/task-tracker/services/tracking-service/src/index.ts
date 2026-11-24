import { createApp } from './app';
import { getDatabase } from './utils/database';

const PORT = parseInt(process.env.PORT || '3003', 10);
getDatabase();
const app = createApp();
app.listen(PORT, () => {
  console.log(`tracking-service listening on http://localhost:${PORT}`);
});
