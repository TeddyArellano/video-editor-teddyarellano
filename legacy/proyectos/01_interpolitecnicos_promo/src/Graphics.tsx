import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, anton, mont} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const useSpring = (at: number, cfg: object = {damping: 12, stiffness: 180, mass: 0.7}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: cfg});
};

const exitK = (frame: number, from: number, len = 8) =>
  interpolate(frame, [from, from + len], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});

/* ---------- persistent top badge (official banner) ---------- */
export const BANNER_RATIO = 822 / 1378;

export const TopBadge: React.FC<{visible: [number, number][]}> = ({visible}) => {
  const frame = useCurrentFrame();
  let k = 0;
  for (const [a, b] of visible) {
    k = Math.max(k, Math.min(interpolate(frame, [a, a + 8], [0, 1], clamp), interpolate(frame, [b - 6, b], [1, 0], clamp)));
  }
  if (k <= 0) return null;
  const w = 300;
  return (
    <AbsoluteFill style={{alignItems: 'center', top: 70}}>
      <Img
        src={staticFile('img/banner.png')}
        style={{
          width: w,
          height: w * BANNER_RATIO,
          borderRadius: 20,
          border: '3px solid rgba(255,200,61,0.6)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.55)',
          opacity: k,
          transform: `translateY(${(1 - k) * -40}px) scale(${0.9 + 0.1 * k})`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------- clip 2: official banner + "inscripciones abiertas" stamp ---------- */
export const TitleCard: React.FC<{titleAt: number; yearAt: number; stampAt: number; outAt: number}> = ({
  titleAt,
  yearAt,
  stampAt,
  outAt,
}) => {
  const frame = useCurrentFrame();
  const t = useSpring(titleAt, {damping: 14, stiffness: 150});
  const s = useSpring(stampAt, {damping: 10, stiffness: 260, mass: 0.9});
  const out = exitK(frame, outAt);
  if (frame < titleAt - 2 || out <= 0) return null;
  // glow pulse when "2026" is said
  const pulse = interpolate(frame, [yearAt, yearAt + 4, yearAt + 16], [0, 1, 0], clamp);
  const w = 920;
  const h = w * BANNER_RATIO;
  const open = interpolate(t, [0, 1], [50, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(20,4,10,0.88) 0%, rgba(20,4,10,0.6) 38%, rgba(20,4,10,0) 52%)',
          opacity: t,
        }}
      />
      <Img
        src={staticFile('img/banner.png')}
        style={{
          position: 'absolute',
          left: (1080 - w) / 2,
          top: 130,
          width: w,
          height: h,
          borderRadius: 30,
          clipPath: `inset(0 ${open}% 0 ${open}% round 30px)`,
          transform: `scale(${interpolate(t, [0, 1], [1.15, 1], clamp) * (1 + 0.035 * pulse) * (0.94 + 0.06 * out)})`,
          boxShadow: `0 0 0 4px rgba(255,200,61,${0.35 + 0.65 * pulse}), 0 0 ${30 + 70 * pulse}px rgba(255,200,61,${0.25 + 0.5 * pulse}), 0 30px 80px rgba(0,0,0,0.6)`,
        }}
      />
      {frame >= stampAt ? (
        <div style={{position: 'absolute', top: 130 + h - 70, width: '100%', display: 'flex', justifyContent: 'center'}}>
          <div
            style={{
              transform: `rotate(-6deg) scale(${interpolate(s, [0, 1], [2.6, 1], clamp)})`,
              opacity: Math.min(1, s * 3),
              background: C.guinda,
              border: `6px solid ${C.white}`,
              borderRadius: 18,
              padding: '12px 34px 8px',
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 80px ${C.guindaHot}`,
              textAlign: 'center',
            }}
          >
            <div style={{fontFamily: mont, fontWeight: 900, fontSize: 42, color: C.white, letterSpacing: 8}}>
              INSCRIPCIONES
            </div>
            <div style={{fontFamily: anton, fontSize: 108, color: C.gold, lineHeight: 1.05, letterSpacing: 4}}>
              ¡ABIERTAS!
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- clips 4–5: game logos ---------- */
export type Game = {img: string; at: number};

export const GamesGrid: React.FC<{games: Game[]; inAt: number; outAt: number}> = ({games, inAt, outAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const panel = interpolate(frame, [inAt, inAt + 8], [0, 1], clamp);
  const out = exitK(frame, outAt, 9);
  if (frame < inAt || out <= 0) return null;
  const head = spring({frame: frame - inAt, fps, config: {damping: 13, stiffness: 170}});
  const activeIdx = games.reduce((acc, g, i) => (frame >= g.at ? i : acc), -1);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(18,4,10,0.94) 0%, rgba(18,4,10,0.86) 40%, rgba(18,4,10,0) 58%)',
          opacity: panel,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 118,
          width: '100%',
          textAlign: 'center',
          fontFamily: anton,
          fontSize: 92,
          color: C.white,
          letterSpacing: 3,
          transform: `translateY(${(1 - head) * -60}px)`,
          opacity: head,
        }}
      >
        COMPITE EN <span style={{color: C.gold}}>6 JUEGOS</span>
      </div>
      {games.map((g, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const p = spring({frame: frame - g.at, fps, config: {damping: 10, stiffness: 230, mass: 0.6}});
        const isActive = i === activeIdx && frame - g.at < 22;
        const x = 84 + col * (440 + 32);
        const yy = 262 + row * (170 + 24);
        const outShift = interpolate(frame, [outAt, outAt + 9], [0, (col ? 1 : -1) * 500], {
          ...clamp,
          easing: Easing.in(Easing.cubic),
        });
        return (
          <div
            key={g.img}
            style={{
              position: 'absolute',
              left: x,
              top: yy,
              width: 440,
              height: 170,
              borderRadius: 26,
              background: C.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: frame < g.at ? 0 : Math.min(1, p * 2),
              transform: `translateX(${outShift}px) translateY(${(1 - p) * 60}px) scale(${
                frame < g.at ? 0.4 : interpolate(p, [0, 1], [0.4, 1]) * (isActive ? 1.06 : 1)
              }) rotate(${(1 - p) * (col ? 8 : -8)}deg)`,
              boxShadow: isActive
                ? `0 0 0 6px ${C.gold}, 0 0 50px rgba(255,200,61,0.75), 0 18px 40px rgba(0,0,0,0.5)`
                : '0 18px 40px rgba(0,0,0,0.5)',
            }}
          >
            <Img src={staticFile(`img/${g.img}.png`)} style={{maxWidth: 360, maxHeight: 130, objectFit: 'contain'}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- clip 8: deadline calendar ---------- */
export const CalendarCard: React.FC<{at: number; outAt: number}> = ({at, outAt}) => {
  const frame = useCurrentFrame();
  const p = useSpring(at, {damping: 11, stiffness: 150, mass: 0.8});
  const tag = useSpring(at + 10, {damping: 12, stiffness: 200});
  const out = exitK(frame, outAt);
  if (frame < at - 1 || out <= 0) return null;
  const rx = interpolate(p, [0, 1], [-95, 0]);
  return (
    <AbsoluteFill style={{alignItems: 'center', top: 150, opacity: out, perspective: 1400}}>
      <div
        style={{
          width: 430,
          borderRadius: 34,
          overflow: 'hidden',
          background: C.white,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          transform: `rotateX(${rx}deg) scale(${0.8 + 0.2 * p})`,
          transformOrigin: '50% 0%',
        }}
      >
        <div
          style={{
            background: C.guinda,
            color: C.white,
            textAlign: 'center',
            fontFamily: anton,
            fontSize: 72,
            letterSpacing: 6,
            padding: '12px 0 8px',
          }}
        >
          OCTUBRE
        </div>
        <div style={{textAlign: 'center', fontFamily: anton, fontSize: 290, lineHeight: 1.02, color: C.ink}}>6</div>
      </div>
      <div
        style={{
          marginTop: 26,
          fontFamily: mont,
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: 4,
          color: C.ink,
          background: C.gold,
          padding: '12px 30px',
          borderRadius: 999,
          transform: `scale(${frame < at + 10 ? 0 : tag})`,
          boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
        }}
      >
        ÚLTIMO DÍA DE REGISTRO
      </div>
    </AbsoluteFill>
  );
};

/* ---------- clips 10–11 + end card: scannable registration QR ---------- */
export const QRBlock: React.FC<{size: number; scanFrom?: number}> = ({size, scanFrom}) => {
  const frame = useCurrentFrame();
  // viewfinder sweep runs only twice, then the code stays clean for scanning
  const sweep = scanFrom === undefined ? -1 : (frame - scanFrom) / 22;
  const showSweep = sweep >= 0 && sweep < 2;
  const bracket = (pos: React.CSSProperties, rot: number) => (
    <div
      style={{
        position: 'absolute',
        width: 64,
        height: 64,
        borderTop: `9px solid ${C.gold}`,
        borderLeft: `9px solid ${C.gold}`,
        borderRadius: '14px 0 0 0',
        transform: `rotate(${rot}deg)`,
        ...pos,
      }}
    />
  );
  return (
    <div style={{position: 'relative', width: size, height: size}}>
      <Img src={staticFile('img/qr.png')} style={{width: size, height: size, display: 'block'}} />
      {bracket({left: -22, top: -22}, 0)}
      {bracket({right: -22, top: -22}, 90)}
      {bracket({right: -22, bottom: -22}, 180)}
      {bracket({left: -22, bottom: -22}, 270)}
      {showSweep ? (
        <div
          style={{
            position: 'absolute',
            left: -10,
            right: -10,
            top: (sweep % 1) * size - 4,
            height: 8,
            borderRadius: 4,
            background: C.gold,
            boxShadow: '0 0 26px 8px rgba(255,200,61,0.6)',
          }}
        />
      ) : null}
    </div>
  );
};

export const QRCard: React.FC<{at: number; bioAt: number}> = ({at, bioAt}) => {
  const frame = useCurrentFrame();
  const p = useSpring(at, {damping: 13, stiffness: 170});
  const bio = useSpring(bioAt, {damping: 10, stiffness: 220, mass: 0.7});
  if (frame < at - 1) return null;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 120, width: '100%', display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            width: 620,
            borderRadius: 40,
            background: C.white,
            padding: '26px 0 44px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
            transform: `translateY(${(1 - p) * -140}px) scale(${interpolate(p, [0, 1], [0.8, 1], clamp)})`,
            opacity: Math.min(1, p * 2),
          }}
        >
          <div style={{fontFamily: mont, fontWeight: 900, fontSize: 32, letterSpacing: 6, color: C.guinda}}>ESCANEA Y</div>
          <div style={{fontFamily: anton, fontSize: 76, lineHeight: 1.05, color: C.ink, marginBottom: 30}}>REGÍSTRATE</div>
          <QRBlock size={470} scanFrom={at + 8} />
        </div>
      </div>
      {frame >= bioAt ? (
        <div style={{position: 'absolute', top: 842, width: '100%', display: 'flex', justifyContent: 'center'}}>
          <div
            style={{
              fontFamily: mont,
              fontWeight: 900,
              fontSize: 40,
              letterSpacing: 3,
              color: C.ink,
              background: C.gold,
              padding: '14px 32px',
              borderRadius: 999,
              transform: `scale(${bio}) rotate(${(1 - bio) * -10}deg)`,
              boxShadow: '0 16px 44px rgba(0,0,0,0.5)',
            }}
          >
            O EN EL LINK DE MI BIO ↑
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
