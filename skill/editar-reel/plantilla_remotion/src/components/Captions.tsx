// Subtítulos: bloques de 1–3 palabras (≤ ~16 caracteres), cortan en puntuación y al cambiar de sección,
// pop de escala, palabras clave en color acento. CENTRADOS en x = 540: el AbsoluteFill no lleva left/right
// (AbsoluteFill trae width:100%; un `left` corre todo a la derecha).
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CUT, D, E, FPS, SIDE, W, Word, font, stroke, topLibre} from '../theme';

type Chunk = {words: Word[]; from: number; to: number};
const S = E.subtitulos;
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({words: cur, from: 0, to: 0});
    cur = [];
  };
  D.words.forEach((w, i) => {
    const prev = D.words[i - 1];
    if (prev && (prev.sec !== w.sec || w.corte)) flush();
    const chars = cur.reduce((a, x) => a + x.text.length + 1, 0);
    if (cur.length >= S.maxPalabras || chars + w.text.length > S.maxChars) flush();
    cur.push(w);
    if (/[.,?!]$/.test(w.text)) flush();
  });
  flush();
  // dos pasadas: primero todos los `from`, luego cada `to` (si no, hay bloques que nunca aparecen)
  out.forEach((c) => (c.from = Math.round(c.words[0].start * FPS) - 2));
  out.forEach((c, i) => {
    const natural = Math.round(c.words[c.words.length - 1].end * FPS) + 6;
    const next = out[i + 1];
    c.to = next ? Math.min(next.from, natural + 24) : Math.min(natural, CUT);
  });
  return out;
})();

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if ((D.hook && frame < D.hookEnd) || frame >= CUT) return null;
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  // si hay una tarjeta (QR) abajo, los subtítulos suben arriba
  const cardBelow = D.images.some((im) => im.pos === 'abajo' && frame >= im.a && frame < im.b);
  const pop = spring({frame: frame - chunk.from, fps, config: {damping: 13, stiffness: 260, mass: 0.5}});
  return (
    <AbsoluteFill style={{top: cardBelow ? topLibre(frame) : S.top, alignItems: 'center'}}>
      <div
        style={{
          width: W - 2 * SIDE,
          textAlign: 'center',
          fontFamily: font(S.fuente),
          fontWeight: S.peso ?? 400,
          fontStyle: S.italic ? 'italic' : 'normal',
          fontSize: S.size,
          lineHeight: 1.02,
          transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])}) rotate(${(1 - pop) * -3}deg)`,
        }}
      >
        {chunk.words.map((w, i) => {
          const t = w.text.replace(/[.,…]+$/, '');
          return (
            <span key={i} style={{color: w.key ? E.colores.acento : E.colores.texto, ...stroke(S.contorno), textShadow: S.sombra ?? '0 6px 0 rgba(0,0,0,0.6)'}}>
              {S.mayus ? t.toUpperCase() : t}
              {i < chunk.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
