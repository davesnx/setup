const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync('fixture-converter-compiler', ['--check'], {
  env: { PATH: path.join(__dirname, 'absent-tools') }, encoding: 'utf8',
});
if (result.error && result.error.code === 'ENOENT') {
  console.error('blocked: fixture-converter-compiler is not supplied');
  process.exitCode = 69;
} else {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  process.exitCode = result.status ?? 1;
}
