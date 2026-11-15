import {describe, expect, it} from 'vitest';
import type {TramoEdl} from '@shared/cortes';
import {datosParaPlan, mapeoCuadros} from '@shared/planDatos';

// corte actual: A[10–12 s] (cuadros 0–59) y luego B[0–2 s] (60–119)
const VIEJO: TramoEdl[] = [
  {src: 'A', in: 10, out: 12, sec: 's1', speed: 1, start: 0, frames: 60, words: []},
  {src: 'B', in: 0, out: 2, sec: 's2', speed: 1, start: 60, frames: 60, words: []},
];
// plan nuevo: B primero, luego solo la 2ª mitad de A
const NUEVO = [
  {src: 'B', in: 0, out: 2, speed: 1, frames: 60},
  {src: 'A', in: 11, out: 12, speed: 1, frames: 30},
];

describe('gráficos en la vista del plan', () => {
  it('traduce cuadros pasando por el segundo del clip original', () => {
    const m = mapeoCuadros(VIEJO, NUEVO);
    expect(m(60)).toBe(0); // inicio de B → inicio del plan
    expect(m(90)).toBe(30);
    expect(m(45)).toBe(75); // A 11.5 s → 60 + 15
    expect(m(10)).toBeNull(); // A 10.33 s: el plan lo quitó
  });

  it('mueve elementos, conserva su duración y quita los que caen en lo recortado', () => {
    const data = {
      n: 120,
      words: [{text: 'hola', start: 2.0, end: 2.3, sec: 's2'}, {text: 'fuera', start: 0.2, end: 0.5, sec: 's1'}],
      labels: [{a: 70, b: 100, texto: 'B'}, {a: 5, b: 30, texto: 'quitada'}],
      fechas: [{a: 40, b: 58, f2: 50, fl: 48}],
      sfx: [{f: 62, src: 'pop'}],
      secs: [{id: 's1', a: 0, b: 60}],
      track: {x: [0.5], y: [0.5]},
      hook: {top: 400},
      hookEnd: 40,
    };
    const d = datosParaPlan(data, VIEJO, NUEVO)! as Record<string, any>;
    expect(d.n).toBe(90);
    expect(d.words.map((w: {text: string}) => w.text)).toEqual(['hola']);
    expect(d.words[0].start).toBeCloseTo(0, 5);
    expect(d.labels).toEqual([{a: 10, b: 40, texto: 'B'}]);
    expect(d.fechas[0]).toMatchObject({a: 70, b: 88, f2: 80, fl: 78});
    expect(d.sfx).toEqual([{f: 2, src: 'pop'}]);
    expect(d.track).toBeUndefined();
    expect(d.hook).toBeNull(); // el plan ya no empieza con el tramo del gancho
  });

  it('sin edl no hay gráficos (la vista usa sus propios subtítulos)', () => {
    expect(datosParaPlan({n: 1}, null, NUEVO)).toBeNull();
  });
});
