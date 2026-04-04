import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../config/mail.js';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getAppUrl(req) {
  return process.env.APP_URL || req.get('origin') || 'http://localhost:5173';
}

export async function register(req, res) {
  try {
    const { username, password, email } = req.body;

    // Validação
    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }

    // Verificar se usuário já existe
    const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username já existe' });
    }

    // Hash da senha
    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(password, saltRounds);

    // Criar usuário
    const userId = uuidv4();
    await dbRun(
      'INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)',
      [userId, username, passwordHash, email || null]
    );

    const token = generateToken(userId);
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: { id: userId, username, email }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validação
    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }

    // Buscar usuário
    const user = await dbGet('SELECT id, password_hash FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = generateToken(user.id);
    res.json({
      message: 'Login bem-sucedido',
      token,
      user: { id: user.id, username }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

export async function logout(req, res) {
  // JWT é stateless, então logout é apenas um feedback ao cliente
  res.json({ message: 'Logout bem-sucedido. Remova o token no cliente.' });
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const user = await dbGet('SELECT id, username, email FROM users WHERE email = ?', [email]);
    const successMessage = 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.';

    if (!user) {
      return res.json({ message: successMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();
    const resetUrl = `${getAppUrl(req)}?resetToken=${resetToken}`;

    await dbRun(
      'UPDATE users SET reset_password_token = ?, reset_password_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedToken, expiresAt, user.id]
    );

    await sendPasswordResetEmail({
      to: user.email,
      username: user.username,
      resetUrl
    });

    res.json({ message: successMessage });
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:', error);
    res.status(500).json({ error: 'Erro ao solicitar redefinição de senha' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    const hashedToken = hashResetToken(token);
    const now = new Date().toISOString();
    const user = await dbGet(
      'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires_at > ?',
      [hashedToken, now]
    );

    if (!user) {
      return res.status(400).json({ error: 'Token de redefinição inválido ou expirado' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);

    await dbRun(
      'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, user.id]
    );

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
}

export async function me(req, res) {
  try {
    const user = await dbGet('SELECT id, username, email FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}
