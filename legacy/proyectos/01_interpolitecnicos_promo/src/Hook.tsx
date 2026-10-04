import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BANNER_RATIO} from './Graphics';
import {C, anton, mont} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Gamepad: React.FC<{size: number; color: string; accent: string}> = ({size, color, accent}) => (
  <svg width={size} height={size * 0.62} viewBox="0 0 64 40">
    <path
      d="M16 3h32c6 0 10.6 3.6 12 9.4l3 13.2c1.3 5.8-5.2 10-9.9 6.2L47 27H17l-6.1 4.8C6.2 35.6-.3 31.4 1 25.6l3-13.2C5.4 6.6 10 3 16 3z"
      fill={color}
    />
    <rect x="12" y="14.5" width="12" height="4" rx="1.2" fill={accent} />
    <rect x="16" y="10.5" width="4" height="12" rx="1.2" fill={accent} />
    <circle cx="46" cy="12" r="2.6" fill={accent} />
    <circle cx="51.5" cy="16.5" r="2.6" fill={accent} />
    <circle cx="40.5" cy="16.5" r="2.6" fill={accent} />
    <circle cx="46" cy="21" r="2.6" fill={accent} />
  </svg>
);

// Controller-button glyphs floating at the sides of the frame
type Glyph = {kind: 'tri' | 'circ' | 'cross' | 'sq'; x: number; y: number; size: number; color: string; at: number; spin: number};
const GLYPHS: Glyph[] = [
  {kind: 'tri', x: 70, y: 560, size: 96, color: '#3DE0A0', at: 6, spin: 1},
  {kind: 'circ', x: 900, y: 520, size: 88, color: '#FF4D6D', at: 9, spin: -1},
  {kind: 'cross', x: 110, y: 880, size: 78, color: '#5AA9FF', at: 12, spin: -1},
  {kind: 'sq', x: 930, y: 860, size: 80, color: '#FF7AD9', at: 15, spin: 1},
  {kind: 'circ', x: 60, y: 1380, size: 54, color: C.gold, at: 18, spin: 1},
  {kind: 'tri', x: 1010, y: 1360, size: 58, color: C.gold, at: 20, spin: -1},
];

const GlyphShape: React.FC<{g: Glyph}> = ({g}) => {
  const s = 24;
  const sw = 3.2;
  const common = {fill: 'none', stroke: g.color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width={g.size} height={g.size} viewBox={`0 0 ${s} ${s}`} style={{filter: `drop-shadow(0 0 10px ${g.color})`}}>
      {g.kind === 'tri' ? <path d="M12 3.5 21 19.5H3z" {...common} /> : null}
      {g.kind === 'circ' ? <circle cx="12" cy="12" r="8.5" {...common} /> : null}
      {g.kind === 'cross' ? <path d="M5 5l14 14M19 5 5 19" {...common} /> : null}
      {g.kind === 'sq' ? <rect x="4" y="4" width="16" height="16" rx="1.5" {...common} /> : null}
    </svg>
  );
};

export const HookIntro: React.FC<{outAt: number}> = ({outAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = (at: number, cfg: object = {damping: 12, stiffness: 190, mass: 0.7}) =>
    spring({frame: frame - at, fps, config: cfg});
  const out = interpolate(frame, [outAt - 6, outAt], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});
  if (out <= 0) return null;

  const ipn = sp(2);
  const banner = sp(6);
  const x = sp(4, {damping: 14, stiffness: 220});
  const pill = sp(12, {damping: 11, stiffness: 200});
  const bw = 400;
  const bh = bw * BANNER_RATIO;
  const blink = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{opacity: out}}>
      {/* top shade so the logos read over the umbrella */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(18,4,10,0.82) 0%, rgba(18,4,10,0.45) 20%, rgba(18,4,10,0) 32%)',
          opacity: Math.min(1, frame / 4),
        }}
      />

      {/* HUD corner brackets */}
      {[
        {left: 34, top: 34, r: 0},
        {right: 34, top: 34, r: 90},
        {right: 34, bottom: 34, r: 180},
        {left: 34, bottom: 34, r: 270},
      ].map((b, i) => {
        const k = sp(i * 2, {damping: 14, stiffness: 260});
        const {r, ...pos} = b;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...pos,
              width: 90,
              height: 90,
              borderTop: `7px solid ${C.gold}`,
              borderLeft: `7px solid ${C.gold}`,
              borderRadius: '10px 0 0 0',
              transform: `rotate(${r}deg) scale(${interpolate(k, [0, 1], [1.6, 1], clamp)})`,
              opacity: Math.min(1, k * 2) * 0.9,
            }}
          />
        );
      })}

      {/* IPN × Interpolitécnicos */}
      <div
        style={{
          position: 'absolute',
          top: 96,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
        }}
      >
        <div
          style={{
            width: bh,
            height: bh,
            borderRadius: 30,
            background: C.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 0 4px ${C.guinda}, 0 18px 44px rgba(0,0,0,0.55)`,
            transform: `translateX(${(1 - ipn) * -260}px) scale(${interpolate(ipn, [0, 1], [0.6, 1], clamp)})`,
            opacity: Math.min(1, ipn * 2),
          }}
        >
          <Img src={staticFile('img/ipn.png')} style={{width: bh * 0.86, height: bh * 0.86, objectFit: 'contain'}} />
        </div>
        <div
          style={{
            fontFamily: anton,
            fontSize: 70,
            color: C.gold,
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            transform: `scale(${x}) rotate(${(1 - x) * 90}deg)`,
          }}
        >
          ×
        </div>
        <Img
          src={staticFile('img/banner.png')}
          style={{
            width: bw,
            height: bh,
            borderRadius: 26,
            border: '4px solid rgba(255,200,61,0.75)',
            boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
            transform: `translateX(${(1 - banner) * 260}px) scale(${interpolate(banner, [0, 1], [0.6, 1], clamp)})`,
            opacity: Math.min(1, banner * 2),
          }}
        />
      </div>

      {/* "Torneo de esports" pill */}
      <div style={{position: 'absolute', top: 96 + bh + 34, width: '100%', display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background: C.guinda,
            border: `4px solid ${C.gold}`,
            borderRadius: 999,
            padding: '12px 34px 12px 26px',
            boxShadow: `0 0 40px ${C.guindaHot}, 0 16px 40px rgba(0,0,0,0.5)`,
            transform: `scale(${frame < 12 ? 0 : pill})`,
          }}
        >
          <Gamepad size={78} color={C.white} accent={C.guinda} />
          <span style={{fontFamily: mont, fontWeight: 900, fontSize: 40, letterSpacing: 3, color: C.white}}>
            TORNEO DE <span style={{color: C.gold}}>ESPORTS</span>
          </span>
        </div>
      </div>

      {/* floating controller glyphs */}
      {GLYPHS.map((g, i) => {
        const k = sp(g.at, {damping: 9, stiffness: 200, mass: 0.6});
        const bob = Math.sin((frame + i * 13) / 9) * 10;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: g.x,
              top: g.y + bob,
              opacity: frame < g.at ? 0 : Math.min(1, k * 2) * 0.95,
              transform: `translate(-50%, -50%) scale(${frame < g.at ? 0 : k}) rotate(${g.spin * frame * 1.6}deg)`,
            }}
          >
            <GlyphShape g={g} />
          </div>
        );
      })}

      {/* blinking arcade prompt */}
      <div
        style={{
          position: 'absolute',
          top: 1480,
          width: '100%',
          textAlign: 'center',
          fontFamily: mont,
          fontWeight: 900,
          fontSize: 34,
          letterSpacing: 10,
          color: C.gold,
          textShadow: '0 0 18px rgba(255,200,61,0.8), 0 4px 12px rgba(0,0,0,0.7)',
          opacity: frame >= 20 && blink ? 1 : 0,
        }}
      >
        ▶ PRESS START
      </div>
    </AbsoluteFill>
  );
};
