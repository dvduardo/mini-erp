import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/security.js';

export function generateToken(userId) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '30d' });
}

export function verifyToken(token) {
  const jwtSecret = getJwtSecret();

  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token ausente' });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  req.userId = decoded.userId;
  next();
}
