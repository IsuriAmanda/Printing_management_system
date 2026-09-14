import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/* ───────────────────────────── */

export interface AuthRequest extends Request {
  user?: any;
}

/* ───────────────────────────── */

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    /* ───────────────────────── */
    if (!authHeader) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    /* ───────────────────────── */
    const token = authHeader.split(' ')[1];

    // FIX ADDED: Ensure the token actually exists after the split
    if (!token) {
      return res.status(401).json({ 
        message: 'Malformed authorization header' 
      });
    }

    /* ───────────────────────── */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    );

    /* ───────────────────────── */
    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }
};

/* ───────────────────────────── */

export const allowRoles = (
  ...roles: string[]
) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    /* ─────────────────────── */
    if (
      !req.user ||
      !roles.includes(req.user.role)
    ) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    /* ─────────────────────── */
    next();
  };
};