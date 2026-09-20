require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config(); // fallback: server/.env
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { startOverdueJob, processOverdue } = require('./jobs/overdue.job');

const PORT = process.env.PORT || 5000;

const required = ['MONGO_URI', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`Missing env vars: ${missing.join(', ')}. See .env.example`);
  process.exit(1);
}

(async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== 'test') {
      startOverdueJob();
      // Catch-up run at startup so fines/overdues don't wait for the next hour
      // after deploys or restarts (nodemon restarts reset the hourly timer).
      processOverdue().catch((e) => logger.error(`Startup overdue catch-up failed: ${e.message}`));
    }
    app.listen(PORT, () => logger.info(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`));
  } catch (err) {
    logger.error(`Startup failed: ${err.message}`);
    process.exit(1);
  }
})();
