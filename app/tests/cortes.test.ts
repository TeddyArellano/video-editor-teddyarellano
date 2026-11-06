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
      {src: 'C1', de: 2, a: 4, sec: 'x', quitar: [3], mas_final: 0.2},
    ]);
  });
});
