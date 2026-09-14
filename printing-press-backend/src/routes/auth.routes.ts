import express from 'express';
import { register, login, me, updateMe, changeMyPassword, forgotPassword } from '../controllers/auth.controller';
import { verifyToken, allowRoles } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', verifyToken, me);
router.put('/me', verifyToken, updateMe);
router.patch('/me/password', verifyToken, changeMyPassword);

// Now Admin-only — new users are created via /api/users instead
router.post('/register', verifyToken, allowRoles('Admin'), register);

export default router;
