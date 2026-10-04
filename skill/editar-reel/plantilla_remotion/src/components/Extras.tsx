// Elementos especiales de estilos concretos (todos opcionales, salen de eventos.json → data.json):
//   montos      → cifra en pixel verde con máquina de escribir y cursor "_" (FEySS: ¿cuánto esperas ganar?)
//   emojis      → sticker emoji en tarjeta blanca arriba al centro (entrevistas a estudiantes)
//   calendario  → hoja de calendario con día y mes (promos de eventos)
//   gancho.decoracion = "gamer" → esquinas HUD + símbolos △○✕□ flotando durante el gancho (promo esports)
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {D, E, SAFE, SIDE, W, clamp, font, stroke, topLibre} from '../theme';

const active = <T extends {a: number; b: number}>(list: T[] | undefined, f: number) => (list ?? []).find((x) => f >= x.a && f < x.b);

export const Monto: React.FC = () => {
  const frame = useCurrentFrame();
  const m = active(D.montos, frame);
  if (!m) return null;
  const chars = Math.min(m.texto.length, Math.floor((frame - m.a) / 2) + 1); // 1 letra cada 2 cuadros
  const cursor = Math.floor(frame / 8) % 2 === 0 ? '_' : ' ';
  const out = interpolate(frame, [m.b - 6, m.b], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: m.top ?? 430, alignItems: 'center', opacity: out}}>
      <div
        style={{
          maxWidth: W - 2 * SIDE,
          fontFamily: font('Silkscreen'),
          fontWeight: 700,
          // se ajusta al ancho seguro (Silkscreen ≈ 0.78 em por carácter, + cursor)
          fontSize: Math.min(m.size ?? 92, Math.floor((W - 2 * SIDE) / ((m.texto.length + 1) * 0.78))),
          color: m.color ?? '#3CFF3C',
          ...stroke(10, '#0B2A0B'),
          textShadow: `0 0 18px ${m.color ?? '#3CFF3C'}, 0 0 36px ${m.color ?? '#3CFF3C'}88`,
          whiteSpace: 'pre',
          textAlign: 'center',
        }}
      >
        {m.texto.slice(0, chars)}
        {cursor}
      </div>
    </AbsoluteFill>
  );
};

export const EmojiSticker: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const e = active(D.emojis, frame);
  const p = spring({frame: frame - (e?.a ?? 0), fps, config: {damping: 8, stiffness: 240, mass: 0.6}});
  if (!e) return null;
  const out = interpolate(frame, [e.b - 6, e.b], [1, 0], clamp);
  const top = Math.max(...Array.from({length: Math.ceil((e.b - e.a) / 5) + 1}, (_, k) => topLibre(Math.min(e.b - 1, e.a + k * 5))));
  return (
    <AbsoluteFill style={{top, alignItems: 'center', opacity: out}}>
      <div
        style={{
          background: '#fff',
          borderRadius: 40,
          padding: e.texto ? '18px 34px 14px' : '18px 26px',
          boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
          textAlign: 'center',
          transform: `scale(${interpolate(p, [0, 1], [0.3, 1], clamp)}) rotate(${Math.sin(frame / 6) * 3}deg)`,
        }}
      >
        <div style={{fontSize: 150, lineHeight: 1}}>{e.emoji}</div>
        {e.texto && <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 34, color: '#111', marginTop: 6}}>{e.texto}</div>}
      </div>
    </AbsoluteFill>
  );
};

export const Calendario: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = active(D.calendario, frame);
  const p = spring({frame: frame - (c?.a ?? 0), fps, config: {damping: 9, stiffness: 220, mass: 0.7}});
  if (!c) return null;
  const out = interpolate(frame, [c.b - 6, c.b], [1, 0], clamp);
  return (
    // arriba, en el espacio libre (no tapa la cara); `top` en eventos.json para moverlo
    <AbsoluteFill style={{top: c.top ?? topLibre(c.a) + 20, alignItems: 'center', opacity: out}}>
      <div style={{width: 300, borderRadius: 26, overflow: 'hidden', boxShadow: '0 16px 36px rgba(0,0,0,0.45)', transform: `rotate(-4deg) scale(${interpolate(p, [0, 1], [0.3, 1], clamp)})`}}>
        <div style={{background: c.color ?? E.colores.pildora, color: '#fff', fontFamily: font(E.etiqueta.fuente), fontWeight: 900, fontSize: 42, textAlign: 'center', padding: '10px 0'}}>{c.mes}</div>
        <div style={{background: '#fff', color: '#111', fontFamily: font(E.etiqueta.fuente), fontWeight: 900, fontSize: 150, lineHeight: 1.05, textAlign: 'center'}}>{c.dia}</div>
        {c.texto && <div style={{background: '#fff', color: '#555', fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 30, textAlign: 'center', paddingBottom: 16}}>{c.texto}</div>}
      </div>
    </AbsoluteFill>
  );
};

const SYMBOLS = ['△', '○', '✕', '□'];
export const Gamer: React.FC = () => {
  const frame = useCurrentFrame();
  if (D.hook?.decoracion !== 'gamer' || frame >= D.hookEnd + 8) return null;
  const k = interpolate(frame, [0, 8, D.hookEnd - 4, D.hookEnd + 8], [0, 1, 1, 0], clamp);
  const c = E.colores.acento;
  const corner = (x: number, y: number, rx: number, ry: number) => (
    <div style={{position: 'absolute', left: x, top: y, width: 90, height: 90, borderColor: c, borderStyle: 'solid', borderWidth: 0,
      [ry < 0 ? 'borderTopWidth' : 'borderBottomWidth']: 8, [rx < 0 ? 'borderLeftWidth' : 'borderRightWidth']: 8,
      transform: `translate(${(1 - k) * rx * 40}px, ${(1 - k) * ry * 40}px)`, filter: `drop-shadow(0 0 10px ${c})`} as React.CSSProperties} />
  );
  return (
    <AbsoluteFill style={{opacity: k}}>
      {corner(SAFE.left - 20, SAFE.top - 20, -1, -1)}
      {corner(W - SAFE.right - 70, SAFE.top - 20, 1, -1)}
      {corner(SAFE.left - 20, SAFE.bottom - 70, -1, 1)}
      {corner(W - SAFE.right - 70, SAFE.bottom - 70, 1, 1)}
      {Array.from({length: 10}, (_, i) => {
        const x = SAFE.left + ((i * 197) % (W - SAFE.left - SAFE.right - 60));
        const y = SAFE.top + 60 + ((i * 331 + frame * (1.2 + (i % 3) * 0.4)) % (SAFE.bottom - SAFE.top - 120));
        return (
          <div key={i} style={{position: 'absolute', left: x, top: SAFE.bottom - (y - SAFE.top), fontSize: 46 + (i % 3) * 14, color: '#fff', opacity: 0.35 + (i % 2) * 0.25, transform: `rotate(${frame * (i % 2 ? 2 : -2)}deg)`, textShadow: `0 0 12px ${c}`}}>
            {SYMBOLS[i % 4]}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
