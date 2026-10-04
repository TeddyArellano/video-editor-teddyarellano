import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as loadPoppins} from '@remotion/google-fonts/Poppins';
import data from './data.json';

const mont = loadMontserrat('normal', {weights: ['700', '800', '900'], subsets: ['latin']}).fontFamily;
const poppins = loadPoppins('normal', {weights: ['700', '800'], subsets: ['latin']}).fontFamily;

const W = 1080;
const H = 1920;
const FPS = 30;
const G = {blue: '#4285F4', red: '#EA4335', yellow: '#FBBC05', green: '#34A853'};
const SAFE = {top: 260, bottom: 1500, left: 70, right: 150};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Piece = {start: number; frames: number; sec: string; zoom: number};
type Word = {text: string; start: number; end: number; sec: string};
type Overlay = {file: string; at: number; dur: number};
type Chip = {sec: string; at: number; end: number; text: string};
const D = data as unknown as {pieces: Piece[]; words: Word[]; track: {x: number[]; y: number[]}; broll: Overlay[]; chips: Chip[]; name: {at: number; end: number}};
const PIECES = D.pieces;
const CUT_FRAMES = PIECES[PIECES.length - 1].start + PIECES[PIECES.length - 1].frames;
const END_LEN = 0; // the video ends on "nos vemos en la próxima"
export const TOTAL_FRAMES = CUT_FRAMES + END_LEN;
const HOOK_END = Math.round(3.3 * FPS);


/* ---------- camera: one framing per section, slow continuous push, eased changes between sections ---------- */
type Section = {sec: string; start: number; end: number; base: number};
const SECTIONS: Section[] = (() => {
  const out: Section[] = [];
  PIECES.forEach((p) => {
    const last = out[out.length - 1];
    if (last && last.sec === p.sec) last.end = p.start + p.frames;
    else out.push({sec: p.sec, start: p.start, end: p.start + p.frames, base: 0});
  });
  // alternate wide / medium framing per section (the hook stays wide)
  out.forEach((s, i) => (s.base = s.sec === 'hook' ? 1.0 : i % 2 ? 1.06 : 1.16));
  return out;
})();
const zoomAt = (f: number) => {
  let i = SECTIONS.findIndex((s) => f >= s.start && f < s.end);
  if (i < 0) i = SECTIONS.length - 1;
  const s = SECTIONS[i];
  const prog = (f - s.start) / Math.max(1, s.end - s.start);
  const z = s.base * (1 + 0.045 * prog); // slow push-in across the whole section
  if (i === 0) return z;
  // ease from the previous section's final zoom over 15 frames (no snaps)
  const prev = SECTIONS[i - 1];
  const zPrev = prev.base * 1.045;
  const k = interpolate(f - s.start, [0, 15], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return zPrev + (z - zPrev) * k;
};
const camXform = (frame: number) => {
  const f = Math.min(frame, CUT_FRAMES - 1);
  const z = zoomAt(f);
  const fx = D.track.x[f];
  const fy = D.track.y[f];
  let tx = W * 0.5 - fx * W * z;
  let ty = H * 0.4 - fy * H * z;
  tx = Math.min(0, Math.max(W - W * z, tx));
  ty = Math.min(0, Math.max(H - H * z, ty));
  return {tx, ty, z};
};
const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  const {tx, ty, z} = camXform(frame);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})`}}>
        <OffthreadVideo src={staticFile('cut.mp4')} style={{width: W, height: H}} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- hook: big Google Cloud SUMMIT that rises from behind the speaker ---------- */
const HOOK_FG_FRAMES = 120; // person cut-outs available for these frames (public/hookfg)
// person cut-out drawn with exactly the same camera transform → text sits between background and speaker
const HookForeground: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= Math.min(HOOK_FG_FRAMES, HOOK_END + 14)) return null;
  const {tx, ty, z} = camXform(frame);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})`}}>
        <Img src={staticFile(`hookfg/${String(frame).padStart(4, '0')}.png`)} style={{width: W, height: H}} />
      </div>
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame >= HOOK_END + 14) return null;
  // everything sinks back down behind the speaker at the end
  const sink = interpolate(frame, [HOOK_END - 4, HOOK_END + 12], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const logo = spring({frame: frame - 2, fps, config: {damping: 12, stiffness: 150, mass: 0.9}});
  const letters = 'SUMMIT'.split('');
  const colors = [G.blue, G.red, G.yellow, G.blue, G.green, G.red];
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 262,
          left: SAFE.left - 20,
          width: W - SAFE.left - SAFE.right + 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${sink * 620}px)`,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 40,
            padding: '22px 34px',
            boxShadow: '0 26px 70px rgba(0,0,0,0.5)',
            transform: `translateY(${(1 - logo) * 520}px) scale(${interpolate(logo, [0, 1], [0.85, 1], clamp)})`,
          }}
        >
          <Img src={staticFile('img/gcloud.png')} style={{width: 760, display: 'block'}} />
        </div>
        <div style={{display: 'flex', marginTop: -6}}>
          {letters.map((l, i) => {
            const at = 10 + i * 4;
            const p = spring({frame: frame - at, fps, config: {damping: 10, stiffness: 170, mass: 0.8}});
            return (
              <span
                key={i}
                style={{
                  fontFamily: poppins,
                  fontWeight: 800,
                  fontSize: 218,
                  lineHeight: 1,
                  color: colors[i],
                  WebkitTextStroke: '12px #fff',
                  paintOrder: 'stroke fill',
                  textShadow: '0 18px 40px rgba(0,0,0,0.45)',
                  display: 'inline-block',
                  opacity: frame < at ? 0 : 1,
                  // each letter rises from behind the body / bags
                  transform: `translateY(${(1 - p) * 560}px) rotate(${(1 - p) * (i % 2 ? 14 : -14)}deg)`,
                }}
              >
                {l}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions ---------- */
const KEY = new Set(
  (
    'GOOGLE CLOUD SUMMIT CREADOR CREADORES CONTENIDO REGALITOS BOTELLITA GAFETE EVENTO CABLES COLORES CORREITA CREDENCIALES ' +
    'MEXICANA LLAVERITOS MÉXICO PAPEL PICADO PIÑATA CORAZONCITO RANDOM TÉ BOLSITA REPOSTERÍA GALLETAS PAN MUERTO CAJITA GRANDE ' +
    'RELAJAR AGENTES TETERA TAZA BASE TAPITA FILTRAR LOGO REGALOS GRACIAS INVITACIÓN PRÓXIMA ESTÉTICA'
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
  D.words.forEach((w) => {
    const chars = cur.reduce((a, x) => a + x.text.length + 1, 0);
    if (cur.length >= 3 || chars + w.text.length > 16) flush();
    cur.push(w);
    if (/[.,?]$/.test(w.text)) flush();
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
  if (frame >= CUT_FRAMES) return null;
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const pop = spring({frame: frame - chunk.from, fps, config: {damping: 14, stiffness: 260, mass: 0.5}});
  return (
    <AbsoluteFill style={{top: 1180, left: SAFE.left, right: SAFE.right, alignItems: 'center'}}>
      <div
        style={{
          width: 860,
          textAlign: 'center',
          fontFamily: mont,
          fontWeight: 800,
          fontSize: 72,
          lineHeight: 1.04,
          transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
        }}
      >
        {chunk.words.map((w, i) => (
          <span
            key={i}
            style={{
              color: KEY.has(clean(w.text)) ? G.yellow : '#fff',
              WebkitTextStroke: '11px #000',
              paintOrder: 'stroke fill',
              textShadow: '0 6px 16px rgba(0,0,0,0.5)',
            }}
          >
            {w.text.toUpperCase().replace(/[.,…]+$/, '')}
            {i < chunk.words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- item chip (what is being unboxed) ---------- */
const ItemChip: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = D.chips.find((x) => frame >= Math.round(x.at * FPS) && frame < Math.round(x.end * FPS));
  if (!c) return null;
  const from = Math.round(c.at * FPS);
  const to = Math.round(c.end * FPS);
  const p = spring({frame: frame - from, fps, config: {damping: 12, stiffness: 220, mass: 0.6}});
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: SAFE.top + 20, left: SAFE.left, alignItems: 'flex-start', opacity: out}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: '#fff',
          borderRadius: 999,
          padding: '10px 26px 10px 14px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
          transform: `translateX(${(1 - p) * -80}px)`,
          opacity: Math.min(1, p * 2),
        }}
      >
        <Img src={staticFile('img/gcloud_icon.png')} style={{width: 64}} />
        <span style={{fontFamily: mont, fontWeight: 900, fontSize: 42, color: '#202124', letterSpacing: 1}}>{c.text}</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- name lower third ---------- */
const NameTag: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = Math.round(D.name.at * FPS);
  const b = Math.round(D.name.end * FPS);
  if (frame < a || frame >= b) return null;
  const p = spring({frame: frame - a, fps, config: {damping: 13, stiffness: 220}});
  const out = interpolate(frame, [b - 6, b], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: 'auto', bottom: H - (SAFE.bottom - 10), height: 'auto', left: SAFE.left, right: SAFE.right, alignItems: 'center', opacity: out}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
          transform: `translateY(${(1 - p) * 30}px)`,
          opacity: Math.min(1, p * 2),
        }}
      >
        {[G.blue, G.red, G.yellow, G.green].map((c) => (
          <div key={c} style={{width: 8, height: 78, background: c}} />
        ))}
        <div style={{background: '#fff', padding: '10px 24px'}}>
          <div style={{fontFamily: mont, fontWeight: 900, fontSize: 36, color: '#202124'}}>TEDDY ARELLANO</div>
          <div style={{fontFamily: mont, fontWeight: 700, fontSize: 22, color: '#5f6368', letterSpacing: 2}}>CREADOR DE CONTENIDO</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- close-up cutaways ---------- */
const BRoll: React.FC<{file: string; len: number}> = ({file, len}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], clamp);
  const z = interpolate(frame, [0, len], [1.08, 1.0]);
  return (
    <AbsoluteFill style={{opacity: k}}>
      <OffthreadVideo src={staticFile(`broll/${file}.mp4`)} muted style={{width: W, height: H, transform: `scale(${z})`}} />
    </AbsoluteFill>
  );
};

const SFX: {f: number; src: string; v: number}[] = [
  ...'SUMMIT'.split('').map((_, i) => ({f: 14 + i * 4, src: 'pop', v: 0.1})),
  ...D.chips.map((c) => ({f: Math.round(c.at * FPS), src: 'pop', v: 0.35})),
  ...D.broll.map((b) => ({f: Math.round(b.at * FPS) - 2, src: 'whoosh2', v: 0.22})),
];

export const Unboxing: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence durationInFrames={CUT_FRAMES}>
      <Camera />
    </Sequence>
    {D.broll.map((b, i) => {
      const len = Math.round(b.dur * FPS);
      return (
        <Sequence key={i} from={Math.round(b.at * FPS)} durationInFrames={len}>
          <BRoll file={b.file} len={len} />
        </Sequence>
      );
    })}
    <Hook />
    <HookForeground />
    <ItemChip />
    <NameTag />
    <Captions />
    {SFX.map((s, i) => (
      <Sequence key={i} from={Math.max(0, s.f)} durationInFrames={45}>
        <Audio src={staticFile(`sfx/${s.src}.wav`)} volume={s.v} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
