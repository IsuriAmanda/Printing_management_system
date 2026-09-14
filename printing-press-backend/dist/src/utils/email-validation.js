"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireValidEmail = exports.isValidEmail = void 0;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isValidEmail = (value) => typeof value === 'string' && EMAIL_PATTERN.test(value.trim());
exports.isValidEmail = isValidEmail;
const requireValidEmail = (value, optional = false) => {
    if (optional && (value == null || String(value).trim() === ''))
        return;
    if (!(0, exports.isValidEmail)(value))
        throw new Error('INVALID_EMAIL');
};
exports.requireValidEmail = requireValidEmail;
