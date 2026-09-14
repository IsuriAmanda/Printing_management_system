"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeUserPassword = exports.removeUser = exports.editUser = exports.addUser = exports.getUserById = exports.getAllUsers = void 0;
const user_service_1 = require("../services/user.service");
const email_validation_1 = require("../utils/email-validation");
const getAllUsers = async (req, res) => {
    try {
        res.json(await (0, user_service_1.fetchAllUsers)());
    }
    catch (err) {
        console.error('getAllUsers error:', err);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const user = await (0, user_service_1.fetchUserById)(Number(req.params.id));
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json(user);
    }
    catch (err) {
        console.error('getUserById error:', err);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
};
exports.getUserById = getUserById;
const addUser = async (req, res) => {
    try {
        const { full_name, email, password, role_id } = req.body;
        if (!full_name || !email || !password || !role_id) {
            return res.status(400).json({ message: 'full_name, email, password and role_id are required' });
        }
        if (!(0, email_validation_1.isValidEmail)(email))
            return res.status(400).json({ message: 'Enter a valid email address' });
        const user = await (0, user_service_1.createUser)({ full_name, email, password, role_id });
        res.status(201).json(user);
    }
    catch (err) {
        if (err.message === 'EMAIL_EXISTS') {
            return res.status(409).json({ message: 'Email already registered' });
        }
        console.error('addUser error:', err);
        res.status(500).json({ message: 'Failed to create user' });
    }
};
exports.addUser = addUser;
const editUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (req.body.email !== undefined && !(0, email_validation_1.isValidEmail)(req.body.email)) {
            return res.status(400).json({ message: 'Enter a valid email address' });
        }
        // Stop an admin from locking themselves out by accident
        if (req.user?.id === id && req.body.is_active === false) {
            return res.status(400).json({ message: 'You cannot deactivate your own account' });
        }
        const updated = await (0, user_service_1.updateUser)(id, req.body);
        if (!updated)
            return res.status(404).json({ message: 'User not found' });
        res.json(updated);
    }
    catch (err) {
        console.error('editUser error:', err);
        res.status(500).json({ message: 'Failed to update user' });
    }
};
exports.editUser = editUser;
const removeUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (req.user?.id === id) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }
        const deleted = await (0, user_service_1.deleteUser)(id);
        if (!deleted)
            return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    }
    catch (err) {
        console.error('removeUser error:', err);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};
exports.removeUser = removeUser;
const changeUserPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const success = await (0, user_service_1.resetUserPassword)(Number(req.params.id), newPassword);
        if (!success)
            return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Password reset successfully' });
    }
    catch (err) {
        console.error('changeUserPassword error:', err);
        res.status(500).json({ message: 'Failed to reset password' });
    }
};
exports.changeUserPassword = changeUserPassword;
