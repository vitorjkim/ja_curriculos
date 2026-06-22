import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretório uploads se não existir
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${ext}`);
  }
});

// Filtro para aceitar apenas arquivos de currículo
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use apenas PDF, DOC ou DOCX.'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
  fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: fileFilter
});

// Middleware personalizado para debugar
const debugUpload = (req, res, next) => {
  console.log('🔍 Upload Middleware - Method:', req.method);
  console.log('🔍 Upload Middleware - Content-Type:', req.get('Content-Type'));
  const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
  console.log('🔍 Upload Middleware - Body keys:', bodyKeys);
  
  upload.single('resumeFile')(req, res, (err) => {
    console.log('📁 Multer processado - File:', req.file ? 'Present' : 'Missing');
    console.log('📁 Multer processado - Error:', err ? err.message : 'None');
    if (err) {
      console.error('❌ Erro do multer:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

export default debugUpload;
