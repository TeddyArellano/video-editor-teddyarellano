import {describe, expect, it} from 'vitest';
import {agregarEvento, aplicarCampos, aplicarTiempo, bloques, eventoDe, quitarEvento} from '@shared/elementos';

const words = [
  {text: 'uno', start: 1, end: 1.3, sec: 'a'},
  {text: 'dos', start: 2, end: 2.3, sec: 'a'},
  {text: 'tres', start: 3, end: 3.3, sec: 'a'},
  {text: 'cuatro', start: 4, end: 4.3, sec: 'a'},
];
// data como la genera reel datos (con "ev"); la etiqueta 0 de eventos no tiene data (p. ej. filtrada)
const data = () => ({
  n: 200,
  words,
  labels: [{a: 60, b: 150, texto: 'B', ev: 1}],
  montos: [{a: 30, b: 90, texto: '$5', ev: 0}],
  hook: {elementos: [{tipo: 'texto', texto: 'HOLA', at: 3}]},
  hookEnd: 40,
});
const eventos = () => ({etiquetas: [{en: 'uno', texto: 'A'}, {en: 'dos', dur: 3, texto: 'B'}], montos: [{en: 'uno', texto: '$5'}], gancho: {elementos: [{tipo: 'texto', texto: 'HOLA', at: 3}]}});

describe('aplicarCampos', () => {
  it('usa "ev" para encontrar el evento correcto', () => {
    const r = aplicarCampos(data(), eventos(), {lista: 'labels', i: 0}, {dx: 40.4, dy: -20, texto: 'C'});
    expect(r.eventos.etiquetas[1]).toMatchObject({texto: 'C', dx: 40.4, dy: -20});
    expect(r.eventos.etiquetas[0].texto).toBe('A');
    expect(r.data.labels[0]).toMatchObject({texto: 'C', dx: 40.4});
  });
  it('limpia valores neutros (dx 0, escala 1) y vacíos', () => {
    const r = aplicarCampos(data(), eventos(), {lista: 'labels', i: 0}, {dx: 0.2, escala: 1, rot: 0, color: ''});
    expect(r.eventos.etiquetas[1]).toEqual({en: 'dos', dur: 3, texto: 'B'});
  });
  it('no muta las entradas', () => {
    const d = data();
    const e = eventos();
    aplicarCampos(d, e, {lista: 'montos', i: 0}, {dx: 10});
    expect(d.montos[0]).not.toHaveProperty('dx');
    expect(e.montos[0]).not.toHaveProperty('dx');
  });
  it('gancho: edita el elemento i en data y eventos', () => {
    const r = aplicarCampos(data(), eventos(), {lista: 'hook', i: 0}, {texto: 'ADIÓS', escala: 1.5});
    expect(r.eventos.gancho.elementos[0]).toMatchObject({texto: 'ADIÓS', escala: 1.5});
    expect(r.data.hook.elementos[0].texto).toBe('ADIÓS');
  });
});

describe('aplicarTiempo', () => {
  it('pega el inicio a la palabra y guarda en + dur', () => {
    const r = aplicarTiempo(data(), eventos(), {lista: 'labels', i: 0}, 92, 150);
    expect(r.eventos.etiquetas[1].en).toBe('a:tres');
    expect(r.eventos.etiquetas[1].dur).toBeCloseTo((150 - 90) / 30, 2);
    expect(r.data.labels[0].a).toBe(90);
  });
  it('sin pegar guarda offset', () => {
    const r = aplicarTiempo(data(), eventos(), {lista: 'labels', i: 0}, 96, 150, false);
    expect(r.eventos.etiquetas[1].en).toMatchObject({palabra: 'tres', sec: 'a', offset: 0.2});
    expect(r.data.labels[0].a).toBe(96);
  });
});

describe('agregar / quitar', () => {
  it('agrega una etiqueta en el cuadro y la selecciona', () => {
    const r = agregarEvento(data(), eventos(), 'labels', 119);
    expect(r.eventos.etiquetas).toHaveLength(3);
    expect(r.eventos.etiquetas[2]).toMatchObject({en: 'a:cuatro', dur: 3, texto: 'NUEVA ETIQUETA'});
    expect(r.sel).toEqual({lista: 'labels', i: 1});
    expect(r.data.labels[1]).toMatchObject({a: 120, ev: 2});
    expect(eventoDe(r.eventos, r.data, r.sel)?.texto).toBe('NUEVA ETIQUETA');
  });
  it('quita y reindexa "ev"', () => {
    const d = {...data(), labels: [{a: 1, b: 2, texto: 'A', ev: 0}, {a: 60, b: 150, texto: 'B', ev: 1}]};
    const r = quitarEvento(d, eventos(), {lista: 'labels', i: 0});
    expect(r.eventos.etiquetas.map((x: {texto: string}) => x.texto)).toEqual(['B']);
    expect(r.data.labels[0]).toMatchObject({texto: 'B', ev: 0});
  });
});

describe('bloques', () => {
  it('lista elementos con tiempo, incluido el gancho', () => {
    const b = bloques(data());
    expect(b.map((x) => x.sel.lista).sort()).toEqual(['hook', 'labels', 'montos']);
    expect(b.find((x) => x.sel.lista === 'hook')).toMatchObject({a: 3, b: 40, texto: 'HOLA'});
  });
  it('gancho: cada elemento llega hasta el siguiente (no se enciman)', () => {
    const d = {...data(), hook: {elementos: [{texto: 'A', at: 3}, {texto: 'B', at: 20}, {texto: 'C', at: 10}]}, hookEnd: 60};
    const h = bloques(d).filter((x) => x.sel.lista === 'hook').map((x) => [x.texto, x.a, x.b]);
    expect(h).toEqual([['A', 3, 10], ['B', 20, 60], ['C', 10, 20]]);
  });
});
