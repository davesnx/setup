import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadContext } from './context.mjs';

const script = fileURLToPath(new URL('./context.mjs', import.meta.url));

function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'impeccable-context-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  return cwd;
}

function run(cwd, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd, encoding: 'utf8', timeout: 10000,
    env: { PATH: process.env.PATH, HOME: path.join(cwd, '.home'), IMPECCABLE_NO_UPDATE_CHECK: '1' },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
}

test('missing context is advisory, repeatable, and writes nothing', t => {
  const cwd = fixture(t);
  const first = run(cwd);
  assert.equal(run(cwd), first);
  assert.match(first, /NO_PRODUCT_MD/);
  assert.match(first, /Continue with supplied user context/);
  assert.match(first, /only if explicitly requested or necessary project context remains unresolved/);
  assert.doesNotMatch(first, /Stop the current task|before resuming/);
  assert.deepEqual(fs.readdirSync(cwd), []);
  assert.equal(loadContext(cwd).hasProduct, false);
});

test('DESIGN.md survives missing PRODUCT.md, then loads newly supplied PRODUCT.md', t => {
  const cwd = fixture(t);
  const design = '# Design\n\nUse existing blue buttons.\n';
  fs.writeFileSync(path.join(cwd, 'DESIGN.md'), design);
  const first = run(cwd);
  assert.match(first, /# DESIGN.md\n\n# Design/);
  assert.match(first, /Use existing blue buttons/);
  assert.equal(run(cwd), first);
  assert.deepEqual(fs.readdirSync(cwd), ['DESIGN.md']);
  assert.equal(fs.readFileSync(path.join(cwd, 'DESIGN.md'), 'utf8'), design);
  const product = '# Product\n\n## Register\n\nproduct\n';
  fs.writeFileSync(path.join(cwd, 'PRODUCT.md'), product);
  const recovered = run(cwd);
  assert.doesNotMatch(recovered, /NO_PRODUCT_MD/);
  assert.match(recovered, /reference\/product.md/);
  assert.equal(run(cwd), recovered);
  assert.equal(fs.readFileSync(path.join(cwd, 'PRODUCT.md'), 'utf8'), product);
});

test('targeted monorepo context keeps shared product and child design', t => {
  const cwd = fixture(t);
  fs.writeFileSync(path.join(cwd, 'package.json'), '{"workspaces":["apps/*"]}');
  fs.writeFileSync(path.join(cwd, 'PRODUCT.md'), '# Shared user context\n');
  fs.mkdirSync(path.join(cwd, 'apps/site'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'apps/site/DESIGN.md'), '# Child design\n');
  const output = run(cwd, ['--target', 'apps/site']);
  assert.match(output, /Shared user context/);
  assert.match(output, /Child design/);
  assert.equal(run(cwd, ['--target', 'apps/site']), output);
  const ctx = loadContext(cwd, { targetPath: 'apps/site' });
  assert.equal(ctx.productPath, 'PRODUCT.md');
  assert.equal(ctx.designPath, 'apps/site/DESIGN.md');
  assert.match(run(cwd), /TARGET_SELECTION_REQUIRED/);
});

test('init pin carries advisory metadata and repeated pinning is stable', t => {
  const cwd = fixture(t);
  fs.writeFileSync(path.join(cwd, 'package.json'), '{}');
  fs.mkdirSync(path.join(cwd, '.agents/skills/impeccable'), { recursive: true });
  const pin = fileURLToPath(new URL('./pin.mjs', import.meta.url));
  const target = path.join(cwd, '.agents/skills/init/SKILL.md');
  const results = [];
  for (let i = 0; i < 2; i++) {
    const result = spawnSync(process.execPath, [pin, 'pin', 'init'], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    results.push(fs.readFileSync(target, 'utf8'));
  }
  assert.equal(results[0], results[1]);
  assert.match(results[0], /Missing PRODUCT.md alone does not require init/);
  assert.doesNotMatch(results[0], /Every other command reads these files before/);
});
