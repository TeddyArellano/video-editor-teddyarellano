import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont as loadLilita} from '@remotion/google-fonts/LilitaOne';
import {loadFont as loadMarker} from '@remotion/google-fonts/PermanentMarker';
import {loadFont as loadBangers} from '@remotion/google-fonts/Bangers';
import {loadFont as loadBungee} from '@remotion/google-fonts/Bungee';
import data from './data.json';

const lilita = loadLilita().fontFamily;
const marker = loadMarker().fontFamily;
const bangers = loadBangers().fontFamily;
const bungee = loadBungee().fontFamily;

const W = 1080;
const H = 1920;
const FPS = 30;
const SAFE = {top: 260, bottom: 1500, left: 125, right: 175};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const BLUE = '#2F80ED';
const RED = '#EB5757';
const YEL = '#FFE14D';

type Word = {text: string; start: number; end: number; sec: string};
type Item = {sec: string; at: number};
type Name = {at: number; dur: number; name: string; sem: string; color: string};
type Zoom = {sec: string; word: string; at: number; dur: number; cx: number; cy: number};
const D = data as unknown as {
  n: number;
  words: Word[];
  items: Item[];
  sections: Record<string, [number, number]>;
  track: {x: number[]; y: number[]};
  fast: [number, number][];
  zooms: Zoom[];
  names: Name[];
  cues: Record<string, number>;
};
const CUT = D.n;
export const TOTAL_FRAMES = CUT;
const HOOK_END = D.sections.intro[1];
const RADIO_START = D.sections.radio[0];

/* ---------- camera: one framing per section, slow push, eased changes ---------- */
const SECS = (['intro', 'juan', 'radio'] as const).map((k, i) => ({k, a: D.sections[k][0], b: D.sections[k][1], base: [1.0, 1.12, 1.12][i]}));
const zoomAt = (f: number) => {
  const i = Math.max(0, SECS.findIndex((s) => f >= s.a && f < s.b));
  const s = SECS[i];
  const z = s.base * (1 + 0.04 * ((f - s.a) / Math.max(1, s.b - s.a)));
  if (i === 0) return z;
  const zp = SECS[i - 1].base * 1.04;
  return zp + (z - zp) * interpolate(f - s.a, [0, 15], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
};
/* small push-in on the hands showing the most curious objects */
const HAND_Z = 1.5;
// object position checked frame by frame (normalized)
const CENTER: Record<string, [number, number]> = {
  Luigi: [0.38, 0.54], mazapán: [0.44, 0.6], Snoopy: [0.38, 0.5], lapicera: [0.44, 0.44],
  carpetita: [0.38, 0.44], Victus: [0.42, 0.5], audífonos: [0.53, 0.45], aburrida: [0.46, 0.5],
};
// Radio's two "por si sale algo / otra cosa en los baños" objects
const EXTRA_ZOOMS: Zoom[] = [
  {sec: 'radio', word: 'baños1', at: 68.25, dur: 1.5, cx: 0.44, cy: 0.54},
  {sec: 'radio', word: 'baños2', at: 71.3, dur: 1.45, cx: 0.44, cy: 0.56},
];
const ZOOMS = [...D.zooms, ...EXTRA_ZOOMS].sort((x, y) => x.at - y.at).map((z) => {
  // the laptop is shown while he talks about it, the name comes right before the cut to Radio
  const at = z.word === 'Victus' ? 53.3 : z.at;
  const a = Math.round(at * FPS);
  const end = Math.min(Math.round((z.word === 'Victus' ? 56.75 : at + z.dur) * FPS), D.sections[z.sec][1] - 4);
  const [cx, cy] = CENTER[z.word] ?? [z.cx, z.cy];
  return {a, b: end, cx, cy};
});
const handZoom = (f: number) => {
  for (const z of ZOOMS) {
    if (f >= z.a && f < z.b) {
      const k = interpolate(f, [z.a, z.a + 9, z.b - 9, z.b], [0, 1, 1, 0], {...clamp, easing: Easing.inOut(Easing.cubic)});
      return {k, cx: z.cx, cy: z.cy};
    }
  }
  return {k: 0, cx: 0.5, cy: 0.5};
};
const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  const f = Math.min(frame, CUT - 1);
  const hz = handZoom(f);
  const z0 = zoomAt(f);
  const z = z0 + (HAND_Z - z0) * hz.k;
  const cx = D.track.x[f] + (hz.cx - D.track.x[f]) * hz.k;
  const cy = D.track.y[f] + (hz.cy - D.track.y[f]) * hz.k;
  let tx = W * 0.5 - cx * W * z;
  let ty = H * (0.38 + 0.1 * hz.k) - cy * H * z;
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

/* ---------- hook: notebook / sticker look with mixed typefaces ---------- */
const Sticker: React.FC<{text: string; bg: string; rot: number; at: number}> = ({text, bg, rot, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 9, stiffness: 260, mass: 0.7}});
  return (
    <div
      style={{
        fontFamily: lilita,
        fontSize: 44,
        color: '#fff',
        background: bg,
        padding: '8px 16px 4px',
        borderRadius: 14,
        border: '5px solid #fff',
        boxShadow: '6px 8px 0 rgba(0,0,0,0.85)',
        whiteSpace: 'nowrap',
        transform: `rotate(${rot}deg) scale(${frame < at ? 0 : interpolate(p, [0, 1], [2.2, 1], clamp)})`,
        opacity: frame < at ? 0 : Math.min(1, p * 2),
      }}
    >
      {text}
    </div>
  );
};
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame >= HOOK_END + 8) return null;
  const out = interpolate(frame, [HOOK_END - 4, HOOK_END + 8], [1, 0], clamp);
  const l1 = spring({frame: frame - 2, fps, config: {damping: 12, stiffness: 200}});
  const l2 = spring({frame: frame - 8, fps, config: {damping: 8, stiffness: 220, mass: 0.8}});
  const vs = spring({frame: frame - 26, fps, config: {damping: 7, stiffness: 300, mass: 0.6}});
  const note = spring({frame: frame - 40, fps, config: {damping: 12, stiffness: 200}});
  const wobble = Math.sin(frame / 4) * 2;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        style={{
          position: 'absolute',
          top: 820,
          left: SAFE.right,
          width: W - 2 * SAFE.right,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: marker,
            fontSize: 64,
            color: '#fff',
            WebkitTextStroke: '10px #111',
            paintOrder: 'stroke fill',
            transform: `rotate(-3deg) translateX(${(1 - l1) * -300}px)`,
            opacity: Math.min(1, l1 * 2),
          }}
        >
          ¿Qué lleva en su
        </div>
        <div
          style={{
            fontFamily: lilita,
            fontSize: 150,
            lineHeight: 0.95,
            color: YEL,
            WebkitTextStroke: '16px #111',
            paintOrder: 'stroke fill',
            textShadow: '10px 12px 0 #111',
            transform: `rotate(${2 + wobble * (1 - l2) * 0}deg) scale(${frame < 8 ? 0 : interpolate(l2, [0, 1], [0.3, 1], clamp)})`,
          }}
        >
          MOCHILA?
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 18}}>
          <Sticker text="1ER SEMESTRE" bg={BLUE} rot={-5} at={18} />
          <div
            style={{
              fontFamily: bangers,
              fontSize: 92,
              color: RED,
              WebkitTextStroke: '8px #fff',
              paintOrder: 'stroke fill',
              textShadow: '5px 6px 0 #111',
              transform: `scale(${frame < 26 ? 0 : interpolate(vs, [0, 1], [3, 1], clamp)}) rotate(${wobble}deg)`,
            }}
          >
            VS
          </div>
          <Sticker text="9NO SEMESTRE" bg={RED} rot={4} at={32} />
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: marker,
            fontSize: 32,
            color: '#222',
            background: YEL,
            padding: '12px 22px',
            transform: `rotate(-2deg) translateY(${(1 - note) * 60}px)`,
            opacity: frame < 40 ? 0 : Math.min(1, note * 2),
            boxShadow: '4px 6px 0 rgba(0,0,0,0.5)',
          }}
        >
          estudiantes de Ing. en Sistemas
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- object counter ---------- */
const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < HOOK_END || frame >= CUT) return null;
  const sec = frame >= RADIO_START ? 'radio' : 'juan';
  const color = sec === 'radio' ? RED : BLUE;
  const evs = D.items.filter((i) => i.sec === sec).map((i) => Math.round(i.at * FPS));
  const n = evs.filter((e) => frame >= e).length;
  const last = [...evs].reverse().find((e) => frame >= e);
  const bump = last !== undefined ? spring({frame: frame - last, fps, config: {damping: 8, stiffness: 300, mass: 0.5}}) : 1;
  const secStart = sec === 'radio' ? RADIO_START : HOOK_END;
  const enter = spring({frame: frame - secStart, fps, config: {damping: 12, stiffness: 200}});
  return (
    <AbsoluteFill style={{top: SAFE.top + 10, left: SAFE.left, alignItems: 'flex-start'}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: '#fff',
          borderRadius: 22,
          padding: '8px 22px 8px 16px',
          border: `5px solid ${color}`,
          boxShadow: '5px 7px 0 rgba(0,0,0,0.8)',
          transform: `translateX(${(1 - enter) * -260}px) rotate(-2deg)`,
        }}
      >
        <span style={{fontFamily: lilita, fontSize: 34, color: '#222', lineHeight: 1}}>
          OBJETOS
          <br />
          <span style={{fontSize: 24, color}}>{sec === 'radio' ? '9NO SEM.' : '1ER SEM.'}</span>
        </span>
        <span
          style={{
            fontFamily: bungee,
            fontSize: 76,
            color,
            minWidth: 96,
            textAlign: 'center',
            display: 'inline-block',
            transform: `scale(${interpolate(bump, [0, 1], [1.5, 1], clamp)})`,
          }}
        >
          {n}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- name tag ---------- */
const NameTag: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = D.names.find((x) => frame >= Math.round(x.at * FPS) && frame < Math.round((x.at + x.dur) * FPS));
  if (!t) return null;
  const a = Math.round(t.at * FPS);
  const b = Math.round((t.at + t.dur) * FPS);
  const p = spring({frame: frame - a, fps, config: {damping: 10, stiffness: 240, mass: 0.6}});
  const out = interpolate(frame, [b - 6, b], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: SAFE.top + 10, right: SAFE.right, left: 'auto', width: 420, alignItems: 'flex-end', opacity: out}}>
      <div
        style={{
          background: t.color,
          borderRadius: 16,
          padding: '6px 22px 10px',
          border: '5px solid #fff',
          boxShadow: '5px 7px 0 rgba(0,0,0,0.8)',
          textAlign: 'right',
          transform: `rotate(3deg) scale(${interpolate(p, [0, 1], [0.4, 1], clamp)})`,
        }}
      >
        <div style={{fontFamily: lilita, fontSize: 62, color: '#fff', lineHeight: 1}}>{t.name}</div>
        <div style={{fontFamily: marker, fontSize: 28, color: YEL}}>{t.sem}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions ---------- */
const ITEM_FRAMES = new Set(D.items.map((i) => Math.round(i.at * FPS)));
type Chunk = {words: Word[]; from: number; to: number};
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({words: cur, from: 0, to: 0});
    cur = [];
  };
  D.words.forEach((w, i) => {
    const prev = D.words[i - 1];
    if (prev && prev.sec !== w.sec) flush();
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
  if (frame < HOOK_END || frame >= CUT) return null;
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const pop = spring({frame: frame - chunk.from, fps, config: {damping: 13, stiffness: 260, mass: 0.5}});
  return (
    <AbsoluteFill style={{top: 1190, alignItems: 'center'}}>
      <div
        style={{
          width: W - 2 * SAFE.right,
          textAlign: 'center',
          fontFamily: lilita,
          fontSize: 80,
          lineHeight: 1.02,
          transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])}) rotate(${(1 - pop) * -3}deg)`,
        }}
      >
        {chunk.words.map((w, i) => {
          const isItem = [...ITEM_FRAMES].some((f) => Math.abs(f - Math.round(w.start * FPS)) <= 1);
          return (
            <span
              key={i}
              style={{
                color: isItem ? YEL : '#fff',
                WebkitTextStroke: '12px #111',
                paintOrder: 'stroke fill',
                textShadow: '0 6px 0 rgba(0,0,0,0.6)',
              }}
            >
              {w.text.toUpperCase().replace(/[.,…]+$/, '')}
              {i < chunk.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- VS wipe into the 9th-semester student ---------- */
const VsWipe: React.FC = () => {
  const frame = useCurrentFrame(); // local
  const {fps} = useVideoConfig();
  const len = 22;
  const inP = interpolate(frame, [0, 6], [-1, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  const outP = interpolate(frame, [len - 6, len], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const vs = spring({frame: frame - 3, fps, config: {damping: 7, stiffness: 300, mass: 0.6}});
  return (
    <AbsoluteFill style={{transform: `translateX(${(inP + outP) * W}px)`}}>
      <AbsoluteFill style={{background: `linear-gradient(115deg, ${BLUE} 0 48%, #111 48% 52%, ${RED} 52% 100%)`}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{fontFamily: bangers, fontSize: 300, color: YEL, WebkitTextStroke: '14px #111', paintOrder: 'stroke fill', transform: `scale(${interpolate(vs, [0, 1], [3, 1], clamp)})`}}>
          VS
        </div>
        <div style={{fontFamily: lilita, fontSize: 90, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill'}}>9NO SEMESTRE</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- fast-forward badge ---------- */
const FAST = D.fast;
const FastBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const r = FAST.find(([a, b]) => frame >= a && frame < b);
  if (!r) return null;
  const p = spring({frame: frame - r[0], fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
  const out = interpolate(frame, [r[1] - 6, r[1]], [1, 0], clamp);
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{top: SAFE.top + 140, left: SAFE.left, alignItems: 'flex-start', opacity: out}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: YEL,
          borderRadius: 18,
          border: '5px solid #111',
          padding: '6px 18px 2px',
          boxShadow: '5px 7px 0 rgba(0,0,0,0.8)',
          transform: `rotate(-2deg) scale(${interpolate(p, [0, 1], [0.3, 1], clamp)})`,
        }}
      >
        <span style={{fontFamily: bungee, fontSize: 56, color: '#111', opacity: blink ? 1 : 0.35, letterSpacing: -10}}>▶▶</span>
        <span style={{fontFamily: bungee, fontSize: 56, color: RED}}>x2</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- sound ---------- */
const itemSfx = D.items.map((i) => ({f: Math.round(i.at * FPS), src: 'ding', v: 0.32}));
const C = (k: string) => Math.round(D.cues[k] * FPS);
const SFX: {f: number; src: string; v: number; len?: number}[] = [
  {f: 18, src: 'pop', v: 0.35},
  {f: 26, src: 'boom', v: 0.35},
  {f: 32, src: 'pop', v: 0.35},
  ...itemSfx,
  ...ZOOMS.map((z) => ({f: z.a - 2, src: 'whoosh2', v: 0.16})),
  ...FAST.flatMap(([a, b]) => [
    {f: a - 6, src: 'ffwd', v: 0.4},
    {f: b - 4, src: 'pop', v: 0.3},
  ]),
  {f: C('luigi') + 4, src: 'coin', v: 0.4},
  {f: C('aplastado'), src: 'boing', v: 0.4},
  {f: C('inhalador3') - 2, src: 'boom', v: 0.45},
  {f: C('preparados') + 6, src: 'tada', v: 0.35, len: 40},
  {f: C('victus'), src: 'boom', v: 0.45},
  {f: RADIO_START - 2, src: 'whoosh', v: 0.45},
];

export const Mochila: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence durationInFrames={CUT}>
      <Camera />
    </Sequence>
    <Hook />
    <Counter />
    <NameTag />
    <Captions />
    <Sequence from={RADIO_START - 2} durationInFrames={22}>
      <VsWipe />
    </Sequence>
    <FastBadge />
    {SFX.map((s, i) => (
      <Sequence key={i} from={Math.max(0, s.f)} durationInFrames={Math.min(s.len ?? 45, CUT - Math.max(0, s.f))}>
        <Audio src={staticFile(`sfx/${s.src}.wav`)} volume={s.v} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
