// Ediciones de subtítulos. Igual que los eventos: se aplican a data (vista previa) y a eventos.json (lo que guarda
// `reel datos`): fix (corrección de texto, afecta todas las apariciones), resaltar (color acento), enfasis (palabra
// sola y grande) y cortes (la palabra empieza un bloque nuevo).
import {Anclas, norm, type Palabra} from './anclas';
import type {Obj} from './elementos';

const clon = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const anclaDe = (e: unknown) => (typeof e === 'string' ? e : (e as Obj)?.en);

// corrige el texto de la palabra i (y de todas las que suenan igual): fix {original: nuevo}
export const corregir = (data: Obj, eventos: Obj, i: number, nuevo: string) => {
  const d = clon(data);
  const e = clon(eventos ?? {});
  const w: Palabra = d.words[i];
  const limpio = (t: string) => t.replace(/^[¿¡]+/, '').replace(/[.,?!…]+$/, '');
  const orig = limpio(w.text);
  const nuevoLimpio = limpio(nuevo.trim());
  if (!nuevoLimpio || norm(orig) === norm(nuevoLimpio) && orig === nuevoLimpio) return {data: d, eventos: e};
  // si la palabra ya venía de un fix, se actualiza esa entrada (la clave sigue siendo lo que dijo Whisper)
  e.fix = e.fix ?? {};
  const previa = Object.entries(e.fix as Record<string, string>).find(([, v]) => norm(v) === norm(orig));
  const clave = previa ? previa[0] : orig;
  e.fix[clave] = nuevoLimpio;
  const k = norm(orig);
  for (const x of d.words as Palabra[]) {
    if (norm(x.text) === k) x.text = x.text.replace(/^([¿¡]?).*?([.,?!…]*)$/u, (_m, a: string, b: string) => a + nuevoLimpio + b);
  }
  // las anclas que apuntaban a la palabra vieja ("sec:palabra#n") se renombran: si no, `reel datos` ya no las encuentra
  return {data: d, eventos: renombrarAnclas(e, orig, nuevoLimpio)};
};

// renombra la palabra `viejo` → `nuevo` en todas las anclas de eventos.json (en, hasta, segunda, flecha, objetos,
// cortes, enfasis…). Todas las apariciones cambian juntas, así que los "#n" siguen apuntando a la misma palabra.
const CLAVES_ANCLA = new Set(['en', 'hasta', 'segunda', 'flecha', 'monedas']);
export const renombrarAnclas = (eventos: Obj, viejo: string, nuevo: string): Obj => {
  const k = norm(viejo);
  if (!k || k === norm(nuevo)) return eventos;
  const palabra = (t: string) => t.split(/(\s+)/).map((x) => (norm(x) === k ? nuevo : x)).join('');
  const texto = (an: string) => {
    const m = an.trim().match(/^(?:([\w-]+):)?(.+?)(?:#(\d+))?$/u);
    if (!m) return an;
    const w = palabra(m[2]);
    return w === m[2] ? an : `${m[1] ? `${m[1]}:` : ''}${w}${m[3] ? `#${m[3]}` : ''}`;
  };
  const ancla = (an: unknown): unknown => {
    if (typeof an === 'string') return texto(an);
    if (Array.isArray(an)) return an.map(ancla);
    if (an && typeof an === 'object' && typeof (an as Obj).palabra === 'string') return {...(an as Obj), palabra: palabra((an as Obj).palabra)};
    return an;
  };
  const recorrer = (o: unknown): unknown => {
    if (Array.isArray(o)) return o.map(recorrer);
    if (!o || typeof o !== 'object') return o;
    const r: Obj = {};
    for (const [c, v] of Object.entries(o as Obj)) r[c] = CLAVES_ANCLA.has(c) ? ancla(v) : recorrer(v);
    return r;
  };
  const r = recorrer(eventos) as Obj;
  for (const c of ['objetos', 'cortes']) if (Array.isArray(eventos[c])) r[c] = eventos[c].map(ancla);
  if (Array.isArray(r.enfasis)) r.enfasis = (r.enfasis as unknown[]).map((x) => (typeof x === 'string' ? ancla(x) : x));
  // fix y resaltar no son anclas: se quedan como están
  r.fix = eventos.fix;
  if (eventos.resaltar) r.resaltar = eventos.resaltar;
  return r;
};

export const alternarResaltar = (data: Obj, eventos: Obj, i: number) => {
  const d = clon(data);
  const e = clon(eventos ?? {});
  const k = norm(d.words[i].text);
  const lista: string[] = e.resaltar ?? [];
  const esta = lista.some((x) => norm(x) === k);
  e.resaltar = esta ? lista.filter((x) => norm(x) !== k) : [...lista, d.words[i].text.replace(/[.,?!…¿¡]/g, '')];
  if (!e.resaltar.length) delete e.resaltar;
  for (const w of d.words as Palabra[]) if (norm(w.text) === k && !w.enf) w.key = !esta;
  return {data: d, eventos: e};
};

export const alternarEnfasis = (data: Obj, eventos: Obj, i: number) => {
  const d = clon(data);
  const e = clon(eventos ?? {});
  const A = new Anclas(d.words);
  const f = Math.round(d.words[i].start * 30);
  const lista: unknown[] = e.enfasis ?? [];
  const idx = lista.findIndex((x) => {
    try {
      return Math.abs(A.f(anclaDe(x)) - f) <= 1;
    } catch {
      return false;
    }
  });
  if (idx >= 0) {
    lista.splice(idx, 1);
    d.words[i].enf = false;
    d.words[i].key = (e.resaltar ?? []).some((x: string) => norm(x) === norm(d.words[i].text));
  } else {
    lista.push(A.deIndice(i));
    d.words[i].enf = true;
    d.words[i].key = true;
  }
  e.enfasis = lista;
  if (!lista.length) delete e.enfasis;
  return {data: d, eventos: e};
};

export const alternarCorte = (data: Obj, eventos: Obj, i: number) => {
  const d = clon(data);
  const e = clon(eventos ?? {});
  const A = new Anclas(d.words);
  const f = Math.round(d.words[i].start * 30);
  const lista: string[] = e.cortes ?? [];
  const idx = lista.findIndex((x) => {
    try {
      return Math.abs(A.f(x) - f) <= 1;
    } catch {
      return false;
    }
  });
  if (idx >= 0) {
    lista.splice(idx, 1);
    d.words[i].corte = false;
  } else {
    lista.push(A.deIndice(i));
    d.words[i].corte = true;
  }
  e.cortes = lista;
  if (!lista.length) delete e.cortes;
  return {data: d, eventos: e};
};

// la palabra que se dice en el cuadro f
export const palabraEn = (words: Palabra[], f: number): number => {
  const t = f / 30;
  let lo = 0;
  let hi = words.length - 1;
  let r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (words[m].start <= t) {
      r = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return r;
};
