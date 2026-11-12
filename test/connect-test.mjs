// Test end-to-end de thumbnail-designer.
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const packageDir = path.resolve(import.meta.dirname, '..');
const tmpDir = path.join(packageDir, 'test', 'tmp');
rmSync(tmpDir, { recursive: true, force: true });
const home = path.join(tmpDir, 'dsh-home');
mkdirSync(path.join(home, 'thumbnail-designer'), { recursive: true });
writeFileSync(path.join(home, 'thumbnail-designer', 'config.json'), JSON.stringify({ allowedPaths: [tmpDir] }), 'utf8');

function makeClient(extraEnv = {}) {
  const entry = process.env.THUMBS_SERVER ? path.resolve(process.env.THUMBS_SERVER) : path.join(packageDir, 'server.mjs');
  const transport = new StdioClientTransport({ command: process.execPath, args: [entry], env: { SystemRoot: process.env.SystemRoot || 'C:\\Windows', PATH: process.env.PATH, USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME || process.env.USERPROFILE, TEMP: process.env.TEMP, TMP: process.env.TMP, DSH_HOME: home, ...extraEnv }, stderr: 'pipe' });
  transport.stderr?.on('data', (c) => process.stderr.write(`[server] ${c}`));
  const client = new Client({ name: 'thumbs-test', version: '1.0.0' }, { capabilities: {}, versionNegotiation: { mode: 'auto' } });
  return client.connect(transport).then(() => ({ client, transport }));
}
const textOf = (r) => (r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');

const { client, transport } = await makeClient();
console.log('tools:', (await client.listTools()).tools.map((t) => t.name).join(', '));
console.log('--- status ---'); console.log(textOf(await client.callTool({ name: 'status', arguments: {} })));
const preview = textOf(await client.callTool({ name: 'preview', arguments: { title: 'Cómo vender bots en 2026', subtitle: 'Guía práctica para Discord', badge: 'NUEVO', accent: '#e11d48', palette: { from: '#0f172a', to: '#7f1d1d' } } }));
console.log('--- preview (recorte) ---'); console.log(preview.slice(0, 500));
console.log('es SVG 1280x720:', preview.startsWith('<svg') && preview.includes('width="1280"') && preview.includes('height="720"'));
console.log('gradiente:', preview.includes('linearGradient'));
console.log('título:', preview.includes('Cómo vender bots'));
console.log('subtítulo:', preview.includes('Guía práctica para Discord'));
console.log('badge:', preview.includes('NUEVO'));
const noConfirm = await client.callTool({ name: 'save', arguments: { title: 'Miniatura test', output: path.join(tmpDir, 'thumb.svg') } });
console.log('save sin confirm isError:', noConfirm.isError === true);
const saved = await client.callTool({ name: 'save', arguments: { title: 'Miniatura test', output: path.join(tmpDir, 'thumb.svg'), confirm: true } });
const savedText = textOf(saved);
const file = savedText.replace('Guardado: ', '').split(' (')[0];
console.log('archivo escrito:', existsSync(file) && readFileSync(file, 'utf8').includes('<svg'));
const empty = await client.callTool({ name: 'preview', arguments: { title: ' ' } });
console.log('título vacío isError:', empty.isError === true);
await client.close(); try { await transport.close?.(); } catch {}
const { client: roClient, transport: roTransport } = await makeClient({ DSH_THUMBS_MODE: 'read-only' });
const roSave = await roClient.callTool({ name: 'save', arguments: { title: 'X', output: path.join(tmpDir, 'ro.svg'), confirm: true } });
console.log('read-only save isError:', roSave.isError === true);
await roClient.close(); try { await roTransport.close?.(); } catch {}
console.log('OK');
