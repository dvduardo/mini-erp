import { dbRun, dbGet, dbAll } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { uploadsDir, ensureUploadsDir } from '../config/storage.js';

function resolveUploadedFilePath(caminhoArquivo) {
  return path.join(uploadsDir, path.basename(caminhoArquivo));
}

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uid = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uid}${ext}`);
  }
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Apenas aceitar PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  }
});

// Listar notas fiscais de um pedido
export const getNotasFiscais = async (req, res) => {
  try {
    const { pedidoId } = req.query;
    
    let query = 'SELECT * FROM notas_fiscais';
    const params = [];
    
    if (pedidoId) {
      query += ' WHERE pedido_id = ?';
      params.push(pedidoId);
    }
    
    const notas = await dbAll(query, params);
    res.json(notas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obter nota fiscal por ID
export const getNotaFiscalById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const nota = await dbGet('SELECT * FROM notas_fiscais WHERE id = ?', [id]);
    
    if (!nota) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    }
    
    res.json(nota);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fazer upload de nota fiscal
export const uploadNotaFiscal = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }
    
    const { pedido_id, numero_nota_fiscal } = req.body;
    
    if (!pedido_id) {
      return res.status(400).json({ error: 'Campo pedido_id é obrigatório' });
    }
    
    // Verificar se pedido existe
    const pedido = await dbGet('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    // Deletar nota fiscal anterior se existir
    const notaExistente = await dbGet('SELECT * FROM notas_fiscais WHERE pedido_id = ?', [pedido_id]);
    if (notaExistente) {
      const caminhoAntigo = resolveUploadedFilePath(notaExistente.caminho_arquivo);
      if (fs.existsSync(caminhoAntigo)) {
        fs.unlinkSync(caminhoAntigo);
      }
      await dbRun('DELETE FROM notas_fiscais WHERE pedido_id = ?', [pedido_id]);
    }
    
    const caminhoArquivo = `uploads/${req.file.filename}`;
    
    const result = await dbRun(
      'INSERT INTO notas_fiscais (pedido_id, numero_nota_fiscal, caminho_arquivo) VALUES (?, ?, ?) RETURNING id',
      [pedido_id, numero_nota_fiscal, caminhoArquivo]
    );
    
    const nota = await dbGet('SELECT * FROM notas_fiscais WHERE id = ?', [result.id]);
    
    res.status(201).json({
      message: 'Nota fiscal enviada com sucesso',
      nota
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deletar nota fiscal
export const deleteNotaFiscal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const nota = await dbGet('SELECT * FROM notas_fiscais WHERE id = ?', [id]);
    if (!nota) {
      return res.status(404).json({ error: 'Nota fiscal não encontrada' });
    }
    
    // Deletar arquivo físico
    const caminhoArquivo = resolveUploadedFilePath(nota.caminho_arquivo);
    if (fs.existsSync(caminhoArquivo)) {
      fs.unlinkSync(caminhoArquivo);
    }
    
    // Deletar do banco de dados
    await dbRun('DELETE FROM notas_fiscais WHERE id = ?', [id]);
    
    res.json({ message: 'Nota fiscal deletada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
