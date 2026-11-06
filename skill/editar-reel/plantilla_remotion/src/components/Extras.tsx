// Elementos especiales de estilos concretos (todos opcionales, salen de eventos.json → data.json):
//   montos      → pixel: cifra verde con máquina de escribir (FEySS) · golpe: cifra GRANDE con sacudida y billetes (Rocket Revolution)
//   emojis      → sticker emoji en tarjeta blanca arriba al centro (entrevistas a estudiantes)
//   calendario  → hoja de calendario con día y mes (promos de eventos)
//   gancho.decoracion = "gamer" → esquinas HUD + símbolos △○✕□ flotando durante el gancho (promo esports)
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {D, E, Libre, SAFE, SIDE, W, clamp, font, stroke, topLibre} from '../theme';
import {Marker} from './Overlays';
import {Pos} from './Pos';

const active = <T extends {a: number; b: number}>(list: T[] | undefined, f: number) => (list ?? []).find((x) => f >= x.a && f < x.b);
const idx = <T extends {a: number; b: number}>(list: T[] | undefined, x: T) => (list ?? []).indexOf(x);

const MontoPixel: React.FC = () => {
  const frame = useCurrentFrame();
  const m = active(D.montos, frame);
  if (!m) return null;
  const chars = Math.min(m.texto.length, Math.floor((frame - m.a) / 2) + 1); // 1 letra cada 2 cuadros
  const cursor = Math.floor(frame / 8) % 2 === 0 ? '_' : ' ';
  const out = interpolate(frame, [m.b - 6, m.b], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: m.top ?? 430, alignItems: 'center', opacity: out}}>
      <Pos k={`montos:${idx(D.montos, m)}`} o={m as Libre}>
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
      </Pos>
    </AbsoluteFill>
  );
};

// Rocket Revolution: monto GRANDE con golpe (escala 2.6→1), sacudida, anillo de destello, brillo que barre la cifra
// y ráfaga de billetes/monedas que salen disparados y caen con gravedad. "texto" = cifra, "sub" opcional (MXN).
const BILLETES = ['💵', '💸', '🪙', '💵', '💰', '🪙', '💵', '💸', '🪙', '💵', '💰', '💵', '🪙', '💸'];
const MontoGolpe: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = active(D.montos, frame) as (NonNullable<typeof D.montos>[number] & {sub?: string}) | undefined;
  if (!m) return null;
  const t = frame - m.a;
  const p = spring({frame: t, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  const escala = interpolate(p, [0, 1], [2.6, 1]);
  const out = interpolate(frame, [m.b - 6, m.b], [1, 0], clamp);
  const outS = interpolate(frame, [m.b - 6, m.b], [1, 0.6], clamp);
  const sac = t < 10 ? (10 - t) * 1.6 : 0;
  const sx = Math.sin(t * 2.7) * sac, sy = Math.cos(t * 3.1) * sac;
  const latido = 1 + Math.sin(t / 5) * 0.02 * (t > 12 ? 1 : 0);
  const fs = Math.min(m.size ?? 190, Math.floor((W - 2 * SIDE) / (m.texto.length * 0.5)));
  const brillo = interpolate(t, [6, 26], [-40, 140], clamp);
  const anillo = interpolate(t, [0, 16], [0.2, 2.4], clamp);
  const anilloO = interpolate(t, [0, 16], [0.9, 0], clamp);
  const top = m.top ?? 300;
  const base: React.CSSProperties = {fontFamily: font('Anton'), fontSize: fs, lineHeight: 1.05, whiteSpace: 'pre', letterSpacing: 2};
  return (
    <AbsoluteFill style={{opacity: out, transform: `translate(${sx + ((m as Libre).dx ?? 0)}px, ${sy + ((m as Libre).dy ?? 0)}px)`}}>
      {/* destello */}
      <div style={{position: 'absolute', left: W / 2 - 260, top: top + fs * 0.55 - 260, width: 520, height: 520, borderRadius: '50%',
        border: '18px solid #FFD60A', opacity: anilloO, transform: `scale(${anillo})`, boxShadow: '0 0 60px #FFD60A'}} />
      {/* billetes */}
      {BILLETES.map((e, i) => {
        const ang = (i / BILLETES.length) * Math.PI * 2 + 0.4;
        const v = 26 + (i % 4) * 7;
        const k = Math.max(0, t - 2);
        const x = Math.cos(ang) * v * k * 0.9;
        const y = Math.sin(ang) * v * k * 0.75 + 0.9 * k * k;
        const o = interpolate(k, [0, 3, 30, 42], [0, 1, 1, 0], clamp);
        return (
          <div key={i} style={{position: 'absolute', left: W / 2 - 50 + x, top: top + fs * 0.4 + y, fontSize: 110 + (i % 3) * 26, opacity: o,
            transform: `rotate(${(i % 2 ? 1 : -1) * k * (8 + i)}deg)`}}>{e}</div>
        );
      })}
      <AbsoluteFill style={{top, alignItems: 'center'}}>
        <Pos k={`montos:${idx(D.montos, m)}`} o={{escala: (m as Libre).escala, rot: (m as Libre).rot}}>
        <div style={{position: 'relative', transform: `scale(${escala * outS * latido}) rotate(${interpolate(p, [0, 1], [-12, -3])}deg)`}}>
          {/* capa trasera: contorno negro + sombra dura */}
          <div style={{...base, color: '#0B3D1A', WebkitTextStroke: '22px #000', textShadow: '10px 12px 0 #000'}}>{m.texto}</div>
          {/* capa frontal: verde dinero con brillo que barre */}
          <div style={{...base, position: 'absolute', inset: 0,
            backgroundImage: `linear-gradient(105deg, transparent ${brillo - 18}%, rgba(255,255,255,0.95) ${brillo}%, transparent ${brillo + 18}%), linear-gradient(180deg, #C6FF6B 0%, #3CE36A 48%, #12A54A 100%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{m.texto}</div>
          {m.sub && (
            <div style={{position: 'absolute', left: '50%', bottom: -54, transform: `translateX(-50%) rotate(-2deg) scale(${interpolate(t, [6, 12], [0, 1], clamp)})`, whiteSpace: 'nowrap',
              background: '#FFD60A', color: '#111', fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 44, padding: '4px 18px',
              border: '5px solid #000', boxShadow: '6px 6px 0 #000'}}>{m.sub}</div>
          )}
        </div>
        </Pos>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// estilo.json → "monto": {"estilo": "golpe"} (cifra grande verde con billetes, Rocket Revolution) | "pixel" (FEySS, por defecto)
export const Monto: React.FC = () => (E.monto?.estilo === 'golpe' ? <MontoGolpe /> : <MontoPixel />);

export const EmojiSticker: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const e = active(D.emojis, frame);
  const p = spring({frame: frame - (e?.a ?? 0), fps, config: {damping: 7, stiffness: 260, mass: 0.6}});
  if (!e) return null;
  const out = interpolate(frame, [e.b - 6, e.b], [1, 0], clamp);
  const top = Math.max(...Array.from({length: Math.ceil((e.b - e.a) / 5) + 1}, (_, k) => topLibre(Math.min(e.b - 1, e.a + k * 5))));
  const w = interpolate(frame, [e.a + 5, e.a + 14], [0, 1], clamp);
  return (
    <AbsoluteFill style={{top, alignItems: 'center', opacity: out}}>
      <Pos k={`emojis:${idx(D.emojis, e)}`} o={e as Libre}>
      <div style={{fontSize: 190, lineHeight: 1, transform: `scale(${interpolate(p, [0, 1], [0, 1], clamp)}) rotate(${Math.sin(frame / 5) * 8}deg)`}}>{e.emoji}</div>
      {e.texto && (
        <div style={{marginTop: 14}}>
          <Marker p={w} bg="#fff" color="#111" size={46} rot={3}>{e.texto}</Marker>
        </div>
      )}
      </Pos>
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
      <Pos k={`calendario:${idx(D.calendario, c)}`} o={c as Libre}>
      <div style={{width: 300, borderRadius: 26, overflow: 'hidden', boxShadow: '0 16px 36px rgba(0,0,0,0.45)', transform: `rotate(-4deg) scale(${interpolate(p, [0, 1], [0.3, 1], clamp)})`}}>
        <div style={{background: c.color ?? E.colores.pildora, color: '#fff', fontFamily: font(E.etiqueta.fuente), fontWeight: 900, fontSize: 42, textAlign: 'center', padding: '10px 0'}}>{c.mes}</div>
        <div style={{background: '#fff', color: '#111', fontFamily: font(E.etiqueta.fuente), fontWeight: 900, fontSize: 150, lineHeight: 1.05, textAlign: 'center'}}>{c.dia}</div>
        {c.texto && <div style={{background: '#fff', color: '#555', fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 30, textAlign: 'center', paddingBottom: 16}}>{c.texto}</div>}
      </div>
      </Pos>
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
