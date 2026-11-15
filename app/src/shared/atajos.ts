// Atajos de teclado configurables: cada acción tiene combinaciones por defecto y el usuario puede cambiarlas en
// Preferencias (preferencias.json → atajos: {accion: ["mod+e", …]}).
// Una combinación es "mod+alt+shift+<tecla>" (mod = ⌘ en Mac). Cada pulsación se compara de dos formas:
//   - por la tecla escrita (e.key): respeta la distribución del teclado ("+" en el teclado latinoamericano);
//   - por la tecla física (e.code): así "shift+," funciona aunque Shift convierta la coma en otro símbolo.

export type Accion = {id: string; n: string; def: string[]; grupo: 'Reproducción' | 'Edición' | 'Línea de tiempo' | 'Archivo'};

export const ACCIONES: Accion[] = [
  {id: 'play', n: 'Reproducir / pausar', def: ['space', 'k'], grupo: 'Reproducción'},
  {id: 'cuadroAtras', n: 'Cuadro anterior', def: ['arrowleft'], grupo: 'Reproducción'},
  {id: 'cuadroAdelante', n: 'Cuadro siguiente', def: ['arrowright'], grupo: 'Reproducción'},
  {id: 'segAtras', n: '1 segundo atrás', def: ['shift+arrowleft', 'j'], grupo: 'Reproducción'},
  {id: 'segAdelante', n: '1 segundo adelante', def: ['shift+arrowright', 'l'], grupo: 'Reproducción'},
  {id: 'inicio', n: 'Ir al principio', def: ['home'], grupo: 'Reproducción'},
  {id: 'fin', n: 'Ir al final', def: ['end'], grupo: 'Reproducción'},
  {id: 'corteAnterior', n: 'Corte anterior', def: ['arrowup'], grupo: 'Reproducción'},
  {id: 'corteSiguiente', n: 'Corte siguiente', def: ['arrowdown'], grupo: 'Reproducción'},
  {id: 'deshacer', n: 'Deshacer', def: ['mod+z'], grupo: 'Edición'},
  {id: 'rehacer', n: 'Rehacer', def: ['mod+shift+z'], grupo: 'Edición'},
  {id: 'dividir', n: 'Dividir el corte en el cabezal', def: ['s', 'mod+b'], grupo: 'Edición'},
  {id: 'recortarIni', n: 'Recortar inicio hasta el cabezal', def: ['q'], grupo: 'Edición'},
  {id: 'recortarFin', n: 'Recortar final hasta el cabezal', def: ['w'], grupo: 'Edición'},
  {id: 'marcarA', n: 'Marcar entrada del rango', def: ['i'], grupo: 'Edición'},
  {id: 'marcarB', n: 'Marcar salida del rango', def: ['o'], grupo: 'Edición'},
  {id: 'quitar', n: 'Quitar el rango o el elemento', def: ['x', 'delete', 'backspace'], grupo: 'Edición'},
  {id: 'recuperar', n: 'Recuperar lo tachado', def: ['r'], grupo: 'Edición'},
  {id: 'aplicar', n: 'Aplicar los recortes', def: ['enter'], grupo: 'Edición'},
  {id: 'empujarAtras', n: 'Mover el elemento 1 cuadro atrás', def: [','], grupo: 'Edición'},
  {id: 'empujarAdelante', n: 'Mover el elemento 1 cuadro adelante', def: ['.'], grupo: 'Edición'},
  {id: 'empujarAtras5', n: 'Mover el elemento 5 cuadros atrás', def: ['shift+,'], grupo: 'Edición'},
  {id: 'empujarAdelante5', n: 'Mover el elemento 5 cuadros adelante', def: ['shift+.'], grupo: 'Edición'},
  {id: 'duplicar', n: 'Duplicar el elemento', def: ['mod+d'], grupo: 'Edición'},
  {id: 'clave', n: 'Fotograma clave en el cabezal', def: ['alt+k'], grupo: 'Edición'},
  {id: 'texto', n: 'Agregar texto en el cabezal', def: ['t'], grupo: 'Edición'},
  {id: 'deseleccionar', n: 'Quitar la selección', def: ['escape'], grupo: 'Edición'},
  {id: 'cuchilla', n: 'Herramienta cuchilla', def: ['b'], grupo: 'Línea de tiempo'},
  {id: 'seleccion', n: 'Herramienta selección', def: ['v'], grupo: 'Línea de tiempo'},
  {id: 'iman', n: 'Imán de la línea de tiempo', def: ['n'], grupo: 'Línea de tiempo'},
  {id: 'acercar', n: 'Acercar', def: ['+', '=', 'shift+='], grupo: 'Línea de tiempo'},
  {id: 'alejar', n: 'Alejar', def: ['-'], grupo: 'Línea de tiempo'},
  {id: 'verTodo', n: 'Ver todo el video', def: ['0'], grupo: 'Línea de tiempo'},
  {id: 'guardar', n: 'Guardar ahora', def: ['mod+s'], grupo: 'Archivo'},
  {id: 'exportar', n: 'Exportar', def: ['mod+e'], grupo: 'Archivo'},
];

export type Teclado = {key: string; code?: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean};

const NOMBRES: Record<string, string> = {' ': 'space', spacebar: 'space', esc: 'escape', del: 'delete'};
const MODS = ['meta', 'control', 'alt', 'shift', 'os'];
// tecla física → tecla base (sin Shift) para letras, números y la puntuación común
const baseCodigo = (code?: string): string | null => {
  if (!code) return null;
  const m = /^Key([A-Z])$/.exec(code) ?? /^Digit(\d)$/.exec(code);
  if (m) return m[1].toLowerCase();
  return ({Comma: ',', Period: '.', Equal: '=', Minus: '-', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Backquote: '`'} as Record<string, string>)[code] ?? null;
};
const unir = (mod: boolean, alt: boolean, shift: boolean, k: string) => [mod && 'mod', alt && 'alt', shift && 'shift', k].filter(Boolean).join('+');

// combinación por la tecla escrita. Con Shift sobre un símbolo, el símbolo ya incluye el Shift (p. ej. "+", "<").
export const comboDe = (e: Teclado): string | null => {
  let k = e.key.toLowerCase();
  k = NOMBRES[k] ?? k;
  if (MODS.includes(k)) return null;
  const simbolo = k.length === 1 && !/[a-z0-9ñ]/.test(k);
  // con Alt, macOS escribe otro símbolo (Alt+K = "˚"): para combinaciones con Alt manda la tecla física
  if (e.altKey && k.length === 1) k = baseCodigo(e.code) ?? k;
  return unir(!!(e.metaKey || e.ctrlKey), !!e.altKey, !!e.shiftKey && !simbolo, k);
};
// combinación por la tecla física (para "shift+," y similares)
export const comboFisico = (e: Teclado): string | null => {
  const b = baseCodigo(e.code);
  return b ? unir(!!(e.metaKey || e.ctrlKey), !!e.altKey, !!e.shiftKey, b) : null;
};

export type Atajos = Record<string, string[]>; // accion → combinaciones (solo las que el usuario cambió)
export const combosDe = (a: Accion, propios?: Atajos) => propios?.[a.id] ?? a.def;

// mapa combinación → acción (lo propio del usuario gana sobre los valores por defecto de otras acciones)
export const mapaAtajos = (propios?: Atajos): Map<string, string> => {
  const m = new Map<string, string>();
  for (const a of ACCIONES) if (!propios?.[a.id]) for (const c of a.def) m.set(c, a.id);
  for (const a of ACCIONES) if (propios?.[a.id]) for (const c of propios[a.id]) m.set(c, a.id);
  return m;
};
export const accionDe = (e: Teclado, mapa: Map<string, string>): string | null => {
  const a = comboDe(e);
  if (a && mapa.has(a)) return mapa.get(a)!;
  const b = comboFisico(e);
  return b && mapa.has(b) ? mapa.get(b)! : null;
};

// texto legible: "mod+shift+z" → "⇧⌘Z"
const SIMB: Record<string, string> = {space: 'Espacio', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', escape: 'Esc', enter: 'Enter', backspace: '⌫', delete: 'Supr', home: 'Inicio', end: 'Fin', tab: 'Tab'};
export const textoCombo = (c: string) => {
  const p = c.split('+');
  // "shift+=" y "+" terminan en "+": la tecla es el último elemento no vacío
  const k = c.endsWith('++') || c === '+' ? '+' : p[p.length - 1];
  const mods = c === '+' ? [] : p.slice(0, c.endsWith('++') ? -2 : -1);
  return (mods.includes('alt') ? '⌥' : '') + (mods.includes('shift') ? '⇧' : '') + (mods.includes('mod') ? '⌘' : '') + (SIMB[k] ?? k.toUpperCase());
};

// acciones que comparten una combinación (para avisar al cambiarla)
export const conflictos = (propios?: Atajos): [string, string[]][] => {
  const usos = new Map<string, string[]>();
  for (const a of ACCIONES) for (const c of combosDe(a, propios)) usos.set(c, [...(usos.get(c) ?? []), a.id]);
  return [...usos.entries()].filter(([, ids]) => ids.length > 1);
};
