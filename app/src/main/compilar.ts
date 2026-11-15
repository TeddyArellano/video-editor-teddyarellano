// Vista previa con los componentes PROPIOS del proyecto: compila src/Reel.tsx del proyecto (y lo que importe) con el
// esbuild del toolkit (~/.reels-toolkit/remotion/node_modules/esbuild) en un solo script. React, Remotion, three… no se
// empaquetan: se toman de la app (window.__reelDeps), así el Player de la app puede dibujar el componente.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {TOOLKIT} from './rutas';

// lo poco de la API de esbuild que se usa (el paquete vive en el toolkit, no en la app)
type Resolver = {path: string; namespace?: string};
type Constructor = {
  onResolve: (o: {filter: RegExp}, fn: (a: {path: string}) => Resolver) => void;
  onLoad: (o: {filter: RegExp; namespace: string}, fn: (a: {path: string}) => {contents: string; loader: string}) => void;
};
type Esbuild = {build: (o: Record<string, unknown> & {plugins: {name: string; setup: (b: Constructor) => void}[]}) => Promise<{outputFiles: {text: string}[]}>};
let esb: Esbuild | null | undefined;
const esbuild = (): Esbuild | null => {
  if (esb !== undefined) return esb;
  try {
    const req = createRequire(path.join(TOOLKIT, 'remotion', 'package.json'));
    esb = req(path.join(TOOLKIT, 'remotion', 'node_modules', 'esbuild')) as Esbuild;
  } catch {
    esb = null;
  }
  return esb;
};

// módulos que pone la app (renderer/src/deps.ts); cualquier otro paquete se busca en node_modules del toolkit
// @remotion/google-fonts/<Fuente> (proyectos viejos que bajaban las fuentes de Google) → las fuentes locales de la app
export const EXTERNOS = /^(react|react-dom|react\/jsx-runtime|react\/jsx-dev-runtime|remotion|@remotion\/three|@remotion\/player|three|@remotion\/google-fonts\/[\w-]+)$/;

export type Compilado = {ok: true; codigo: string; ms: number} | {ok: false; error: string};
const cache = new Map<string, {huella: string; r: Compilado}>();

// huella de src/ (archivos y fechas): si nada cambió, se reusa el resultado
const huellaDe = (dir: string): string => {
  const partes: string[] = [];
  const ver = (d: string) => {
    for (const f of fs.readdirSync(d, {withFileTypes: true})) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) ver(p);
      else partes.push(`${p}:${fs.statSync(p).mtimeMs}`);
    }
  };
  ver(dir);
  return partes.sort().join('|');
};

export const compilarProyecto = async (ruta: string): Promise<Compilado> => {
  const src = path.join(ruta, 'src');
  const entrada = path.join(src, 'Reel.tsx');
  if (!fs.existsSync(entrada)) return {ok: false, error: 'el proyecto no tiene src/Reel.tsx'};
  const e = esbuild();
  if (!e) return {ok: false, error: 'no encuentro esbuild en el toolkit (corre Instalar / reparar)'};
  const huella = huellaDe(src);
  const c = cache.get(ruta);
  if (c && c.huella === huella) return c.r;
  const t0 = Date.now();
  try {
    const r = await e.build({
      stdin: {contents: `export {Reel} from ${JSON.stringify(entrada)};`, resolveDir: src, loader: 'ts', sourcefile: 'entrada-reel-studio.ts'},
      bundle: true,
      write: false,
      format: 'iife',
      globalName: '__reelProyecto',
      platform: 'browser',
      target: 'chrome130',
      jsx: 'automatic',
      loader: {'.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.svg': 'dataurl', '.webp': 'dataurl', '.woff2': 'dataurl'},
      nodePaths: [path.join(TOOLKIT, 'remotion', 'node_modules')],
      logLevel: 'silent',
      plugins: [
        {
          name: 'deps-de-la-app',
          setup(b) {
            b.onResolve({filter: EXTERNOS}, (a) => ({path: a.path, namespace: 'app'}));
            b.onLoad({filter: /.*/, namespace: 'app'}, (a) => {
              const gf = /^@remotion\/google-fonts\/(.+)$/.exec(a.path);
              if (gf) return {contents: `module.exports = window.__reelDeps['@remotion/google-fonts'](${JSON.stringify(gf[1])});`, loader: 'js'};
              return {
                contents: `const m = window.__reelDeps && window.__reelDeps[${JSON.stringify(a.path)}]; if (!m) throw new Error('Reel Studio no tiene el módulo ${a.path}'); module.exports = m;`,
                loader: 'js',
              };
            });
          },
        },
      ],
    });
    const res: Compilado = {ok: true, codigo: r.outputFiles[0].text, ms: Date.now() - t0};
    cache.set(ruta, {huella, r: res});
    return res;
  } catch (err) {
    const m = err as {errors?: {text: string; location?: {file: string; line: number}}[]; message?: string};
    const error = m.errors?.length ? m.errors.slice(0, 3).map((x) => `${x.location ? `${path.basename(x.location.file)}:${x.location.line} ` : ''}${x.text}`).join('\n') : String(m.message ?? err);
    return {ok: false, error};
  }
};
