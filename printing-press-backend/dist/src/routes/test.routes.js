"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
/* ───────────────────────────── */
router.get('/admin', auth_middleware_1.verifyToken, (0, auth_middleware_1.allowRoles)('Admin'), (_req, res) => {
    res.json({
        message: 'Welcome Admin'
    });
});
/* ───────────────────────────── */
router.get('/manager', auth_middleware_1.verifyToken, (0, auth_middleware_1.allowRoles)('Admin', 'Manager'), (_req, res) => {
    res.json({
        message: 'Welcome Manager'
    });
});
/* ───────────────────────────── */
router.get('/operator', auth_middleware_1.verifyToken, (0, auth_middleware_1.allowRoles)('Operator'), (_req, res) => {
    res.json({
        message: 'Welcome Operator'
    });
});
/* ───────────────────────────── */
exports.default = router;
