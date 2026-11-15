import {describe, expect, it} from 'vitest';
import {agregarClave, agregarEvento, aplicarLibre, aplicarTiempo, bloques, quitarClave, valoresEn} from '@shared/elementos';

const words = [
  {text: 'uno', start: 1, end: 1.3, sec: 'a'},
  {text: 'dos', start: 2, end: 2.3, sec: 'a'},
  {text: 'tres', start: 3, end: 3.3, sec: 'a'},
];
const base = () => ({n: 200, words, textos: [] as unknown[], audios: [] as unknown[], tcortes: [] as unknown[], ajustes: [] as unknown[]});

describe('capas libres', () => {
  it('agrega un texto libre pegado a la palabra más cercana, con su plantilla', () => {
    const r = agregarEvento(base(), {}, 'textos', 62);
    expect(r.eventos.textos[0]).toMatchObject({en: 'a:dos', dur: 2.5, texto: 'TU TEXTO'});
    expect(r.data.textos[0]).toMatchObject({a: 60, b: 135, ev: 0, texto: 'TU TEXTO'});
    expect(r.sel).toEqual({lista: 'textos', i: 0});
  });
  it('la transición de corte se mueve y estira como cualquier capa (en / dur)', () => {
    const r = agregarEvento(base(), {}, 'tcortes', 30);
    const m = aplicarTiempo(r.data, r.eventos, r.sel, 90, 105);
    expect(m.eventos.transiciones_corte[0]).toMatchObject({en: 'a:tres', dur: 0.5, tipo: 'fundido'});
    expect(m.data.tcortes[0]).toMatchObject({a: 90, b: 105});
  });
  it('bloques: nombres legibles para formas, audios y ajustes', () => {
    const d = {...base(), formas: [{a: 0, b: 30, forma: 'flecha', ev: 0}], audios: [{a: 0, b: 90, src: 'audio/musica.mp3', ev: 0}], ajustes: [{a: 0, b: 30, filtro: 'bn', brillo: 10, ev: 0}]};
    const b = bloques(d);
    expect(b.find((x) => x.sel.lista === 'formas')?.texto).toBe('flecha');
    expect(b.find((x) => x.sel.lista === 'audios')?.texto).toBe('musica.mp3');
    expect(b.find((x) => x.sel.lista === 'ajustes')?.texto).toBe('bn · brillo +10');
  });
});

describe('fotogramas clave', () => {
  const conTexto = () => {
    const r = agregarEvento(base(), {}, 'textos', 60);
    return {data: r.data, eventos: r.eventos, sel: r.sel};
  };
  it('sin claves, aplicarLibre escribe la posición fija', () => {
    const {data, eventos, sel} = conTexto();
    const r = aplicarLibre(data, eventos, sel, {dx: 30}, 90);
    expect(r.eventos.textos[0].dx).toBe(30);
    expect(r.eventos.textos[0].claves).toBeUndefined();
  });
  it('la primera clave fija también el inicio; luego mover edita/crea la clave del cuadro actual', () => {
    const c = conTexto();
    let r = agregarClave(c.data, c.eventos, c.sel, 75); // t = 0.5 s
    expect(r.eventos.textos[0].claves).toEqual([
      {t: 0, dx: 0, dy: 0, escala: 1, rot: 0, opacidad: 1},
      {t: 0.5, dx: 0, dy: 0, escala: 1, rot: 0, opacidad: 1},
    ]);
    r = aplicarLibre(r.data, r.eventos, c.sel, {dx: 100, escala: 2}, 75);
    expect(r.eventos.textos[0].claves[1]).toMatchObject({t: 0.5, dx: 100, escala: 2});
    expect(r.eventos.textos[0].dx).toBeUndefined();
    // a mitad de camino (t = 0.25 s) la interpolación suave da la mitad exacta
    expect(valoresEn(r.data.textos[0], 60 + 7.5).dx).toBeCloseTo(50, 5);
    // después de la última clave se queda en su valor
    expect(valoresEn(r.data.textos[0], 130)).toMatchObject({dx: 100, escala: 2});
    // mover en otro cuadro crea una clave nueva con los valores interpolados de ese cuadro
    r = aplicarLibre(r.data, r.eventos, c.sel, {dy: -40}, 90);
    expect(r.eventos.textos[0].claves).toHaveLength(3);
    expect(r.eventos.textos[0].claves[2]).toMatchObject({t: 1, dx: 100, dy: -40, escala: 2});
    // quitar
    r = quitarClave(r.data, r.eventos, c.sel, 0.5);
    expect(r.eventos.textos[0].claves.map((k: {t: number}) => k.t)).toEqual([0, 1]);
    r = quitarClave(quitarClave(r.data, r.eventos, c.sel, 0).data, quitarClave(r.data, r.eventos, c.sel, 0).eventos, c.sel, 1);
    expect(r.eventos.textos[0].claves).toBeUndefined();
  });
});
