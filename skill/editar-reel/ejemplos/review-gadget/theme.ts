// Tema global: datos del video (data.json, generado por `reel datos`) + estilo (estilo.json, preset editable).
import {loadFont as lilita} from '@remotion/google-fonts/LilitaOne';
import {loadFont as marker} from '@remotion/google-fonts/PermanentMarker';
import {loadFont as bangers} from '@remotion/google-fonts/Bangers';
import {loadFont as bungee} from '@remotion/google-fonts/Bungee';
import {loadFont as montserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as poppins} from '@remotion/google-fonts/Poppins';
import {loadFont as anton} from '@remotion/google-fonts/Anton';
import {loadFont as silkscreen} from '@remotion/google-fonts/Silkscreen';
import {loadFont as righteous} from '@remotion/google-fonts/Righteous';
import {loadFont as pacifico} from '@remotion/google-fonts/Pacifico';
import {loadFont as rubikMono} from '@remotion/google-fonts/RubikMonoOne';
import {loadFont as lobster} from '@remotion/google-fonts/Lobster';
import {loadFont as bowlby} from '@remotion/google-fonts/BowlbyOne';
import {loadFont as caveatBrush} from '@remotion/google-fonts/CaveatBrush';
import {loadFont as yellowtail} from '@remotion/google-fonts/Yellowtail';
import {loadFont as unbounded} from '@remotion/google-fonts/Unbounded';
import {loadFont as instrumentSerif} from '@remotion/google-fonts/InstrumentSerif';
import {loadFont as spaceGrotesk} from '@remotion/google-fonts/SpaceGrotesk';
import {loadFont as archivoBlack} from '@remotion/google-fonts/ArchivoBlack';
import {loadFont as outfit} from '@remotion/google-fonts/Outfit';
import data from './data.json';
import estilo from './estilo.json';

const mont = montserrat('normal', {weights: ['600', '700', '800', '900'], subsets: ['latin']}).fontFamily;
montserrat('italic', {weights: ['800', '900'], subsets: ['latin']});
const FONTS: Record<string, string> = {
  'Lilita One': lilita().fontFamily,
  'Permanent Marker': marker().fontFamily,
  Bangers: bangers().fontFamily,
  Bungee: bungee().fontFamily,
  Montserrat: mont,
  Poppins: poppins('normal', {weights: ['600', '700', '800'], subsets: ['latin']}).fontFamily,
  Anton: anton().fontFamily,
  Silkscreen: silkscreen('normal', {weights: ['400', '700'], subsets: ['latin']}).fontFamily,
  Righteous: righteous().fontFamily,
  Pacifico: pacifico().fontFamily,
  'Rubik Mono One': rubikMono().fontFamily,
  Lobster: lobster().fontFamily,
  'Bowlby One': bowlby().fontFamily,
  'Caveat Brush': caveatBrush().fontFamily,
  Yellowtail: yellowtail().fontFamily,
  Unbounded: unbounded('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily,
  'Instrument Serif': instrumentSerif('normal', {subsets: ['latin']}).fontFamily,
  'Instrument Serif Italic': instrumentSerif('italic', {subsets: ['latin']}).fontFamily,
  'Space Grotesk': spaceGrotesk('normal', {weights: ['500', '700'], subsets: ['latin']}).fontFamily,
  'Archivo Black': archivoBlack().fontFamily,
  Outfit: outfit('normal', {weights: ['600', '800'], subsets: ['latin']}).fontFamily,
};
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
export type Span = {a: number; b: number};
export type HookEl = {
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
  fast: [number, number][];
  items: {sec: string; f: number}[];
  zooms: (Span & {cx: number; cy: number; z: number})[];
  names: (Span & {nombre: string; sub: string; color?: string | null})[];
  labels: (Span & {texto: string; color?: string | null})[];
  images: (Span & {src: string; pos: 'arriba' | 'centro' | 'abajo'; ancho: number; titulo?: string; texto?: string; tarjeta: boolean})[];
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
export const D = data as unknown as Data;

type Estilo = {
  colores: {acento: string; texto: string; contorno: string; a: string; b: string; pildora: string};
  subtitulos: {fuente: string; peso?: number; italic?: boolean; size: number; top: number; contorno: number; maxPalabras: number; maxChars: number; mayus: boolean; sombra?: string};
  camara: {empuje: number; ancla_y: number; zoom_objeto?: number};
  contador: {titulo: string; fuente: string; fuente_num: string};
  nombre: {fuente: string; sub_fuente: string};
  etiqueta: {fuente: string; peso?: number; size: number; top: number; bg?: string; color?: string};
  transicion: {fuente: string; texto_fuente: string};
  cierre: {fuente: string; peso?: number; italic?: boolean};
  monto?: {estilo?: 'pixel' | 'golpe'}; // golpe = cifra grande verde con billetes (Rocket Revolution)
};
export const E = estilo as unknown as Estilo;
export const CIERRE_LEN = D.cierre ? Math.round((D.cierre.dur ?? 2.3) * FPS) : 0;
export const CUT = D.n;
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
export const HOOK_START = D.hook && (D.intro3d || (D.hook as {tras_intro?: boolean}).tras_intro)
  ? Math.max(0, Math.min(...D.hook.elementos.map((e) => (e.at ?? 0) as number)) - 6)
  : 0;
export const enGancho = (f: number) => !!D.hook && f >= HOOK_START && f < D.hookEnd;
