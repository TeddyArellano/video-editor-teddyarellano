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
