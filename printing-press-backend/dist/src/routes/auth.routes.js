"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post('/login', auth_controller_1.login);
router.post('/forgot-password', auth_controller_1.forgotPassword);
router.get('/me', auth_middleware_1.verifyToken, auth_controller_1.me);
router.put('/me', auth_middleware_1.verifyToken, auth_controller_1.updateMe);
router.patch('/me/password', auth_middleware_1.verifyToken, auth_controller_1.changeMyPassword);
// Now Admin-only — new users are created via /api/users instead
router.post('/register', auth_middleware_1.verifyToken, (0, auth_middleware_1.allowRoles)('Admin'), auth_controller_1.register);
exports.default = router;
