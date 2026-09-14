"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const attendance_controller_1 = require("../controllers/attendance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.verifyToken, (0, auth_middleware_1.allowRoles)('Admin', 'Manager'));
router.get('/', attendance_controller_1.getAttendanceForDate);
router.patch('/', attendance_controller_1.setAttendance);
exports.default = router;
