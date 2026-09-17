const path = require('path');
const fs = require('fs');
const { isConfigured, uploadBuffer } = require('./cloudinary');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function processUploadedFile(file, subdirectory) {
  if (!file) return null;

  if (isConfigured()) {
    const url = await uploadBuffer(file.buffer, `athstack/${subdirectory}`);
    return url;
  }

  const ext = MIME_EXTENSIONS[file.mimetype];
  if (!ext) {
    throw new Error('Unsupported file type');
  }

  const dir = path.join(UPLOAD_DIR, subdirectory);
  ensureDir(dir);

  const filename = `${subdirectory}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);

  return `/uploads/${subdirectory}/${filename}`;
}

async function processUploadedFiles(files, subdirectory) {
  if (!files || files.length === 0) return [];

  const results = [];
  for (const file of files) {
    const url = await processUploadedFile(file, subdirectory);
    results.push(url);
  }
  return results;
}

module.exports = { processUploadedFile, processUploadedFiles };
