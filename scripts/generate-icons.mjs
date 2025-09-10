import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(process.cwd());
const iconsDir = path.join(root, 'public', 'icons');

const tasks = [
  // source SVG, output PNG name, size
  { src: 'loom-logo-512.svg', out: 'loom-logo-512.png', size: 512 },
  { src: 'loom-logo-192.svg', out: 'loom-logo-192.png', size: 192 },
  { src: 'loom-logo-144.svg', out: 'loom-logo-144.png', size: 144 },
  { src: 'loom-apple-touch-icon.svg', out: 'loom-apple-touch-icon.png', size: 180 },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generatePng({ src, out, size }) {
  const inputPath = path.join(iconsDir, src);
  const outputPath = path.join(iconsDir, out);

  const svg = await fs.readFile(inputPath);
  // Use higher density to improve rasterization quality
  const image = sharp(svg, { density: Math.max(300, size) })
    .resize(size, size, { fit: 'cover' })
    .png({ quality: 90 });

  await image.toFile(outputPath);
  return { out, size };
}

(async () => {
  try {
    await ensureDir(iconsDir);
    const results = [];
    for (const t of tasks) {
      results.push(await generatePng(t));
    }
    console.log('PNG icons generated:', results);
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
})();
