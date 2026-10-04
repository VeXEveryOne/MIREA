import path from 'node:path';
import { fileURLToPath } from 'node:url';
export { omniModule, OMNI_ROOT } from '../../../tools/runtime.mjs';

export const MODEL_DIR = process.env.IM_MODEL_OUTPUT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'OmniNotation');
