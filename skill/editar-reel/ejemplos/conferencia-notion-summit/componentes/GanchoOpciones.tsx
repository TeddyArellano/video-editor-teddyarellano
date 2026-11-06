// Tres diseños del gancho "AGENDO TODO EN 10 SEGUNDOS" (se eligen con inputProps {"gancho": "a" | "b" | "c"}).
// Todos: solo blanco + amarillo #FFD60A, arriba de la cabeza (zona segura), "10" entra en el cuadro de la palabra "10" y salen al terminar el gancho.
//  a) caída:   las palabras caen de arriba y rebotan (Archivo Black), la aprobada en Google Cloud Summit.
//  b) número:  "10" grande en amarillo con golpe + "SEGUNDOS" al lado (Anton).
//  c) marcador: minúsculas limpias y "10 segundos" sobre un trazo de marcador amarillo que se dibuja (Montserrat).
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as archivo} from '@remotion/google-fonts/ArchivoBlack';
import {loadFont as anton} from '@remotion/google-fonts/Anton';
import {loadFont as montserrat} from '@remotion/google-fonts/Montserrat';
import {D, FPS, clamp} from '../theme';

const ARCHIVO = archivo().fontFamily;
const ANTON = anton().fontFamily;
const MONT = montserrat('normal', {weights: ['800'], subsets: ['latin']}).fontFamily;
const AM = '#FFD60A';
const SOMBRA = '0 6px 0 #000, 0 0 18px rgba(0,0,0,0.45)';
const TOP = 300;

const palabra = (t: string) => {
  const w = D.words.find((x) => x.text.toLowerCase().replace(/[^\wáéíóú]/g, '') === t);
  return w ? Math.round(w.start * FPS) - 2 : 0;
};

export const GanchoOpciones: React.FC<{v: string}> = ({v}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fin = D.hookEnd;
  if (f >= fin + 8) return null;
  const f10 = palabra('10');
  const salida = interpolate(f, [fin - 4, fin + 4], [1, 0], clamp);
  const pop = (a: number, from = 1.6) => interpolate(spring({frame: f - a, fps, config: {damping: 11, stiffness: 380, mass: 0.5}}), [0, 1], [from, 1]);

  if (v === 'a') {
    // Reel "La trampa del Notion perfecto": 3 filas en caída, la última en amarillo
    const filas: {t: string; a: number; am?: boolean}[][] = [
      [{t: 'MI', a: 2}, {t: 'NOTION', a: 7}],
      [{t: 'ES UNA', a: 14}, {t: 'PÁGINA', a: 19}],
      [{t: 'EN BLANCO', a: 27, am: true}],
    ];
    return (
      <AbsoluteFill style={{top: 262, alignItems: 'center', opacity: salida}}>
        {filas.map((fila, i) => {
          const chars = fila.reduce((a, p) => a + p.t.length, 0) + fila.length - 1;
          const size = Math.min(84, Math.floor(720 / (chars * 0.8)));
          return (
            <div key={i} style={{display: 'flex', gap: size * 0.25, height: 90, alignItems: 'flex-end'}}>
              {fila.map((p, j) => {
                const sp = spring({frame: f - p.a, fps, config: {damping: 13, stiffness: 420, mass: 0.5}});
                const y = f < p.a ? -1400 : interpolate(sp, [0, 1], [-300, 0]);
                const rot = f < p.a ? 0 : interpolate(sp, [0, 1], [(random(i * 9 + j) - 0.5) * 30, (random(i * 9 + j + 5) - 0.5) * 4]);
                return (
                  <span key={j} style={{fontFamily: ARCHIVO, fontSize: size, lineHeight: 1, color: p.am ? AM : '#fff', textShadow: SOMBRA,
                    display: 'inline-block', opacity: f < p.a ? 0 : 1, transform: `translateY(${y}px) rotate(${rot}deg)`}}>
                    {p.t}
                  </span>
                );
              })}
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  if (v === 'b') {
    const a0 = interpolate(f, [2, 8], [0, 1], clamp);
    const a1 = interpolate(f, [f10 + 8, f10 + 13], [0, 1], clamp);
    return (
      <AbsoluteFill style={{top: TOP - 60, alignItems: 'center', opacity: salida}}>
        <div style={{fontFamily: MONT, fontWeight: 800, fontSize: 52, letterSpacing: 6, color: '#fff', textShadow: SOMBRA,
          opacity: a0, transform: `translateY(${(1 - a0) * -24}px)`}}>
          AGENDO TODO EN
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 22, marginTop: -4}}>
          <span style={{fontFamily: ANTON, fontSize: 215, lineHeight: 1, color: AM, textShadow: '0 10px 0 #000, 0 0 24px rgba(0,0,0,0.45)',
            display: 'inline-block', opacity: f < f10 ? 0 : 1, transform: `scale(${f < f10 ? 0 : pop(f10, 2.2)})`, transformOrigin: '50% 80%'}}>
            10
          </span>
          <span style={{fontFamily: ANTON, fontSize: 104, lineHeight: 1.15, color: '#fff', textShadow: SOMBRA, paddingBottom: 14,
            opacity: a1, transform: `translateX(${(1 - a1) * 40}px)`}}>
            SEGUNDOS
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  // c) marcador
  const a0 = interpolate(f, [2, 9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const trazo = interpolate(f, [f10 - 2, f10 + 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const a1 = interpolate(f, [f10 - 2, f10 + 4], [0, 1], clamp);
  return (
    <AbsoluteFill style={{top: TOP, alignItems: 'center', opacity: salida}}>
      <div style={{fontFamily: MONT, fontWeight: 800, fontSize: 70, color: '#fff', textShadow: SOMBRA, opacity: a0, transform: `translateY(${(1 - a0) * 30}px)`}}>
        agendo todo en
      </div>
      <div style={{position: 'relative', marginTop: 10, padding: '2px 30px 8px'}}>
        <div style={{position: 'absolute', inset: 0, background: AM, transform: `skewX(-6deg) scaleX(${trazo})`, transformOrigin: '0 50%', borderRadius: 6}} />
        <span style={{position: 'relative', fontFamily: MONT, fontWeight: 800, fontSize: 112, lineHeight: 1.1, color: '#111', opacity: a1}}>10 segundos</span>
      </div>
    </AbsoluteFill>
  );
};
