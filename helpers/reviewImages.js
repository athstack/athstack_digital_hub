const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { isConfigured, uploadBuffer } = require('./cloudinary');

const MAX_WIDTH = 1280;
const THUMB_WIDTH = 240;
const JPEG_QUALITY = 80;
const THUMB_QUALITY = 70;
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'reviews');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Compress and upload a single review image.
 * Returns { full, thumb } URLs.
 */
async function processReviewImage(file) {
  if (!file || !file.buffer) return null;

  let fullBuffer = file.buffer;
  let thumbBuffer = null;

  try {
    const image = sharp(file.buffer).rotate();
    const meta = await image.metadata();
    if (meta.width > MAX_WIDTH) {
      fullBuffer = await image.resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: JPEG_QUALITY }).toBuffer();
    } else {
      fullBuffer = await image.jpeg({ quality: JPEG_QUALITY }).toBuffer();
    }
    thumbBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY })
      .toBuffer();
  } catch (err) {
    console.error('Review image compression failed:', err.message);
    fullBuffer = file.buffer;
    thumbBuffer = null;
  }

  if (isConfigured()) {
    const full = await uploadBuffer(fullBuffer, 'athstack/reviews');
    return { full, thumb: full };
  }

  ensureDir(UPLOAD_DIR);
  const base = `review-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, `${base}.jpg`), fullBuffer);
  if (thumbBuffer) {
    fs.writeFileSync(path.join(UPLOAD_DIR, `${base}-thumb.jpg`), thumbBuffer);
  }
  return { full: `/uploads/reviews/${base}.jpg`, thumb: `/uploads/reviews/${base}-thumb.jpg` };
}

/**
 * Process multiple review images (max 5). Returns array of full URLs.
 */
async function processReviewImages(files) {
  if (!files || files.length === 0) return [];
  const urls = [];
  for (const file of files.slice(0, 5)) {
    const result = await processReviewImage(file);
    if (result) urls.push(result.full);
  }
  return urls;
}

/**
 * Derive the thumbnail URL for a stored review image URL.
 */
function reviewThumbUrl(url) {
  if (!url) return '';
  if (url.includes('cloudinary.com')) {
    return url.replace('/image/upload/', '/image/upload/w_240,q_auto,f_auto/');
  }
  const ext = path.extname(url);
  return ext ? url.slice(0, -ext.length) + '-thumb' + ext : url;
}

module.exports = { processReviewImage, processReviewImages, reviewThumbUrl };
