import { createApp } from './app';

const PORT = parseInt(process.env.PORT || '3004', 10);
const app = createApp();
app.listen(PORT, () => {
  console.log(`report-service listening on http://localhost:${PORT}`);
});
