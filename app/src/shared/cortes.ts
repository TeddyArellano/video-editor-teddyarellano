// edicion/plan.json = {"piezas": [{src, de, a, sec, speed?, gain_db?, quitar?, mas_inicio?, mas_final?}]}
// de/a = índices de palabra (inclusive) en edicion/palabras/<src>.json ([[texto, inicio, fin], …]).
import {Anclas, FPS, norm, type Ancla, type Palabra} from './anclas';

export type PalabraClip = [string, number, number];
export type Pieza = {src: string; de: number; a: number; sec: string; speed?: number; gain_db?: number; quitar?: number[]; mas_inicio?: number; mas_final?: number; pegada?: boolean};
export type Plan = {piezas: Pieza[]; [k: string]: unknown};

const clon = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export const textoPieza = (pal: PalabraClip[] | undefined, p: Pieza) => {
  if (!pal) return '';
  const q = new Set(p.quitar ?? []);
  return pal
    .slice(p.de, p.a + 1)
    .map((w, k) => (q.has(p.de + k) ? `[${w[0]}]` : w[0]))
    .join(' ');
};

export const duracionPieza = (pal: PalabraClip[] | undefined, p: Pieza) => {
  if (!pal || !pal[p.de] || !pal[p.a]) return 0;
  return (pal[p.a][2] - pal[p.de][1] + (p.mas_inicio ?? 0) + (p.mas_final ?? 0)) / (p.speed ?? 1);
};

export const moverPieza = (plan: Plan, i: number, d: -1 | 1): Plan => {
  const p = clon(plan);
  const j = i + d;
  if (j < 0 || j >= p.piezas.length) return p;
  [p.piezas[i], p.piezas[j]] = [p.piezas[j], p.piezas[i]];
  return p;
};

export const quitarPieza = (plan: Plan, i: number): Plan => {
  const p = clon(plan);
  p.piezas.splice(i, 1);
  return p;
};

export const editarPieza = (plan: Plan, i: number, campos: Partial<Pieza>): Plan => {
  const p = clon(plan);
  const x = p.piezas[i] as Record<string, unknown>;
  for (const [k, v] of Object.entries(campos)) {
    if (v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))) delete x[k];
    else x[k] = v;
  }
  if (x.speed === 1) delete x.speed;
  if (x.gain_db === 0) delete x.gain_db;
  const pz = p.piezas[i];
  if (pz.de > pz.a) [pz.de, pz.a] = [pz.a, pz.de];
  if (pz.quitar) {
    pz.quitar = [...new Set(pz.quitar)].filter((k) => k > pz.de && k < pz.a).sort((a, b) => a - b);
    if (!pz.quitar.length) delete pz.quitar;
  }
  return p;
};

// tachar/destachar una palabra dentro de la pieza (si es la primera o la última, mejor se recorta el rango)
export const alternarQuitar = (plan: Plan, i: number, k: number): Plan => {
  const pz = plan.piezas[i];
  if (k === pz.de) return editarPieza(plan, i, {de: Math.min(pz.a, k + 1)});
  if (k === pz.a) return editarPieza(plan, i, {a: Math.max(pz.de, k - 1)});
  const q = new Set(pz.quitar ?? []);
  if (q.has(k)) q.delete(k);
  else q.add(k);
  return editarPieza(plan, i, {quitar: [...q]});
};

export const agregarPieza = (plan: Plan | null, pieza: Pieza, despuesDe?: number): Plan => {
  const p: Plan = plan ? clon(plan) : {piezas: []};
  const at = despuesDe === undefined ? p.piezas.length : despuesDe + 1;
  p.piezas.splice(at, 0, pieza);
  return p;
};

// divide la pieza i en la palabra k (k empieza la segunda parte)
export const dividirPieza = (plan: Plan, i: number, k: number): Plan => {
  const p = clon(plan);
  const pz = p.piezas[i];
  if (k <= pz.de || k > pz.a) return p;
  const segunda: Pieza = {...clon(pz), de: k, pegada: true}; // pegada: dividir no crea un corte audible hasta que algo las separe
  pz.a = k - 1;
  delete pz.mas_final;
  delete segunda.mas_inicio;
  if (pz.quitar) pz.quitar = pz.quitar.filter((x) => x < k);
  if (segunda.quitar) segunda.quitar = segunda.quitar.filter((x) => x > k);
  p.piezas.splice(i + 1, 0, segunda);
  return p;
};

// ---------------------------------------------------------------- recortes sobre la línea de tiempo
// edicion/edl_final.json = el corte que hoy existe (public/cut.mp4). El plan puede ir por delante: modeloCorte alinea los dos
// palabra por palabra, así que lo que se recortó y falta aplicar se ve y se salta en la vista previa sin re-cortar el video.
export type TramoEdl = {src: string; in: number; out: number; sec: string; speed: number; start: number; frames: number; words: PalabraClip[]; bloque?: number};
export type PalCorte = {i: number; src: string; k: number; texto: string; sec: string; f0: number; f1: number; pieza: number}; // pieza −1 = quitada, falta aplicar
export type BloqueCorte = {id: number; a: number; b: number; pieza: number; quitada: boolean; src: string; k0: number; k1: number; speed: number; i0: number; i1: number; texto: string};
export type ModeloCorte = {pal: PalCorte[]; bloques: BloqueCorte[]; zonas: [number, number][]; agregadas: number; total: number};
export type Palabras = Record<string, PalabraClip[]>;

const indices = new WeakMap<PalabraClip[], Map<number, number>>();
const indiceDe = (w: PalabraClip[]) => {
  let m = indices.get(w);
  if (!m) indices.set(w, (m = new Map(w.map((x, k) => [x[1], k]))));
  return m;
};

// subsecuencia común más larga entre dos listas de claves: a[i] → índice en b o −1
const alinear = (a: string[], b: string[]): {ab: Int32Array; usadasB: number} => {
  const ab = new Int32Array(a.length).fill(-1);
  let ini = 0;
  while (ini < a.length && ini < b.length && a[ini] === b[ini]) (ab[ini] = ini), ini++;
  let ea = a.length, eb = b.length;
  while (ea > ini && eb > ini && a[ea - 1] === b[eb - 1]) ab[--ea] = --eb;
  let usadas = ini + (a.length - ea);
  const n = ea - ini, m = eb - ini;
  if (n && m) {
    const t = new Uint16Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        t[i * (m + 1) + j] = a[ini + i] === b[ini + j] ? t[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(t[(i + 1) * (m + 1) + j], t[i * (m + 1) + j + 1]);
    for (let i = 0, j = 0; i < n && j < m; ) {
      if (a[ini + i] === b[ini + j]) {
        ab[ini + i] = ini + j;
        usadas++;
        i++;
        j++;
      } else if (t[(i + 1) * (m + 1) + j] >= t[i * (m + 1) + j + 1]) i++;
      else j++;
    }
  }
  return {ab, usadasB: usadas};
};

export const modeloCorte = (plan: Plan | null, edl: TramoEdl[] | null, palabras: Palabras): ModeloCorte | null => {
  if (!plan || !edl?.length) return null;
  const pal: PalCorte[] = [];
  for (const t of edl) {
    const W = palabras[t.src];
    if (!W) return null;
    const idx = indiceDe(W);
    const fin = t.start + t.frames;
    for (const w of t.words ?? []) {
      const k = idx.get(w[1]);
      if (k === undefined) return null; // la transcripción cambió después del corte
      const f = Math.min(fin - 1, t.start + Math.max(0, Math.round(((w[1] - t.in) * FPS) / (t.speed || 1))));
      pal.push({i: pal.length, src: t.src, k, texto: w[0], sec: t.sec, f0: pal.length ? Math.max(pal[pal.length - 1].f0, f) : 0, f1: fin, pieza: -1});
    }
  }
  const ult = edl[edl.length - 1];
  const total = ult.start + ult.frames;
  pal.forEach((p, i) => (p.f1 = i + 1 < pal.length ? pal[i + 1].f0 : total));
  const delPlan: {i: number; k: number; src: string}[] = [];
  plan.piezas.forEach((pz, i) => {
    const q = new Set(pz.quitar ?? []);
    for (let k = pz.de; k <= pz.a; k++) if (!q.has(k)) delPlan.push({i, k, src: pz.src});
  });
  const {ab, usadasB} = alinear(pal.map((p) => `${p.src}:${p.k}`), delPlan.map((p) => `${p.src}:${p.k}`));
  pal.forEach((p, i) => (p.pieza = ab[i] >= 0 ? delPlan[ab[i]].i : -1));

  const bloques: BloqueCorte[] = [];
  pal.forEach((p, i) => {
    const c = bloques[bloques.length - 1];
    if (c && c.pieza === p.pieza && c.src === p.src && pal[i - 1].k + 1 === p.k) {
      c.b = p.f1;
      c.k1 = p.k;
      c.i1 = i;
      c.texto += ` ${p.texto}`;
    } else {
      bloques.push({id: bloques.length, a: p.f0, b: p.f1, pieza: p.pieza, quitada: p.pieza < 0, src: p.src, k0: p.k, k1: p.k, speed: p.pieza >= 0 ? (plan.piezas[p.pieza].speed ?? 1) : 1, i0: i, i1: i, texto: p.texto});
    }
  });
  const zonas: [number, number][] = [];
  for (const b of bloques) {
    if (!b.quitada) continue;
    const z = zonas[zonas.length - 1];
    if (z && z[1] === b.a) z[1] = b.b;
    else zonas.push([b.a, b.b]);
  }
  return {pal, bloques, zonas, agregadas: delPlan.length - usadasB, total};
};

// deja en la pieza solo las palabras indicadas (recalcula de/a/quitar); sin palabras, la pieza desaparece
const conservar = (plan: Plan, i: number, quedan: Set<number>) => {
  const pz = plan.piezas[i];
  if (!quedan.size) return void plan.piezas.splice(i, 1);
  const l = [...quedan].sort((x, y) => x - y);
  if (l[0] !== pz.de) delete pz.mas_inicio;
  if (l[l.length - 1] !== pz.a) delete pz.mas_final;
  pz.de = l[0];
  pz.a = l[l.length - 1];
  const huecos: number[] = [];
  for (let k = pz.de; k <= pz.a; k++) if (!quedan.has(k)) huecos.push(k);
  if (huecos.length) pz.quitar = huecos;
  else delete pz.quitar;
};
const palabrasDePieza = (pz: Pieza) => {
  const q = new Set(pz.quitar ?? []);
  const s = new Set<number>();
  for (let k = pz.de; k <= pz.a; k++) if (!q.has(k)) s.add(k);
  return s;
};

const quitarPal = (plan: Plan, l: PalCorte[]): Plan => {
  const p = clon(plan);
  const por = new Map<number, number[]>();
  for (const w of l) if (w.pieza >= 0) por.set(w.pieza, [...(por.get(w.pieza) ?? []), w.k]);
  for (const i of [...por.keys()].sort((x, y) => y - x)) {
    const s = palabrasDePieza(p.piezas[i]);
    for (const k of por.get(i)!) s.delete(k);
    conservar(p, i, s);
  }
  return p;
};

// palabras que quedan dentro de [a, b) al menos en su mitad
const palabrasEn = (m: ModeloCorte, a: number, b: number) => m.pal.filter((p) => p.f1 > p.f0 && Math.min(p.f1, b) - Math.max(p.f0, a) >= (p.f1 - p.f0) / 2);

export const quitarRango = (plan: Plan, m: ModeloCorte, a: number, b: number): Plan => quitarPal(plan, palabrasEn(m, a, b));

// recupera las palabras quitadas de [a, b): dentro de su pieza, pegadas a una vecina o como pieza nueva en su lugar
export const restaurarRango = (plan: Plan, m: ModeloCorte, edl: TramoEdl[], palabras: Palabras, a: number, b: number): Plan => {
  let p = clon(plan);
  const objetivo = palabrasEn(m, a, b).filter((w) => w.pieza < 0).map((w) => w.i);
  for (const i of objetivo) {
    const actual = modeloCorte(p, edl, palabras);
    if (!actual) break;
    const w = actual.pal[i];
    if (w.pieza >= 0) continue;
    const j = p.piezas.findIndex((z) => z.src === w.src && z.de <= w.k && w.k <= z.a && (z.quitar ?? []).includes(w.k));
    const antes = p.piezas.findIndex((z) => z.src === w.src && z.a === w.k - 1);
    const despues = p.piezas.findIndex((z) => z.src === w.src && z.de === w.k + 1);
    if (j >= 0) p = editarPieza(p, j, {quitar: p.piezas[j].quitar!.filter((k) => k !== w.k)});
    else if (antes >= 0) p = editarPieza(p, antes, {a: w.k});
    else if (despues >= 0) p = editarPieza(p, despues, {de: w.k});
    else {
      let prev = -1;
      for (let t = i - 1; t >= 0 && prev < 0; t--) prev = actual.pal[t].pieza;
      p.piezas.splice(prev + 1, 0, {src: w.src, de: w.k, a: w.k, sec: w.sec});
    }
  }
  return p;
};

export const palabraEn = (m: ModeloCorte, f: number): PalCorte | undefined => m.pal.find((p) => f >= p.f0 && f < p.f1) ?? (f >= m.total ? m.pal[m.pal.length - 1] : undefined);
export const bloqueEn = (m: ModeloCorte, f: number): BloqueCorte | undefined => m.bloques.find((b) => f >= b.a && f < b.b);

// divide la pieza en el límite de palabra más cercano al cuadro f; null si ahí no se puede
export const dividirEn = (plan: Plan, m: ModeloCorte, f: number): Plan | null => {
  const w = palabraEn(m, f);
  if (!w) return null;
  const sig = m.pal[w.i + 1];
  const elegida = f - w.f0 > w.f1 - f && sig && sig.pieza === w.pieza ? sig : w;
  if (elegida.pieza < 0 || elegida.k <= plan.piezas[elegida.pieza].de) return null;
  return dividirPieza(plan, elegida.pieza, elegida.k);
};

// quita desde el inicio del bloque hasta f ('ini') o desde f hasta el final del bloque ('fin')
export const recortarHasta = (plan: Plan, m: ModeloCorte, f: number, lado: 'ini' | 'fin'): Plan | null => {
  const b = bloqueEn(m, f);
  if (!b || b.quitada) return null;
  const l = m.pal.slice(b.i0, b.i1 + 1).filter((p) => (lado === 'ini' ? (p.f0 + p.f1) / 2 < f : (p.f0 + p.f1) / 2 >= f));
  return l.length ? quitarPal(plan, l) : null;
};

// a qué palabra llegaría el borde de un bloque si se arrastra dF cuadros (sin pasar sobre palabras de otra pieza)
export const objetivoBorde = (plan: Plan, b: BloqueCorte, palabras: Palabras, lado: 'ini' | 'fin', dF: number): number => {
  const W = palabras[b.src];
  const t = (lado === 'ini' ? W[b.k0][1] : W[b.k1][2]) + (dF / FPS) * b.speed;
  let mejor = lado === 'ini' ? b.k0 : b.k1;
  let d = Infinity;
  W.forEach((w, k) => {
    const dd = Math.abs((lado === 'ini' ? w[1] : w[2]) - t);
    if (dd < d) (d = dd), (mejor = k);
  });
  if (lado === 'ini') mejor = Math.min(mejor, b.k1);
  else mejor = Math.max(mejor, b.k0);
  const ocupada = (k: number) => plan.piezas.some((z, i) => i !== b.pieza && z.src === b.src && k >= z.de && k <= z.a && !(z.quitar ?? []).includes(k));
  if (lado === 'ini') for (let k = b.k0 - 1; k >= mejor; k--) if (ocupada(k)) return k + 1;
  if (lado === 'fin') for (let k = b.k1 + 1; k <= mejor; k++) if (ocupada(k)) return k - 1;
  return mejor;
};

// el borde del bloque pasa a la palabra k: hacia adentro quita, hacia afuera recupera o extiende la pieza
export const ajustarBorde = (plan: Plan, b: BloqueCorte, lado: 'ini' | 'fin', k: number): Plan => {
  const p = clon(plan);
  const s = palabrasDePieza(p.piezas[b.pieza]);
  if (lado === 'ini') {
    for (let x = b.k0; x < k; x++) s.delete(x);
    for (let x = k; x < b.k0; x++) s.add(x);
  } else {
    for (let x = k + 1; x <= b.k1; x++) s.delete(x);
    for (let x = b.k1 + 1; x <= k; x++) s.add(x);
  }
  conservar(p, b.pieza, s);
  return p;
};

export const corteVecino = (m: ModeloCorte, f: number, dir: -1 | 1): number => {
  const l = [...new Set([...m.bloques.map((b) => b.a), m.total])].sort((x, y) => x - y);
  return dir > 0 ? (l.find((x) => x > f) ?? m.total) : ([...l].reverse().find((x) => x < f) ?? 0);
};

// ajusta un rango de cuadros a los límites de palabra más cercanos
export const rangoAPalabras = (m: ModeloCorte, a: number, b: number): [number, number] => {
  const cerca = (f: number, campo: 'f0' | 'f1') => m.pal.reduce((mej, p) => (Math.abs(p[campo] - f) < Math.abs(mej - f) ? p[campo] : mej), m.pal[0]?.[campo] ?? f);
  const x = cerca(Math.min(a, b), 'f0');
  return [x, Math.max(x + 1, cerca(Math.max(a, b), 'f1'))];
};

// ---------------------------------------------------------------- anclas tras un re-corte
type PalId = Palabra & {id: string};
// las mismas palabras que cut_words() de reel.py (con correcciones "fix"), más la identidad de la palabra original
export const palabrasDeEdl = (edl: TramoEdl[], fix: Record<string, string> = {}): PalId[] => {
  const out: PalId[] = [];
  for (const p of edl) {
    const tc = (t: number) => p.start / FPS + Math.max(0, t - p.in) / p.speed;
    const pend = (p.start + p.frames) / FPS;
    p.words.forEach((w, j) => {
      let text = w[0];
      for (const [a, b] of Object.entries(fix)) if (norm(a) === norm(w[0])) text = text.replace(/^([¿¡]?).*?([.,?!…]*)$/u, (_m, x, y) => x + b + y);
      const st = tc(w[1]);
      const en = j + 1 < p.words.length ? tc(p.words[j + 1][1]) : pend;
      out.push({id: `${p.src}:${w[1]}`, text, sec: p.sec, start: +Math.min(st, pend - 0.05).toFixed(3), end: +Math.min(en, st + 1.2, pend).toFixed(3)});
    });
  }
  return out;
};

// dónde quedó cada palabra del corte viejo en el nuevo (si se quitó, la siguiente que sobrevive; si no hay, la anterior)
const puente = (V: PalId[], N: PalId[]) => {
  const pos = new Map<string, number[]>();
  N.forEach((w, i) => pos.set(w.id, [...(pos.get(w.id) ?? []), i]));
  const visto = new Map<string, number>();
  const directo = V.map((w) => {
    const n = visto.get(w.id) ?? 0;
    visto.set(w.id, n + 1);
    const l = pos.get(w.id);
    return l ? (l[n] ?? l[l.length - 1]) : -1;
  });
  return (i: number): {j: number; viva: boolean} | null => {
    if (directo[i] >= 0) return {j: directo[i], viva: true};
    for (let x = i + 1; x < V.length; x++) if (directo[x] >= 0) return {j: directo[x], viva: false};
    for (let x = i - 1; x >= 0; x--) if (directo[x] >= 0) return {j: directo[x], viva: false};
    return null;
  };
};

// a qué cuadro del corte nuevo corresponde el cuadro f del viejo (para no perder el lugar al aplicar)
export const cuadroTrasCorte = (f: number, viejo: TramoEdl[], nuevo: TramoEdl[]): number => {
  const V = palabrasDeEdl(viejo);
  const N = palabrasDeEdl(nuevo);
  if (!V.length || !N.length) return 0;
  let i = 0;
  while (i + 1 < V.length && V[i + 1].start * FPS <= f) i++;
  const d = puente(V, N)(i);
  return d ? Math.round(N[d.j].start * FPS) : 0;
};

// reescribe las anclas de eventos.json tras un re-corte: las que siguen apuntando bien no se tocan. Evita dos fallas: que `reel datos`
// se detenga por una palabra borrada y que "sec:palabra#2" caiga en otra palabra porque se quitó una aparición anterior.
export const reanclar = (eventos: Record<string, unknown>, edlViejo: TramoEdl[], edlNuevo: TramoEdl[]): {eventos: Record<string, unknown>; movidas: number} => {
  const ev = clon(eventos) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const fix = (ev.fix ?? {}) as Record<string, string>;
  const V = palabrasDeEdl(edlViejo, fix);
  const N = palabrasDeEdl(edlNuevo, fix);
  if (!V.length || !N.length) return {eventos: ev, movidas: 0};
  const AV = new Anclas(V);
  const AN = new Anclas(N);
  const ir = puente(V, N);
  let movidas = 0;
  const tiempo = (t: number) => {
    let i = 0;
    while (i + 1 < V.length && V[i + 1].start <= t) i++;
    const d = ir(i);
    if (!d) return t;
    if (!d.viva) movidas++;
    return +(N[d.j].start + (d.viva ? t - V[i].start : 0)).toFixed(3);
  };
  const mapear = (an: Ancla): Ancla => {
    if (typeof an === 'number') return tiempo(an);
    if (typeof an === 'object' && 't' in an) return {...an, t: tiempo(an.t)};
    let i: number;
    try {
      i = AV.indice(an);
    } catch {
      return an; // ya estaba rota: `reel datos` la reporta
    }
    const d = ir(i);
    if (!d) return an;
    if (!d.viva) movidas++;
    try {
      if (AN.indice(an) === d.j) return an;
    } catch {
      /* ya no existe: se reescribe */
    }
    return typeof an === 'object' ? AN.objetoDe(d.j, an.offset) : AN.deIndice(d.j);
  };
  const recorrer = (o: unknown) => {
    if (Array.isArray(o)) return o.forEach(recorrer);
    if (!o || typeof o !== 'object') return;
    const x = o as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const [k, v] of Object.entries(x)) {
      if (['en', 'hasta', 'monedas'].includes(k) && v !== null && v !== undefined) x[k] = Array.isArray(v) ? v.map(mapear) : mapear(v);
      else if (v && typeof v === 'object') recorrer(v);
    }
  };
  for (const [k, v] of Object.entries(ev)) {
    if (k === 'objetos' || k === 'cortes') ev[k] = (v as Ancla[]).map(mapear);
    else if (k === 'enfasis') ev[k] = (v as (string | {en: Ancla})[]).map((e) => (typeof e === 'string' ? mapear(e) : {...e, en: mapear(e.en)}));
    else if (k !== 'fix') recorrer(v);
  }
  return {eventos: ev, movidas};
};
