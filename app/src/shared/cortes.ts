// edicion/plan.json = {"piezas": [{src, de, a, sec, speed?, gain_db?, quitar?, mas_inicio?, mas_final?}]}
// de/a = índices de palabra (inclusive) en edicion/palabras/<src>.json ([[texto, inicio, fin], …]).
export type PalabraClip = [string, number, number];
export type Pieza = {src: string; de: number; a: number; sec: string; speed?: number; gain_db?: number; quitar?: number[]; mas_inicio?: number; mas_final?: number};
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
  const segunda: Pieza = {...clon(pz), de: k};
  pz.a = k - 1;
  delete pz.mas_final;
  delete segunda.mas_inicio;
  if (pz.quitar) pz.quitar = pz.quitar.filter((x) => x < k);
  if (segunda.quitar) segunda.quitar = segunda.quitar.filter((x) => x > k);
  p.piezas.splice(i + 1, 0, segunda);
  return p;
};
