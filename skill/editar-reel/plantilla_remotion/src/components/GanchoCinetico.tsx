// Gancho de tipografía cinética (estilo vlog). Se activa cuando src/vlog.json trae "gancho" (lo genera `vlog.py datos`
// desde edicion/vlog.json). Cada línea entra de golpe (3 cuadros) cuando se dice; cada escena se reemplaza con un zoom
// que atraviesa el texto. Golpes = sacudida + destello; zooms = golpes de cámara; partículas = confeti; franja = cierre.
// Roles de línea → tipografía de la variante: chico | grande | acento | script | medio | numero.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {D, VLOG, W, clamp, derivado, font, stroke} from '../theme';

type Linea = {t: string; f: number; rol: string; color?: string; sombra?: string; desde?: 'grande' | 'izq' | 'der' | 'arriba'; rot?: number; size?: number; mt?: number};
type Escena = {a: number; b: number; top?: number; lineas: Linea[]};
export type GanchoV = {
  variante?: string; escenas: Escena[]; zooms?: number[]; golpes?: {f: number; flash?: number; sacudida?: number}[];
  particulas?: number; franja?: {t: string; f: number};
};
export const GV = derivado(() => (VLOG as {gancho?: GanchoV}).gancho);

type Fnt = {f: string; peso?: number; italic?: boolean; cw?: number};
type Var = {key: string; acc: string; sh: string; sh2: string; txt: string; strip: string; stripTxt: string; extra: string;
  chico: Fnt; grande: Fnt; acento: Fnt; script: Fnt; medio: Fnt};
// paletas probadas con el creador; "limpio" es la que eligió (IEEE ESCOM)
export const VARIANTES: Record<string, Var> = {
  limpio: {key: '#FFD60A', acc: '#FFD60A', sh: '#000', sh2: '#000', txt: '#fff', strip: '#FFD60A', stripTxt: '#111', extra: '#fff',
    chico: {f: 'Montserrat', peso: 900, italic: true, cw: 0.8}, grande: {f: 'Anton', cw: 0.46}, acento: {f: 'Anton', cw: 0.46},
    script: {f: 'Montserrat', peso: 800, italic: true}, medio: {f: 'Anton', cw: 0.5}},
  neon: {key: '#FFE500', acc: '#FF3D9A', sh: '#7B2CFF', sh2: '#3A0CA3', txt: '#fff', strip: '#7B2CFF', stripTxt: '#fff', extra: '#00E5FF',
    chico: {f: 'Montserrat', peso: 900, italic: true, cw: 0.8}, grande: {f: 'Anton', cw: 0.46}, acento: {f: 'Righteous', cw: 0.62},
    script: {f: 'Pacifico'}, medio: {f: 'Bangers', cw: 0.5}},
  electrico: {key: '#00F0FF', acc: '#FF2BD6', sh: '#2A0A5E', sh2: '#2A0A5E', txt: '#fff', strip: '#FF2BD6', stripTxt: '#fff', extra: '#FFE500',
    chico: {f: 'Bungee', cw: 0.8}, grande: {f: 'Anton', cw: 0.46}, acento: {f: 'Rubik Mono One', cw: 0.86}, script: {f: 'Lobster'}, medio: {f: 'Bungee', cw: 0.78}},
  calido: {key: '#FF8A00', acc: '#FF8A00', sh: '#8B1A1A', sh2: '#5A0F0F', txt: '#fff', strip: '#FF8A00', stripTxt: '#fff', extra: '#FFD60A',
    chico: {f: 'Bowlby One', cw: 0.8}, grande: {f: 'Anton', cw: 0.46}, acento: {f: 'Caveat Brush', cw: 0.45}, script: {f: 'Yellowtail'}, medio: {f: 'Bowlby One', cw: 0.75}},
};
const GVv = GV;
const VAR = derivado(() => VARIANTES[GV()?.variante ?? 'limpio'] ?? VARIANTES.limpio);
const col = (c?: string, def = VAR().txt) => {
  const V = VAR();
  return (!c ? def : c === 'key' ? V.key : c === 'acc' ? V.acc : c === 'txt' ? V.txt : c);
};
const sombra = (c: string | undefined, px: number) => (c === 'none' ? undefined : `${px}px ${px}px 0 ${c === 'sh2' ? VAR().sh2 : c && c !== 'sh' ? c : VAR().sh}`);

const fast = {...clamp, easing: Easing.out(Easing.cubic)};
const hit = (f: number, at: number, d = 3) => interpolate(f, [at, at + d], [0, 1], fast);
const fill = (txt: string, cw: number, max: number, w = 780) => Math.min(max, Math.floor(w / (Math.max(1, txt.length) * cw)));

// golpes de cámara del gancho (los usa Reel.tsx sobre el video)
export const hookCam = (f: number) => {
  const GV = GVv();
  if (!GV || f > D.hookEnd + 8) return 1;
  let s = 0;
  for (const p of GV.zooms ?? []) if (f >= p && f < p + 12) s = Math.max(s, interpolate(f, [p, p + 12], [0.16, 0], fast));
  return 1 + s + interpolate(f, [0, D.hookEnd, D.hookEnd + 8], [0, 0.08, 0], clamp);
};

const Word: React.FC<{l: Linea; f: number}> = ({l, f}) => {
  const V = VAR();
  const fn: Fnt = (V as unknown as Record<string, Fnt>)[l.rol === 'numero' ? 'grande' : l.rol] ?? V.grande;
  const size =
    l.size ??
    (l.rol === 'numero' ? 720 : l.rol === 'grande' ? fill(l.t, fn.cw ?? 0.46, 260) : l.rol === 'medio' ? fill(l.t, fn.cw ?? 0.6, 240)
      : l.rol === 'acento' ? fill(l.t, fn.cw ?? 0.6, 150) : l.rol === 'script' ? 130 : fill(l.t, fn.cw ?? 0.8, 140));
  const grandeRol = l.rol === 'grande' || l.rol === 'numero';
  if (f < l.f) return <div style={{height: size * 0.95, marginTop: l.mt ?? 0}} />;
  const p = hit(f, l.f);
  const q = 1 - p;
  const d = l.desde ?? 'grande';
  const tr = d === 'izq' ? `translateX(${q * -700}px)` : d === 'der' ? `translateX(${q * 700}px)` : d === 'arriba' ? `translateY(${q * -400}px)` : `scale(${1 + q * 1.4})`;
  return (
    <div style={{fontFamily: font(fn.f), fontWeight: fn.peso ?? 400, fontStyle: fn.italic ? 'italic' : 'normal', fontSize: size, lineHeight: 0.95,
      color: col(l.color), ...stroke(l.rol === 'numero' ? 16 : grandeRol ? 12 : 10, '#000'),
      textShadow: grandeRol || l.sombra ? sombra(l.sombra, l.rol === 'numero' ? 18 : 10) : undefined, whiteSpace: 'nowrap', marginTop: l.mt ?? 0,
      transform: `${tr} rotate(${l.rot ?? 0}deg)`, opacity: Math.min(1, p * 2.5), filter: q > 0.05 ? `blur(${q * 10}px)` : undefined}}>
      {l.t}
    </div>
  );
};

const Particulas: React.FC<{f: number; at: number}> = ({f, at}) => {
  const t = f - at;
  if (t < 0 || t > 16) return null;
  const V = VAR();
  const cols = [V.key, '#fff', V.acc, V.sh === '#000' ? V.key : V.sh, V.extra];
  return (
    <>
      {Array.from({length: 34}, (_, i) => {
        const ang = random(`a${i}`) * Math.PI * 2;
        const d = (28 + random(`v${i}`) * 38) * t * (1 - t / 50);
        const s = 10 + random(`s${i}`) * 22;
        return <div key={i} style={{position: 'absolute', left: W / 2 + Math.cos(ang) * d - s / 2, top: 1130 + Math.sin(ang) * d + t * t * 0.6 - s / 2, width: s,
          height: s * (i % 3 ? 1 : 0.4), background: cols[i % 5], transform: `rotate(${t * 25 + i * 40}deg)`, opacity: interpolate(t, [10, 16], [1, 0], clamp)}} />;
      })}
    </>
  );
};

export const GanchoCinetico: React.FC = () => {
  const f = useCurrentFrame();
  const GV = GVv();
  const V = VAR();
  if (!GV || f >= D.hookEnd + 1) return null;
  const end = interpolate(f, [D.hookEnd - 3, D.hookEnd], [1, 0], clamp);
  let amp = 0;
  let flash = 0;
  for (const g of GV.golpes ?? []) {
    if (f >= g.f && f < g.f + 9) amp += (1 - (f - g.f) / 9) * (g.sacudida ?? 0);
    if (f >= g.f) flash = Math.max(flash, interpolate(f, [g.f, g.f + 6], [g.flash ?? 0, 0], clamp));
  }
  const sx = (random(`x${f}`) - 0.5) * amp;
  const sy = (random(`y${f}`) - 0.5) * amp;
  const esc = GV.escenas.find((e) => f >= e.a && f < e.b) ?? (f < GV.escenas[0].a ? undefined : GV.escenas[GV.escenas.length - 1]);
  if (!esc) return null;
  const fin = Math.min(esc.b, D.hookEnd);
  const zin = interpolate(f, [fin - 3, fin], [1, 1.7], clamp) * (fin > esc.a ? interpolate(f, [esc.a, fin], [1, 1.07], clamp) : 1);
  const zop = interpolate(f, [fin - 3, fin], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: end}}>
      <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) scale(${zin})`, transformOrigin: '50% 58%', opacity: f < D.hookEnd ? zop : 1}}>
        <div style={{position: 'absolute', left: 0, width: W, top: esc.top ?? 930, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {esc.lineas.map((l, i) => <Word key={i} l={l} f={f} />)}
          {GV.franja && f >= GV.franja.f && f >= esc.a && GV.franja.f >= esc.a && (
            <div style={{marginTop: 16, background: V.strip, padding: '6px 34px', transform: `rotate(-3deg) scaleX(${hit(f, GV.franja.f)})`}}>
              <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontStyle: 'italic', fontSize: 88, color: V.stripTxt, letterSpacing: 2}}>{GV.franja.t}</div>
            </div>
          )}
        </div>
        {GV.particulas !== undefined && <Particulas f={f} at={GV.particulas} />}
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
    </AbsoluteFill>
  );
};
