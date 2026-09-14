"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const quotation_routes_1 = __importDefault(require("./routes/quotation.routes"));
const job_routes_1 = __importDefault(require("./routes/job.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const supply_routes_1 = __importDefault(require("./routes/supply.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const path_1 = __importDefault(require("path"));
const artwork_routes_1 = __importDefault(require("./routes/artwork.routes"));
const production_routes_1 = __importDefault(require("./routes/production.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/quotations', quotation_routes_1.default);
app.use('/api/jobs', job_routes_1.default);
app.use('/api/customers', customer_routes_1.default);
app.use('/api/supplies', supply_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.get('/uploads/artwork/:filename/download', (req, res) => {
    const filename = path_1.default.basename(req.params.filename);
    const filePath = path_1.default.join(process.cwd(), 'uploads', 'artwork', filename);
    res.download(filePath, filename, err => {
        if (err && !res.headersSent)
            res.status(404).json({ message: 'Artwork file is missing. Please re-upload it.' });
    });
});
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.use('/api/artwork', artwork_routes_1.default);
app.use('/api/production', production_routes_1.default);
exports.default = app;
