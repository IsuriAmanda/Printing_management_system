"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Every route below requires: valid token AND Admin role
router.use(auth_middleware_1.verifyToken, (0, auth_middleware_1.allowRoles)('Admin'));
router.get('/', user_controller_1.getAllUsers);
router.get('/:id', user_controller_1.getUserById);
router.post('/', user_controller_1.addUser);
router.put('/:id', user_controller_1.editUser);
router.delete('/:id', user_controller_1.removeUser);
router.patch('/:id/password', user_controller_1.changeUserPassword);
exports.default = router;
