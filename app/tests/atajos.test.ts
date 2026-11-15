import {describe, expect, it} from 'vitest';
import {accionDe, conflictos, mapaAtajos, textoCombo} from '@shared/atajos';

const m = mapaAtajos();
describe('atajos', () => {
  it('los valores por defecto cubren lo de siempre', () => {
    expect(accionDe({key: ' ', code: 'Space'}, m)).toBe('play');
    expect(accionDe({key: 'z', code: 'KeyZ', metaKey: true}, m)).toBe('deshacer');
    expect(accionDe({key: 'z', code: 'KeyZ', metaKey: true, shiftKey: true}, m)).toBe('rehacer');
    expect(accionDe({key: 'ArrowRight', code: 'ArrowRight', shiftKey: true}, m)).toBe('segAdelante');
    expect(accionDe({key: 'e', code: 'KeyE', metaKey: true}, m)).toBe('exportar');
  });
  it('Shift + coma funciona aunque el teclado escriba otro símbolo', () => {
    expect(accionDe({key: '<', code: 'Comma', shiftKey: true}, m)).toBe('empujarAtras5'); // EE. UU.
    expect(accionDe({key: ';', code: 'Comma', shiftKey: true}, m)).toBe('empujarAtras5'); // latinoamericano
  });
  it('"+" del teclado latinoamericano y Shift+= del de EE. UU. acercan', () => {
    expect(accionDe({key: '+', code: 'BracketRight'}, m)).toBe('acercar');
    expect(accionDe({key: '+', code: 'Equal', shiftKey: true}, m)).toBe('acercar');
  });
  it('Alt + tecla usa la tecla física (macOS escribe otro símbolo)', () => {
    expect(accionDe({key: '˚', code: 'KeyK', altKey: true}, m)).toBe('clave');
  });
  it('lo propio del usuario gana y deja libre el valor por defecto', () => {
    const p = mapaAtajos({dividir: ['c']});
    expect(accionDe({key: 'c', code: 'KeyC'}, p)).toBe('dividir');
    expect(accionDe({key: 's', code: 'KeyS'}, p)).toBeNull();
  });
  it('texto legible y conflictos', () => {
    expect(textoCombo('mod+shift+z')).toBe('⇧⌘Z');
    expect(textoCombo('shift+arrowleft')).toBe('⇧←');
    expect(textoCombo('+')).toBe('+');
    expect(conflictos()).toEqual([]);
    expect(conflictos({texto: ['k']}).map(([c]) => c)).toEqual(['k']);
  });
});
