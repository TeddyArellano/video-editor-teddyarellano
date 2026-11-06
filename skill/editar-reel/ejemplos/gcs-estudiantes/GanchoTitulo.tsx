// Título del gancho (Google Cloud Summit 2026 · estudiantes). Datos: src/titulo.json (edicion/titulo.py).
// Solo blanco + amarillo, sin destellos ni sacudidas; cada palabra entra ~3 cuadros antes de decirse.
// Variantes: caida (palabras caen de arriba y rebotan) · marcador (párrafo + trazo de marcador amarillo) · revelado (líneas que suben tras una máscara, serif + sans).
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as archivo} from '@remotion/google-fonts/ArchivoBlack';
import {loadFont as bricolage} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as instrument} from '@remotion/google-fonts/InstrumentSerif';
import {loadFont as outfit} from '@remotion/google-fonts/Outfit';
import {clamp} from '../theme';
import T from '../titulo.json';

const ARCHIVO = archivo().fontFamily;
const BRICO = bricolage('normal', {weights: ['800'], subsets: ['latin']}).fontFamily;
const SERIF = instrument('italic', {subsets: ['latin']}).fontFamily;
const OUTFIT = outfit('normal', {weights: ['700'], subsets: ['latin']}).fontFamily;

type Pal = {t: string; f: number; e: string};
type Esc = {a: number; b: number; lineas: Pal[][]};
const TIT = T as unknown as {variante: string; fin: number; escenas: Esc[]} | null;
export const HAY_TITULO = !!TIT && TIT.escenas?.length > 0;

const AM = '#FFD60A';
const ease = {...clamp, easing: Easing.out(Easing.cubic)};
const SAFE_W = 800;
// velo suave detrás del texto (no es caja): oscurece la mitad de abajo para que el blanco se lea sobre cualquier toma
const Velo: React.FC<{o: number}> = ({o}) => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0) 95%)', opacity: o}} />
);

// ---------- A) CAÍDA ----------
const Caida: React.FC<{f: number; fps: number}> = ({f, fps}) => {
  const esc = TIT!.escenas.find((e) => f >= e.a && f < e.b + 8);
  if (!esc) return null;
  const saliendo = f >= esc.b; // al cambiar de escena las palabras caen fuera de cuadro
  return (
    <div style={{position: 'absolute', top: 1010, left: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
      {esc.lineas.map((l, i) => {
        const chars = l.reduce((s, p) => s + p.t.length, 0) + l.length - 1;
        const size = Math.min(104, Math.floor(SAFE_W / (chars * 0.74)));
        return (
          <div key={i} style={{display: 'flex', gap: size * 0.28, height: size * 1.12, alignItems: 'flex-end'}}>
            {l.map((p, j) => {
              const k = i * 10 + j;
              const s = spring({frame: f - p.f, fps, config: {damping: 13, stiffness: 420, mass: 0.5}});
              const y = f < p.f ? -1400 : interpolate(s, [0, 1], [-300 - i * 40, 0]);
              const rot = f < p.f ? 0 : interpolate(s, [0, 1], [(random(k) - 0.5) * 30, (random(k + 7) - 0.5) * 5]);
              const g = saliendo ? Math.pow((f - esc.b) / 8, 2) : 0;
              return (
                <span key={j} style={{fontFamily: ARCHIVO, fontSize: size, lineHeight: 1, color: p.e === 'y' ? AM : '#fff',
                  textShadow: '0 6px 0 #000, 0 0 18px rgba(0,0,0,0.45)', display: 'inline-block', opacity: f < p.f ? 0 : 1,
                  transform: `translateY(${y + g * (900 + j * 120)}px) rotate(${rot + g * (random(k + 3) - 0.5) * 60}deg)`}}>
                  {p.t}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ---------- B) MARCADOR ----------
const Marcador: React.FC<{f: number}> = ({f}) => {
  const esc = TIT!.escenas[0];
  const size = 84;
  return (
    <div style={{position: 'absolute', top: 930, left: 150, width: SAFE_W, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2}}>
      {esc.lineas.map((l, i) => (
        <div key={i} style={{display: 'flex', gap: size * 0.26, height: size * 1.12, alignItems: 'center'}}>
          {l.map((p, j) => {
            const q = interpolate(f, [p.f, p.f + 5], [0, 1], ease);
            const mk = p.e === 'y' ? interpolate(f, [p.f + 2, p.f + 9], [0, 1], ease) : 0;
            return (
              <span key={j} style={{position: 'relative', display: 'inline-block', fontFamily: BRICO, fontWeight: 800, fontSize: size, lineHeight: 1,
                letterSpacing: -2, opacity: q, transform: `translateY(${(1 - q) * 28}px)`, filter: `blur(${(1 - q) * 6}px)`,
                color: mk > 0.5 ? '#111' : '#fff', textShadow: mk > 0.5 ? 'none' : '0 4px 14px rgba(0,0,0,0.6)'}}>
                {/* trazo de marcador: barrido de izquierda a derecha, borde irregular (no píldora) */}
                <span style={{position: 'absolute', left: -10, right: -10, top: size * 0.1, bottom: size * 0.02, background: AM, zIndex: -1,
                  transform: `scaleX(${mk}) skewX(-8deg) rotate(-1.2deg)`, transformOrigin: 'left',
                  clipPath: 'polygon(0 8%, 100% 0, 99% 92%, 1% 100%)'}} />
                {p.t}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------- C) REVELADO ----------
const Revelado: React.FC<{f: number}> = ({f}) => {
  const esc = TIT!.escenas[0];
  return (
    <div style={{position: 'absolute', top: 960, left: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {esc.lineas.map((l, i) => {
        const serif = l.some((p) => p.e.startsWith('serif'));
        const f0 = l[0].f;
        const q = interpolate(f, [f0, f0 + 7], [0, 1], ease);
        const chars = l.reduce((s, p) => s + p.t.length, 0) + l.length - 1;
        const size = serif ? 150 : Math.min(64, Math.floor(SAFE_W / (chars * 0.62)));
        return (
          <React.Fragment key={i}>
            <div style={{overflow: 'hidden', height: size * (serif ? 1.08 : 1.25), display: 'flex', alignItems: 'flex-end', marginTop: serif ? -6 : 4}}>
              <div style={{display: 'flex', gap: serif ? 22 : 14, transform: `translateY(${(1 - q) * 110}%)`}}>
                {l.map((p, j) => {
                  const on = interpolate(f, [p.f, p.f + 4], [0.35, 1], clamp);
                  return (
                    <span key={j} style={{fontFamily: p.e.startsWith('serif') ? SERIF : OUTFIT, fontWeight: p.e.startsWith('serif') ? 400 : 700,
                      fontStyle: p.e.startsWith('serif') ? 'italic' : 'normal', fontSize: size, lineHeight: 1, letterSpacing: serif ? -2 : 3,
                      color: p.e.endsWith('Y') ? AM : '#fff', opacity: on, textShadow: '0 4px 16px rgba(0,0,0,0.65)'}}>
                      {p.t}
                    </span>
                  );
                })}
              </div>
            </div>
            {i === 0 && (
              <div style={{height: 5, width: 520, background: AM, margin: '10px 0 6px', transformOrigin: 'center',
                transform: `scaleX(${interpolate(f, [l[l.length - 1].f, l[l.length - 1].f + 10], [0, 1], ease)})`}} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const GanchoTitulo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!HAY_TITULO || f >= TIT!.fin + 8) return null;
  const sal = interpolate(f, [TIT!.fin, TIT!.fin + 8], [1, 0], clamp);
  const v = TIT!.variante;
  return (
    <AbsoluteFill style={{opacity: v === 'caida' ? 1 : sal}}>
      <Velo o={interpolate(f, [0, 6], [0, 1], clamp) * sal} />
      {v === 'caida' ? <Caida f={f} fps={fps} /> : v === 'marcador' ? <Marcador f={f} /> : <Revelado f={f} />}
    </AbsoluteFill>
  );
};
