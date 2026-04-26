/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const targetRel = path.join('node_modules', '@ionic', 'core', 'dist', 'types', 'stencil-public-runtime.d.ts');
const target = path.resolve(process.cwd(), targetRel);

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch-ionic-types] Skip: not found: ${filePath}`);
    return { ok: true, skipped: true };
  }

  const src = fs.readFileSync(filePath, 'utf8');
  const before = 'export declare function Mixin<const TMixins extends readonly MixinFactory[]>';
  const after = 'export declare function Mixin<TMixins extends readonly MixinFactory[]>';

  if (src.includes(after)) {
    console.log('[patch-ionic-types] Already patched.');
    return { ok: true, changed: false };
  }

  if (!src.includes(before)) {
    console.warn('[patch-ionic-types] Pattern not found; nothing patched.');
    return { ok: true, changed: false };
  }

  const next = src.replace(before, after);
  fs.writeFileSync(filePath, next, 'utf8');
  console.log('[patch-ionic-types] Patched stencil-public-runtime.d.ts for TS<5 compatibility.');
  return { ok: true, changed: true };
}

try {
  patchFile(target);
} catch (err) {
  console.error('[patch-ionic-types] Failed:', err?.message || err);
  process.exitCode = 1;
}

