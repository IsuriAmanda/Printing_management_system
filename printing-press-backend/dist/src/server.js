"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const node_cron_1 = __importDefault(require("node-cron"));
const machine_scheduling_service_1 = require("./services/machine-scheduling.service");
const PORT = process.env.PORT || 3000;
app_1.default.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Catch up immediately on startup (in case server was down over midnight)
(0, machine_scheduling_service_1.rolloverLeftoverJobs)().catch(err => console.error('Rollover error on startup:', err));
// Then run daily just after midnight to rollover leftover jobs from the previous day to the current day at 12:05 AM
node_cron_1.default.schedule('5 0 * * *', () => {
    (0, machine_scheduling_service_1.rolloverLeftoverJobs)().catch(err => console.error('Daily rollover error:', err));
});
