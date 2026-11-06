// Anclas de tiempo de eventos.json, igual que `class Anchors` de reel.py:
//   número (s del corte) | "palabra" | "sec:palabra" | "sec:palabra#n" | {palabra, sec, n, offset} | {t, offset}
// La app las usa para (1) mostrar dónde cae cada evento y (2) "pegar" a una palabra al soltar en la línea de tiempo.
export const FPS = 30;

export type Palabra = {text: string; start: number; end: number; sec: string; key?: boolean; corte?: boolean; enf?: boolean};
export type Ancla = number | string | {palabra: string; sec?: string; n?: number; offset?: number} | {t: number; offset?: number};

// misma normalización que norm() de reel.py: minúsculas, sin acentos, solo letras/números/_/*
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^\p{L}\p{N}_*]+/gu, '');

export class Anclas {
  constructor(private words: Palabra[]) {}

  // segundos del corte; lanza Error si el ancla no existe (como reel datos)
  t(an: Ancla | null | undefined, offDef = 0): number | null {
    if (an === null || an === undefined) return null;
    if (typeof an === 'number') return an;
    let word: string;
    let sec: string | undefined;
    let n = 0;
    let off = offDef;
    if (typeof an === 'object') {
      if ('t' in an) return an.t + (an.offset ?? 0);
      word = an.palabra;
      sec = an.sec;
      n = an.n ?? 0;
      off = an.offset ?? offDef;
    } else {
      const m = an.trim().match(/^(?:([\w-]+):)?(.+?)(?:#(\d+))?$/u);
      if (!m) throw new Error(`ancla inválida: ${an}`);
      sec = m[1];
      word = m[2];
      n = Number(m[3] ?? 0);
    }
    const q = word.split(/\s+/).filter(Boolean).map(norm);
    const hits: number[] = [];
    for (let i = 0; i + q.length <= this.words.length; i++) {
      if (sec && this.words[i].sec !== sec) continue;
      if (q.every((x, k) => norm(this.words[i + k].text) === x)) hits.push(this.words[i].start);
    }
    if (!hits.length && q.length === 1 && q[0].length >= 4) {
      for (const w of this.words) if ((!sec || w.sec === sec) && norm(w.text).includes(q[0])) hits.push(w.start);
    }
    if (hits.length <= n) throw new Error(`${JSON.stringify(an)} (coincidencias: ${hits.length})`);
    return hits[n] + off;
  }

  f(an: Ancla, off = 0): number {
    return Math.round((this.t(an, off) as number) * FPS);
  }

  ok(an: Ancla): boolean {
    try {
      this.t(an);
      return true;
    } catch {
      return false;
    }
  }

  // ancla "sec:palabra#n" que apunta exactamente a la palabra i (n = cuántas veces apareció antes en su sección)
  deIndice(i: number): string {
    const w = this.words[i];
    const k = norm(w.text);
    let n = 0;
    for (let j = 0; j < i; j++) if (this.words[j].sec === w.sec && norm(this.words[j].text) === k) n++;
    const limpia = w.text.replace(/^[¿¡"«(]+|[.,;:?!…"»)]+$/gu, '') || w.text;
    return n ? `${w.sec}:${limpia}#${n}` : `${w.sec}:${limpia}`;
  }

  // palabra cuyo inicio está más cerca del cuadro f (opcionalmente solo palabras con inicio <= f)
  masCercana(f: number): number {
    let best = 0;
    let d = Infinity;
    this.words.forEach((w, i) => {
      const dd = Math.abs(Math.round(w.start * FPS) - f);
      if (dd < d) {
        d = dd;
        best = i;
      }
    });
    return best;
  }

  // ancla para el cuadro f: la palabra más cercana + offset (s) si no cae justo (con Alt: sin pegar)
  paraCuadro(f: number, pegar = true): Ancla {
    if (!this.words.length) return +(f / FPS).toFixed(3);
    const i = this.masCercana(f);
    const an = this.deIndice(i);
    const base = this.t(an) as number;
    const off = +(f / FPS - base).toFixed(2);
    if (pegar || Math.abs(off) < 0.02) return an;
    return {palabra: an.replace(/^[\w-]+:/u, '').replace(/#\d+$/, ''), sec: this.words[i].sec, n: Number(an.match(/#(\d+)$/)?.[1] ?? 0), offset: off};
  }
}
