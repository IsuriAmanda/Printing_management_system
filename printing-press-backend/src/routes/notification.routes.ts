import express from 'express';
import { getMyNotifications, markRead, markAllRead } from '../controllers/notification.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = express.Router();

router.use(verifyToken);  // any logged-in user — no role restriction

router.get('/', getMyNotifications);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);

export default router;