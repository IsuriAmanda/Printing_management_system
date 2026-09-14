import express from 'express';
import {
  getAllUsers, getUserById, addUser,
  editUser, removeUser, changeUserPassword
} from '../controllers/user.controller';
import { verifyToken, allowRoles } from '../middleware/auth.middleware';

const router = express.Router();

// Every route below requires: valid token AND Admin role
router.use(verifyToken, allowRoles('Admin'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', addUser);
router.put('/:id', editUser);
router.delete('/:id', removeUser);
router.patch('/:id/password', changeUserPassword);

export default router;