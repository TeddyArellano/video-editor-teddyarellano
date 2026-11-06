// Diferencias entre dos JSON (para revisar lo que propone Claude): lista plana de rutas "etiquetas[1].texto".
export type Cambio = {ruta: string; tipo: 'nuevo' | 'quitado' | 'cambio'; antes?: unknown; despues?: unknown};

const esObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const unir = (base: string, k: string | number) => (typeof k === 'number' ? `${base}[${k}]` : base ? `${base}.${k}` : k);

export const diffJSON = (a: unknown, b: unknown, ruta = ''): Cambio[] => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a === undefined) return [{ruta, tipo: 'nuevo', despues: b}];
  if (b === undefined) return [{ruta, tipo: 'quitado', antes: a}];
  if (Array.isArray(a) && Array.isArray(b)) {
    const out: Cambio[] = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) out.push(...diffJSON(a[i], b[i], unir(ruta, i)));
    return out;
  }
  if (esObj(a) && esObj(b)) {
    const out: Cambio[] = [];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out.push(...diffJSON(a[k], b[k], unir(ruta, k)));
    return out;
  }
  return [{ruta, tipo: 'cambio', antes: a, despues: b}];
};

export const corto = (x: unknown, max = 80) => {
  const t = typeof x === 'string' ? `"${x}"` : JSON.stringify(x);
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
