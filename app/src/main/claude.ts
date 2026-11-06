// Claude integrado: corre Claude Code en modo headless (`claude -p … --output-format stream-json`) dentro del proyecto,
// con la sesión y la skill /editar-reel que ya tiene el creador. La app solo muestra lo que hace; los archivos que
// Claude cambie llegan a la vista previa por el vigilante (como cualquier cambio externo).
import {spawn, type ChildProcess} from 'node:child_process';
import crypto from 'node:crypto';
import type {EventoClaude} from '../shared/tipos';
import {entorno, python, reelPy} from './rutas';

const sesiones = new Map<string, ChildProcess>();

export const CONTEXTO = (ruta: string) =>
  [
    `Estás dentro de Reel Studio (la app de escritorio de la skill /editar-reel). Proyecto: ${ruta}.`,
    'Usa la skill /editar-reel y sus reglas. El creador tiene la app abierta: relee cualquier archivo justo antes de cambiarlo,',
    'respeta dx/dy/escala/rot de eventos.json y, después de cambiar eventos.json, plan.json o estilo.json, corre los pasos que',
    `correspondan (p. ej. ${python()} ${reelPy()} datos -p "${ruta}"). No renderices el video final salvo que te lo pida.`,
    'Responde en español, breve: qué cambiaste y por qué.',
  ].join(' ');

export const preguntar = (ruta: string, prompt: string, avisar: (e: EventoClaude) => void): string => {
  const sesion = crypto.randomUUID();
  const args = [
    '-p', prompt,
    '--append-system-prompt', CONTEXTO(ruta),
    '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', `Bash(${python()}:*)`, 'Read', 'Edit', 'Write', 'Glob', 'Grep',
  ];
  const p = spawn('claude', args, {cwd: ruta, env: entorno()});
  sesiones.set(sesion, p);
  let buf = '';
  const linea = (s: string) => {
    if (!s.trim()) return;
    try {
      const m = JSON.parse(s);
      if (m.type === 'assistant') {
        for (const c of m.message?.content ?? []) {
          if (c.type === 'text' && c.text) avisar({sesion, tipo: 'texto', texto: c.text});
          if (c.type === 'tool_use') avisar({sesion, tipo: 'herramienta', texto: `${c.name}: ${resumen(c.input)}`});
        }
      } else if (m.type === 'result') {
        avisar({sesion, tipo: m.is_error ? 'error' : 'fin', texto: m.is_error ? String(m.result ?? 'error') : ''});
      }
    } catch {
      /* línea no JSON: se ignora */
    }
  };
  p.stdout.on('data', (d: Buffer) => {
    buf += d.toString();
    let k;
    while ((k = buf.indexOf('\n')) >= 0) {
      linea(buf.slice(0, k));
      buf = buf.slice(k + 1);
    }
  });
  let err = '';
  p.stderr.on('data', (d: Buffer) => (err += d.toString()));
  p.on('error', (e) => avisar({sesion, tipo: 'error', texto: `No se pudo iniciar Claude Code (${e.message}). ¿Está instalado el comando "claude"?`}));
  p.on('close', (code) => {
    if (buf) linea(buf);
    sesiones.delete(sesion);
    if (code !== 0 && code !== null) avisar({sesion, tipo: 'error', texto: err.trim().slice(-500) || `claude terminó con código ${code}`});
    avisar({sesion, tipo: 'fin', texto: ''});
  });
  return sesion;
};

const resumen = (input: unknown): string => {
  if (!input || typeof input !== 'object') return '';
  const o = input as Record<string, unknown>;
  const v = o.command ?? o.file_path ?? o.pattern ?? o.description ?? '';
  return String(v).slice(0, 160);
};

// Publicar en claude.ai necesita la herramienta Artifact, que el modo -p no tiene (verificado: no aparece en la lista
// de herramientas al iniciar). Se abre una sesión INTERACTIVA de Claude Code en Terminal, en la carpeta del proyecto,
// con el pedido ya escrito y permiso solo para Artifact, leer y correr reel.py. El creador la ve y la puede detener.
// REEL_TERMINAL_REGISTRO=<archivo>: en pruebas, escribe ahí el comando en lugar de abrir Terminal.
export const comillasShell = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
export const comandoSesion = (ruta: string, prompt: string) =>
  `cd ${comillasShell(ruta)} && claude --allowedTools Artifact Read ${comillasShell(`Bash(${python()}:*)`)} -- ${comillasShell(prompt)}`;
export const abrirSesionInteractiva = async (ruta: string, prompt: string) => {
  const cmd = comandoSesion(ruta, prompt);
  if (process.env.REEL_TERMINAL_REGISTRO) {
    const fs = await import('node:fs');
    fs.writeFileSync(process.env.REEL_TERMINAL_REGISTRO, cmd);
    return cmd;
  }
  const script = `tell application "Terminal"\n  activate\n  do script ${JSON.stringify(cmd)}\nend tell`;
  await new Promise<void>((ok, mal) => {
    const p = spawn('osascript', ['-e', script], {env: entorno()});
    p.on('close', (c) => (c === 0 ? ok() : mal(new Error(`osascript terminó con ${c}`))));
  });
  return cmd;
};

export const cancelarClaude = (sesion: string) => sesiones.get(sesion)?.kill('SIGTERM');
