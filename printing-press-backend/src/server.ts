import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import cron from 'node-cron';
import { rolloverLeftoverJobs } from './services/machine-scheduling.service';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Catch up immediately on startup (in case server was down over midnight)
rolloverLeftoverJobs().catch(err => console.error('Rollover error on startup:', err));

// Then run daily just after midnight to rollover leftover jobs from the previous day to the current day at 12:05 AM
cron.schedule('5 0 * * *', () => {
  rolloverLeftoverJobs().catch(err => console.error('Daily rollover error:', err));
});