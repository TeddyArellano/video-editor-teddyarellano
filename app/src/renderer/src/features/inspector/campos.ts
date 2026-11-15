// Propiedades editables de cada tipo de elemento (las mismas de referencia/eventos.md).
import type {Lista} from '@shared/elementos';

export type Campo = {
  k: string;
  t: 'texto' | 'area' | 'num' | 'color' | 'bool' | 'opcion' | 'archivo' | 'sfx' | 'fuente' | 'logos';
  n: string; // etiqueta visible
  op?: string[];
  min?: number;
  max?: number;
  paso?: number;
  ayuda?: string;
};

export const FUENTES = ['Montserrat', 'Anton', 'Lilita One', 'Permanent Marker', 'Bangers', 'Bungee', 'Poppins', 'Silkscreen', 'Righteous', 'Pacifico', 'Rubik Mono One', 'Lobster', 'Bowlby One', 'Caveat Brush', 'Yellowtail'];

const LIBRE: Campo[] = [
  {k: 'dx', t: 'num', n: 'Mover X (px)', paso: 1},
  {k: 'dy', t: 'num', n: 'Mover Y (px)', paso: 1},
  {k: 'escala', t: 'num', n: 'Escala', min: 0.2, max: 5, paso: 0.05},
  {k: 'rot', t: 'num', n: 'Rotación (°)', min: -180, max: 180, paso: 1},
];

export const CAMPOS: Record<Lista, Campo[]> = {
  labels: [{k: 'texto', t: 'area', n: 'Texto', ayuda: '"RÓTULO|NOMBRE": lo de antes de | va chico arriba'}, {k: 'color', t: 'color', n: 'Color de fondo'}, ...LIBRE],
  names: [{k: 'nombre', t: 'texto', n: 'Nombre'}, {k: 'sub', t: 'texto', n: 'Subtítulo'}, {k: 'color', t: 'color', n: 'Color'}, ...LIBRE],
  images: [
    {k: 'src', t: 'archivo', n: 'Imagen (public/)'},
    {k: 'pos', t: 'opcion', n: 'Posición', op: ['arriba', 'centro', 'abajo', 'completa']},
    {k: 'ancho', t: 'num', n: 'Ancho (px)', min: 60, max: 1080, paso: 10},
    {k: 'tarjeta', t: 'bool', n: 'Tarjeta blanca (solo QR)'},
    {k: 'titulo', t: 'texto', n: 'Título de la tarjeta'},
    {k: 'texto', t: 'texto', n: 'Texto de la tarjeta'},
    {k: 'top', t: 'num', n: 'Y (top, solo tarjeta)', paso: 10},
    ...LIBRE,
  ],
  montos: [
    {k: 'texto', t: 'texto', n: 'Cifra'},
    {k: 'sub', t: 'texto', n: 'Sello (MXN…)'},
    {k: 'top', t: 'num', n: 'Y (top)', paso: 10},
    {k: 'size', t: 'num', n: 'Tamaño', paso: 2},
    {k: 'color', t: 'color', n: 'Color'},
    ...LIBRE,
  ],
  emojis: [{k: 'emoji', t: 'texto', n: 'Emoji'}, {k: 'texto', t: 'texto', n: 'Texto'}, ...LIBRE],
  calendario: [
    {k: 'dia', t: 'texto', n: 'Día'},
    {k: 'mes', t: 'texto', n: 'Mes'},
    {k: 'texto', t: 'texto', n: 'Texto'},
    {k: 'top', t: 'num', n: 'Y (top)', paso: 10},
    {k: 'color', t: 'color', n: 'Color'},
    ...LIBRE,
  ],
  patrocinadores: [
    {k: 'logos', t: 'logos', n: 'Logos (public/)', ayuda: 'uno por renglón, en orden de izquierda a derecha (1–3)'},
    {k: 'fila', t: 'opcion', n: 'Fila', op: ['arriba', 'abajo']},
    {k: 'top', t: 'num', n: 'Y (top)', paso: 10},
    ...LIBRE,
  ],
  fechas: [
    {k: 'dia1', t: 'texto', n: 'Día 1'},
    {k: 'mes1', t: 'texto', n: 'Mes 1'},
    {k: 'tag1', t: 'texto', n: 'Etiqueta 1 (DEL)'},
    {k: 'color1', t: 'color', n: 'Color 1'},
    {k: 'dia2', t: 'texto', n: 'Día 2'},
    {k: 'mes2', t: 'texto', n: 'Mes 2'},
    {k: 'tag2', t: 'texto', n: 'Etiqueta 2 (AL)'},
    {k: 'color2', t: 'color', n: 'Color 2'},
    {k: 'banner', t: 'texto', n: 'Letrero final', ayuda: 'p. ej. ¡10 DÍAS DE FERIA!'},
    {k: 'top', t: 'num', n: 'Y (top)', paso: 10},
    {k: 'ocultar_subs', t: 'bool', n: 'Ocultar subtítulos (sin marcar = por defecto sí)'},
    ...LIBRE,
  ],
  broll: [{k: 'src', t: 'archivo', n: 'Video (public/)'}],
  zooms: [
    {k: 'cx', t: 'num', n: 'Centro X (0–1)', min: 0, max: 1, paso: 0.01},
    {k: 'cy', t: 'num', n: 'Centro Y (0–1)', min: 0, max: 1, paso: 0.01},
    {k: 'z', t: 'num', n: 'Zoom', min: 1, max: 4, paso: 0.05},
  ],
  sfx: [{k: 'sfx', t: 'sfx', n: 'Sonido'}, {k: 'vol', t: 'num', n: 'Volumen', min: 0, max: 1.5, paso: 0.02}, {k: 'dur', t: 'num', n: 'Duración (s)', min: 0.1, paso: 0.1}],
  hook: [
    {k: 'tipo', t: 'opcion', n: 'Tipo', op: ['texto', 'stickers', 'nota', 'pildora', 'imagen']},
    {k: 'texto', t: 'texto', n: 'Texto'},
    {k: 'fuente', t: 'fuente', n: 'Fuente'},
    {k: 'size', t: 'num', n: 'Tamaño', paso: 2},
    {k: 'peso', t: 'num', n: 'Peso', min: 100, max: 900, paso: 100},
    {k: 'italic', t: 'bool', n: 'Cursiva'},
    {k: 'color', t: 'color', n: 'Color'},
    {k: 'bg', t: 'color', n: 'Fondo'},
    {k: 'contorno', t: 'num', n: 'Contorno', min: 0, max: 40, paso: 1},
    {k: 'sombra', t: 'bool', n: 'Sombra'},
    {k: 'anim', t: 'opcion', n: 'Animación', op: ['pop', 'slide', 'rise', 'letras']},
    {k: 'align', t: 'opcion', n: 'Alineación', op: ['center', 'left', 'right']},
    {k: 'mt', t: 'num', n: 'Espacio arriba (mt)', paso: 2},
    {k: 'top', t: 'num', n: 'Y absoluta (top)', paso: 10},
    {k: 'rot', t: 'num', n: 'Giro propio (°)', paso: 1},
    {k: 'src', t: 'archivo', n: 'Imagen (tipo imagen)'},
    {k: 'ancho', t: 'num', n: 'Ancho imagen', paso: 10},
    {k: 'delante', t: 'bool', n: 'Delante de la persona'},
    {k: 'dx', t: 'num', n: 'Mover X (px)'},
    {k: 'dy', t: 'num', n: 'Mover Y (px)'},
    {k: 'escala', t: 'num', n: 'Escala', min: 0.2, max: 5, paso: 0.05},
  ],
};
