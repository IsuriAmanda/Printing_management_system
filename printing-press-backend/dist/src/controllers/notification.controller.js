"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllRead = exports.markRead = exports.getMyNotifications = void 0;
const notification_service_1 = require("../services/notification.service");
const getMyNotifications = async (req, res) => {
    try {
        const data = await (0, notification_service_1.fetchNotificationsForUser)(req.user.id);
        res.json(data);
    }
    catch (err) {
        console.error('getMyNotifications error:', err);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};
exports.getMyNotifications = getMyNotifications;
const markRead = async (req, res) => {
    try {
        const success = await (0, notification_service_1.markNotificationRead)(Number(req.params.id), req.user.id);
        if (!success)
            return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Marked as read' });
    }
    catch (err) {
        console.error('markRead error:', err);
        res.status(500).json({ message: 'Failed to update notification' });
    }
};
exports.markRead = markRead;
const markAllRead = async (req, res) => {
    try {
        await (0, notification_service_1.markAllNotificationsRead)(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (err) {
        console.error('markAllRead error:', err);
        res.status(500).json({ message: 'Failed to update notifications' });
    }
};
exports.markAllRead = markAllRead;
