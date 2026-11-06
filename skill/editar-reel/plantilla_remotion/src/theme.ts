// Tema global: datos del video (data.json, generado por `reel datos`) + estilo (estilo.json, preset editable).
import {continueRender, delayRender, staticFile} from 'remotion';
import fuentes from './fuentes.json';
import data from './data.json';
import estilo from './estilo.json';
import vlogJson from './vlog.json';
import landJson from './land.json';

// Fuentes LOCALES (public/fonts, descargadas de Google Fonts; licencia OFL): no hace falta internet para ver ni renderizar.
// src/fuentes.json = manifiesto {familia, peso, estilo, subconjunto, rango, archivo}. Se cargan una vez, con delayRender.
type Fuente = {familia: string; peso: string; estilo: string; rango: string; archivo: string};
let fuentesCargadas = false;
export const cargarFuentes = (base?: string | null) => {
  if (fuentesCargadas || typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  fuentesCargadas = true;
  for (const f of fuentes as Fuente[]) {
    const url = base ? base + f.archivo : staticFile(`fonts/${f.archivo}`);
    const h = delayRender(`fuente ${f.archivo}`);
    const ff = new FontFace(f.familia, `url("${url}") format("woff2")`, {weight: f.peso, style: f.estilo, unicodeRange: f.rango, display: 'block'});
    document.fonts.add(ff);
    ff.load().then(
      () => continueRender(h),
      (e) => {
        console.error(`no se pudo cargar ${f.archivo}`, e);
        continueRender(h);
      },
    );
  }
};
const FONTS: Record<string, string> = Object.fromEntries((fuentes as Fuente[]).map((f) => [f.familia, f.familia]));
export const font = (name?: string) => (name ? FONTS[name] ?? name : FONTS['Montserrat']);
// ancho aproximado por carácter (en em) de cada fuente, para que una línea nunca se salga de la zona segura
const CHAR_W: Record<string, number> = {
  'Lilita One': 0.52, 'Permanent Marker': 0.62, Bangers: 0.46, Bungee: 0.78, Montserrat: 0.7, Poppins: 0.64, Anton: 0.46, Silkscreen: 0.78,
};
export const fitSize = (text: string, size: number, fuente?: string, maxW = 1080 - 2 * 175, italic = false) =>
  Math.min(size, Math.floor(maxW / (Math.max(1, text.length) * (CHAR_W[fuente ?? 'Montserrat'] ?? 0.65) * (italic ? 1.06 : 1))));

export const W = 1080;
export const H = 1920;
export const FPS = 30;
// Zona segura TikTok/Reels: el texto vive en x 125–905, y 260–1500. Centrar SIEMPRE en x = 540 (márgenes simétricos).
export const SAFE = {top: 260, bottom: 1500, left: 125, right: 175};
export const SIDE = SAFE.right; // margen simétrico para bloques centrados
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export type Word = {text: string; start: number; end: number; sec: string; key?: boolean; corte?: boolean; enf?: boolean};
export type Sec = {id: string; a: number; b: number; zoom: number; color?: string | null; contador?: {label: string; color?: string} | null};
export type Span = {a: number; b: number; ev?: number} & Libre;
export type HookEl = {
  top?: number;
  tipo: 'texto' | 'stickers' | 'nota' | 'pildora' | 'imagen';
  texto?: string;
  fuente?: string;
  peso?: number;
  italic?: boolean;
  size?: number;
  color?: string;
  bg?: string;
  contorno?: number;
  sombra?: boolean;
  rot?: number;
  at?: number;
  anim?: 'pop' | 'slide' | 'rise' | 'letras';
  align?: 'center' | 'left' | 'right';
  items?: {texto: string; bg: string; rot?: number}[];
  vs?: string;
  src?: string;
  ancho?: number;
  mt?: number;
  delante?: boolean; // con gancho.detras: esta línea va ENCIMA de la persona recortada
};
export type Data = {
  n: number;
  words: Word[];
  secs: Sec[];
  track: {x: number[]; y: number[]};
  fast: [number, number, number?][];
  items: {sec: string; f: number}[];
  zooms: (Span & {cx: number; cy: number; z: number})[];
  names: (Span & {nombre: string; sub: string; color?: string | null})[];
  labels: (Span & {texto: string; color?: string | null})[];
  images: (Span & {src: string; pos: 'arriba' | 'centro' | 'abajo' | 'completa'; ancho: number; titulo?: string; texto?: string; tarjeta: boolean; top?: number})[];
  broll: (Span & {src: string})[];
  transitions: {f: number; texto: string; a?: string | null; b?: string | null; len: number}[];
  sfx: {f: number; src: string; v: number; len: number}[];
  hook: null | {top?: number; dur?: number; detras?: boolean; decoracion?: string; elementos: HookEl[]};
  hookEnd: number;
  hookfg: number;
  cierre: null | {pregunta: string; cta?: string; dur?: number};
  musica: null | {src: string; vol?: number};
  montos?: (Span & {texto: string; top?: number; size?: number; color?: string; sub?: string})[];
  // intro 3D (eventos.json → intro_espacio): t = cuadros de [línea 1, línea 2, hud]; capa = video pre-renderizado (reel capas)
  intro3d?: null | {sec: string; fin: number; titulo: string[]; hud: string; t: (number | null)[]; monedas: number | null;
    planeta: boolean; cohete: boolean; warp: boolean; capa?: string};
  emojis?: (Span & {emoji: string; texto?: string})[];
  calendario?: (Span & {dia: string; mes: string; texto?: string; top?: number; color?: string})[];
};

export type Estilo = {
  colores: {acento: string; texto: string; contorno: string; a: string; b: string; pildora: string};
  subtitulos: {fuente: string; peso?: number; italic?: boolean; size: number; top: number; contorno: number; maxPalabras: number; maxChars: number; mayus: boolean; sombra?: string; simple?: boolean};
  camara: {empuje: number; ancla_y: number; zoom_objeto?: number};
  contador: {titulo: string; fuente: string; fuente_num: string};
  nombre: {fuente: string; sub_fuente: string};
  etiqueta: {fuente: string; peso?: number; size: number; top: number; bg?: string; color?: string};
  transicion: {fuente: string; texto_fuente: string};
  cierre: {fuente: string; peso?: number; italic?: boolean};
  monto?: {estilo?: 'pixel' | 'golpe'}; // golpe = cifra grande verde con billetes (Rocket Revolution)
};
export const secAt = (f: number) => D.secs.find((s) => f >= s.a && f < s.b) ?? D.secs[D.secs.length - 1];
export const stroke = (px: number, color = E.colores.contorno) => ({WebkitTextStroke: `${px}px ${color}`, paintOrder: 'stroke fill' as const});
// primera y libre debajo de los elementos fijos de arriba (contador, insignia x2, nombre), para no encimar
export const topLibre = (f: number) => {
  const s = secAt(f);
  const counter = !!s.contador && !(D.hook && f < D.hookEnd);
  const fast = D.fast.some(([a, b]) => f >= a && f < b);
  const name = D.names.some((x) => f >= x.a && f < x.b);
  return SAFE.top + 20 + (counter ? 130 : name ? 120 : 0) + (fast ? 90 : 0);
};

// El gancho puede empezar DESPUÉS de una intro del creador (Rocket Revolution): antes de HOOK_START hay subtítulos normales.
// Sin intro, HOOK_START = 0 y todo funciona como antes.
const hookStart = (d: Data) => d.hook && (d.intro3d || (d.hook as {tras_intro?: boolean}).tras_intro)
  ? Math.max(0, Math.min(...d.hook.elementos.map((e) => (e.at ?? 0) as number)) - 6)
  : 0;
export const enGancho = (f: number) => !!D.hook && f >= HOOK_START && f < D.hookEnd;

// ---------------------------------------------------------------- datos intercambiables
// D/E/VLOG/LAND son "live bindings": `npx remotion render` usa los JSON importados arriba (como siempre) y la app
// (Reel Studio, @remotion/player) pasa otros datos por props → setDatos() los reemplaza ANTES de que se dibujen los hijos.
// Todo lo que se calcula a partir de los datos (bloques de subtítulos, tramos de cámara…) va con derivado(): se recalcula
// solo cuando cambian los datos.
export type Vlog = Record<string, unknown>;
export type Datos = {data?: unknown; estilo?: unknown; vlog?: unknown; land?: unknown; base?: string | null; proxy?: boolean; fuentes?: string | null};
export let D: Data;
export let E: Estilo;
export let VLOG: Vlog;
export let LAND: [number, number][];
export let CUT = 0;
export let CIERRE_LEN = 0;
export let HOOK_START = 0;
export let PROXY = false;
let BASE: string | null = null;
let version = 0;
const cierreLen = (d: Data) => (d.cierre ? Math.round((d.cierre.dur ?? 2.3) * FPS) : 0);
export const totalFrames = (d: Data) => d.n + cierreLen(d);
export const setDatos = (o: Datos) => {
  const d = (o.data ?? data) as unknown as Data;
  const e = (o.estilo ?? estilo) as unknown as Estilo;
  const v = (o.vlog ?? vlogJson) as Vlog;
  const l = (o.land ?? landJson) as [number, number][];
  const b = o.base ?? null;
  const px = !!o.proxy;
  if (d === D && e === E && v === VLOG && l === LAND && b === BASE && px === PROXY) return;
  D = d;
  E = e;
  VLOG = v;
  LAND = l;
  BASE = b;
  PROXY = px;
  CUT = d.n;
  CIERRE_LEN = cierreLen(d);
  HOOK_START = hookStart(d);
  version++;
};
// valor calculado a partir de los datos, con caché hasta el siguiente setDatos()
export const derivado = <T,>(fn: () => T) => {
  let v = -1;
  let val: T;
  return () => {
    if (v !== version) {
      val = fn();
      v = version;
    }
    return val;
  };
};
// ruta de un archivo de public/: staticFile() al renderizar; en la app, la URL del proyecto abierto
export const asset = (p: string) => (BASE === null ? staticFile(p) : BASE + p.split('/').map(encodeURIComponent).join('/'));
setDatos({});

// ---------------------------------------------------------------- posición libre (eventos.json → dx, dy, escala, rot)
// Cualquier elemento movible se envuelve en <Pos>: sin campos se dibuja EXACTAMENTE igual que antes (el envoltorio se
// comporta como su contenedor flex); con dx/dy (px), escala y rot se mueve sobre su posición normal.
// data-reel="<lista>:<i>" permite que Reel Studio encuentre el elemento en el lienzo.
export type Libre = {dx?: number; dy?: number; escala?: number; rot?: number};
export const libre = (o?: Libre | null) => {
  if (!o) return undefined;
  const t: string[] = [];
  if (o.dx || o.dy) t.push(`translate(${o.dx ?? 0}px, ${o.dy ?? 0}px)`);
  if (o.rot) t.push(`rotate(${o.rot}deg)`);
  if (o.escala !== undefined && o.escala !== 1) t.push(`scale(${o.escala})`);
  return t.length ? t.join(' ') : undefined;
};
