// Installed tools are external dependencies, never vendored into teaching materials.
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const profile = process.env.USERPROFILE ?? process.env.HOME;
export const RUNTIME_ROOT = process.env.CODEX_RUNTIME_ROOT ?? path.join(profile, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies');
export const NODE_MODULES = path.join(RUNTIME_ROOT, 'node', 'node_modules');
export const PYTHON = path.join(RUNTIME_ROOT, 'python', process.platform === 'win32' ? 'python.exe' : 'bin/python');
export const OMNI_ROOT = process.env.OMNINOTATION_ROOT ?? 'D:/OmniNotation';
const require = createRequire(path.join(RUNTIME_ROOT, 'node', 'package.json'));

export function runtimeModule(name) {
  return import(pathToFileURL(require.resolve(name)).href);
}

export function omniModule(relative) {
  return import(pathToFileURL(path.join(OMNI_ROOT, relative)).href);
}

export function skillDirectory(name) {
  const base = path.join(process.env.CODEX_SKILLS_ROOT ?? path.join(profile, '.codex', 'plugins', 'cache', 'openai-primary-runtime'), name);
  const versions = fs.readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const version of versions) {
    const directory = path.join(base, version, 'skills', name);
    if (fs.existsSync(directory)) return directory;
  }
  throw new Error(`No installed ${name} tool package in ${base}`);
}
