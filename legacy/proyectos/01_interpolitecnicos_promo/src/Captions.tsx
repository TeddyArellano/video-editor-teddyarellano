import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import words from './words.json';
import {CLIPS} from './Camera';
import {C, FPS, mont} from './theme';

type Word = {clip: number; text: string; start: number; end: number};
const WORDS = words as Word[];

const KEYWORDS = new Set([
  'TORNEO', 'ESPERABAN', 'DEMOSTRAR', 'HECHOS', 'INSCRIPCIONES', 'INTERPOLITÉCNICOS', '2026',
  'ABIERTAS', 'EQUIPO', 'GLORIA', 'DARLO', 'TODO', 'BATALLA', 'OPORTUNIDAD', '6', 'OCTUBRE',
  'LUGAR', 'COMPETENCIA', 'LINK', 'BIOGRAFÍA', 'ARENA',
]);

const clean = (t: string) => t.replace(/[.,¿?¡!]/g, '').toUpperCase();

// Clips where captions are replaced by full-screen graphics
const HIDDEN_CLIPS = new Set([4, 5]);

type Chunk = {words: Word[]; from: number; to: number};

const buildChunks = (): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) chunks.push({words: cur, from: 0, to: 0});
    cur = [];
  };
  WORDS.forEach((w, i) => {
    const prev = WORDS[i - 1];
    if (prev && prev.clip !== w.clip) flush();
    const chars = cur.reduce((a, x) => a + x.text.length + 1, 0);
    if (cur.length >= 3 || chars + w.text.length > 17) flush();
    cur.push(w);
    if (/[.,?]$/.test(w.text)) flush();
  });
  flush();
  chunks.forEach((c) => {
    c.from = Math.round(c.words[0].start * FPS) - 2;
  });
  chunks.forEach((c, i) => {
    const clip = CLIPS[c.words[0].clip];
    const clipEnd = clip.start + clip.frames;
    const next = chunks[i + 1];
    const natural = Math.round(c.words[c.words.length - 1].end * FPS) + 8;
    c.to = Math.min(next ? next.from : natural + 20, clipEnd);
  });
  return chunks.filter((c) => !HIDDEN_CLIPS.has(c.words[0].clip));
};

const CHUNKS = buildChunks();

export const Captions: React.FC<{hideFrom: number}> = ({hideFrom}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame >= hideFrom) return null;
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', top: 1170}}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '6px 22px',
          width: 960,
          fontFamily: mont,
          fontWeight: 900,
          fontSize: 92,
          lineHeight: 1.05,
          textTransform: 'uppercase',
          letterSpacing: -1,
        }}
      >
        {chunk.words.map((w, i) => {
          const s = Math.round(w.start * FPS) - 2;
          const e = Math.round(w.end * FPS);
          const visible = frame >= s;
          const active = frame >= s && frame < Math.max(e, s + 4);
          const key = KEYWORDS.has(clean(w.text));
          const pop = spring({frame: frame - s, fps, config: {damping: 11, stiffness: 220, mass: 0.6}});
          const scale = visible ? interpolate(pop, [0, 1], [0.55, 1]) * (active ? 1.08 : 1) : 0.55;
          const color = key ? C.gold : C.white;
          return (
            <span
              key={i}
              style={{
                position: 'relative',
                display: 'inline-block',
                opacity: visible ? Math.min(1, pop * 1.6) : 0,
                transform: `translateY(${visible ? (1 - pop) * 28 : 28}px) scale(${scale})`,
                color,
                WebkitTextStroke: '14px #0B0507',
                paintOrder: 'stroke fill',
                textShadow: '0 10px 28px rgba(0,0,0,0.55)',
                padding: '0 10px',
              }}
            >
              {active && key ? (
                <span
                  style={{
                    position: 'absolute',
                    inset: '6px -2px 2px -2px',
                    background: C.guinda,
                    borderRadius: 14,
                    transform: 'rotate(-2deg)',
                    zIndex: -1,
                    boxShadow: `0 0 34px ${C.guindaHot}`,
                  }}
                />
              ) : null}
              {w.text.replace(/[.,]$/, '')}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
