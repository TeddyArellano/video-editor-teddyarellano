// Proyectos de /editar-reel: abrir, estado, recientes y vigilancia de cambios hechos por otros (Claude, reel.py).
import {app} from 'electron';
import chokidar, {type FSWatcher} from 'chokidar';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {ARCHIVOS, type Archivo, type CambioArchivo, type ProyectoInfo, type Reciente, type Snapshot} from '../shared/tipos';
import {hashArchivo, leerJSON} from './archivos';
import {baseDe, dejarDeServir, servirProyecto} from './medios';
import {plantillaDir} from './rutas';

type Abierto = {id: string; ruta: string; vigilante: FSWatcher};
export const abiertos = new Map<string, Abierto>();
export const propias = new Set<string>(); // "<archivo>:<hash>" escritos por la app

// acepta la carpeta proyecto_remotion o la del material que la contiene
export const normalizarRuta = (ruta: string): string => {
  const r = path.resolve(ruta);
  if (fs.existsSync(path.join(r, 'edicion', 'proyecto.json'))) return r;
  if (fs.existsSync(path.join(r, 'proyecto_remotion', 'edicion', 'proyecto.json'))) return path.join(r, 'proyecto_remotion');
  throw new Error(`${r} no es un proyecto de editar-reel (falta edicion/proyecto.json)`);
};

// mismo id que reel.py (proyecto.json → id, o md5 de la ruta para proyectos que aún no lo tienen)
export const idDe = (ruta: string): string => {
  const cfg = (leerJSON(path.join(ruta, 'edicion', 'proyecto.json'))?.contenido ?? {}) as {id?: string};
  return cfg.id || crypto.createHash('md5').update(ruta).digest('hex').slice(0, 10);
};

const mtime = (f: string) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);

const componentesPropios = (ruta: string): string[] => {
  const out: string[] = [];
  const pl = path.join(plantillaDir(), 'src');
  const revisar = (rel: string) => {
    const a = path.join(ruta, 'src', rel);
    const b = path.join(pl, rel);
    if (!fs.existsSync(a)) return;
    if (!fs.existsSync(b) || fs.readFileSync(a, 'utf8') !== fs.readFileSync(b, 'utf8')) out.push(rel);
  };
  for (const f of ['Reel.tsx', 'Root.tsx', 'theme.ts']) revisar(f);
  const comps = path.join(ruta, 'src', 'components');
  if (fs.existsSync(comps)) for (const f of fs.readdirSync(comps)) if (/\.tsx?$/.test(f)) revisar(path.join('components', f));
  return out;
};

export const infoDe = (ruta: string): ProyectoInfo => {
  const cfg = (leerJSON(path.join(ruta, 'edicion', 'proyecto.json'))?.contenido ?? {}) as Record<string, string>;
  const id = idDe(ruta);
  const pal = path.join(ruta, 'edicion', 'palabras');
  const clips = fs.existsSync(pal) ? fs.readdirSync(pal).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort() : [];
  const cut = path.join(ruta, 'public', 'cut.mp4');
  const proxy = path.join(ruta, 'public', 'cut_proxy.mp4');
  const carpeta = cfg.fuentes ?? path.dirname(ruta);
  return {
    id,
    ruta,
    carpeta,
    nombre: cfg.nombre ?? path.basename(carpeta),
    estilo: cfg.estilo ?? '',
    base: baseDe(id),
    clips,
    estado: {
      transcrito: clips.length > 0,
      plan: fs.existsSync(path.join(ruta, 'edicion', 'plan.json')),
      cortado: fs.existsSync(cut),
      datos: fs.existsSync(path.join(ruta, 'src', 'data.json')) && fs.existsSync(cut),
      borrador: fs.existsSync(path.join(ruta, 'edicion', 'borrador.mp4')),
      final: fs.existsSync(path.join(carpeta, `${cfg.nombre}.mp4`)),
      proxy: fs.existsSync(proxy) && mtime(proxy) >= mtime(cut),
      componentesPropios: componentesPropios(ruta),
    },
  };
};

export const snapshot = (ruta: string): Snapshot => {
  const archivos = {} as Snapshot['archivos'];
  for (const a of ARCHIVOS) archivos[a] = leerJSON(path.join(ruta, a));
  return {info: infoDe(ruta), archivos};
};

// ---------------------------------------------------------------- recientes
const fRecientes = () => path.join(app.getPath('userData'), 'recientes.json');
export const recientes = (): Reciente[] => {
  try {
    const l = JSON.parse(fs.readFileSync(fRecientes(), 'utf8')) as Reciente[];
    return l.filter((r) => fs.existsSync(path.join(r.ruta, 'edicion', 'proyecto.json')));
  } catch {
    return [];
  }
};
const anotarReciente = (info: ProyectoInfo) => {
  const l = [{ruta: info.ruta, nombre: info.nombre, abierto: Date.now(), estilo: info.estilo}, ...recientes().filter((r) => r.ruta !== info.ruta)].slice(0, 30);
  fs.mkdirSync(path.dirname(fRecientes()), {recursive: true});
  fs.writeFileSync(fRecientes(), JSON.stringify(l, null, 2));
};

// ---------------------------------------------------------------- abrir / cerrar
export const abrir = (rutaIn: string, avisar: (c: CambioArchivo) => void): Snapshot => {
  const ruta = normalizarRuta(rutaIn);
  const id = idDe(ruta);
  if (!abiertos.has(id)) {
    servirProyecto(id, ruta, infoDe(ruta).carpeta);
    const vigilados = new Set<string>([...ARCHIVOS.map((a) => path.join(ruta, a)), path.join(ruta, 'public', 'cut.mp4')]);
    const vigilante = chokidar.watch([path.join(ruta, 'edicion'), path.join(ruta, 'src'), path.join(ruta, 'public')], {
      depth: 0,
      ignoreInitial: true,
      awaitWriteFinish: {stabilityThreshold: 250, pollInterval: 50},
    });
    const alCambiar = (f: string) => {
      if (!vigilados.has(f)) return;
      const rel = path.relative(ruta, f) as Archivo | 'public/cut.mp4';
      const h = rel === 'public/cut.mp4' ? String(mtime(f)) : hashArchivo(f);
      if (h && propias.has(`${f}:${h}`)) return; // lo escribió la app
      avisar({proyecto: id, archivo: rel, hash: h});
    };
    vigilante.on('add', alCambiar).on('change', alCambiar).on('unlink', alCambiar);
    abiertos.set(id, {id, ruta, vigilante});
  }
  const s = snapshot(ruta);
  anotarReciente(s.info);
  return s;
};

export const cerrar = async (id: string) => {
  const a = abiertos.get(id);
  if (!a) return;
  await a.vigilante.close();
  abiertos.delete(id);
  dejarDeServir(id);
};

export const rutaDe = (id: string): string => {
  const a = abiertos.get(id);
  if (!a) throw new Error(`proyecto ${id} no está abierto`);
  return a.ruta;
};
