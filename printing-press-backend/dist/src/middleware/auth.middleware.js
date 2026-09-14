"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowRoles = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/* ───────────────────────────── */
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        /* ───────────────────────── */
        if (!authHeader) {
            return res.status(401).json({
                message: 'No token provided'
            });
        }
        /* ───────────────────────── */
        const token = authHeader.split(' ')[1];
        // FIX ADDED: Ensure the token actually exists after the split
        if (!token) {
            return res.status(401).json({
                message: 'Malformed authorization header'
            });
        }
        /* ───────────────────────── */
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        /* ───────────────────────── */
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            message: 'Invalid token'
        });
    }
};
exports.verifyToken = verifyToken;
/* ───────────────────────────── */
const allowRoles = (...roles) => {
    return (req, res, next) => {
        /* ─────────────────────── */
        if (!req.user ||
            !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }
        /* ─────────────────────── */
        next();
    };
};
exports.allowRoles = allowRoles;
