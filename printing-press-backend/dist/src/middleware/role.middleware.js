"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAnyRole = exports.isManagerOrAdmin = exports.isAdmin = void 0;
const auth_middleware_1 = require("./auth.middleware");
// Convenience shortcuts — use these instead of allowRoles('Admin') everywhere
exports.isAdmin = (0, auth_middleware_1.allowRoles)('Admin');
exports.isManagerOrAdmin = (0, auth_middleware_1.allowRoles)('Admin', 'Manager');
exports.isAnyRole = (0, auth_middleware_1.allowRoles)('Admin', 'Manager', 'Operator');
