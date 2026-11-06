import {describe, expect, it} from 'vitest';
import {alternarCorte, alternarEnfasis, alternarResaltar, corregir, palabraEn} from '@shared/subtitulos';

const data = () => ({
  words: [
    {text: 'La', start: 0, end: 0.2, sec: 's'},
    {text: 'escom,', start: 0.3, end: 0.7, sec: 's'},
    {text: 'escom', start: 1, end: 1.4, sec: 's'},
    {text: 'gana.', start: 1.5, end: 2, sec: 's'},
  ],
});

describe('subtítulos', () => {
  it('corregir cambia todas las apariciones y conserva puntuación', () => {
    const r = corregir(data(), {}, 1, 'ESCOM');
    expect(r.eventos.fix).toEqual({escom: 'ESCOM'});
    expect(r.data.words.map((w: {text: string}) => w.text)).toEqual(['La', 'ESCOM,', 'ESCOM', 'gana.']);
    // corregir de nuevo actualiza la misma entrada (clave = texto de Whisper)
    const r2 = corregir(r.data, r.eventos, 2, 'ESCOM IPN');
    expect(r2.eventos.fix).toEqual({escom: 'ESCOM IPN'});
  });
  it('resaltar alterna', () => {
    const r = alternarResaltar(data(), {}, 3);
    expect(r.eventos.resaltar).toEqual(['gana']);
    expect(r.data.words[3].key).toBe(true);
    const r2 = alternarResaltar(r.data, r.eventos, 3);
    expect(r2.eventos.resaltar).toBeUndefined();
    expect(r2.data.words[3].key).toBe(false);
  });
  it('énfasis usa un ancla exacta y alterna', () => {
    const r = alternarEnfasis(data(), {}, 2);
    expect(r.eventos.enfasis).toEqual(['s:escom#1']);
    expect(r.data.words[2]).toMatchObject({enf: true, key: true});
    const r2 = alternarEnfasis(r.data, r.eventos, 2);
    expect(r2.eventos.enfasis).toBeUndefined();
    expect(r2.data.words[2].enf).toBe(false);
  });
  it('corte alterna', () => {
    const r = alternarCorte(data(), {}, 3);
    expect(r.eventos.cortes).toEqual(['s:gana']);
    expect(r.data.words[3].corte).toBe(true);
    expect(alternarCorte(r.data, r.eventos, 3).eventos.cortes).toBeUndefined();
  });
  it('palabraEn', () => {
    expect(palabraEn(data().words, 0)).toBe(0);
    expect(palabraEn(data().words, 31)).toBe(2);
    expect(palabraEn(data().words, 300)).toBe(3);
  });
});
