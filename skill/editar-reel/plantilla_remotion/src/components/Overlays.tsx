// Elementos sobre el video. Todos dentro de la zona segura (SAFE) y los bloques centrados con márgenes simétricos.
import React from 'react';
import {AbsoluteFill, Audio, Easing, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera} from './Camera';
import {CIERRE_LEN, CUT, D, E, H, SAFE, SIDE, W, clamp, font, secAt, stroke, topLibre} from '../theme';

const useSpan = (a: number, b: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - a, fps, config: {damping: 10, stiffness: 240, mass: 0.6}});
  const out = interpolate(frame, [b - 6, b], [1, 0], clamp);
  return {p, out};
};

/* ---------- contador de objetos (secciones con `contador`) ---------- */
export const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if ((D.hook && frame < D.hookEnd) || frame >= CUT) return null;
  const s = secAt(frame);
  if (!s.contador) return null;
  const color = s.contador.color ?? s.color ?? E.colores.a;
  const evs = D.items.filter((i) => i.sec === s.id).map((i) => i.f);
  const n = evs.filter((e) => frame >= e).length;
  const last = [...evs].reverse().find((e) => frame >= e);
  const bump = last !== undefined ? spring({frame: frame - last, fps, config: {damping: 8, stiffness: 300, mass: 0.5}}) : 1;
  const enter = spring({frame: frame - Math.max(s.a, D.hookEnd), fps, config: {damping: 12, stiffness: 200}});
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
        <span style={{fontFamily: font(E.contador.fuente), fontSize: 34, color: '#222', lineHeight: 1}}>
          {E.contador.titulo}
          <br />
          <span style={{fontSize: 24, color}}>{s.contador.label}</span>
        </span>
        <span style={{fontFamily: font(E.contador.fuente_num), fontSize: 76, color, minWidth: 96, textAlign: 'center', display: 'inline-block', transform: `scale(${interpolate(bump, [0, 1], [1.5, 1], clamp)})`}}>
          {n}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- insignia de cámara rápida (debajo del contador) ---------- */
export const FastBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const r = D.fast.find(([a, b]) => frame >= a && frame < b);
  const {p, out} = useSpan(r ? r[0] : 0, r ? r[1] : 0);
  if (!r) return null;
  const hasCounter = !!secAt(frame).contador;
  return (
    <AbsoluteFill style={{top: SAFE.top + (hasCounter ? 140 : 10), left: SAFE.left, alignItems: 'flex-start', opacity: out}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, background: E.colores.acento, borderRadius: 18, border: '5px solid #111', padding: '6px 18px 2px', boxShadow: '5px 7px 0 rgba(0,0,0,0.8)', transform: `rotate(-2deg) scale(${interpolate(p, [0, 1], [0.3, 1], clamp)})`}}>
        <span style={{fontFamily: font('Bungee'), fontSize: 56, color: '#111', opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0.35, letterSpacing: -10}}>▶▶</span>
        <span style={{fontFamily: font('Bungee'), fontSize: 56, color: '#E53935'}}>x2</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- etiqueta de nombre (arriba a la derecha) ---------- */
export const NameTag: React.FC = () => {
  const frame = useCurrentFrame();
  const t = D.names.find((x) => frame >= x.a && frame < x.b);
  const {p, out} = useSpan(t?.a ?? 0, t?.b ?? 0);
  if (!t) return null;
  const color = t.color ?? secAt(t.a).color ?? E.colores.pildora;
  return (
    <AbsoluteFill style={{top: SAFE.top + 10, right: SAFE.right, left: 'auto', width: 440, alignItems: 'flex-end', opacity: out}}>
      <div style={{background: color, borderRadius: 16, padding: '6px 22px 10px', border: '5px solid #fff', boxShadow: '5px 7px 0 rgba(0,0,0,0.8)', textAlign: 'right', transform: `rotate(3deg) scale(${interpolate(p, [0, 1], [0.4, 1], clamp)})`}}>
        <div style={{fontFamily: font(E.nombre.fuente), fontSize: 62, color: '#fff', lineHeight: 1}}>{t.nombre}</div>
        {t.sub && <div style={{fontFamily: font(E.nombre.sub_fuente), fontSize: 28, color: E.colores.acento}}>{t.sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- etiqueta centrada bajo los subtítulos (carrera, escuela, dato) ---------- */
export const Labels: React.FC = () => {
  const frame = useCurrentFrame();
  const t = D.labels.find((x) => frame >= x.a && frame < x.b);
  const {p, out} = useSpan(t?.a ?? 0, t?.b ?? 0);
  if (!t) return null;
  const L = E.etiqueta;
  return (
    <AbsoluteFill style={{top: L.top, alignItems: 'center', opacity: out}}>
      <div style={{maxWidth: W - 2 * SIDE, fontFamily: font(L.fuente), fontWeight: L.peso ?? 900, fontSize: L.size, color: L.color ?? '#fff', background: t.color ?? L.bg ?? E.colores.pildora, padding: '10px 26px', borderRadius: 40, textAlign: 'center', transform: `scale(${interpolate(p, [0, 1], [0.6, 1], clamp)})`, boxShadow: '0 6px 14px rgba(0,0,0,0.35)'}}>
        {t.texto}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- imágenes: logos (arriba/centro) y tarjetas QR (abajo) ---------- */
export const Images: React.FC = () => {
  const frame = useCurrentFrame();
  const im = D.images.find((x) => frame >= x.a && frame < x.b);
  const {p, out} = useSpan(im?.a ?? 0, im?.b ?? 0);
  if (!im) return null;
  // arriba: debajo de lo que ocupe la parte superior en CUALQUIER momento de su duración (no salta)
  const libre = Math.max(...Array.from({length: Math.ceil((im.b - im.a) / 5) + 1}, (_, k) => topLibre(Math.min(im.b - 1, im.a + k * 5))));
  const top = im.pos === 'arriba' ? libre : im.pos === 'centro' ? 620 : 770;
  const img = <Img src={staticFile(im.src)} style={{width: im.ancho, display: 'block', margin: '0 auto'}} />;
  return (
    <AbsoluteFill style={{top, alignItems: 'center', opacity: out}}>
      <div style={{maxWidth: W - 2 * SIDE, transform: `scale(${interpolate(p, [0, 1], [0.5, 1], clamp)})`}}>
        {im.tarjeta ? (
          <div style={{background: '#fff', borderRadius: 34, padding: '26px 30px', boxShadow: '0 12px 30px rgba(0,0,0,0.4)', textAlign: 'center'}}>
            {im.titulo && <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 30, color: '#777', marginBottom: 6}}>{im.titulo}</div>}
            {im.texto && <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 40, color: '#111', marginBottom: 16}}>{im.texto}</div>}
            {img}
          </div>
        ) : (
          img
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- transición "VS" / cambio de persona ---------- */
export const Transition: React.FC<{texto: string; a: string; b: string; len: number}> = ({texto, a, b, len}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inP = interpolate(frame, [0, 6], [-1, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  const outP = interpolate(frame, [len - 6, len], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const vs = spring({frame: frame - 3, fps, config: {damping: 7, stiffness: 300, mass: 0.6}});
  return (
    <AbsoluteFill style={{transform: `translateX(${(inP + outP) * W}px)`}}>
      <AbsoluteFill style={{background: `linear-gradient(115deg, ${a} 0 48%, #111 48% 52%, ${b} 52% 100%)`}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{fontFamily: font(E.transicion.fuente), fontSize: 300, color: E.colores.acento, ...stroke(14), transform: `scale(${interpolate(vs, [0, 1], [3, 1], clamp)})`}}>VS</div>
        {texto && <div style={{fontFamily: font(E.transicion.texto_fuente), fontSize: 90, color: '#fff', ...stroke(10)}}>{texto}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- b-roll (solo si aporta: nunca tapar el objeto del que se habla) ---------- */
export const BRoll: React.FC<{src: string; len: number}> = ({src, len}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: k}}>
      <OffthreadVideo src={staticFile(src)} muted style={{width: W, height: H, objectFit: 'cover', transform: `scale(${interpolate(frame, [0, len], [1.1, 1])})`}} />
    </AbsoluteFill>
  );
};

/* ---------- cierre opcional (entrevistas): último cuadro desenfocado + pregunta + CTA ---------- */
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!D.cierre) return null;
  const p = spring({frame: frame - 3, fps, config: {damping: 11, stiffness: 200}});
  const q = spring({frame: frame - 14, fps, config: {damping: 10, stiffness: 220}});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(16px) brightness(0.5)', transform: 'scale(1.08)'}}>
        <Freeze frame={CUT - 1}>
          <Camera />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34}}>
        <div style={{width: W - 2 * SIDE, textAlign: 'center', fontFamily: font(E.cierre.fuente), fontWeight: E.cierre.peso ?? 900, fontStyle: E.cierre.italic ? 'italic' : 'normal', fontSize: 84, lineHeight: 1.05, color: '#fff', textShadow: '7px 7px 0 #000', transform: `scale(${interpolate(p, [0, 1], [0.6, 1], clamp)})`, opacity: Math.min(1, p * 2)}}>
          {D.cierre.pregunta}
        </div>
        {D.cierre.cta && (
          <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 44, color: '#111', background: E.colores.acento, padding: '12px 30px', borderRadius: 40, transform: `scale(${interpolate(q, [0, 1], [0.4, 1], clamp)})`, opacity: Math.min(1, q * 2)}}>
            {D.cierre.cta}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- sonido: SFX + música opcional ---------- */
export const Sound: React.FC = () => (
  <>
    {D.sfx.map((s, i) => (
      <Sequence key={i} from={s.f} durationInFrames={Math.max(1, s.len)}>
        <Audio src={staticFile(`sfx/${s.src}.wav`)} volume={s.v} />
      </Sequence>
    ))}
    {D.musica && (
      <Sequence durationInFrames={CUT + CIERRE_LEN}>
        <Audio src={staticFile(D.musica.src)} volume={D.musica.vol ?? 0.12} />
      </Sequence>
    )}
  </>
);
