import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import edl from './edl.json';
import track from './track.json';
import words from './words.json';
import {C, FPS, H, W, mont, pixel, sec} from './theme';

type Piece = {clip: number; start: number; frames: number; zoom: number; cut: string; beep?: [number, number]};
type Word = {piece: number; role: string; text: string; start: number; end: number};
const PIECES = edl as unknown as Piece[];
const WORDS = words as Word[];
const CUT_FRAMES = PIECES[PIECES.length - 1].start + PIECES[PIECES.length - 1].frames;
const END_LEN = 70;
export const TOTAL_FRAMES = CUT_FRAMES + END_LEN;
const HOOK_END = sec(1.95);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const pieceAt = (f: number) => {
  for (let i = PIECES.length - 1; i >= 0; i--) if (f >= PIECES[i].start) return i;
  return 0;
};

/* ---------------- camera ---------------- */
const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  const f = Math.min(frame, CUT_FRAMES - 1);
  const i = pieceAt(f);
  const p = PIECES[i];
  const local = f - p.start;
  // slow push inside each piece + a short punch when a new interview starts
  const push = 1 + 0.025 * (local / Math.max(1, p.frames));
  const punch = p.cut === 'new' ? 1 + 0.07 * Math.exp(-local / 3.5) : 1;
  const z = p.zoom * push * punch;
  const fx = track.x[f];
  const fy = track.y[f];
  let tx = W * 0.5 - fx * W * z;
  // during the hook title the faces sit lower, then the camera tilts up into the normal framing
  const faceY = interpolate(frame, [HOOK_END - 6, HOOK_END + 10], [0.5, 0.37], {...clamp, easing: Easing.inOut(Easing.cubic)});
  let ty = H * faceY - fy * H * z;
  tx = Math.min(0, Math.max(W - W * z, tx));
  ty = Math.min(0, Math.max(H - H * z, ty));
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})`}}>
        <OffthreadVideo src={staticFile('cut.mp4')} style={{width: W, height: H}} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- captions (ref 2 style) ---------------- */
const KEY = new Set(
  (
    'CUÁNTO EGRESAR GANAR 30 40 25 14 20 10 11 MIL PESOS POSGRADO EXPERIENCIA INDUSTRIA INGENIERÍA ALIMENTOS DOCTORADO ' +
    'BIOPROCESOS ROBÓTICA CAMPO LABORAL CARRERA ESCUELA ESIME AZCAPOTZALCO INDUSTRIAL TURISMO PROFESIÓN AVANZADA SALARIO ' +
    'CONSIDERABLE CASITA VALE COMER HERMANO SUEÑO FOTÓNICA TEXTIL COMUNICACIONES ELECTRÓNICA SUPERIOR'
  ).split(' '),
);
const clean = (t: string) => t.replace(/[.,¿?¡!…]/g, '').toUpperCase();

type Chunk = {words: Word[]; from: number; to: number};
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({words: cur, from: 0, to: 0});
    cur = [];
  };
  WORDS.forEach((w, i) => {
    const prev = WORDS[i - 1];
    if (prev && (prev.role !== w.role || PIECES[prev.piece].clip !== PIECES[w.piece].clip)) flush();
    const chars = cur.reduce((a, x) => a + x.text.length + 1, 0);
    if (cur.length >= 3 || chars + w.text.length > 16) flush();
    cur.push(w);
    if (/[.,?]$|\.\.\.$/.test(w.text)) flush();
  });
  flush();
  out.forEach((c) => (c.from = Math.round(c.words[0].start * FPS) - 2));
  out.forEach((c, i) => {
    const natural = Math.round(c.words[c.words.length - 1].end * FPS) + 6;
    const next = out[i + 1];
    c.to = next ? Math.min(next.from, natural + 24) : natural;
  });
  return out;
})();

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < HOOK_END || frame >= CUT_FRAMES) return null;
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const pop = spring({frame: frame - chunk.from, fps, config: {damping: 14, stiffness: 260, mass: 0.5}});
  return (
    <AbsoluteFill style={{top: 1120, left: 70, right: 130, alignItems: 'center'}}>
      <div
        style={{
          width: 880,
          textAlign: 'center',
          fontFamily: mont,
          fontWeight: 800,
          fontSize: 76,
          lineHeight: 1.04,
          letterSpacing: -0.5,
          transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
        }}
      >
        {chunk.words.map((w, i) => (
          <span
            key={i}
            style={{
              color: KEY.has(clean(w.text)) ? C.yellow : C.white,
              WebkitTextStroke: '11px #000',
              paintOrder: 'stroke fill',
              textShadow: '0 6px 16px rgba(0,0,0,0.5)',
            }}
          >
            {clean(w.text) === 'P***' ? 'P***' : w.text.toUpperCase().replace(/[.,…]+$/, '')}
            {i < chunk.words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- hook title (ref 1 style) ---------------- */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame >= HOOK_END + 6) return null;
  const out = interpolate(frame, [HOOK_END - 2, HOOK_END + 6], [1, 0], clamp);
  const line = (text: string, at: number, align: 'left' | 'right', color: string, size: number) => {
    const p = spring({frame: frame - sec(at), fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
    return (
      <div
        style={{
          alignSelf: align === 'left' ? 'flex-start' : 'flex-end',
          fontFamily: mont,
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: size,
          lineHeight: 1.02,
          color,
          textShadow: '7px 7px 0 #000, 0 10px 30px rgba(0,0,0,0.5)',
          opacity: frame < sec(at) ? 0 : Math.min(1, p * 2),
          transform: `translateX(${(1 - p) * (align === 'left' ? -120 : 120)}px) scale(${0.85 + 0.15 * p})`,
        }}
      >
        {text}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{padding: '270px 150px 0 90px', flexDirection: 'column', gap: 6, opacity: out}}>
      {line('¿CUÁNTO', 0.05, 'left', C.white, 122)}
      {line('ESPERAS', 0.62, 'right', C.white, 122)}
      {line('GANAR', 0.9, 'left', C.yellow, 122)}
      {line('AL EGRESAR?', 1.2, 'right', C.yellow, 100)}
    </AbsoluteFill>
  );
};

/* ---------------- money tag (green pixel, ref 2) ---------------- */
const MONEY: {text: string; at: number; to: number}[] = [
  {text: '30K - 40K MXN', at: 2.75, to: 4.4},
  {text: '25K MXN', at: 16.633, to: 17.583},
  {text: '14K MXN', at: 27.9, to: 28.85},
  {text: '20K MXN', at: 41.617, to: 42.917},
  {text: '10K - 11K MXN', at: 43.317, to: 45.217},
  {text: '20K MXN', at: 45.317, to: 47.117},
  {text: '30K MXN', at: 48.217, to: 50.067},
];
const Money: React.FC = () => {
  const frame = useCurrentFrame();
  const m = MONEY.find((x) => frame >= sec(x.at) && frame < sec(x.to));
  if (!m) return null;
  const local = frame - sec(m.at);
  const shown = Math.min(m.text.length, Math.floor(local * 1.4) + 1); // typewriter
  const cursor = local % 10 < 5 ? '_' : ' ';
  return (
    <AbsoluteFill style={{top: 430, alignItems: 'center'}}>
      <div
        style={{
          fontFamily: pixel,
          fontWeight: 700,
          fontSize: 92,
          color: C.green,
          WebkitTextStroke: '10px #031a03',
          paintOrder: 'stroke fill',
          textShadow: '0 0 24px rgba(60,255,60,0.55), 0 6px 0 #000',
          whiteSpace: 'pre',
        }}
      >
        {m.text.slice(0, shown)}
        {shown < m.text.length ? cursor : ''}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- emoji stickers (ref 2 meme cards) ---------------- */
const STICKERS: {e: string; at: number; to: number; rot: number}[] = [
  {e: '🎓', at: 6.35, to: 7.25, rot: -6},
  {e: '🏭', at: 7.65, to: 8.4, rot: 5},
  {e: '🤖', at: 19.783, to: 21.033, rot: -5},
  {e: '💼', at: 21.083, to: 22.033, rot: 6},
  {e: '🤷', at: 33.35, to: 34.9, rot: -4},
  {e: '💵', at: 35.85, to: 37.2, rot: 5},
  {e: '🏠', at: 50.167, to: 51.067, rot: -6},
  {e: '😎', at: 52.767, to: 54.267, rot: 5},
  {e: '🍔', at: 55.167, to: 56.667, rot: -5},
  {e: '✨', at: 58.667, to: 60.267, rot: 6},
];
const Stickers: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = STICKERS.find((x) => frame >= sec(x.at) && frame < sec(x.to));
  if (!s) return null;
  const p = spring({frame: frame - sec(s.at), fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
  const out = interpolate(frame, [sec(s.to) - 4, sec(s.to)], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: 250, alignItems: 'center'}}>
      <div
        style={{
          width: 300,
          height: 300,
          borderRadius: 28,
          background: C.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 210,
          boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
          transform: `scale(${interpolate(p, [0, 1], [0.3, 1]) * out}) rotate(${s.rot * p}deg)`,
        }}
      >
        {s.e}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- career / school badges (instead of school logos) ---------------- */
const BADGES: {groups: {text: string; icon: string; at: number}[]; to: number}[] = [
  {groups: [{text: 'INGENIERÍA EN ALIMENTOS', icon: '🍎', at: 10.2}, {text: 'DOCTORADO EN BIOPROCESOS', icon: '🧪', at: 12.3}], to: 14.95},
  {groups: [{text: 'ROBÓTICA INDUSTRIAL', icon: '🤖', at: 24.333}, {text: 'ESIME AZCAPOTZALCO', icon: '🎓', at: 25.433}], to: 27.433},
  {groups: [{text: 'ESCUELA SUPERIOR DE TURISMO', icon: '✈️', at: 38.6}], to: 40.8},
  {
    groups: [
      {text: 'ING. FOTÓNICA', icon: '💡', at: 61.967},
      {text: 'ING. TEXTIL', icon: '🧵', at: 63.767},
      {text: 'ING. EN ALIMENTOS', icon: '🍎', at: 65.367},
      {text: 'COMUNICACIONES Y ELECTRÓNICA', icon: '📡', at: 67.067},
    ],
    to: 69.067,
  },
];
const Badges: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const b = BADGES.find((x) => frame >= sec(x.groups[0].at) - 1 && frame < sec(x.to));
  if (!b) return null;
  const out = interpolate(frame, [sec(b.to) - 5, sec(b.to)], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: 262, alignItems: 'center', gap: 18, opacity: out}}>
      {b.groups.map((g) => {
        if (frame < sec(g.at)) return null;
        const p = spring({frame: frame - sec(g.at), fps, config: {damping: 12, stiffness: 230, mass: 0.6}});
        return (
          <div
            key={g.text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 30px 14px 20px',
              borderRadius: 999,
              background: C.guinda,
              border: `4px solid ${C.white}`,
              boxShadow: '0 14px 36px rgba(0,0,0,0.45)',
              transform: `translateY(${(1 - p) * -40}px) scale(${interpolate(p, [0, 1], [0.6, 1])})`,
              opacity: Math.min(1, p * 2),
            }}
          >
            <span style={{fontSize: 52}}>{g.icon}</span>
            <span style={{fontFamily: mont, fontWeight: 900, fontSize: 42, color: C.white, letterSpacing: 1}}>{g.text}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------------- end card: engagement question ---------------- */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 12, stiffness: 200}});
  const p2 = spring({frame: frame - 12, fps, config: {damping: 10, stiffness: 220}});
  const bob = Math.sin(frame / 5) * 10;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(16px) brightness(0.55)', transform: 'scale(1.1)'}}>
        <Freeze frame={CUT_FRAMES - 1}>
          <Camera />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30}}>
        <div
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 118,
            lineHeight: 1.05,
            textAlign: 'center',
            color: C.white,
            textShadow: '7px 7px 0 #000',
            transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
            opacity: Math.min(1, p * 2),
          }}
        >
          ¿Y TÚ
          <br />
          <span style={{color: C.yellow}}>CUÁNTO</span> ESPERAS
          <br />
          GANAR?
        </div>
        <div
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontSize: 56,
            color: C.ink,
            background: C.yellow,
            padding: '14px 36px',
            borderRadius: 999,
            transform: `scale(${frame < 12 ? 0 : p2}) translateY(${bob}px)`,
          }}
        >
          COMÉNTALO 👇
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- sound design ---------------- */
const beepPiece = PIECES.find((p) => p.beep);
const SFX: {f: number; src: string; v: number; len?: number}[] = [
  {f: 0, src: 'whoosh', v: 0.45},
  ...MONEY.map((m) => ({f: sec(m.at), src: 'cash', v: 0.5})),
  ...STICKERS.map((s) => ({f: sec(s.at), src: 'pop', v: 0.5})),
  ...BADGES.flatMap((b) => b.groups.map((g) => ({f: sec(g.at), src: 'pop', v: 0.4}))),
  ...PIECES.filter((p, i) => i > 0 && p.cut === 'new').map((p) => ({f: p.start - 3, src: 'whoosh2', v: 0.4})),
  {f: CUT_FRAMES, src: 'whoosh', v: 0.45},
  ...(beepPiece && beepPiece.beep
    ? [{f: beepPiece.start + Math.round(beepPiece.beep[0] * FPS), src: 'beep', v: 0.55, len: Math.max(4, Math.round((beepPiece.beep[1] - beepPiece.beep[0]) * FPS))}]
    : []),
];

export const Entrevista: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence durationInFrames={CUT_FRAMES}>
      <Camera />
    </Sequence>
    <Hook />
    <Badges />
    <Stickers />
    <Money />
    <Captions />
    <Sequence from={CUT_FRAMES}>
      <EndCard />
    </Sequence>
    {SFX.map((s, i) => (
      <Sequence key={i} from={Math.max(0, s.f)} durationInFrames={s.len ?? 45}>
        <Audio src={staticFile(`sfx/${s.src}.wav`)} volume={s.v} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
