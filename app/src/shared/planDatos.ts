// Gráficos en la vista del plan: traduce los cuadros de data.json (calculados sobre el corte actual, edl_final) al plan
// pendiente, pasando por el segundo del clip original. Un elemento cuyo inicio cae en algo que el plan quita desaparece;
// los demás conservan su duración. Es una aproximación de lo que hará `reel datos` después de re-cortar.
import type {TramoEdl} from './cortes';

const FPS = 30;
export type TramoNuevo = {src: string; in: number; out: number; speed: number; frames: number};
type Obj = Record<string, unknown>;

// cuadro del corte actual → cuadro del plan (null si ese momento del clip ya no está en el plan)
export const mapeoCuadros = (viejo: TramoEdl[], nuevo: TramoNuevo[]) => {
  const inicios: number[] = [];
  nuevo.reduce((s, t) => (inicios.push(s), s + t.frames), 0);
  return (f: number): number | null => {
    const v = viejo.find((t) => f >= t.start && f < t.start + t.frames) ?? (f >= 0 && viejo.length && f >= viejo[viejo.length - 1].start ? viejo[viejo.length - 1] : undefined);
    if (!v) return null;
    const seg = v.in + ((f - v.start) / FPS) * (v.speed || 1);
    const k = nuevo.findIndex((t) => t.src === v.src && seg >= t.in - 0.02 && seg <= t.out + 0.02);
    if (k < 0) return null;
    const t = nuevo[k];
    return Math.max(0, Math.min(inicios[k] + t.frames - 1, inicios[k] + Math.round(((seg - t.in) / (t.speed || 1)) * FPS)));
  };
};

// claves de cuadro que se mueven junto con "a" (la 2ª hoja y la flecha de las fechas)
const CON_A = ['f2', 'fl'];

export const datosParaPlan = (data: Obj, viejo: TramoEdl[] | null, nuevo: TramoNuevo[]): Obj | null => {
  if (!viejo?.length || !nuevo.length) return null;
  const m = mapeoCuadros(viejo, nuevo);
  const n = nuevo.reduce((s, t) => s + t.frames, 0);
  const d: Obj = JSON.parse(JSON.stringify(data));
  d.n = n;
  // palabras (subtítulos) en segundos del corte
  if (Array.isArray(d.words))
    d.words = (d.words as {start: number; end: number}[]).flatMap((w) => {
      const a = m(Math.round(w.start * FPS));
      if (a === null) return [];
      const b = m(Math.round(w.end * FPS));
      return [{...w, start: a / FPS, end: (b !== null && b > a ? b : a + Math.round((w.end - w.start) * FPS)) / FPS}];
    });
  // la cámara virtual no se dibuja en la vista del plan
  delete d.track;
  if (Array.isArray(d.secs)) d.secs = (d.secs as Obj[]).map((s) => ({...s, a: 0, b: n}));
  for (const [k, v] of Object.entries(d)) {
    if (!Array.isArray(v) || k === 'words' || k === 'secs') continue;
    d[k] = (v as Obj[]).flatMap((x) => {
      if (!x || typeof x !== 'object') return [x];
      if (typeof x.a === 'number' && typeof x.b === 'number') {
        const a = m(x.a);
        if (a === null) return [];
        const delta = a - x.a;
        const y: Obj = {...x, a, b: Math.min(n, a + (x.b - x.a))};
        for (const c of CON_A) if (typeof x[c] === 'number') y[c] = (x[c] as number) + delta;
        return [y];
      }
      if (typeof x.f === 'number') {
        const f = m(x.f);
        return f === null ? [] : [{...x, f}];
      }
      return [x];
    });
  }
  // el gancho vive al principio: se queda si el primer tramo del corte sigue abriendo el plan
  if (typeof d.hookEnd === 'number' && m(0) !== 0) {
    d.hook = null;
    d.hookEnd = 0;
    d.hookfg = 0;
  }
  return d;
};
