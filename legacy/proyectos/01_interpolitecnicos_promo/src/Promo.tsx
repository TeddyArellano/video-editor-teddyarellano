import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CameraView, CLIPS, CUT_FRAMES} from './Camera';
import {Captions} from './Captions';
import {HookIntro} from './Hook';
import {BANNER_RATIO, CalendarCard, GamesGrid, QRBlock, QRCard, TitleCard, TopBadge} from './Graphics';
import {C, H, W, anton, mont, sec} from './theme';

const END_AT = 860; // end card starts right after "…en la arena"
export const TOTAL_FRAMES = 1019; // longer end card so the QR can be scanned
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const GAMES = [
  {img: 'marvel', at: sec(11.43)},
  {img: 'overwatch', at: sec(12.63)},
  {img: 'lol', at: sec(13.53)},
  {img: 'brawl', at: sec(14.68)},
  {img: 'valorant', at: sec(15.31)},
  {img: 'rocket', at: sec(15.84)},
];

// White flashes on key cuts: [frame, length]
const FLASHES: [number, number][] = [
  [0, 6],
  [497, 5],
  [END_AT, 7],
];
// RGB-split glitch windows: [frame, length]
const GLITCHES: [number, number][] = [
  [86, 3],
  [497, 6],
  [576, 3],
  [END_AT - 4, 7],
];

const SFX: {f: number; src: string; v: number}[] = [
  {f: 0, src: 'whoosh', v: 0.55},
  {f: 3, src: 'pop', v: 0.45},
  {f: 7, src: 'pop', v: 0.45},
  {f: 12, src: 'pop', v: 0.5},
  {f: 85, src: 'whoosh2', v: 0.4},
  {f: 187, src: 'whoosh', v: 0.55},
  {f: 245, src: 'impact', v: 0.75},
  {f: 336, src: 'whoosh', v: 0.5},
  ...GAMES.map((g) => ({f: g.at, src: 'pop', v: 0.55})),
  {f: 486, src: 'whoosh2', v: 0.45},
  {f: 497, src: 'glitch', v: 0.45},
  {f: 575, src: 'whoosh2', v: 0.3},
  {f: 644, src: 'whoosh', v: 0.5},
  {f: 650, src: 'impact', v: 0.55},
  {f: 693, src: 'whoosh2', v: 0.35},
  {f: 758, src: 'whoosh', v: 0.5},
  {f: 811, src: 'pop', v: 0.6},
  {f: END_AT - 4, src: 'glitch', v: 0.5},
  {f: END_AT, src: 'impact', v: 0.8},
  {f: END_AT + 29, src: 'whoosh', v: 0.35},
];

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  let o = 0;
  for (const [f, len] of FLASHES) o = Math.max(o, interpolate(frame, [f, f + 1, f + len], [0.95, 0.8, 0], clamp) * (frame >= f ? 1 : 0));
  return o > 0 ? <AbsoluteFill style={{background: '#fff', opacity: o}} /> : null;
};

const Glitch: React.FC = () => {
  const frame = useCurrentFrame();
  const g = GLITCHES.find(([f, len]) => frame >= f && frame < f + len);
  if (!g || frame >= CUT_FRAMES) return null;
  const k = g[0] + '-' + frame;
  const shift = 10 + random('s' + k) * 26;
  const bands = [0, 1, 2].map((i) => {
    const top = random(`t${i}${k}`) * 85;
    const h = 3 + random(`h${i}${k}`) * 10;
    return {top, h, dx: (random(`d${i}${k}`) - 0.5) * 140};
  });
  return (
    <>
      <AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.75}}>
        <AbsoluteFill style={{isolation: 'isolate'}}>
          <CameraView muted offsetX={-shift} />
          <AbsoluteFill style={{background: '#ff0040', mixBlendMode: 'multiply'}} />
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.75}}>
        <AbsoluteFill style={{isolation: 'isolate'}}>
          <CameraView muted offsetX={shift} />
          <AbsoluteFill style={{background: '#00e5ff', mixBlendMode: 'multiply'}} />
        </AbsoluteFill>
      </AbsoluteFill>
      {bands.map((b, i) => (
        <CameraView
          key={i}
          muted
          offsetX={b.dx}
          style={{clipPath: `inset(${b.top}% 0 ${Math.max(0, 100 - b.top - b.h)}% 0)`}}
        />
      ))}
    </>
  );
};

const Vignette: React.FC = () => {
  const frame = useCurrentFrame();
  // Stronger, warmer vignette on the "¿Están listos…?" push-in
  const drama = interpolate(frame, [497, 503, 570, 576], [0, 1, 1, 0], clamp);
  return (
    <>
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}}
      />
      <AbsoluteFill
        style={{
          opacity: drama,
          background: `radial-gradient(ellipse 70% 55% at 50% 42%, rgba(0,0,0,0) 40%, ${C.guindaDeep}ee 100%)`,
        }}
      />
    </>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const x = Math.floor(random('gx' + frame) * 512);
  const y = Math.floor(random('gy' + frame) * 512);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile('img/grain.png')})`,
        backgroundPosition: `${x}px ${y}px`,
        mixBlendMode: 'overlay',
        opacity: 0.16,
      }}
    />
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: 10,
        width: `${(frame / (TOTAL_FRAMES - 1)) * 100}%`,
        background: `linear-gradient(90deg, ${C.guindaHot}, ${C.gold})`,
        boxShadow: `0 0 18px ${C.gold}`,
      }}
    />
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame(); // local to Sequence
  const {fps} = useVideoConfig();
  const sp = (at: number, cfg: object = {damping: 12, stiffness: 180}) => spring({frame: frame - at, fps, config: cfg});
  const arena = sp(2, {damping: 9, stiffness: 160, mass: 0.9});
  const banner = sp(10, {damping: 13, stiffness: 170});
  const qr = sp(0, {damping: 14, stiffness: 200});
  const shine = interpolate(frame, [14, 40], [-60, 160], clamp);
  const bgZoom = interpolate(frame, [0, TOTAL_FRAMES - END_AT], [1.08, 1.18]);
  const bw = 600;
  return (
    <AbsoluteFill style={{background: C.guindaDeep}}>
      <AbsoluteFill style={{transform: `scale(${bgZoom})`, filter: 'blur(18px) saturate(1.2)', opacity: 0.35}}>
        <Freeze frame={CUT_FRAMES - 12}>
          <OffthreadVideo src={staticFile('cut.mp4')} muted style={{width: W, height: H, objectFit: 'cover'}} />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 55% at 50% 42%, ${C.guinda}cc 0%, ${C.guindaDeep}f2 70%, #0a0205 100%)`,
        }}
      />
      {/* diagonal light streaks */}
      <AbsoluteFill style={{overflow: 'hidden', opacity: 0.18}}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: -400,
              left: -600 + i * 520 + frame * 9,
              width: 90 + i * 40,
              height: 2800,
              background: `linear-gradient(180deg, transparent, ${C.gold}, transparent)`,
              transform: 'rotate(24deg)',
            }}
          />
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', top: 110}}>
        <div
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontSize: 52,
            letterSpacing: 10,
            color: C.white,
            opacity: sp(0),
            transform: `translateY(${(1 - sp(0)) * -40}px)`,
          }}
        >
          NOS VEMOS EN LA
        </div>
        <div
          style={{
            fontFamily: anton,
            fontSize: 230,
            lineHeight: 1,
            color: C.gold,
            letterSpacing: 6,
            transform: `scale(${interpolate(arena, [0, 1], [1.8, 1], clamp)})`,
            opacity: Math.min(1, arena * 2),
            textShadow: `0 0 70px rgba(255,200,61,0.55), 0 12px 0 ${C.guinda}`,
            WebkitMaskImage: `linear-gradient(100deg, #000 ${shine - 20}%, rgba(0,0,0,0.55) ${shine}%, #000 ${shine + 20}%)`,
          }}
        >
          ARENA
        </div>
        <Img
          src={staticFile('img/banner.png')}
          style={{
            marginTop: 26,
            width: bw,
            height: bw * BANNER_RATIO,
            borderRadius: 26,
            border: `4px solid rgba(255,200,61,0.7)`,
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            opacity: Math.min(1, banner * 2),
            transform: `translateY(${(1 - banner) * 60}px) scale(${interpolate(banner, [0, 1], [0.85, 1], clamp)})`,
          }}
        />
        <div
          style={{
            marginTop: 34,
            background: C.white,
            borderRadius: 32,
            padding: '34px 34px 22px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            transform: `scale(${interpolate(qr, [0, 1], [0.9, 1], clamp)})`,
            opacity: Math.min(1, qr * 2),
          }}
        >
          <QRBlock size={400} />
          <div style={{marginTop: 22, fontFamily: mont, fontWeight: 900, fontSize: 32, letterSpacing: 4, color: C.guinda}}>
            ESCANEA PARA INSCRIBIRTE
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: mont,
            fontWeight: 800,
            fontSize: 38,
            color: C.white,
            textAlign: 'center',
            opacity: sp(30),
          }}
        >
          Inscripciones abiertas hasta el <span style={{color: C.gold, fontWeight: 900}}>6 de octubre</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence durationInFrames={CUT_FRAMES}>
        <CameraView volume={0.8} />
      </Sequence>
      <Glitch />
      <Vignette />
      <Grain />

      <HookIntro outAt={CLIPS[1].start} />
      <TopBadge
        visible={[
          [CLIPS[1].start - 2, 186],
          [CLIPS[3].start, CLIPS[4].start],
          [CLIPS[6].start, 644],
          [696, 758],
        ]}
      />
      <TitleCard titleAt={186} yearAt={218} stampAt={246} outAt={262} />
      <GamesGrid games={GAMES} inAt={CLIPS[4].start - 1} outAt={486} />
      <CalendarCard at={647} outAt={688} />
      <QRCard at={759} bioAt={811} />
      <Captions hideFrom={END_AT} />

      <Sequence from={END_AT}>
        <EndCard />
      </Sequence>

      <Flash />
      <Progress />

      <Audio
        src={staticFile('music.wav')}
        volume={(f) => interpolate(f, [0, END_AT - 4, END_AT, TOTAL_FRAMES], [0.31, 0.31, 1, 1], clamp)}
      />
      {SFX.map((s, i) => (
        <Sequence key={i} from={s.f} durationInFrames={60}>
          <Audio src={staticFile(`sfx/${s.src}.wav`)} volume={Math.min(0.9, s.v * 1.5)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
