import express from 'express';
import { getAttendanceForDate, setAttendance } from '../controllers/attendance.controller';
import { verifyToken, allowRoles } from '../middleware/auth.middleware';

const router = express.Router();
router.use(verifyToken, allowRoles('Admin', 'Manager'));

router.get('/', getAttendanceForDate);
router.patch('/', setAttendance);

export default router;