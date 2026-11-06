import {describe, expect, it} from 'vitest';
import {corto, diffJSON} from '@shared/diff';

describe('diffJSON', () => {
  it('igual = sin cambios', () => expect(diffJSON({a: [1, {b: 2}]}, {a: [1, {b: 2}]})).toEqual([]));
  it('rutas de cambios, nuevos y quitados', () => {
    const a = {etiquetas: [{texto: 'A', dur: 3}, {texto: 'B'}], fix: {x: 'y'}};
    const b = {etiquetas: [{texto: 'A', dur: 2.5, dy: -40}], fix: {x: 'y'}, enfasis: ['s:hola']};
    expect(diffJSON(a, b)).toEqual([
      {ruta: 'etiquetas[0].dur', tipo: 'cambio', antes: 3, despues: 2.5},
      {ruta: 'etiquetas[0].dy', tipo: 'nuevo', despues: -40},
      {ruta: 'etiquetas[1]', tipo: 'quitado', antes: {texto: 'B'}},
      {ruta: 'enfasis', tipo: 'nuevo', despues: ['s:hola']},
    ]);
  });
  it('corto recorta', () => expect(corto('x'.repeat(200), 10)).toHaveLength(10));
});
