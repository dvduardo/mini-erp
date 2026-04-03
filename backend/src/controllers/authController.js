import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

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
