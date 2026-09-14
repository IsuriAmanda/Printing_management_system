import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
// TEMPORARILY DISABLED (requires internet/SMTP):
// import { sendTemporaryPasswordEmail } from '../services/email.service';
import { isValidEmail } from '../utils/email-validation';

/* ───────────────────────────── */
// REGISTER — creates a new user
// NOTE: this route will be locked to Admin-only once we wire the role middleware onto it
export const register = async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, role_id } = req.body;

    if (!full_name || !email || !password || !role_id) {
      return res.status(400).json({
        message: 'full_name, email, password and role_id are all required'
      });
    }

    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    // Prevent duplicate emails
    const [existing]: any = await pool.query(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (full_name, email, password, role_id)
       VALUES (?, ?, ?, ?)`,
      [full_name, email, hashedPassword, role_id]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

/* ───────────────────────────── */
// LOGIN — verifies credentials, returns JWT with role_name embedded
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    // JOIN role table so we get role_name, not just role_id
    const [rows]: any = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.password, u.is_active,
              u.role_id, r.role_name
       FROM users u
       JOIN role r ON u.role_id = r.role_id
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id,
        role: user.role_name   // 'Admin' | 'Manager' | 'Operator' — this is what allowRoles() checks
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role_id: user.role_id,
        role: user.role_name
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed' });
  }
};

/* ───────────────────────────── */
// ME — lets the frontend verify a token / fetch current user on app reload
export const forgotPassword = async (req: Request, res: Response) => {
  // Password reset depends on email delivery. Stop before changing the stored
  // password so an offline request cannot lock the user out of their account.
  return res.status(503).json({
    message: 'Password reset by email is temporarily unavailable'
  });

  /* TEMPORARILY DISABLED (requires internet/SMTP)
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ message: 'Password reset email is not configured' });
    }

    const [rows]: any = await pool.query(
      `SELECT id, full_name, email, is_active FROM users WHERE email = ? LIMIT 1`,
      [String(email).trim()]
    );

    if (rows.length === 0) {
      return res.json({
        message: 'If that email exists, password reset instructions have been sent.'
      });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const temporaryPassword = `HP-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`;
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await pool.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedPassword, user.id]
    );

    await sendTemporaryPasswordEmail(user.email, user.full_name, temporaryPassword);

    res.json({
      message: 'If that email exists, password reset instructions have been sent.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to process password reset' });
  }
  */
};

export const me = async (req: any, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role_id, r.role_name AS role
       FROM users u
       JOIN role r ON u.role_id = r.role_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch current user' });
  }
};
// ── UPDATE MY PROFILE ──────────────────────────────────────
export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const { full_name, email } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ message: 'full_name and email are required' });
    }

    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    // Prevent taking someone else's email
    const [existing]: any = await pool.query(
      `SELECT id FROM users WHERE email = ? AND id != ?`,
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    await pool.query(
      `UPDATE users SET full_name = ?, email = ? WHERE id = ?`,
      [full_name.trim(), email.trim(), req.user.id]
    );

    const [rows]: any = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role_id, r.role_name AS role
       FROM users u JOIN role r ON u.role_id = r.role_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// ── CHANGE MY OWN PASSWORD ─────────────────────────────────
export const changeMyPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Current password and a new password (min 6 chars) are required' });
    }

    const [rows]: any = await pool.query(`SELECT password FROM users WHERE id = ?`, [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hashed, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};
