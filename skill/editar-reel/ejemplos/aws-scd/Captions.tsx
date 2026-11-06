// Subtítulos: bloques de 1–3 palabras (≤ ~16 caracteres), cortan en puntuación y al cambiar de sección,
// palabras clave en color acento. CENTRADOS en x = 540: el AbsoluteFill no lleva left/right
// (AbsoluteFill trae width:100%; un `left` corre todo a la derecha).
// Sincronía: dentro del bloque cada palabra aparece JUSTO cuando se dice (las que faltan ocupan su lugar invisibles,
// así el bloque no brinca); entrada rápida de 3 cuadros. Un bloque nunca termina en conector (y, de, la, el…): pasa al siguiente.
// Palabras de ÉNFASIS (eventos.json → "enfasis"): salen SOLAS, ~2× más grandes, en color acento, con un golpe rápido.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {R} from './RefEstilo';
import {CUT, D, E, FPS, SIDE, W, Word, enGancho, font, stroke, topLibre} from '../theme';

type Chunk = {words: Word[]; from: number; to: number; enf?: boolean};
const S = E.subtitulos;
const LEAD = 1; // cuadros de adelanto de cada palabra (se percibe en sincronía con la voz)
const CONECTORES = new Set(['y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las', 'a', 'al', 'en', 'con', 'por', 'para', 'que', 'un', 'una',
  'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'lo', 'le', 'les', 'me', 'te', 'se', 'nos', 'no', 'es', 'muy', 'más', 'como', 'sobre', 'pero']);
const bare = (t: string) => t.toLowerCase().replace(/[^\wáéíóúñü]/g, '');
const fr = (w: Word) => Math.round(w.start * FPS) - LEAD;

const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const soloConectores = (ws: Word[]) => ws.length > 0 && ws.every((x) => CONECTORES.has(bare(x.text)));
  const flush = (carry = false) => {
    // al cortar por tamaño, los conectores finales se van al siguiente bloque ("UNIVERSIDADES Y" → "UNIVERSIDADES" / "Y HOY POR FIN");
    // si el bloque es puro conector ("PARA QUE LO"), no se corta: sigue creciendo (límite suave) para que nunca quede un conector solo
    let keep: Word[] = [];
    if (carry) {
      if (soloConectores(cur) && cur.length < 3) return; // con 3 conectores ya se lee como frase ("DE QUE ME")
      if (soloConectores(cur)) {
        out.push({words: cur, from: 0, to: 0});
        cur = [];
        return;
      }
      while (CONECTORES.has(bare(cur[cur.length - 1].text))) keep = [cur.pop() as Word, ...keep];
    }
    if (cur.length) out.push({words: cur, from: 0, to: 0});
    cur = keep;
  };
  D.words.forEach((w, i) => {
    const prev = D.words[i - 1];
    if (prev && (prev.sec !== w.sec || w.corte)) flush();
    if (w.enf) {
      // conectores sueltos antes del énfasis ("EN" MUCHÍSIMAS) se pegan al bloque anterior de la misma sección
      const last = out[out.length - 1];
      if (soloConectores(cur) && last && !last.enf && last.words[0].sec === cur[0].sec) {
        last.words.push(...cur);
        cur = [];
      }
      flush();
      out.push({words: [w], from: 0, to: 0, enf: true});
      return;
    }
    const chars = cur.reduce((a, x) => a + x.text.length + 1, 0);
    if (cur.length >= S.maxPalabras || chars + w.text.length > S.maxChars) flush(true);
    cur.push(w);
    if (/[.,?!]$/.test(w.text)) flush();
  });
  flush();
  out.forEach((c) => (c.from = fr(c.words[0])));
  out.forEach((c, i) => {
    const natural = Math.round(c.words[c.words.length - 1].end * FPS) + 6;
    const next = out[i + 1];
    c.to = next ? Math.min(next.from, natural + 18) : Math.min(natural, CUT);
    // nunca pasa a la siguiente entrevista: termina donde termina su sección
    const sec = D.secs.find((x) => c.from >= x.a && c.from < x.b);
    if (sec) c.to = Math.min(c.to, sec.b - 1);
  });
  return out;
})();

const ent = (frame: number, at: number, d = 3) =>
  interpolate(frame, [at, at + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.8))});

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  if (enGancho(frame) || frame < R.hookEnd || frame >= CUT) return null;
  const RS = (R as unknown as {subs?: {arriba?: [number, number][]; ocultar?: [number, number][]; top?: number}}).subs;
  if (RS?.ocultar?.some(([a, b]) => frame >= a && frame < b)) return null;
  const arriba = RS?.arriba?.some(([a, b]) => frame >= a && frame < b);
  const BLOQUE = (S as {bloque?: boolean}).bloque; // estilo referencia: la frase completa de golpe, sin palabra por palabra
  // mientras se ve una captura de perfil (public/perfiles/) no hay subtítulos: el perfil va centrado
  if (D.images.some((im) => im.src.startsWith('perfiles/') && frame >= im.a && frame < im.b)) return null;
  const chunk = CHUNKS.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  // si hay una tarjeta (QR) abajo, los subtítulos suben arriba
  const cardBelow = D.images.some((im) => im.pos === 'abajo' && frame >= im.a && frame < im.b);
  if (chunk.enf) {
    const w = chunk.words[0];
    const t = (S.mayus ? w.text.toUpperCase() : w.text).replace(/[.,…]+$/, '');
    const size = Math.min(S.size * 2, Math.floor((W - 2 * 150) / (Math.max(1, t.length) * 0.7)));
    const p = ent(frame, chunk.from, 4);
    const giro = (CHUNKS.indexOf(chunk) % 2 ? 1 : -1) * 3;
    return (
      <AbsoluteFill style={{top: cardBelow ? topLibre(frame) : S.top - size * 0.35, alignItems: 'center'}}>
        <div style={{fontFamily: font(S.fuente), fontWeight: S.peso ?? 900, fontStyle: S.italic ? 'italic' : 'normal', fontSize: size, lineHeight: 1,
          color: E.colores.acento, whiteSpace: 'nowrap', ...stroke(S.contorno * 1.3), textShadow: '0 8px 0 rgba(0,0,0,0.75)',
          transform: `scale(${interpolate(p, [0, 1], [1.8, 1])}) rotate(${giro}deg)`, opacity: Math.min(1, p * 2.5)}}>
          {t}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{top: arriba ? RS?.top ?? 860 : cardBelow ? topLibre(frame) : S.top, alignItems: 'center'}}>
      <div style={{width: W - 2 * SIDE, textAlign: 'center', fontFamily: font(S.fuente), fontWeight: S.peso ?? 400, fontStyle: S.italic ? 'italic' : 'normal',
        fontSize: S.size, lineHeight: 1.02}}>
        {chunk.words.map((w, i) => {
          const t = w.text.replace(/[.,…]+$/, '');
          const at = i === 0 || BLOQUE ? chunk.from : fr(w);
          const p = ent(frame, at);
          return (
            <span key={i} style={{display: 'inline-block', color: w.key ? E.colores.acento : E.colores.texto, ...stroke(S.contorno), textShadow: S.sombra ?? '0 6px 0 rgba(0,0,0,0.6)',
              visibility: frame >= at ? 'visible' : 'hidden', transform: BLOQUE ? undefined : `scale(${interpolate(p, [0, 1], [0.6, 1])})`, opacity: BLOQUE ? interpolate(frame, [at, at + 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1, whiteSpace: 'pre'}}>
              {S.mayus ? t.toUpperCase() : t}
              {i < chunk.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
