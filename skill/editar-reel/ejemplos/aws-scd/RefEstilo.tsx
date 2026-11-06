// Estilo copiado de referencia.mp4 (video "Google Gemini gratis"): todo sale de src/ref.json (lo genera edicion/ref.py).
//   gancho → palabras-sticker blancas inclinadas ("POR" "FIN"), palabra ancha que entra desenfocada ("VOLVIÓ") y logo con glitch en el pecho
//   logos  → grandes, arriba de la cabeza, entran con desenfoque + escala
//   gratis → texto pixel amarillo que entra con barrido lateral y desenfoque de movimiento
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import ref from '../ref.json';
import {camTransform} from './Camera';
import {H, W, clamp, font, stroke} from '../theme';

type Sticker = {texto: string; at: number; x: number; y: number; rot: number; size: number};
type Ref = {
  hookEnd: number;
  stickers: Sticker[];
  blur: {texto: string; at: number; y: number; size: number} | null;
  glitch: {src: string; at: number; y: number; ancho: number} | null;
  logos: {src: string; a: number; b: number; ancho: number; y: number}[];
  gratis: {texto: string; a: number; b: number; y: number; size: number}[];
  detras?: unknown[];
  pegatinas?: {src: string; a: number; b: number; x: number; y: number; ancho: number; entrada: 'pop' | 'izq' | 'der' | 'abajo'; rot?: number}[];
};
export const R = ref as unknown as Ref;

// paleta SCD2026_elementos.pdf
const NARANJA = '#d85a2f';
const NAVY = '#1e1938';

const salida = (f: number, b: number) => interpolate(f, [b - 4, b], [1, 0], clamp);

export const GanchoRef: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f >= R.hookEnd) return null;
  const out = salida(f, R.hookEnd);
  return (
    <AbsoluteFill style={{opacity: out}}>
      {R.stickers.map((s, i) => {
        if (f < s.at) return null;
        const p = spring({frame: f - s.at, fps, config: {damping: 20, stiffness: 1400, mass: 0.3}});
        return (
          <div key={i} style={{position: 'absolute', left: s.x, top: s.y, transform: `translate(-50%, -50%) rotate(${s.rot}deg) scale(${interpolate(p, [0, 1], [0.7, 1])})`,
            fontFamily: font('Montserrat'), fontWeight: 900, fontSize: s.size, color: '#fff', whiteSpace: 'nowrap', ...stroke(14, NAVY), textShadow: `0 6px 0 ${NAVY}`}}>
            {s.texto}
          </div>
        );
      })}
      {R.blur && f >= R.blur.at && (() => {
        const t = f - R.blur.at;
        const p = spring({frame: t, fps, config: {damping: 11, stiffness: 520, mass: 0.5}});
        const brillo = interpolate(t, [2, 12], [-40, 140], clamp); // destello que cruza la franja
        return (
          <AbsoluteFill style={{top: R.blur.y, alignItems: 'center'}}>
            <div style={{position: 'relative', transform: `rotate(-4deg) scale(${interpolate(p, [0, 1], [2.2, 1])})`, opacity: Math.min(1, t / 2 + 0.2)}}>
              <div style={{background: NARANJA, padding: '6px 40px 14px', borderRadius: 10, border: `8px solid ${NAVY}`, boxShadow: `12px 12px 0 ${NAVY}, 0 0 50px rgba(216,90,47,0.75)`,
                overflow: 'hidden', position: 'relative'}}>
                <div style={{fontFamily: font('Bungee'), fontSize: R.blur.size, lineHeight: 1.05, color: '#fff', whiteSpace: 'nowrap', textShadow: `5px 5px 0 ${NAVY}`}}>{R.blur.texto}</div>
                <div style={{position: 'absolute', top: 0, bottom: 0, left: `${brillo}%`, width: '22%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.75), transparent)', transform: 'skewX(-20deg)'}} />
              </div>
            </div>
          </AbsoluteFill>
        );
      })()}
      {R.glitch && f >= R.glitch.at && (() => {
        const t = f - R.glitch.at;
        // glitch: los primeros 10 cuadros y un segundo golpe corto a los 14–17
        const on = t < 6 || (t >= 12 && t < 14);
        const rnd = (n: number) => (((t + 1) * 9301 + n * 49297) % 233280) / 233280;
        const dx = on ? (rnd(1) - 0.5) * 60 : 0;
        const src = staticFile(R.glitch.src);
        const cortes = on ? [0, 1, 2, 3].map((i) => ({y0: rnd(i + 2) * 80, h: 8 + rnd(i + 7) * 18, sx: (rnd(i + 11) - 0.5) * 120})) : [];
        return (
          <AbsoluteFill style={{top: R.glitch.y, alignItems: 'center'}}>
            <div style={{position: 'relative', width: R.glitch.ancho, transform: `scale(${on && t < 3 ? 1.15 : 1})`}}>
              {on && <Img src={src} style={{position: 'absolute', width: '100%', left: dx - 14, opacity: 0.8, filter: 'brightness(0.6) sepia(1) saturate(8) hue-rotate(-50deg)', mixBlendMode: 'screen'}} />}
              {on && <Img src={src} style={{position: 'absolute', width: '100%', left: -dx + 14, opacity: 0.8, filter: 'brightness(0.6) sepia(1) saturate(8) hue-rotate(140deg)', mixBlendMode: 'screen'}} />}
              <Img src={src} style={{position: 'relative', width: '100%', transform: `translateX(${dx * 0.4}px)`, opacity: on && t % 4 === 2 ? 0.4 : 1,
                filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))'}} />
              {cortes.map((c, i) => (
                <Img key={i} src={src} style={{position: 'absolute', top: 0, width: '100%', left: c.sx, clipPath: `inset(${c.y0}% 0 ${Math.max(0, 100 - c.y0 - c.h)}% 0)`}} />
              ))}
            </div>
          </AbsoluteFill>
        );
      })()}
    </AbsoluteFill>
  );
};

export const LogosRef: React.FC = () => {
  const f = useCurrentFrame();
  const l = R.logos.find((x) => f >= x.a && f < x.b);
  if (!l) return null;
  const k = interpolate(f, [l.a, l.a + 6], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  return (
    <AbsoluteFill style={{top: l.y, alignItems: 'center', opacity: salida(f, l.b)}}>
      <Img src={staticFile(l.src)} style={{width: l.ancho, transform: `scale(${interpolate(k, [0, 1], [1.35, 1])})`, filter: `blur(${(1 - Math.min(1, k)) * 14}px)`,
        opacity: Math.min(1, k * 1.8)}} />
    </AbsoluteFill>
  );
};

export const GratisRef: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const g = R.gratis.find((x) => f >= x.a && f < x.b);
  if (!g) return null;
  const t = f - g.a;
  const p = spring({frame: t, fps, config: {damping: 9, stiffness: 380, mass: 0.6}});
  const sacude = t < 10 ? Math.sin(t * 2.6) * (10 - t) * 1.6 : 0;
  const pulso = 1 + Math.sin(t / 3.2) * 0.035 * Math.min(1, t / 10);
  const glow = 30 + Math.sin(t / 2.5) * 14;
  const brillo = interpolate(t % 30, [4, 18], [-30, 130], clamp);
  const relieve = Array.from({length: 9}, (_, i) => `${i + 1}px ${i + 1}px 0 ${NAVY}`).join(', ');
  const base = {fontFamily: font('Bungee'), fontSize: g.size, lineHeight: 1, whiteSpace: 'nowrap' as const, letterSpacing: 4};
  const chispas = [[-0.08, 0.1], [1.04, 0.0], [0.15, 1.0], [0.9, 1.05], [0.5, -0.12]];
  return (
    <AbsoluteFill style={{top: g.y, alignItems: 'center', opacity: salida(f, g.b)}}>
      <div style={{position: 'relative', transform: `translateX(${sacude}px) rotate(-3deg) scale(${interpolate(p, [0, 1], [3.2, 1]) * pulso})`, filter: `blur(${Math.max(0, 1 - t / 3) * 8}px)`}}>
        {/* contorno + relieve 3D + resplandor */}
        <div style={{...base, color: NAVY, ...stroke(16, NAVY), textShadow: `${relieve}, 0 0 ${glow}px rgba(255,170,40,0.95), 0 0 ${glow * 2}px rgba(216,90,47,0.7)`}}>{g.texto}</div>
        {/* relleno con degradado y destello que lo cruza */}
        <div style={{...base, position: 'absolute', inset: 0, backgroundImage: `linear-gradient(100deg, transparent ${brillo - 12}%, rgba(255,255,255,0.95) ${brillo}%, transparent ${brillo + 12}%), linear-gradient(180deg, #FFE45C 0%, #FFB22E 45%, ${NARANJA} 100%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{g.texto}</div>
        {chispas.map(([x, y], i) => {
          const k = ((t + i * 7) % 20) / 20;
          return <div key={i} style={{position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, fontSize: 70, color: '#FFE45C', textShadow: '0 0 16px #fff',
            transform: `translate(-50%, -50%) scale(${Math.sin(k * Math.PI) * 1.1}) rotate(${k * 90}deg)`, opacity: t > 3 ? 1 : 0}}>✦</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

// Elementos que salen DESDE ATRÁS de la persona y quedan detrás de ella (recortes en public/fg/NNNN.png, cuadro absoluto del corte).
// x,y = posición final (centro); desde = desplazamiento inicial (detrás del cuerpo); rot = giro final; destello al llegar para llamar la atención.
type Detras = {src: string; a: number; b: number; x: number; y: number; ancho: number; desde: [number, number]; rot?: number};
export const DetrasItems: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items = (R.detras ?? []) as Detras[];
  return (
    <AbsoluteFill>
      {items.filter((d) => f >= d.a && f < d.b).map((d, i) => {
        const t = f - d.a;
        const p = spring({frame: t, fps, config: {damping: 11, stiffness: 240, mass: 0.6}});
        const flota = Math.sin(t / 9) * 5;
        const flash = interpolate(t, [5, 9, 16], [0, 1, 0], clamp);
        return (
          <div key={i} style={{position: 'absolute', left: d.x, top: d.y, width: d.ancho, opacity: salida(f, d.b),
            transform: `translate(-50%, -50%) translate(${(1 - p) * d.desde[0]}px, ${(1 - p) * d.desde[1] + flota}px) scale(${interpolate(p, [0, 1], [0.35, 1])}) rotate(${(d.rot ?? 0) * p}deg)`}}>
            <Img src={staticFile(d.src)} style={{width: '100%', filter: `drop-shadow(0 0 ${8 + flash * 30}px rgba(255,214,120,${0.35 + flash * 0.6})) drop-shadow(0 10px 14px rgba(0,0,0,0.35))`}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
export const PersonaDelante: React.FC = () => {
  const f = useCurrentFrame();
  if (!((R.detras ?? []) as Detras[]).some((d) => f >= d.a && f < d.b)) return null;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: camTransform(f)}}>
        <Img src={staticFile(`fg/${String(f).padStart(4, '0')}.png`)} style={{width: W, height: H}} />
      </div>
    </AbsoluteFill>
  );
};

// Ilustraciones del kit SCD2026 (xolos, nube, Ángel, pan de muerto…): x,y = centro; entran con pop, desde un lado o desde abajo y flotan suave
export const Pegatinas: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      {(R.pegatinas ?? []).filter((g) => f >= g.a && f < g.b).map((g, i) => {
        const p = spring({frame: f - g.a, fps, config: {damping: 12, stiffness: 320, mass: 0.6}});
        const o = interpolate(f, [g.b - 5, g.b], [1, 0], clamp);
        const dx = g.entrada === 'izq' ? (1 - p) * -700 : g.entrada === 'der' ? (1 - p) * 700 : 0;
        const dy = g.entrada === 'abajo' ? (1 - p) * 900 : 0;
        const sc = g.entrada === 'pop' ? interpolate(p, [0, 1], [0.2, 1]) : 1;
        const flota = Math.sin((f - g.a) / 9) * 6;
        return (
          <Img key={i} src={staticFile(g.src)} style={{position: 'absolute', left: g.x, top: g.y, width: g.ancho, opacity: o,
            transform: `translate(-50%, -50%) translate(${dx}px, ${dy + flota}px) scale(${sc}) rotate(${(g.rot ?? 0) + (1 - p) * (g.entrada === 'pop' ? -15 : 0)}deg)`,
            filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.35))'}} />
        );
      })}
    </AbsoluteFill>
  );
};

// Foto a pantalla completa (estilo de las capturas de la referencia): entra con zoom rápido + destello, Ken Burns lento
type FotoFull = {src: string; a: number; b: number; cx?: number};
export const FotoFullRef: React.FC = () => {
  const f = useCurrentFrame();
  const fotos = ((R as unknown as {fotos?: FotoFull[]}).fotos ?? []);
  const g = fotos.find((x) => f >= x.a && f < x.b);
  if (!g) return null;
  const t = f - g.a, len = g.b - g.a;
  const z = interpolate(t, [0, 5, len], [1.6, 1.22, 1.08], {...clamp, easing: Easing.out(Easing.cubic)});
  const flash = interpolate(t, [0, 2, 6], [0.9, 0.6, 0], clamp);
  return (
    <AbsoluteFill style={{overflow: 'hidden', opacity: interpolate(f, [g.b - 3, g.b], [1, 0], clamp)}}>
      <Img src={staticFile(g.src)} style={{width: W, height: H, objectFit: 'cover', objectPosition: `${(g.cx ?? 0.5) * 100}% 50%`, transform: `scale(${z})`, filter: `blur(${Math.max(0, 1 - t / 4) * 10}px)`}} />
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
    </AbsoluteFill>
  );
};

// Tarjeta QR de registro (marca SCD2026)
type QR = {src: string; a: number; b: number; y: number; qr: number; titulo: string; pie: string};
export const QRRef: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const q = (R as unknown as {qr?: QR}).qr;
  if (!q || f < q.a || f >= q.b) return null;
  const t = f - q.a;
  const p = spring({frame: t, fps, config: {damping: 12, stiffness: 260, mass: 0.6}});
  const glow = 18 + Math.sin(t / 4) * 10;
  return (
    <AbsoluteFill style={{top: q.y, alignItems: 'center'}}>
      <div style={{transform: `translateY(${(1 - p) * -520}px) rotate(${(1 - p) * 8}deg)`, opacity: salida(f, q.b), background: '#fff', borderRadius: 34, border: `8px solid ${NAVY}`,
        boxShadow: `10px 10px 0 ${NAVY}, 0 0 ${glow}px rgba(216,90,47,0.8)`, overflow: 'hidden', width: q.qr + 70}}>
        <div style={{background: NARANJA, color: '#fff', fontFamily: font('Bungee'), fontSize: 34, textAlign: 'center', padding: '8px 0 4px', textShadow: `3px 3px 0 ${NAVY}`}}>{q.titulo}</div>
        <Img src={staticFile(q.src)} style={{display: 'block', width: q.qr, height: q.qr, margin: q.pie ? '22px auto 10px' : '18px auto'}} />
        {q.pie && <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 21, color: NAVY, textAlign: 'center', paddingBottom: 18, whiteSpace: 'nowrap'}}>{q.pie}</div>}
      </div>
    </AbsoluteFill>
  );
};

// Caja de comentario: se escribe la palabra letra por letra (con teclado), botón de enviar con golpe
type Comentario = {a: number; b: number; y: number; texto: string; letras: number[]; enviar: number};
export const ComentarioRef: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = (R as unknown as {comentario?: Comentario}).comentario;
  if (!c || f < c.a || f >= c.b) return null;
  const t = f - c.a;
  const p = spring({frame: t, fps, config: {damping: 12, stiffness: 300, mass: 0.5}});
  const n = c.letras.filter((x) => f >= x).length;
  const escrito = c.texto.slice(0, n);
  const cursor = Math.floor(t / 8) % 2 === 0;
  const s = spring({frame: f - c.enviar, fps, config: {damping: 8, stiffness: 300, mass: 0.5}});
  const enviado = f >= c.enviar;
  const golpe = enviado ? 1 + Math.sin(Math.min(1, (f - c.enviar) / 8) * Math.PI) * 0.12 : 1;
  return (
    <AbsoluteFill style={{top: c.y, alignItems: 'center', opacity: salida(f, c.b)}}>
      <div style={{transform: `scale(${interpolate(p, [0, 1], [0.4, 1]) * golpe})`, display: 'flex', alignItems: 'center', gap: 22, background: '#fff', borderRadius: 80,
        padding: '18px 22px 18px 18px', width: 800, border: `6px solid ${NAVY}`, boxShadow: `8px 8px 0 ${NAVY}, 0 0 ${enviado ? 50 : 0}px rgba(255,180,60,0.9)`}}>
        <div style={{width: 96, height: 96, borderRadius: 48, background: NARANJA, overflow: 'hidden', flexShrink: 0, border: `4px solid ${NAVY}`}}>
          <Img src={staticFile('scd/xolo_frente.png')} style={{width: 120, marginLeft: -12, marginTop: 4}} />
        </div>
        <div style={{flex: 1, fontFamily: font('Bungee'), fontSize: 74, color: n ? NARANJA : '#9a9a9a', whiteSpace: 'nowrap', textShadow: n ? `3px 3px 0 ${NAVY}` : 'none'}}>
          {n ? escrito : <span style={{fontFamily: font('Montserrat'), fontWeight: 600, fontSize: 40}}>Añade un comentario…</span>}
          {!enviado && n > 0 && cursor && <span style={{color: NAVY}}>|</span>}
        </div>
        <div style={{width: 96, height: 96, borderRadius: 48, background: enviado ? NARANJA : '#d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${enviado ? interpolate(s, [0, 1], [1.6, 1]) : 1}) rotate(${enviado ? (1 - s) * 40 : 0}deg)`, flexShrink: 0}}>
          <svg width="52" height="52" viewBox="0 0 24 24"><path d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z" fill="#fff" stroke={NAVY} strokeWidth="1.6" strokeLinejoin="round" /></svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
