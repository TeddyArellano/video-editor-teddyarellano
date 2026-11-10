// Relación entre los elementos de src/data.json (lo que dibuja la plantilla, en cuadros) y su origen en
// edicion/eventos.json (lo que se edita, con anclas). Cada cambio de la app se aplica a los dos:
//   - a data (parche optimista: la vista previa cambia al instante)
//   - a eventos (lo que se guarda; luego `reel datos` regenera data con la lógica oficial)
import {Ancla, Anclas, FPS} from './anclas';

export type Lista = 'names' | 'labels' | 'images' | 'broll' | 'montos' | 'emojis' | 'calendario' | 'hook' | 'zooms' | 'sfx';

export type InfoLista = {
  lista: Lista;
  eventos: string; // clave en eventos.json
  nombre: string; // nombre visible
  durDef: number; // duración por defecto (s), como span() de reel datos
  movible: boolean; // se puede arrastrar en el lienzo
  color: string; // color en la línea de tiempo
};

export const LISTAS: Record<Lista, InfoLista> = {
  hook: {lista: 'hook', eventos: 'gancho', nombre: 'Gancho', durDef: 0, movible: true, color: '#f59e0b'},
  labels: {lista: 'labels', eventos: 'etiquetas', nombre: 'Etiqueta', durDef: 3, movible: true, color: '#22c55e'},
  names: {lista: 'names', eventos: 'nombres', nombre: 'Nombre', durDef: 3, movible: true, color: '#06b6d4'},
  images: {lista: 'images', eventos: 'imagenes', nombre: 'Imagen', durDef: 2.5, movible: true, color: '#a855f7'},
  montos: {lista: 'montos', eventos: 'montos', nombre: 'Monto', durDef: 2.5, movible: true, color: '#84cc16'},
  emojis: {lista: 'emojis', eventos: 'emojis', nombre: 'Emoji', durDef: 2, movible: true, color: '#eab308'},
  calendario: {lista: 'calendario', eventos: 'calendario', nombre: 'Calendario', durDef: 2.5, movible: true, color: '#ec4899'},
  broll: {lista: 'broll', eventos: 'broll', nombre: 'B-roll', durDef: 2.5, movible: false, color: '#64748b'},
  zooms: {lista: 'zooms', eventos: 'zooms', nombre: 'Zoom', durDef: 1.7, movible: false, color: '#3b82f6'},
  sfx: {lista: 'sfx', eventos: 'sfx', nombre: 'SFX', durDef: 1.5, movible: false, color: '#f97316'},
};

export const LISTAS_TIEMPO: Lista[] = ['labels', 'names', 'images', 'montos', 'emojis', 'calendario', 'broll', 'zooms', 'sfx'];

export type Sel = {lista: Lista; i: number}; // i = índice en data (para hook: índice del elemento)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Obj = Record<string, any>;

const clon = <T>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

// índice en eventos.json del elemento i de data (campo "ev" que escribe reel datos; si falta, mismo índice)
export const indiceEvento = (data: Obj, lista: Lista, i: number): number => {
  if (lista === 'hook') return i;
  const x = (data[lista] ?? [])[i];
  return x && typeof x.ev === 'number' ? x.ev : i;
};

// el objeto de eventos.json que origina el elemento (o undefined)
export const eventoDe = (eventos: Obj, data: Obj, sel: Sel): Obj | undefined => {
  if (sel.lista === 'hook') return eventos.gancho?.elementos?.[sel.i];
  if (sel.lista === 'zooms' || sel.lista === 'sfx') return eventos[LISTAS[sel.lista].eventos]?.[sel.i];
  return eventos[LISTAS[sel.lista].eventos]?.[indiceEvento(data, sel.lista, sel.i)];
};

// ---------------------------------------------------------------- posición libre
export type Libre = {dx?: number; dy?: number; escala?: number; rot?: number};

const limpiarLibre = (o: Obj) => {
  for (const k of ['dx', 'dy'] as const) if (o[k] !== undefined && Math.abs(o[k]) < 0.5) delete o[k];
  if (o.escala !== undefined && Math.abs(o.escala - 1) < 0.005) delete o.escala;
  if (o.rot !== undefined && Math.abs(o.rot) < 0.05) delete o.rot;
  for (const k of ['dx', 'dy', 'escala', 'rot'] as const) if (o[k] !== undefined) o[k] = Math.round(o[k] * 100) / 100;
};

// aplica campos a data y a eventos a la vez (cualquier campo: texto, color, dx…). Devuelve copias nuevas.
export const aplicarCampos = (data: Obj, eventos: Obj, sel: Sel, campos: Obj): {data: Obj; eventos: Obj} => {
  const d = clon(data);
  const e = clon(eventos ?? {});
  const fix = (o: Obj) => {
    for (const [k, v] of Object.entries(campos)) {
      if (v === undefined || v === null || v === '') delete o[k];
      else o[k] = v;
    }
    limpiarLibre(o);
  };
  if (sel.lista === 'hook') {
    if (d.hook?.elementos?.[sel.i]) fix(d.hook.elementos[sel.i]);
    if (e.gancho?.elementos?.[sel.i]) fix(e.gancho.elementos[sel.i]);
    return {data: d, eventos: e};
  }
  const dx = d[sel.lista]?.[sel.i];
  if (dx) fix(dx);
  const ev = eventoDe(e, data, sel);
  if (ev) fix(ev);
  return {data: d, eventos: e};
};

// ---------------------------------------------------------------- tiempos
// mueve/estira un elemento en el tiempo. a/b en cuadros del corte. Guarda "en" como ancla pegada a palabra y "dur".
export const aplicarTiempo = (data: Obj, eventos: Obj, sel: Sel, a: number, b: number, pegar = true): {data: Obj; eventos: Obj} => {
  const d = clon(data);
  const e = clon(eventos ?? {});
  const A = new Anclas(d.words ?? []);
  a = Math.max(0, Math.round(a));
  b = Math.max(a + 3, Math.round(b));
  const enA: Ancla = A.paraCuadro(a, pegar);
  const fa = d.words?.length ? A.f(enA) : a; // donde realmente cae el ancla
  const dur = +((b - fa) / FPS).toFixed(2);
  if (sel.lista === 'hook') {
    const el = d.hook?.elementos?.[sel.i];
    if (el) el.at = fa;
    const ee = e.gancho?.elementos?.[sel.i];
    if (ee) {
      delete ee.en;
      ee.at = fa;
    }
    return {data: d, eventos: e};
  }
  const x = d[sel.lista]?.[sel.i];
  const ev = eventoDe(e, data, sel);
  if (sel.lista === 'sfx') {
    if (x) x.f = fa;
    if (ev) {
      ev.en = enA;
      delete ev.offset;
    }
    return {data: d, eventos: e};
  }
  if (x) {
    x.a = fa;
    x.b = fa + Math.round(dur * FPS);
  }
  if (ev) {
    ev.en = enA;
    delete ev.offset;
    delete ev.hasta;
    ev.dur = dur;
  }
  return {data: d, eventos: e};
};

// ---------------------------------------------------------------- agregar / quitar
export const PLANTILLAS_EVENTO: Partial<Record<Lista, Obj>> = {
  labels: {texto: 'NUEVA ETIQUETA'},
  names: {nombre: 'Nombre', sub: 'Cargo'},
  montos: {texto: '$1,000'},
  emojis: {emoji: '🔥', texto: ''},
  calendario: {dia: '1', mes: 'ENERO', texto: ''},
  images: {src: 'logos/logo.png', pos: 'arriba', ancho: 420, tarjeta: false},
  zooms: {cx: 0.5, cy: 0.5, z: 1.5},
  sfx: {sfx: 'pop', vol: 0.4},
};

// agrega un evento en el cuadro f (pegado a la palabra más cercana). Solo cambia eventos (data sale de `reel datos`),
// pero también agrega una aproximación a data para verlo de inmediato.
export const agregarEvento = (data: Obj, eventos: Obj, lista: Lista, f: number, extra: Obj = {}): {data: Obj; eventos: Obj; sel: Sel} => {
  const d = clon(data);
  const e = clon(eventos ?? {});
  const info = LISTAS[lista];
  const A = new Anclas(d.words ?? []);
  const en = A.paraCuadro(f);
  const fa = d.words?.length ? A.f(en) : f;
  const base = {...PLANTILLAS_EVENTO[lista], ...extra};
  const ev: Obj = {en, ...(lista === 'sfx' ? {} : {dur: info.durDef}), ...base};
  e[info.eventos] = [...(e[info.eventos] ?? []), ev];
  const j = e[info.eventos].length - 1;
  const len = Math.round(info.durDef * FPS);
  d[lista] = d[lista] ?? [];
  if (lista === 'sfx') d.sfx.push({f: fa, src: base.sfx, v: base.vol, len: 45});
  else if (lista === 'zooms') d.zooms.push({a: fa, b: fa + len, cx: base.cx, cy: base.cy, z: base.z});
  else {
    const item: Obj = {a: fa, b: fa + len, ev: j, ...base};
    if (lista === 'images') item.titulo = item.titulo ?? null;
    d[lista].push(item);
  }
  return {data: d, eventos: e, sel: {lista, i: d[lista].length - 1}};
};

export const quitarEvento = (data: Obj, eventos: Obj, sel: Sel): {data: Obj; eventos: Obj} => {
  const d = clon(data);
  const e = clon(eventos ?? {});
  if (sel.lista === 'hook') {
    e.gancho?.elementos?.splice(sel.i, 1);
    d.hook?.elementos?.splice(sel.i, 1);
    return {data: d, eventos: e};
  }
  const key = LISTAS[sel.lista].eventos;
  const j = sel.lista === 'zooms' || sel.lista === 'sfx' ? sel.i : indiceEvento(data, sel.lista, sel.i);
  if (Array.isArray(e[key])) e[key].splice(j, 1);
  if (Array.isArray(d[sel.lista])) {
    d[sel.lista].splice(sel.i, 1);
    // los índices "ev" posteriores bajan uno
    for (const x of d[sel.lista]) if (typeof x.ev === 'number' && x.ev > j) x.ev--;
  }
  return {data: d, eventos: e};
};

// copia del elemento justo después del original (mismo texto y duración)
export const duplicarEvento = (data: Obj, eventos: Obj, sel: Sel): {data: Obj; eventos: Obj; sel: Sel} | null => {
  if (sel.lista === 'hook') return null;
  const d = clon(data);
  const e = clon(eventos ?? {});
  const key = LISTAS[sel.lista].eventos;
  const x = d[sel.lista]?.[sel.i];
  const orig = eventoDe(e, data, sel);
  if (!x || !orig || !Array.isArray(e[key])) return null;
  const copia = {...clon(x)};
  e[key].push(clon(orig));
  const j = e[key].length - 1;
  if (typeof copia.ev === 'number') copia.ev = j;
  d[sel.lista].push(copia);
  const nuevo: Sel = {lista: sel.lista, i: d[sel.lista].length - 1};
  const a = sel.lista === 'sfx' ? x.f : x.a;
  const b = sel.lista === 'sfx' ? x.f + 15 : x.b;
  const r = aplicarTiempo(d, e, nuevo, b, b + (b - a), true);
  return {...r, sel: nuevo};
};

// lista de elementos con tiempo para la línea de tiempo
export type Bloque = {sel: Sel; a: number; b: number; texto: string; color: string};
export const bloques = (data: Obj): Bloque[] => {
  const out: Bloque[] = [];
  for (const l of LISTAS_TIEMPO) {
    (data[l] ?? []).forEach((x: Obj, i: number) => {
      const a = l === 'sfx' ? x.f : x.a;
      const b = l === 'sfx' ? x.f + Math.min(x.len ?? 15, 15) : x.b;
      const texto = x.texto ?? x.nombre ?? x.emoji ?? (x.dia ? `${x.dia} ${x.mes}` : undefined) ?? x.src ?? (l === 'zooms' ? `×${x.z}` : '');
      out.push({sel: {lista: l, i}, a, b, texto: String(texto ?? ''), color: LISTAS[l].color});
    });
  }
  // gancho: cada elemento ocupa hasta que aparece el siguiente (todos siguen en pantalla hasta hookEnd, pero así se ven en fila)
  const els: Obj[] = data.hook?.elementos ?? [];
  const ats = els.map((el, i) => el.at ?? 2 + i * 8);
  const orden = [...ats].sort((x, y) => x - y);
  els.forEach((el, i) => {
    const a = ats[i];
    const sig = orden.find((x) => x > a);
    const b = Math.max(a + 6, sig ?? data.hookEnd ?? a + 30);
    out.push({sel: {lista: 'hook', i}, a, b, texto: el.texto ?? el.tipo, color: LISTAS.hook.color});
  });
  return out;
};

export const nombreSel = (data: Obj, sel: Sel): string => {
  const b = bloques(data).find((x) => x.sel.lista === sel.lista && x.sel.i === sel.i);
  return `${LISTAS[sel.lista].nombre}${b?.texto ? ` · ${b.texto}` : ''}`;
};
