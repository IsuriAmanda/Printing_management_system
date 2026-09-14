import { Request, Response } from 'express';
import {
  fetchAllUsers, fetchUserById, createUser,
  updateUser, deleteUser, resetUserPassword
} from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { isValidEmail } from '../utils/email-validation';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    res.json(await fetchAllUsers());
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await fetchUserById(Number(req.params.id));
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('getUserById error:', err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

export const addUser = async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, role_id } = req.body;
    if (!full_name || !email || !password || !role_id) {
      return res.status(400).json({ message: 'full_name, email, password and role_id are required' });
    }
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    const user = await createUser({ full_name, email, password, role_id });
    res.status(201).json(user);
  } catch (err: any) {
    if (err.message === 'EMAIL_EXISTS') {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error('addUser error:', err);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

export const editUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (req.body.email !== undefined && !isValidEmail(req.body.email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    // Stop an admin from locking themselves out by accident
    if (req.user?.id === id && req.body.is_active === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const updated = await updateUser(id, req.body);
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) {
    console.error('editUser error:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

export const removeUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (req.user?.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const deleted = await deleteUser(id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('removeUser error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

export const changeUserPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const success = await resetUserPassword(Number(req.params.id), newPassword);
    if (!success) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('changeUserPassword error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};
