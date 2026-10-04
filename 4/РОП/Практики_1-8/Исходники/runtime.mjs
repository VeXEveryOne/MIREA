import path from 'node:path';
import { fileURLToPath } from 'node:url';
export { omniModule, runtimeModule, skillDirectory, PYTHON, NODE_MODULES } from '../../../../tools/runtime.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = process.env.ROP_ROOT ?? sourceRoot;
export const REPO_ROOT = path.resolve(sourceRoot, '..', '..', '..');
export const MODEL_DIR = path.join(ROOT, 'Модели');
export const EXPORT_DIR = path.join(ROOT, 'Экспорт', 'PNG');
export const BUILD_DIR = path.join(REPO_ROOT, '.cache', 'rop');
