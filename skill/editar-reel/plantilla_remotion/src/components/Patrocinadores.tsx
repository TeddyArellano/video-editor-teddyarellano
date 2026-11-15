// Patrocinadores en las esquinas (nació en Feria Zumpango 2026): grupos de logos que entran con rebote desde el borde,
// flotan suave y salen encogiéndose. Cada grupo es una fila (arriba o abajo) con 1–3 logos; se reparten a lo largo del video.
// Datos: data.json → patrocinadores (eventos.json → "patrocinadores"; reel datos calcula ar = ancho/alto de cada logo).
import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CUT, D, Libre, W, asset, clamp, type Logo} from '../theme';
import {Pos} from './Pos';

const ALTO = 235; // alto de cada logo
const MAX_W = 420;
const MARGEN = 24;
export const TOP_FILA = {arriba: 215, abajo: 1330};

// en eventos.json los logos son rutas; en data.json, {src, ar}. La app puede tener rutas sueltas hasta el siguiente `reel datos`.
const logo = (l: Logo | string): Logo => (typeof l === 'string' ? {src: l, ar: 1} : l);

const Chip: React.FC<{logo: Logo; t: number; len: number; desde: 'izq' | 'der' | 'centro'; i: number; maxW: number}> = ({logo, t, len, desde, i, maxW}) => {
  const {fps} = useVideoConfig();
  const p = spring({frame: t, fps, config: {damping: 11, stiffness: 190, mass: 0.6}});
  const salida = interpolate(t, [len - 8, len], [1, 0], clamp);
  const s = interpolate(p, [0, 1], [0.2, 1]) * interpolate(salida, [0, 1], [0.5, 1]);
  const dx = desde === 'izq' ? interpolate(p, [0, 1], [-160, 0]) : desde === 'der' ? interpolate(p, [0, 1], [160, 0]) : 0;
  const rot = interpolate(p, [0, 1], [desde === 'der' ? 14 : -14, 0]) + Math.sin((t + i * 13) / 14) * 1.6;
  const flota = Math.sin((t + i * 9) / 11) * 4;
  // brillo que barre el logo al entrar
  const brillo = interpolate(t, [6, 22], [-60, 160], clamp);
  let w = ALTO * logo.ar;
  let h = ALTO;
  if (w > maxW) {
    w = maxW;
    h = maxW / logo.ar;
  }
  return (
    <div
      style={{
        width: w,
        height: h,
        transform: `translate(${dx}px, ${flota}px) scale(${s}) rotate(${rot}deg)`,
        opacity: Math.min(1, p * 2) * salida,
        boxShadow: '0 8px 22px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        position: 'relative',
        background: '#fff',
      }}
    >
      <Img src={asset(logo.src)} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(115deg, transparent ${brillo - 25}%, rgba(255,255,255,0.75) ${brillo}%, transparent ${brillo + 25}%)`,
        }}
      />
    </div>
  );
};

export const Patrocinadores: React.FC = () => {
  const f = useCurrentFrame();
  const grupos = D.patrocinadores ?? [];
  if (!grupos.length) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {grupos.map((g, gi) => {
        const b = Math.min(g.b, CUT);
        if (f < g.a || f >= b) return null;
        const t = f - g.a;
        const logos = (g.logos ?? []).map(logo);
        const n = logos.length;
        if (!n) return null;
        return (
          <div key={gi} style={{position: 'absolute', top: g.top ?? TOP_FILA[g.fila] ?? TOP_FILA.arriba, left: MARGEN, width: W - 2 * MARGEN}}>
            <Pos k={`patrocinadores:${gi}`} o={g as Libre}>
              <div style={{width: '100%', display: 'flex', justifyContent: n === 1 ? 'flex-start' : 'space-between', alignItems: 'center'}}>
                {logos.map((l, i) => (
                  <Chip
                    maxW={n >= 3 ? 320 : MAX_W}
                    key={`${l.src}-${i}`}
                    logo={l}
                    t={t - i * 5}
                    len={b - g.a - i * 5}
                    i={i}
                    desde={i === 0 ? 'izq' : i === n - 1 ? 'der' : 'centro'}
                  />
                ))}
              </div>
            </Pos>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
