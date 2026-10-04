import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import logos from './logos.json';
import pieces from './pieces.json';
import segments from './segments.json';
import track from './track.json';
import words from './words.json';
import {C, FPS, H, W, mont} from './theme';
import {AREA, HOOK_STYLE} from './variant';
import careerEvents from './careerEvents.json';

type Piece = {start: number; frames: number; seg: number; zoom: number; zoomAlt: number; faceY: number; cut: string; beep?: [number, number] | null};
type Seg = {seg: number; start: number; end: number; gain: number};
type Word = {piece: number; seg: number; role: string; text: string; start: number; end: number};
type Logo = {key: string; seg: number; at: number};
const PIECES = pieces as Piece[];
const SEGS = segments as Seg[];
const WORDS = words as Word[];
const LOGOS = logos as Logo[];
const CUT_FRAMES = PIECES[PIECES.length - 1].start + PIECES[PIECES.length - 1].frames;
const END_LEN = 75;
export const TOTAL_FRAMES = CUT_FRAMES + END_LEN;
const HOOK_END = 66;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// TikTok / Reels safe zone on 1080x1920
const SAFE = {top: 260, bottom: 1500, left: 70, right: 150};
const SAFE_CX = (SAFE.left + (W - SAFE.right)) / 2; // 500

const pieceAt = (f: number) => {
  for (let i = PIECES.length - 1; i >= 0; i--) if (f >= PIECES[i].start) return i;
  return 0;
};
const segAt = (f: number) => {
  for (let i = SEGS.length - 1; i >= 0; i--) if (f >= SEGS[i].start) return i;
  return 0;
};

/* ---------- camera ---------- */
const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  const f = Math.min(frame, CUT_FRAMES - 1);
  const p = PIECES[pieceAt(f)];
  const local = f - p.start;
  const push = 1 + 0.025 * (local / Math.max(1, p.frames));
  const punch = p.cut === 'new' ? 1 + 0.06 * Math.exp(-local / 3.5) : 1;
  const z = p.zoom * p.zoomAlt * push * punch;
  const fx = track.x[f];
  const fy = track.y[f];
  // during the hook the faces sit lower so the title never covers them
  const faceY = interpolate(frame, [HOOK_END - 6, HOOK_END + 10], [0.52, p.faceY], {...clamp, easing: Easing.inOut(Easing.cubic)});
  let tx = W * 0.5 - fx * W * z;
  let ty = H * faceY - fy * H * z;
  tx = Math.min(0, Math.max(W - W * z, tx));
  ty = Math.min(0, Math.max(H - H * z, ty));
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})`}}>
        <OffthreadVideo
          src={staticFile('cut.mp4')}
          volume={(vf) => SEGS[segAt(Math.min(vf, CUT_FRAMES - 1))].gain}
          style={{width: W, height: H}}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- hook ---------- */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame >= HOOK_END + 6) return null;
  const out = interpolate(frame, [HOOK_END - 2, HOOK_END + 6], [1, 0], clamp);
  const line = (text: string, at: number, align: 'left' | 'right', color: string, size: number) => {
    const p = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
    return (
      <div
        style={{
          alignSelf: align === 'left' ? 'flex-start' : 'flex-end',
          fontFamily: mont,
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: size,
          lineHeight: 1.02,
          whiteSpace: 'nowrap',
          color,
          textShadow: '7px 7px 0 #000, 0 10px 30px rgba(0,0,0,0.5)',
          opacity: frame < at ? 0 : Math.min(1, p * 2),
          transform: `translateX(${(1 - p) * (align === 'left' ? -120 : 120)}px) scale(${0.85 + 0.15 * p})`,
        }}
      >
        {text}
      </div>
    );
  };
  if (HOOK_STYLE === 'B') {
    // Variant B: centred block, zoom-punch entrances, "TUS SUEÑOS?" on a tilted yellow band
    const punch = (at: number) => spring({frame: frame - at, fps, config: {damping: 9, stiffness: 260, mass: 0.7}});
    const word = (text: string, at: number, size: number) => {
      const p = punch(at);
      return (
        <div
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.0,
            whiteSpace: 'nowrap',
            color: C.white,
            textShadow: '0 8px 0 #000, 0 12px 30px rgba(0,0,0,0.55)',
            opacity: frame < at ? 0 : Math.min(1, p * 2),
            transform: `scale(${frame < at ? 2 : interpolate(p, [0, 1], [2, 1], clamp)})`,
          }}
        >
          {text}
        </div>
      );
    };
    const band = punch(20);
    return (
      <AbsoluteFill style={{opacity: out}}>
        <div
          style={{
            position: 'absolute',
            top: 285,
            left: SAFE.left,
            width: W - SAFE.left - SAFE.right,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {word('¿CUÁL ES', 2, 104)}
          {word('LA EMPRESA DE', 10, 88)}
          <div
            style={{
              marginTop: 10,
              fontFamily: mont,
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 110,
              lineHeight: 1.05,
              whiteSpace: 'nowrap',
              color: C.ink,
              background: C.yellow,
              padding: '4px 30px 10px',
              borderRadius: 14,
              boxShadow: '8px 8px 0 #000',
              transform: `rotate(-3deg) scale(${frame < 20 ? 0 : interpolate(band, [0, 1], [1.8, 1], clamp)})`,
              opacity: frame < 20 ? 0 : Math.min(1, band * 2),
            }}
          >
            TUS SUEÑOS?
          </div>
          {AREA ? (
            <div
              style={{
                marginTop: 18,
                fontFamily: mont,
                fontWeight: 900,
                fontSize: 38,
                letterSpacing: 2,
                color: C.white,
                background: C.guinda,
                padding: '8px 22px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                transform: `scale(${frame < 30 ? 0 : punch(30)})`,
              }}
            >
              {AREA}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', top: 285, left: 90, width: W - 90 - SAFE.right, display: 'flex', flexDirection: 'column', gap: 4}}>
        {line('¿CUÁL ES LA', 2, 'left', C.white, 100)}
        {line('EMPRESA DE', 12, 'right', C.white, 100)}
        {line('TUS SUEÑOS?', 22, 'left', C.yellow, 112)}
        {AREA ? (
          <div
            style={{
              alignSelf: 'flex-start',
              marginTop: 16,
              fontFamily: mont,
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 42,
              color: C.white,
              background: C.guinda,
              border: `4px solid ${C.white}`,
              padding: '8px 22px',
              borderRadius: 14,
              whiteSpace: 'nowrap',
              transform: `scale(${frame < 28 ? 0 : spring({frame: frame - 28, fps, config: {damping: 12, stiffness: 220}})})`,
              transformOrigin: 'left center',
            }}
          >
            {AREA}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions ---------- */
const KEY = new Set(
  (
    'AWS GOOGLE BOSTON DYNAMICS TESLA SIEMENS GENERAL MOTORS LEGO FESTO SAMSUNG TELEVISA COCA-COLA FEMSA MICROSOFT BBVA ' +
    "BIG FOUR DELOITTE KPMG GBM SECIHTI SABRITAS FLAMIN' HOT ROBÓTICA ROBOTS AUTOMATIZACIÓN TECNOLOGÍA PROGRAMACIÓN SOFTWARE " +
    'DINERO TRADING DATOS BECAS INVESTIGACIÓN TURÍSTICA SOÑAR CRYPTOS BANCO FINANCIERO DISPOSITIVOS INVENTAR TEXTILERA SUEÑOS'
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
    if (prev && (prev.seg !== w.seg || prev.role !== w.role)) flush();
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
  if (frame < HOOK_END || frame >= CUT_FRAMES) return null;
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const pop = spring({frame: frame - chunk.from, fps, config: {damping: 14, stiffness: 260, mass: 0.5}});
  return (
    <AbsoluteFill style={{top: 1130, left: SAFE.left, right: SAFE.right, alignItems: 'center'}}>
      <div
        style={{
          width: 860,
          textAlign: 'center',
          fontFamily: mont,
          fontWeight: 800,
          fontSize: 74,
          lineHeight: 1.04,
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
            {w.text.toUpperCase().replace(/[.,…]+$/, '')}
            {i < chunk.words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- company logos (appear when the company is named) ---------- */
const LogoCards: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const si = segAt(Math.min(frame, CUT_FRAMES - 1));
  const seg = SEGS[si];
  const mine = LOGOS.filter((l) => l.seg === seg.seg);
  if (!mine.length || frame >= CUT_FRAMES) return null;
  const out = interpolate(frame, [seg.end - 6, seg.end], [1, 0], clamp);
  const n = mine.length;
  const perRow = n <= 2 ? n : 3;
  const cardW = n === 1 ? 560 : n === 2 ? 390 : 250;
  const cardH = n === 1 ? 240 : n === 2 ? 200 : 150;
  const gap = 20;
  return (
    <AbsoluteFill style={{opacity: out}}>
      {mine.map((l, i) => {
        const at = Math.round(l.at * FPS) - 2;
        if (frame < at) return null;
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, n - row * perRow);
        const col = i % perRow;
        const rowW = inRow * cardW + (inRow - 1) * gap;
        const x = SAFE_CX - rowW / 2 + col * (cardW + gap);
        const y = SAFE.top + 30 + row * (cardH + gap);
        const p = spring({frame: frame - at, fps, config: {damping: 11, stiffness: 240, mass: 0.6}});
        return (
          <div
            key={`${l.key}${i}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: cardW,
              height: cardH,
              borderRadius: 26,
              background: C.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 18px 44px rgba(0,0,0,0.45)',
              transform: `translateY(${(1 - p) * 50}px) scale(${interpolate(p, [0, 1], [0.4, 1])}) rotate(${(1 - p) * (i % 2 ? 7 : -7)}deg)`,
              opacity: Math.min(1, p * 2),
            }}
          >
            <Img
              src={staticFile(`logos/${l.key}.${l.key === 'gbm' ? 'svg' : 'png'}`)}
              style={{width: cardW * 0.82, height: cardH * 0.7, objectFit: 'contain'}}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- subtle career tag per interviewee (below the captions) ---------- */
const CAREERS: Record<number, {label: string; text: string}> = {
  0: {label: 'ESTUDIA', text: 'ING. EN COMPUTACIÓN · ESIME CULHUACÁN'},
  1: {label: 'ESTUDIA', text: 'ING. EN ROBÓTICA INDUSTRIAL · ESIME AZCAPOTZALCO'},
  2: {label: 'ESTUDIAN', text: 'MECATRÓNICA · ROBÓTICA'},
  3: {label: 'ESTUDIA', text: 'ING. EN SISTEMAS COMPUTACIONALES'},
  4: {label: 'ESTUDIAN', text: 'FOTÓNICA · TEXTIL · ALIMENTOS · COMUNICACIONES Y ELECTRÓNICA'},
  5: {label: 'ESTUDIA', text: 'CONTADOR PÚBLICO · ESCA'},
  6: {label: 'ESTUDIA', text: 'ECONOMÍA · ESE'},
  7: {label: 'ESTUDIA', text: 'SISTEMAS COMPUTACIONALES · ESCOM'},
  8: {label: 'ESTUDIA', text: 'ING. EN ALIMENTOS · DOCTORADO EN BIOPROCESOS'},
  9: {label: 'ESTUDIA', text: 'ESCUELA SUPERIOR DE TURISMO'},
  10: {label: 'ESTUDIA', text: 'ING. TEXTIL'},
};
type CareerEvent = {seg: number; at: number; text: string};
const EVENTS = careerEvents as CareerEvent[];
const CareerTag: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame >= CUT_FRAMES) return null;
  const seg = SEGS[segAt(frame)];
  const info = CAREERS[seg.seg];
  if (!info) return null;
  const segStart = seg.seg === SEGS[0].seg ? HOOK_END + 4 : seg.start + 6;
  // group interviews: the tag follows whoever is answering
  const evs = EVENTS.filter((e) => e.seg === seg.seg);
  let text = info.text;
  let label = info.label;
  let from = segStart;
  if (evs.length) {
    const cur = [...evs].reverse().find((e) => frame >= Math.round(e.at * FPS) - 2);
    if (!cur) return null;
    text = cur.text;
    label = 'ESTUDIA';
    from = Math.round(cur.at * FPS) - 2;
  }
  if (frame < from) return null;
  const p = spring({frame: frame - from, fps, config: {damping: 13, stiffness: 230, mass: 0.6}});
  const out = interpolate(frame, [seg.end - 6, seg.end], [1, 0], clamp);
  return (
    <AbsoluteFill style={{bottom: H - (SAFE.bottom - 8), left: SAFE.left, right: SAFE.right, height: 'auto', top: 0, alignItems: 'center', justifyContent: 'flex-end', opacity: out}}>
      <div
        style={{
          maxWidth: 840,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '9px 20px 9px 12px',
          borderRadius: 16,
          background: 'rgba(0,0,0,0.55)',
          borderLeft: `6px solid ${C.yellow}`,
          transform: `translateY(${(1 - p) * 26}px) scale(${interpolate(p, [0, 1], [0.92, 1], clamp)})`,
          opacity: Math.min(1, p * 1.5),
        }}
      >
        <span
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: 2,
            color: C.ink,
            background: C.yellow,
            padding: '4px 10px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        <span style={{fontFamily: mont, fontWeight: 800, fontSize: 30, color: C.white, lineHeight: 1.15}}>{text}</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- end card ---------- */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 12, stiffness: 200}});
  const p2 = spring({frame: frame - 12, fps, config: {damping: 10, stiffness: 220}});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(16px) brightness(0.5)', transform: 'scale(1.1)'}}>
        <Freeze frame={CUT_FRAMES - 1}>
          <Camera />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{left: SAFE.left, right: SAFE.right, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34}}>
        <div
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 100,
            lineHeight: 1.05,
            textAlign: 'center',
            color: C.white,
            textShadow: '7px 7px 0 #000',
            transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
            opacity: Math.min(1, p * 2),
          }}
        >
          ¿Y LA TUYA
          <br />
          <span style={{color: C.yellow}}>CUÁL ES?</span>
        </div>
        <div
          style={{
            fontFamily: mont,
            fontWeight: 900,
            fontSize: 52,
            color: C.ink,
            background: C.yellow,
            padding: '14px 36px',
            borderRadius: 999,
            transform: `scale(${frame < 12 ? 0 : p2})`,
          }}
        >
          COMÉNTALA
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- sound ---------- */
const beepPiece = PIECES.find((p) => p.beep);
const SFX: {f: number; src: string; v: number; len?: number}[] = [
  {f: 0, src: 'whoosh', v: 0.4},
  ...LOGOS.map((l) => ({f: Math.round(l.at * FPS) - 2, src: 'pop', v: 0.45})),
  ...SEGS.slice(1).map((s) => ({f: s.start - 3, src: 'whoosh2', v: 0.3})),
  ...EVENTS.map((e) => ({f: Math.round(e.at * FPS) - 2, src: 'tag', v: 0.6})),
  {f: CUT_FRAMES, src: 'whoosh', v: 0.4},
  ...(beepPiece && beepPiece.beep
    ? [{f: beepPiece.start + Math.round(beepPiece.beep[0] * FPS), src: 'beep', v: 0.5, len: Math.max(4, Math.round((beepPiece.beep[1] - beepPiece.beep[0]) * FPS))}]
    : []),
];

export const Suenos: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence durationInFrames={CUT_FRAMES}>
      <Camera />
    </Sequence>
    <LogoCards />
    <Hook />
    <CareerTag />
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
