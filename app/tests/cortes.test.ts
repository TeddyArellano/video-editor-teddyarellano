import {describe, expect, it} from 'vitest';
import {agregarPieza, alternarQuitar, dividirPieza, duracionPieza, editarPieza, moverPieza, textoPieza, type PalabraClip, type Plan} from '@shared/cortes';

const pal: PalabraClip[] = [['a', 0, 0.5], ['b', 0.6, 1], ['c', 1.1, 1.5], ['d', 1.6, 2], ['e', 2.1, 2.5]];
const plan = (): Plan => ({piezas: [{src: 'C1', de: 0, a: 4, sec: 'x'}, {src: 'C1', de: 1, a: 2, sec: 'y'}]});

describe('cortes', () => {
  it('texto y duración', () => {
    expect(textoPieza(pal, {src: 'C1', de: 0, a: 4, sec: 'x', quitar: [2]})).toBe('a b [c] d e');
    expect(duracionPieza(pal, {src: 'C1', de: 0, a: 4, sec: 'x', speed: 2})).toBeCloseTo(1.25);
  });
  it('quitar en medio vs en orillas', () => {
    expect(alternarQuitar(plan(), 0, 2).piezas[0].quitar).toEqual([2]);
    expect(alternarQuitar(plan(), 0, 0).piezas[0]).toMatchObject({de: 1});
    expect(alternarQuitar(plan(), 0, 4).piezas[0]).toMatchObject({a: 3});
    const p = alternarQuitar(alternarQuitar(plan(), 0, 2), 0, 2);
    expect(p.piezas[0].quitar).toBeUndefined();
  });
  it('editar limpia valores neutros', () => {
    const p = editarPieza(plan(), 0, {speed: 1, gain_db: 0, mas_inicio: 0.1});
    expect(p.piezas[0]).toEqual({src: 'C1', de: 0, a: 4, sec: 'x', mas_inicio: 0.1});
  });
  it('mover, agregar y dividir', () => {
    expect(moverPieza(plan(), 1, -1).piezas.map((x) => x.sec)).toEqual(['y', 'x']);
    expect(agregarPieza(plan(), {src: 'C2', de: 0, a: 1, sec: 'z'}, 0).piezas.map((x) => x.sec)).toEqual(['x', 'z', 'y']);
    expect(agregarPieza(null, {src: 'C2', de: 0, a: 1, sec: 'z'}).piezas).toHaveLength(1);
    const d = dividirPieza({piezas: [{src: 'C1', de: 0, a: 4, sec: 'x', quitar: [1, 3], mas_inicio: 0.1, mas_final: 0.2}]}, 0, 2);
    expect(d.piezas).toEqual([
      {src: 'C1', de: 0, a: 1, sec: 'x', quitar: [1], mas_inicio: 0.1},
      {src: 'C1', de: 2, a: 4, sec: 'x', quitar: [3], mas_final: 0.2, pegada: true},
    ]);
  });
});

// ---- recortes sobre la línea de tiempo
import {ajustarBorde, bloqueEn, corteVecino, dividirEn, modeloCorte, objetivoBorde, palabrasDeEdl, quitarRango, rangoAPalabras, reanclar, recortarHasta, restaurarRango, type Palabras, type TramoEdl} from '@shared/cortes';

const W: PalabraClip[] = ['hola', 'amigos', 'esto', 'es', 'una', 'prueba', 'de', 'cortes', 'hola', 'otra', 'vez', 'fin'].map((t, i) => [t, i, i + 0.9]);
const PAL: Palabras = {C1: W};
// un tramo por pieza; 30 cuadros por palabra
const tramo = (de: number, a: number, start: number, sec: string, quitar: number[] = []): TramoEdl => {
  const ws = W.slice(de, a + 1).filter((_, k) => !quitar.includes(de + k));
  return {src: 'C1', in: de, out: a + 1, sec, speed: 1, start, frames: ws.length * 30, words: ws};
};
const PLAN = (): Plan => ({piezas: [{src: 'C1', de: 0, a: 4, sec: 'x'}, {src: 'C1', de: 5, a: 11, sec: 'y'}]});
const EDL = () => [tramo(0, 4, 0, 'x'), tramo(5, 11, 150, 'y')];
const M = (p: Plan = PLAN()) => modeloCorte(p, EDL(), PAL)!;

describe('modelo de recortes', () => {
  it('sin cambios: dos bloques, nada pendiente', () => {
    const m = M();
    expect(m.bloques.map((b) => [b.a, b.b, b.pieza])).toEqual([[0, 150, 0], [150, 360, 1]]);
    expect(m.zonas).toEqual([]);
    expect(m.agregadas).toBe(0);
    expect(m.total).toBe(360);
  });
  it('quitar un rango marca la zona y corrige el plan sin palabras sueltas', () => {
    const p = quitarRango(PLAN(), M(), 30, 90);
    expect(p.piezas[0]).toMatchObject({de: 0, a: 4, quitar: [1, 2]});
    expect(M(p).zonas).toEqual([[30, 90]]);
    expect(M(p).bloques.map((b) => b.quitada)).toEqual([false, true, false, false]);
  });
  it('quitar en la orilla mueve de/a; quitar todo borra la pieza', () => {
    expect(quitarRango(PLAN(), M(), 0, 60).piezas[0]).toMatchObject({de: 2, a: 4});
    const p = quitarRango(PLAN(), M(), 0, 150);
    expect(p.piezas).toHaveLength(1);
    expect(M(p).zonas).toEqual([[0, 150]]);
  });
  it('un rango que cruza piezas recorta las dos', () => {
    const p = quitarRango(PLAN(), M(), 120, 180);
    expect(p.piezas[0].a).toBe(3);
    expect(p.piezas[1].de).toBe(6);
  });
  it('restaurar deja el plan como estaba', () => {
    const q = quitarRango(PLAN(), M(), 30, 90);
    expect(restaurarRango(q, M(q), EDL(), PAL, 30, 90).piezas[0].quitar).toBeUndefined();
    const sinPieza = quitarRango(PLAN(), M(), 0, 150);
    const r = restaurarRango(sinPieza, M(sinPieza), EDL(), PAL, 0, 150);
    expect(modeloCorte(r, EDL(), PAL)!.zonas).toEqual([]);
  });
  it('si una palabra se usa dos veces, se quita la aparición correcta', () => {
    const plan: Plan = {piezas: [{src: 'C1', de: 0, a: 1, sec: 'g'}, {src: 'C1', de: 2, a: 4, sec: 'x'}, {src: 'C1', de: 0, a: 1, sec: 'x'}]};
    const edl = [tramo(0, 1, 0, 'g'), tramo(2, 4, 60, 'x'), tramo(0, 1, 150, 'x')];
    const m = modeloCorte(plan, edl, PAL)!;
    const p = quitarRango(plan, m, 150, 210);
    expect(p.piezas).toHaveLength(2);
    expect(modeloCorte(p, edl, PAL)!.zonas).toEqual([[150, 210]]);
    const q = quitarRango(plan, m, 0, 60);
    expect(modeloCorte(q, edl, PAL)!.zonas).toEqual([[0, 60]]);
  });
  it('dividir en el cabezal: pieza pegada y sin duplicar palabras', () => {
    const p = dividirEn(PLAN(), M(), 62)!;
    expect(p.piezas.map((z) => [z.de, z.a, !!z.pegada])).toEqual([[0, 1, false], [2, 4, true], [5, 11, false]]);
    expect(M(p).zonas).toEqual([]);
    expect(dividirEn(PLAN(), M(), 2)).toBeNull(); // ya es el inicio de la pieza
  });
  it('Q y W recortan hasta el cabezal', () => {
    expect(recortarHasta(PLAN(), M(), 60, 'ini')!.piezas[0]).toMatchObject({de: 2, a: 4});
    expect(recortarHasta(PLAN(), M(), 60, 'fin')!.piezas[0]).toMatchObject({de: 0, a: 1});
  });
  it('arrastrar un borde: adentro quita, afuera extiende y no invade otra pieza', () => {
    const m = M();
    const b = m.bloques[1];
    expect(objetivoBorde(PLAN(), b, PAL, 'ini', 60)).toBe(7);
    expect(ajustarBorde(PLAN(), b, 'ini', 7).piezas[1]).toMatchObject({de: 7, a: 11});
    expect(objetivoBorde(PLAN(), b, PAL, 'ini', -60)).toBe(5); // la pieza 0 ocupa las palabras anteriores
    const corto: Plan = {piezas: [{src: 'C1', de: 3, a: 5, sec: 'x'}]};
    const edl = [tramo(3, 5, 0, 'x')];
    const b2 = modeloCorte(corto, edl, PAL)!.bloques[0];
    expect(objetivoBorde(corto, b2, PAL, 'fin', 60)).toBe(7);
    expect(ajustarBorde(corto, b2, 'fin', 7).piezas[0].a).toBe(7);
    expect(modeloCorte(ajustarBorde(corto, b2, 'fin', 7), edl, PAL)!.agregadas).toBe(2);
  });
  it('navegación y selección', () => {
    const m = M(quitarRango(PLAN(), M(), 30, 90));
    expect(corteVecino(m, 0, 1)).toBe(30);
    expect(corteVecino(m, 90, -1)).toBe(30);
    expect(bloqueEn(m, 40)!.quitada).toBe(true);
    expect(rangoAPalabras(M(), 33, 88)).toEqual([30, 90]);
    expect(rangoAPalabras(M(), 88, 33)).toEqual([30, 90]);
  });
});

describe('anclas tras un re-corte', () => {
  const edlTras = () => [tramo(0, 4, 0, 'x', [1, 2]), tramo(5, 11, 90, 'y')];
  it('no toca las que siguen bien; las desplazadas por una aparición anterior se corrigen', () => {
    const viejo = EDL();
    const sinHola = [tramo(1, 4, 0, 'x'), tramo(5, 11, 120, 'y')];
    const r = reanclar({etiquetas: [{en: 'una'}, {en: 'hola#1'}]}, viejo, sinHola);
    expect((r.eventos.etiquetas as {en: unknown}[])[0].en).toBe('una');
    expect((r.eventos.etiquetas as {en: unknown}[])[1].en).toBe('y:hola'); // antes era la 2ª "hola"; ahora es la única
  });
  it('si la palabra se borró, pasa a la siguiente que sobrevive y lo reporta', () => {
    const r = reanclar({zooms: [{en: 'amigos', z: 1.5}]}, EDL(), edlTras());
    expect((r.eventos.zooms as {en: unknown}[])[0].en).toBe('x:es');
    expect(r.movidas).toBe(1);
  });
  it('conserva offset, cubre objetos/énfasis/cortes y tiempos numéricos', () => {
    const r = reanclar({nombres: [{en: {palabra: 'esto', sec: 'x', offset: 0.2}}], objetos: ['amigos'], cortes: ['prueba'], enfasis: [{en: 'esto', sfx: 'pop'}], sfx: [{en: 5.5}], fix: {hola: 'HOLA'}}, EDL(), edlTras());
    const e = r.eventos as Record<string, {en: unknown}[]>;
    expect(e.nombres[0].en).toEqual({palabra: 'es', sec: 'x', n: 0, offset: 0.2});
    expect(e.objetos[0]).toBe('x:es');
    expect(e.cortes[0]).toBe('prueba');
    expect(e.enfasis[0].en).toBe('x:es');
    expect(e.sfx[0].en).toBeCloseTo(3.5, 2);
  });
  it('las palabras coinciden con cut_words (correcciones incluidas)', () => {
    const w = palabrasDeEdl(EDL(), {hola: 'HOLA'});
    expect(w[0]).toMatchObject({text: 'HOLA', sec: 'x', start: 0});
    expect(w).toHaveLength(12);
  });
});

describe('reordenar piezas', () => {
  it('moverPiezaA lleva una pieza a cualquier posición', async () => {
    const {moverPiezaA} = await import('@shared/cortes');
    const plan = {piezas: [{src: 'A', de: 0, a: 1, sec: 's'}, {src: 'B', de: 0, a: 1, sec: 's'}, {src: 'C', de: 0, a: 1, sec: 's'}]};
    expect(moverPiezaA(plan, 0, 2).piezas.map((p) => p.src)).toEqual(['B', 'C', 'A']);
    expect(moverPiezaA(plan, 2, 0).piezas.map((p) => p.src)).toEqual(['C', 'A', 'B']);
    expect(plan.piezas.map((p) => p.src)).toEqual(['A', 'B', 'C']);
  });
  it('destinoPieza: soltar antes de la mitad de una pieza la pone antes de ella', async () => {
    const {destinoPieza, moverPiezaA} = await import('@shared/cortes');
    const b = (pieza: number, a: number, fin: number) => ({id: pieza, a, b: fin, pieza, quitada: false, src: 'X', k0: 0, k1: 0, speed: 1, i0: 0, i1: 0, texto: ''});
    const m = {pal: [], bloques: [b(0, 0, 30), b(1, 30, 60), b(2, 60, 90)], zonas: [], agregadas: 0, total: 90};
    const plan = {piezas: [{src: 'A', de: 0, a: 1, sec: 's'}, {src: 'B', de: 0, a: 1, sec: 's'}, {src: 'C', de: 0, a: 1, sec: 's'}]};
    // la pieza A soltada al final
    let d = destinoPieza(m, 0, 85);
    expect(moverPiezaA(plan, 0, d.j).piezas.map((p) => p.src)).toEqual(['B', 'C', 'A']);
    expect(d.x).toBe(90);
    // la C soltada al principio
    d = destinoPieza(m, 2, 5);
    expect(moverPiezaA(plan, 2, d.j).piezas.map((p) => p.src)).toEqual(['C', 'A', 'B']);
    expect(d.x).toBe(0);
    // la A entre B y C
    d = destinoPieza(m, 0, 70);
    expect(moverPiezaA(plan, 0, d.j).piezas.map((p) => p.src)).toEqual(['B', 'A', 'C']);
  });
});

describe('tramosPlan (vista del plan sin re-cortar)', () => {
  it('sigue el orden del plan, con márgenes, palabras quitadas y mas_inicio', async () => {
    const {tramosPlan} = await import('@shared/cortes');
    const W: [string, number, number][] = [['hola', 1, 1.3], ['qué', 1.4, 1.6], ['tal', 1.7, 1.9], ['amigos', 4, 4.5]];
    const r = tramosPlan({piezas: [{src: 'B', de: 3, a: 3, sec: 's2'}, {src: 'B', de: 0, a: 2, sec: 's1', quitar: [1], mas_inicio: 0.1}]}, {B: W});
    expect(r.map((t) => t.texto)).toEqual(['amigos', 'hola', 'tal']);
    expect(r[0]).toMatchObject({src: 'B', sec: 's2'});
    expect(r[0].in).toBeCloseTo(3.86, 2); // 4 − 0.14
    expect(r[1].in).toBeCloseTo(0.76, 2); // 1 − 0.14 − 0.1
    expect(r[2].out).toBeLessThanOrEqual(4 - 0.1 + 1e-9); // nunca entra en la palabra siguiente
    // subtítulos de la vista del plan: palabras con su tiempo en el clip, sin las quitadas
    expect(r[1].palabras.map((w) => w[0])).toEqual(['hola']);
    expect(r[2].palabras).toEqual([['tal', 1.7, 1.9]]);
  });
});

describe('curvas de velocidad', () => {
  it('rampaVelocidad = rampa_velocidad de reel.py (la curva recorre la pieza completa)', async () => {
    const {rampaVelocidad} = await import('@shared/cortes');
    const r = (x: [number, number, number][][]) => x.map((t) => t.map(([a, b, s]) => [+a.toFixed(2), +b.toFixed(2), s]));
    expect(r(rampaVelocidad([[10, 12]], 4, 'suave'))).toEqual([[[10, 10.4, 1.9], [10.4, 10.8, 3.1], [10.8, 11.2, 4], [11.2, 11.6, 3.1], [11.6, 12, 1.9]]]);
    expect(rampaVelocidad([[10, 12]], 4)).toEqual([[[10, 12, 4]]]);
    expect(r(rampaVelocidad([[0, 1], [5, 6]], 3, 'subir'))).toEqual([[[0, 0.5, 1], [0.5, 1, 1.66]], [[5, 5.5, 2.32], [5.5, 6, 3]]]);
  });
});
