const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Configure upload root
const UPLOADS_DIR = path.resolve(__dirname, '../uploads/evidence');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Disallowed extensions (executables, scripts, etc.)
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.sh', '.bin', '.js', '.mjs', '.cjs', '.ts',
  '.html', '.htm', '.php', '.phtml', '.py', '.pl', '.vbs', '.cmd',
  '.scr', '.msi', '.jar', '.dll', '.com'
];

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

/**
 * Multer disk storage engine with randomized secure filenames
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomHex = crypto.randomBytes(16).toString('hex');
    const sanitizedName = `evidence_${Date.now()}_${randomHex}${ext}`;
    cb(null, sanitizedName);
  },
});

/**
 * File filter rejecting executables and unapproved MIME types
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Security Alert: File type ${ext} is blocked for security reasons.`), false);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, GIF, PDF.`), false);
  }

  cb(null, true);
};

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5, // Maximum 5 files per complaint
  },
  fileFilter,
});

/**
 * Storage Abstraction Layer
 */
class EvidenceStorageService {
  /**
   * Calculates cryptographic SHA-256 hash of a file on disk
   * @param {string} filePath 
   * @returns {Promise<string>}
   */
  calculateSHA256(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Processes an uploaded file into standardized evidence subdocument metadata
   * @param {Object} multerFile 
   * @returns {Promise<Object>}
   */
  async processUploadedEvidence(multerFile) {
    const sha256 = await this.calculateSHA256(multerFile.path);

    return {
      fileName: multerFile.originalname.slice(0, 100),
      fileType: multerFile.mimetype,
      size: multerFile.size,
      storageReference: multerFile.filename, // Safe non-enumerable reference
      sha256Hash: sha256,
      uploadedAt: new Date(),
    };
  }
}

module.exports = {
  evidenceStorageService: new EvidenceStorageService(),
  uploadMiddleware,
};
