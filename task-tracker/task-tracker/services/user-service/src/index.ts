import { createApp } from './app';
import { getDatabase } from './utils/database';

const PORT = parseInt(process.env.PORT || '3001', 10);

// 初始化数据库
getDatabase();

const app = createApp();
app.listen(PORT, () => {
  console.log(`user-service listening on http://localhost:${PORT}`);
});
