import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const copyPairs = [
  { src: path.join(rootDir, 'src', 'api', 'views'), dest: path.join(rootDir, 'dist', 'api', 'views') },
  { src: path.join(rootDir, 'src', 'api', 'public'), dest: path.join(rootDir, 'dist', 'api', 'public') },
];

for (const pair of copyPairs) {
  if (fs.existsSync(pair.src)) {
    fs.mkdirSync(path.dirname(pair.dest), { recursive: true });
    fs.cpSync(pair.src, pair.dest, { recursive: true });
    console.log(`Copied ${pair.src} -> ${pair.dest}`);
  }
}
