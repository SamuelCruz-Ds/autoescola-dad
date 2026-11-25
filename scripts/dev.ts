import { createServer } from 'vite';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const server = await createServer();
await server.listen();
await build({
  entryPoints: ['src/main/index.ts'],
  outfile: 'dist/main/index.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron', 'mysql2', 'mysql2/promise', 'dotenv'],
});
await build({
  entryPoints: ['src/preload/index.ts'],
  outfile: 'dist/preload/index.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
});
const childEnv = { ...process.env, ELECTRON_RENDERER_URL: 'http://127.0.0.1:5173' };
delete (childEnv as Record<string, string | undefined>).ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron') as string, ['.'], { stdio: 'inherit', env: childEnv });
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
process.on('SIGINT', () => child.kill());
