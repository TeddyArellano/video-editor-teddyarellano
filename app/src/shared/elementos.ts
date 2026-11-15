// Relación entre los elementos de src/data.json (lo que dibuja la plantilla, en cuadros) y su origen en
// edicion/eventos.json (lo que se edita, con anclas). Cada cambio de la app se aplica a los dos:
//   - a data (parche optimista: la vista previa cambia al instante)
//   - a eventos (lo que se guarda; luego `reel datos` regenera data con la lógica oficial)
import {Ancla, Anclas, FPS} from './anclas';

export type Lista =
  | 'names' | 'labels' | 'images' | 'broll' | 'montos' | 'emojis' | 'calendario' | 'patrocinadores' | 'fechas' | 'hook' | 'zooms' | 'sfx'
  | 'textos' | 'formas' | 'superpuestos' | 'audios' | 'ajustes' | 'tcortes';

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
  patrocinadores: {lista: 'patrocinadores', eventos: 'patrocinadores', nombre: 'Patrocinadores', durDef: 3, movible: true, color: '#14b8a6'},
  fechas: {lista: 'fechas', eventos: 'fechas', nombre: 'Fechas', durDef: 3, movible: true, color: '#e11d48'},
  broll: {lista: 'broll', eventos: 'broll', nombre: 'B-roll', durDef: 2.5, movible: false, color: '#64748b'},
  zooms: {lista: 'zooms', eventos: 'zooms', nombre: 'Zoom', durDef: 1.7, movible: false, color: '#3b82f6'},
  sfx: {lista: 'sfx', eventos: 'sfx', nombre: 'SFX', durDef: 1.5, movible: false, color: '#f97316'},
  // capas libres (estilo CapCut): components/Capas.tsx de la plantilla
  textos: {lista: 'textos', eventos: 'textos', nombre: 'Texto', durDef: 2.5, movible: true, color: '#f43f5e'},
  formas: {lista: 'formas', eventos: 'formas', nombre: 'Forma', durDef: 2, movible: true, color: '#facc15'},
  superpuestos: {lista: 'superpuestos', eventos: 'superpuestos', nombre: 'Superpuesto', durDef: 3, movible: true, color: '#8b5cf6'},
  audios: {lista: 'audios', eventos: 'audios', nombre: 'Audio', durDef: 10, movible: false, color: '#10b981'},
  ajustes: {lista: 'ajustes', eventos: 'ajustes', nombre: 'Ajuste de color', durDef: 3, movible: false, color: '#0ea5e9'},
  tcortes: {lista: 'tcortes', eventos: 'transiciones_corte', nombre: 'Transición', durDef: 0.4, movible: false, color: '#d946ef'},
};
// pistas de la línea de tiempo con varias filas posibles (multipista: capas que se enciman van en carriles)
export const LISTAS_CAPAS: Lista[] = ['superpuestos', 'textos', 'formas', 'ajustes', 'tcortes', 'audios'];

export const LISTAS_TIEMPO: Lista[] = [...LISTAS_CAPAS, 'labels', 'names', 'images', 'montos', 'emojis', 'calendario', 'patrocinadores', 'fechas', 'broll', 'zooms', 'sfx'];

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
  if (o.opacidad !== undefined && Math.abs(o.opacidad - 1) < 0.005) delete o.opacidad;
  if (Array.isArray(o.claves) && !o.claves.length) delete o.claves;
  for (const k of ['dx', 'dy', 'escala', 'rot', 'opacidad'] as const) if (o[k] !== undefined) o[k] = Math.round(o[k] * 100) / 100;
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
  if (sel.lista === 'fechas' && x) {
    // la 2ª hoja y la flecha se mueven con la 1ª (mismo ritmo); sus anclas se vuelven a pegar a la palabra más cercana
    const delta = fa - x.a;
    x.f2 += delta;
    x.fl += delta;
    if (ev && delta) {
      ev.segunda = A.paraCuadro(x.f2 + 4, pegar);
      ev.flecha = A.paraCuadro(x.fl + 3, pegar);
    }
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
  patrocinadores: {fila: 'arriba', logos: []},
  fechas: {dia1: '1', mes1: 'ENERO', dia2: '7', mes2: 'ENERO'},
  images: {src: 'logos/logo.png', pos: 'arriba', ancho: 420, tarjeta: false},
  zooms: {cx: 0.5, cy: 0.5, z: 1.5},
  sfx: {sfx: 'pop', vol: 0.4},
  textos: {texto: 'TU TEXTO', y: 760, entrada: 'pop', salida: 'fundido'},
  formas: {forma: 'flecha', color: '#FFD600', ancho: 360, y: 960},
  superpuestos: {src: '', ancho: 560, y: 760},
  audios: {src: '', vol: 0.15, fade_in: 0.5, fade_out: 1, ducking: 0.6},
  ajustes: {filtro: 'calido', intensidad: 1},
  tcortes: {tipo: 'fundido'},
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
    if (lista === 'fechas') Object.assign(item, {f2: fa + 30, fl: fa + 24});
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
      const texto =
        l === 'patrocinadores'
          ? (x.logos ?? []).map((g: Obj | string) => String(typeof g === 'string' ? g : g.src).split('/').pop()!.replace(/\.\w+$/, '')).join(', ') || 'sin logos'
          : l === 'fechas'
            ? (x.banner ?? `${x.dia1} ${x.mes1} → ${x.dia2} ${x.mes2}`)
            : l === 'ajustes'
              ? [x.filtro && x.filtro !== 'ninguno' ? x.filtro : '', ...['brillo', 'contraste', 'saturacion', 'temperatura'].filter((k) => x[k]).map((k) => `${k} ${x[k] > 0 ? '+' : ''}${x[k]}`)].filter(Boolean).join(' · ') || 'ajuste'
              : x.texto ?? x.nombre ?? x.emoji ?? (x.dia ? `${x.dia} ${x.mes}` : undefined) ?? x.forma ?? x.tipo ?? (x.src ? String(x.src).split('/').pop() : undefined) ?? (l === 'zooms' ? `×${x.z}` : '');
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

// ---------------------------------------------------------------- fotogramas clave (igual que conClaves de la plantilla)
// claves = [{t (s desde que aparece la capa), dx, dy, escala, rot, opacidad}]. Si un elemento tiene claves, mover/escalar/
// girar en el lienzo o en el inspector edita la clave del cuadro actual (o crea una), como en CapCut.
export const CAMPOS_CLAVE = ['dx', 'dy', 'escala', 'rot', 'opacidad'] as const;
export type CampoClave = (typeof CAMPOS_CLAVE)[number];
export type Clave = {t: number} & Partial<Record<CampoClave, number>>;
const BASE_CLAVE: Record<CampoClave, number> = {dx: 0, dy: 0, escala: 1, rot: 0, opacidad: 1};
const suave = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export const itemDe = (data: Obj, sel: Sel): Obj | undefined => (sel.lista === 'hook' ? data.hook?.elementos?.[sel.i] : data[sel.lista]?.[sel.i]);

// valor de cada propiedad en el cuadro f (con claves, interpolado; sin claves, el valor fijo)
export const valoresEn = (x: Obj | undefined, f: number): Record<CampoClave, number> => {
  const r = {...BASE_CLAVE};
  if (!x) return r;
  for (const k of CAMPOS_CLAVE) if (typeof x[k] === 'number') r[k] = x[k];
  const cl: Clave[] = Array.isArray(x.claves) ? x.claves : [];
  if (!cl.length) return r;
  const t = (f - (x.a ?? 0)) / FPS;
  for (const k of CAMPOS_CLAVE) {
    const ks = cl.filter((c) => typeof c[k] === 'number').sort((p, q) => p.t - q.t);
    if (!ks.length) continue;
    if (t <= ks[0].t) r[k] = ks[0][k]!;
    else if (t >= ks[ks.length - 1].t) r[k] = ks[ks.length - 1][k]!;
    else {
      const j = ks.findIndex((c) => c.t > t);
      const p = ks[j - 1];
      const q = ks[j];
      r[k] = p[k]! + (q[k]! - p[k]!) * suave((t - p.t) / Math.max(1e-6, q.t - p.t));
    }
  }
  return r;
};

const tClave = (x: Obj, f: number) => Math.max(0, +((f - (x.a ?? 0)) / FPS).toFixed(2));
const MISMA = 0.5 / FPS + 1e-6; // dos claves a menos de medio cuadro son la misma

// escribe una lista de claves en data y en eventos
const ponerClaves = (data: Obj, eventos: Obj, sel: Sel, claves: Clave[] | undefined) => {
  const orden = claves?.length ? [...claves].sort((p, q) => p.t - q.t) : undefined;
  return aplicarCampos(data, eventos, sel, {claves: orden});
};

// agrega (o reemplaza) una clave en el cuadro f con los valores que se ven en ese cuadro
export const agregarClave = (data: Obj, eventos: Obj, sel: Sel, f: number): {data: Obj; eventos: Obj} => {
  const x = itemDe(data, sel);
  if (!x) return {data, eventos};
  const t = tClave(x, f);
  const v = valoresEn(x, f);
  const otras: Clave[] = (x.claves ?? []).filter((c: Clave) => Math.abs(c.t - t) > MISMA);
  const nueva: Clave = {t};
  for (const k of CAMPOS_CLAVE) nueva[k] = +v[k].toFixed(k === 'escala' || k === 'opacidad' ? 3 : 1);
  // la primera clave también fija el inicio: sin ella, antes de esta clave la capa ya estaría en su valor
  if (!otras.length && t >= 0.2) otras.push({...nueva, t: 0});
  return ponerClaves(data, eventos, sel, [...otras, nueva]);
};

export const quitarClave = (data: Obj, eventos: Obj, sel: Sel, t: number): {data: Obj; eventos: Obj} => {
  const x = itemDe(data, sel);
  if (!x) return {data, eventos};
  return ponerClaves(data, eventos, sel, (x.claves ?? []).filter((c: Clave) => Math.abs(c.t - t) > MISMA));
};

// como aplicarCampos, pero si el elemento tiene claves, dx/dy/escala/rot/opacidad van a la clave del cuadro f
export const aplicarLibre = (data: Obj, eventos: Obj, sel: Sel, campos: Obj, f: number): {data: Obj; eventos: Obj} => {
  const x = itemDe(data, sel);
  const cl: Clave[] = x?.claves ?? [];
  if (!x || !cl.length) return aplicarCampos(data, eventos, sel, campos);
  const animados: Obj = {};
  const resto: Obj = {};
  for (const [k, v] of Object.entries(campos)) ((CAMPOS_CLAVE as readonly string[]).includes(k) ? animados : resto)[k] = v;
  let r = Object.keys(resto).length ? aplicarCampos(data, eventos, sel, resto) : {data, eventos};
  if (!Object.keys(animados).length) return r;
  const t = tClave(x, f);
  const v = valoresEn(x, f);
  const i = cl.findIndex((c) => Math.abs(c.t - t) <= MISMA);
  const base: Clave = i >= 0 ? {...cl[i]} : {t, ...Object.fromEntries(CAMPOS_CLAVE.map((k) => [k, +v[k].toFixed(3)]))};
  for (const [k, val] of Object.entries(animados)) (base as Obj)[k] = val ?? BASE_CLAVE[k as CampoClave];
  const nuevas = i >= 0 ? cl.map((c, j) => (j === i ? base : c)) : [...cl, base];
  r = ponerClaves(r.data, r.eventos, sel, nuevas);
  return r;
};
