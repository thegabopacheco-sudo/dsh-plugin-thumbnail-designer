#!/usr/bin/env node
// dsh-plugin-thumbnail-designer — miniaturas SVG para videos/posts.
// Tools: status, preview, save.

import path from 'node:path';
import os from 'node:os';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

const VERSION = '0.1.0';
const DSH_HOME = (() => {
  const v = process.env.DSH_HOME && process.env.DSH_HOME.trim();
  return v || path.join(process.env.USERPROFILE || process.env.HOME || os.homedir(), '.dsh');
})();
const CONFIG_FILE = path.join(DSH_HOME, 'thumbnail-designer', 'config.json');
const CACHE_DIR = path.join(DSH_HOME, 'cache', 'thumbnail-designer');
const READ_ONLY = String(process.env.DSH_THUMBS_MODE || '').toLowerCase() === 'read-only';
const log = (m) => process.stderr.write(`[thumbs] ${m}\n`);

function loadConfig() { try { if (existsSync(CONFIG_FILE)) return { allowedPaths: [], ...(JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) || {}) }; } catch { /* defaults */ } return { allowedPaths: [] }; }
function allowedRoots() { const configured = loadConfig().allowedPaths; return (Array.isArray(configured) && configured.length ? configured : [process.env.USERPROFILE || process.env.HOME || os.homedir()]).map((item) => path.resolve(item)); }
function isAllowed(target) { const resolved = path.resolve(target); return resolved === CACHE_DIR || resolved.startsWith(CACHE_DIR + path.sep) || allowedRoots().some((root) => resolved === root || resolved.startsWith(root + path.sep)); }
function escapeXml(text) { return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function wrapText(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) current = (current + ' ' + word).trim();
    else { if (current) lines.push(current); current = word; if (lines.length >= maxLines - 1) break; }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}
function render(args) {
  if (!args.title || !String(args.title).trim()) throw new Error('title obligatorio');
  const palette = args.palette || {};
  const from = palette.from || '#0f172a';
  const to = palette.to || '#e11d48';
  const accent = args.accent || '#e11d48';
  const width = 1280;
  const height = 720;
  const titleLines = wrapText(args.title, 18, 3);
  const titleFont = titleLines.length <= 1 ? 92 : titleLines.length === 2 ? 76 : 64;
  const startY = titleLines.length === 1 ? 360 : titleLines.length === 2 ? 320 : 300;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Segoe UI, Arial, sans-serif">`,
    '<defs>',
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${escapeXml(from)}"/><stop offset="1" stop-color="${escapeXml(to)}"/></linearGradient>`,
    '</defs>',
    '<rect width="1280" height="720" fill="url(#bg)"/>',
    `<rect x="0" y="0" width="14" height="720" fill="${escapeXml(accent)}"/>`,
  ];
  if (args.badge) {
    parts.push(`<rect x="72" y="72" rx="18" width="${Math.min(420, 40 + String(args.badge).length * 22)}" height="56" fill="#0f172a" opacity="0.75"/>`);
    parts.push(`<text x="94" y="110" font-size="30" font-weight="600" fill="#ffffff">${escapeXml(args.badge)}</text>`);
  }
  titleLines.forEach((line, index) => {
    parts.push(`<text x="72" y="${startY + index * (titleFont + 12)}" font-size="${titleFont}" font-weight="800" fill="#ffffff">${escapeXml(line)}</text>`);
  });
  if (args.subtitle) {
    parts.push(`<text x="76" y="${startY + titleLines.length * (titleFont + 12) + 28}" font-size="34" fill="#e2e8f0">${escapeXml(args.subtitle)}</text>`);
  }
  parts.push(`<text x="1230" y="690" font-size="24" fill="#f8fafc" opacity="0.8" text-anchor="end">${escapeXml(args.watermark || 'WENDIGO')}</text>`);
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}
function textResult(text) { return { content: [{ type: 'text', text }] }; }
function uniquePath(target) { if (!existsSync(target)) return target; const parsed = path.parse(target); for (let index = 1; index < 1000; index++) { const candidate = path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`); if (!existsSync(candidate)) return candidate; } throw new Error('no se pudo generar nombre único'); }

function buildInstructions() {
  return [
    'Thumbnail Designer: diseña miniaturas SVG 1280x720.',
    '',
    `Salida: ${CACHE_DIR}`,
    '',
    'Herramientas: status, preview, save.',
    '',
    'Reglas:',
    '- preview devuelve el SVG; save escribe y requiere confirm:true.',
    '- Colores de gradiente, acento, badge y subtítulo opcionales.',
    '- Respeta allowedPaths y no sobrescribe.',
  ].join('\n');
}

function buildServer() {
  const server = new McpServer({ name: 'dsh-plugin-thumbnail-designer', version: VERSION }, { capabilities: { tools: {} }, instructions: buildInstructions() });
  const schema = z.object({ title: z.string().min(2).max(120), subtitle: z.string().max(160).optional(), badge: z.string().max(40).optional(), watermark: z.string().max(40).optional(), accent: z.string().max(20).optional(), palette: z.object({ from: z.string().max(20).optional(), to: z.string().max(20).optional() }).optional() });
  server.registerTool('status', { title: 'Estado', description: 'Rutas permitidas y modo.', inputSchema: z.object({}) }, async () => textResult([`Rutas permitidas: ${allowedRoots().join(', ')}`, `Salida: ${CACHE_DIR}`, `Modo: ${READ_ONLY ? 'read-only' : 'normal'}`].join('\n')));
  server.registerTool('preview', { title: 'Previsualizar miniatura', description: 'Genera el SVG sin escribir.', inputSchema: schema }, async (args) => textResult(render(args)));
  server.registerTool('save', { title: 'Guardar miniatura', description: 'Escribe el SVG. Requiere confirm:true.', inputSchema: schema.extend({ output: z.string().optional(), confirm: z.boolean().optional() }) }, async (args) => {
    if (READ_ONLY) throw new Error('modo read-only: save deshabilitado');
    if (args.confirm !== true) throw new Error('save requiere confirm:true y pedido explícito');
    const svg = render(args);
    const target = args.output ? path.resolve(args.output) : path.join(CACHE_DIR, `thumb-${new Date().toISOString().replace(/[:.]/g, '-')}.svg`);
    if (!isAllowed(target)) throw new Error(`ruta de salida no permitida: ${target}`);
    mkdirSync(path.dirname(target), { recursive: true });
    const file = uniquePath(target);
    writeFileSync(file, svg, 'utf8');
    return textResult(`Guardado: ${file} (${svg.length} bytes)`);
  });
  return server;
}

try { mkdirSync(CACHE_DIR, { recursive: true }); } catch { /* ignora */ }
log(`modo: ${READ_ONLY ? 'read-only' : 'normal'}`);
serveStdio(buildServer, { onerror: (e) => log(`serveStdio: ${e.message}`) });
process.on('uncaughtException', (e) => log(`excepción: ${e.message}`));
process.on('unhandledRejection', (e) => log(`rechazo: ${e && e.message ? e.message : String(e)}`));
