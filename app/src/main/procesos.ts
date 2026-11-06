// Cola de trabajos: corre `reel.py <cmd> -p <proyecto> … --json` (uno a la vez: los procesos pesados se comen la RAM)
// y reporta cada línea JSON (progreso, ok, avisos, errores) a la interfaz.
import {spawn, type ChildProcess} from 'node:child_process';
import crypto from 'node:crypto';
import type {LineaReel, Trabajo} from '../shared/tipos';
import {PYTHON, entorno, reelPy, skillDir} from './rutas';

type Interno = Trabajo & {ruta: string; proc?: ChildProcess};
const cola: Interno[] = [];
const historial: Interno[] = [];
let avisar: (t: Trabajo) => void = () => {};
export const alAvisar = (fn: (t: Trabajo) => void) => (avisar = fn);

const publico = (t: Interno): Trabajo => {
  const {proc: _p, ruta: _r, ...rest} = t;
  return {...rest, lineas: rest.lineas.slice(-200)};
};

// comando: ["datos"] | ["render", "--borrador"] | ["vlog.py", "datos"] (scripts de la skill)…
// los comandos de reel.py reciben -p <ruta>; para otros scripts el comando trae sus propios argumentos.
const argv = (t: Interno): string[] => {
  const [c, ...resto] = t.comando;
  if (c.endsWith('.py')) return [`${skillDir()}/scripts/${c}`, ...resto.map((x) => (x === '{P}' ? t.ruta : x))];
  const sinProyecto = ['nuevo', 'prueba'].includes(c);
  return [reelPy(), c, ...(sinProyecto ? [] : ['-p', t.ruta]), ...resto, '--json'];
};

export const encolar = (proyecto: string, ruta: string, titulo: string, comando: string[]): string => {
  // un "datos" pendiente igual al que se pide no se repite (la app lo pide en cada cambio)
  const igual = cola.find((x) => x.estado === 'en_cola' && x.proyecto === proyecto && x.comando.join(' ') === comando.join(' '));
  if (igual) return igual.id;
  const t: Interno = {id: crypto.randomUUID(), proyecto, ruta, titulo, comando, estado: 'en_cola', lineas: []};
  cola.push(t);
  avisar(publico(t));
  siguiente();
  return t.id;
};

let corriendo: Interno | null = null;
const siguiente = () => {
  if (corriendo) return;
  const t = cola.find((x) => x.estado === 'en_cola');
  if (!t) return;
  corriendo = t;
  t.estado = 'corriendo';
  t.inicio = Date.now();
  avisar(publico(t));
  const [prog, ...args] = [PYTHON, ...argv(t)];
  const p = spawn(prog, args, {cwd: t.ruta, env: entorno()});
  t.proc = p;
  let buf = '';
  const linea = (s: string) => {
    if (!s.trim()) return;
    let l: LineaReel;
    try {
      l = JSON.parse(s);
      if (!l || typeof l.msg !== 'string') throw new Error();
    } catch {
      l = {tipo: 'info', msg: s};
    }
    t.lineas.push(l);
    if (l.pct !== undefined) t.pct = l.pct;
    if (l.tipo !== 'info' || !t.ultimo) t.ultimo = l.msg;
    avisar(publico(t));
  };
  p.stdout.on('data', (d: Buffer) => {
    buf += d.toString();
    let k;
    while ((k = buf.indexOf('\n')) >= 0) {
      linea(buf.slice(0, k));
      buf = buf.slice(k + 1);
    }
  });
  p.stderr.on('data', (d: Buffer) => {
    for (const s of d.toString().split('\n')) if (s.trim()) t.lineas.push({tipo: 'info', msg: s});
  });
  p.on('close', (code) => {
    if (buf) linea(buf);
    if (t.estado !== 'cancelado') t.estado = code === 0 ? 'ok' : 'error';
    if (t.estado === 'error' && !t.lineas.some((l) => l.tipo === 'error')) {
      const ult = t.lineas.filter((l) => l.tipo === 'info').slice(-3).map((l) => l.msg).join(' ');
      t.lineas.push({tipo: 'error', msg: ult || `terminó con código ${code}`});
      t.ultimo = ult || `terminó con código ${code}`;
    } else if (t.estado === 'error') t.ultimo = t.lineas.filter((l) => l.tipo === 'error').map((l) => l.msg).join(' · ');
    t.fin = Date.now();
    t.proc = undefined;
    avisar(publico(t));
    cola.splice(cola.indexOf(t), 1);
    historial.unshift(t);
    historial.splice(50);
    corriendo = null;
    siguiente();
  });
};

export const cancelar = (id: string) => {
  const t = cola.find((x) => x.id === id);
  if (!t) return;
  if (t.estado === 'en_cola') {
    t.estado = 'cancelado';
    cola.splice(cola.indexOf(t), 1);
    historial.unshift(t);
    avisar(publico(t));
  } else if (t.proc) {
    t.estado = 'cancelado';
    t.proc.kill('SIGTERM');
  }
};

export const lista = (): Trabajo[] => [...cola, ...historial].map(publico);

// varios pasos en orden; si uno falla (o se cancela) los demás no corren
export const encolarCadena = async (proyecto: string, ruta: string, pasos: {titulo: string; comando: string[]}[]) => {
  for (const p of pasos) {
    const t = await esperar(encolar(proyecto, ruta, p.titulo, p.comando));
    if (t.estado !== 'ok') return false;
  }
  return true;
};

// espera a que termine un trabajo (para pruebas y pasos encadenados)
export const esperar = (id: string): Promise<Trabajo> =>
  new Promise((ok) => {
    const t0 = setInterval(() => {
      const t = lista().find((x) => x.id === id);
      if (t && ['ok', 'error', 'cancelado'].includes(t.estado)) {
        clearInterval(t0);
        ok(t);
      }
    }, 100);
  });
