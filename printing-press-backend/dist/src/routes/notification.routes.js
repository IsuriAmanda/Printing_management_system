"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.verifyToken); // any logged-in user — no role restriction
router.get('/', notification_controller_1.getMyNotifications);
router.patch('/:id/read', notification_controller_1.markRead);
router.patch('/read-all', notification_controller_1.markAllRead);
exports.default = router;
