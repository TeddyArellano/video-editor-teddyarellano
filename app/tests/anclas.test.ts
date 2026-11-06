import {describe, expect, it} from 'vitest';
import {Anclas, norm, type Palabra} from '@shared/anclas';

const W: Palabra[] = [
  {text: 'Hola,', start: 0.1, end: 0.4, sec: 'intro'},
  {text: 'esta', start: 0.5, end: 0.7, sec: 'intro'},
  {text: 'es', start: 0.75, end: 0.85, sec: 'intro'},
  {text: 'mi', start: 0.9, end: 1.0, sec: 'intro'},
  {text: 'mochila.', start: 1.05, end: 1.6, sec: 'intro'},
  {text: '¿Qué', start: 2.0, end: 2.2, sec: 'juan'},
  {text: 'lleva', start: 2.25, end: 2.5, sec: 'juan'},
  {text: 'mi', start: 2.55, end: 2.6, sec: 'juan'},
  {text: 'mochila?', start: 2.65, end: 3.1, sec: 'juan'},
  {text: 'Mochila', start: 3.5, end: 3.9, sec: 'juan'},
];

describe('norm (igual que reel.py)', () => {
  it('quita acentos, puntuación y mayúsculas', () => {
    expect(norm('¿Qué')).toBe('que');
    expect(norm('Mochila?')).toBe('mochila');
    expect(norm('Ñandú')).toBe('nandu');
  });
});

describe('Anclas', () => {
  const A = new Anclas(W);
  it('número = segundos', () => expect(A.t(1.5)).toBe(1.5));
  it('palabra simple = primera aparición', () => expect(A.t('mochila')).toBe(1.05));
  it('sec:palabra#n', () => {
    expect(A.t('juan:mochila')).toBe(2.65);
    expect(A.t('juan:mochila#1')).toBe(3.5);
  });
  it('frase de varias palabras', () => expect(A.t('mi mochila#1')).toBe(2.55));
  it('objeto con offset', () => expect(A.t({palabra: 'lleva', sec: 'juan', offset: -0.1})).toBeCloseTo(2.15));
  it('{t}', () => expect(A.t({t: 4, offset: 0.5})).toBe(4.5));
  it('respaldo por substring (≥ 4 letras)', () => expect(A.t('ochil')).toBe(1.05));
  it('lanza si no existe', () => expect(() => A.t('bicicleta')).toThrow(/coincidencias: 0/));
  it('f() en cuadros', () => expect(A.f('juan:lleva')).toBe(Math.round(2.25 * 30)));
  it('deIndice da un ancla que vuelve a la misma palabra', () => {
    for (let i = 0; i < W.length; i++) expect(A.t(A.deIndice(i))).toBe(W[i].start);
    expect(A.deIndice(9)).toBe('juan:Mochila#1');
    expect(A.deIndice(5)).toBe('juan:Qué');
  });
  it('paraCuadro pega a la palabra más cercana; sin pegar guarda offset', () => {
    expect(A.paraCuadro(Math.round(2.3 * 30))).toBe('juan:lleva');
    const libre = A.paraCuadro(Math.round(2.4 * 30), false) as {palabra: string; offset: number};
    expect(libre.palabra).toBe('lleva');
    expect(libre.offset).toBeCloseTo(0.15, 2);
    expect(A.t(libre)).toBeCloseTo(2.4, 2);
  });
});
