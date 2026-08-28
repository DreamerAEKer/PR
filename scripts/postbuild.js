import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distApp = path.join(rootDir, 'dist', 'app.html');
const distIndex = path.join(rootDir, 'dist', 'index.html');
const rootIndex = path.join(rootDir, 'index.html');

if (fs.existsSync(distApp)) {
  fs.copyFileSync(distApp, distIndex);
  fs.copyFileSync(distApp, rootIndex);
  console.log('Successfully updated dist/index.html and root index.html for GitHub Pages!');
} else {
  console.error('dist/app.html not found!');
}
