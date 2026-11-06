// Tarjeta "#N" de cada herramienta (Google Cloud Summit 2026 · estudiantes). Datos: src/herramientas.json (edicion/herramientas.py).
// Entra con "Número": la cifra gigante cae con golpe y giro, la barra de 4 colores de Google se dibuja debajo,
// y el nombre (texto o logo en blanco) entra cuando se dice. Sale encogiéndose antes de la siguiente frase.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, font} from '../theme';
import H from '../herramientas.json';

type T = {n: number; color: string; a: number; num: number; nom: number; b: number; nombre?: string; pre?: string; logo?: string; logo_pre?: string};
export const HERRAMIENTAS = H as T[];
export const enHerramienta = (f: number) => HERRAMIENTAS.some((t) => f >= t.a && f < t.b);
const G = ['#4285F4', '#EA4335', '#FBBC04', '#34A853'];
const ease = {...clamp, easing: Easing.out(Easing.cubic)};

const Tarjeta: React.FC<{t: T; f: number}> = ({t, f}) => {
  const {fps} = useVideoConfig();
  const fin = interpolate(f, [t.b - 7, t.b], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});
  const pNum = spring({frame: f - t.num, fps, config: {damping: 11, stiffness: 180, mass: 0.8}});
  const sNum = f < t.num ? 0 : interpolate(pNum, [0, 1], [2.6, 1]);
  const rot = f < t.num ? 0 : interpolate(pNum, [0, 1], [-14, -4]);
  const flash = interpolate(f, [t.num, t.num + 6], [0.5, 0], clamp);
  const pTop = interpolate(f, [t.a, t.a + 6], [0, 1], ease);
  const pNom = spring({frame: f - t.nom, fps, config: {damping: 14, stiffness: 160}});
  const sh = (px: number) => `${px}px ${px}px 0 #000`;
  return (
    <AbsoluteFill style={{opacity: fin, transform: `scale(${0.85 + 0.15 * fin})`}}>
      {/* velo oscuro arriba para que la tarjeta se lea sobre cualquier toma */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 62%)', opacity: pTop}} />
      <AbsoluteFill style={{background: t.color, opacity: flash}} />
      <div style={{position: 'absolute', top: 300, width: '100%', textAlign: 'center', opacity: pTop, transform: `translateY(${(1 - pTop) * -40}px)`,
        fontFamily: font('Montserrat'), fontWeight: 900, fontStyle: 'italic', fontSize: 64, color: '#fff', letterSpacing: 2, textShadow: sh(5)}}>
        HERRAMIENTA
      </div>
      <div style={{position: 'absolute', top: 360, width: '100%', textAlign: 'center', fontFamily: font('Anton'), fontSize: 420, lineHeight: 1,
        color: t.color, textShadow: sh(14), transform: `scale(${sNum}) rotate(${rot}deg)`, opacity: f < t.num ? 0 : 1}}>
        #{t.n}
      </div>
      {/* barra de 4 colores de Google, se dibuja segmento por segmento */}
      <div style={{position: 'absolute', top: 820, left: 190, width: 700, height: 22, display: 'flex', gap: 10}}>
        {G.map((c, i) => (
          <div key={i} style={{flex: 1, background: c, borderRadius: 4, boxShadow: '5px 5px 0 #000',
            transform: `scaleX(${interpolate(f, [t.num + 3 + i * 2, t.num + 8 + i * 2], [0, 1], ease)})`, transformOrigin: 'left'}} />
        ))}
      </div>
      <div style={{position: 'absolute', top: 880, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: f < t.nom ? 0 : 1, transform: `translateY(${(1 - pNom) * 60}px) scale(${0.7 + 0.3 * pNom})`}}>
        {t.logo ? (
          <Img src={staticFile(t.logo)} style={{width: 820, filter: 'drop-shadow(6px 6px 0 #000)'}} />
        ) : (
          <>
            {t.logo_pre && <Img src={staticFile(t.logo_pre)} style={{width: 330, marginBottom: 6, filter: 'drop-shadow(5px 5px 0 #000)'}} />}
            {t.pre && <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 70, color: '#fff', textShadow: sh(5), letterSpacing: 6}}>{t.pre}</div>}
            <div style={{fontFamily: font('Anton'), fontSize: 190, lineHeight: 1, color: '#fff', textShadow: sh(10), marginTop: -6}}>{t.nombre}</div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const Herramientas: React.FC = () => {
  const f = useCurrentFrame();
  const t = HERRAMIENTAS.find((x) => f >= x.a && f < x.b);
  return t ? <Tarjeta t={t} f={f} /> : null;
};
