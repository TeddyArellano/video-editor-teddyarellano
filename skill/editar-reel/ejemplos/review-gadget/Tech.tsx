// Review de gadget (HAYLOU Solar Lite 2 → Flowbuds N55): todo sale de src/tech.json (lo genera edicion/tech.py).
//   TechBRoll  → tomas de apoyo con entradas distintas: zoom in, zoom out, barrido (whip) y pop
//   Bateria    → HUD del gancho: la pila se descarga de 100 % a 4 % mientras pasan los días
//   Fichas     → ficha técnica tipo HUD (etiqueta + valor grande con esquinas), contador y reloj
//   Checklist / Pasos → funciones y pasos de configuración que se marcan al decirse
//   Titulo     → nombre del producto con efecto "caída" (blanco + amarillo)
//   Capitulos  → barra de capítulos arriba · Bio → flecha "LINK EN MI BIO" · Comentario → se escribe "RELOJ"
import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, getInputProps, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import tech from '../tech.json';
import {H, W, clamp, font} from '../theme';
import {camParams} from './Camera';
import {BioVar, CTA2, ComentarioVar} from './CtaVariantes';

const AMA = '#FFD60A';
const SOMBRA = '5px 5px 0 #000';
type BR = {src: string; a: number; b: number; anim: 'in' | 'out' | 'whip' | 'whipL' | 'pop'; desde: number};
type T = {
  broll: BR[];
  bateria: {a: number; b: number; drena: [number, number]; low: number};
  fichas: {a: number; b: number; label: string; valor: string; sub?: string; sub_en?: number; sub_b?: number; cuenta?: number; fmt?: string; reloj?: boolean}[];
  checklists: {a: number; b: number; titulo: string; items: [string, number][]}[];
  modos?: {a: number; b: number; titulo: string; items: [string, string]; cambio: number};
  chispas?: {f: number; x: number; y: number; s: number}[];
  pasos: {a: number; b: number; items: [string, number][]};
  titulo: {a: number; b: number; l1: string; l2: string; t1: number; t2: number};
  capitulos: {a: number; b: number; items: [string, number][]};
  bio: {a: number; b: number};
  comentario: {a: number; b: number; texto: string; letras: number[]; enviar: number; y: number};
};
const X = tech as unknown as T;
// diseño de los textos de arriba: base (HUD con esquinas) · A cristal · B bloque · C línea  (inputProps.hud o tech.json → hud)
const HUD = ((getInputProps() as {hud?: string}).hud ?? (tech as {hud?: string}).hud ?? 'base') as 'base' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
const ease = Easing.out(Easing.cubic);
const sal = (f: number, b: number, n = 5) => interpolate(f, [b - n, b], [1, 0], clamp);
const sp = (f: number, fps: number, stiff = 260, damp = 14) => spring({frame: f, fps, config: {damping: damp, stiffness: stiff, mass: 0.6}});

/* ---------- tomas de apoyo ---------- */
const UnaToma: React.FC<{b: BR; ultima: boolean}> = ({b, ultima}) => {
  const f = useCurrentFrame();
  const len = b.b - b.a;
  const t = interpolate(f, [0, len], [0, 1], clamp);
  let tr = '';
  let filt = 'none';
  let op = 1;
  if (b.anim === 'in') tr = `scale(${interpolate(t, [0, 1], [1.02, 1.16], {easing: Easing.inOut(Easing.quad)})})`;
  if (b.anim === 'out') tr = `scale(${interpolate(f, [0, Math.min(len, 14), len], [1.32, 1.08, 1.02], {...clamp, easing: Easing.out(Easing.cubic)})})`;
  if (b.anim === 'whip' || b.anim === 'whipL') {
    const k = interpolate(f, [0, 6], [1, 0], {...clamp, easing: ease});
    const s = b.anim === 'whip' ? 1 : -1;
    tr = `translateX(${s * k * W * 0.9}px) scale(${1.06 + 0.06 * t})`;
    filt = k > 0.02 ? `blur(${k * 24}px)` : 'none';
  }
  if (b.anim === 'pop') {
    const k = interpolate(f, [0, 7], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.6))});
    tr = `scale(${0.82 + 0.2 * k})`;
  }
  if (ultima) op = sal(f, len, 4);
  const flash = b.anim === 'pop' ? interpolate(f, [0, 4], [0.7, 0], clamp) : 0;
  return (
    <AbsoluteFill style={{opacity: op, background: '#000'}}>
      <OffthreadVideo src={staticFile(b.src)} startFrom={b.desde} muted style={{width: W, height: H, objectFit: 'cover', transform: tr, filter: filt}} />
      {flash > 0 && <AbsoluteFill style={{background: '#fff', opacity: flash}} />}
    </AbsoluteFill>
  );
};
export const TechBRoll: React.FC = () => (
  <>
    {X.broll.map((b, i) => {
      const sig = X.broll[i + 1];
      return (
        <Sequence key={i} from={b.a} durationInFrames={b.b - b.a}>
          <UnaToma b={b} ultima={!sig || sig.a > b.b + 1} />
        </Sequence>
      );
    })}
  </>
);

/* ---------- HUD con esquinas ---------- */
const Esquinas: React.FC<{w: number; h: number; k: number; color?: string}> = ({w, h, k, color = '#fff'}) => {
  const L = 40;
  const b = `7px solid ${color}`;
  const dx = (1 - k) * 60;
  const c = (pos: React.CSSProperties): React.CSSProperties => ({position: 'absolute', width: L, height: L, ...pos});
  return (
    <div style={{position: 'absolute', left: -dx, top: -dx * 0.5, width: w + 2 * dx, height: h + dx, opacity: Math.min(1, k * 1.5), filter: 'drop-shadow(3px 3px 0 #000)'}}>
      <div style={c({left: 0, top: 0, borderTop: b, borderLeft: b})} />
      <div style={c({right: 0, top: 0, borderTop: b, borderRight: b})} />
      <div style={c({left: 0, bottom: 0, borderBottom: b, borderLeft: b})} />
      <div style={c({right: 0, bottom: 0, borderBottom: b, borderRight: b})} />
    </div>
  );
};

/* ---------- batería del gancho ---------- */
export const Bateria: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = X.bateria;
  if (f < B.a || f >= B.b) return null;
  const p = sp(f - 1, fps, 300, 13);
  const pct = Math.round(interpolate(f, B.drena, [100, 4], {...clamp, easing: Easing.in(Easing.quad)}));
  const dia = Math.max(1, Math.min(7, Math.floor(interpolate(f, B.drena, [1, 7.99], clamp))));
  const low = f >= B.low;
  const blink = low && Math.floor((f - B.low) / 4) % 2 === 0;
  const golpe = low ? 1 + 0.12 * Math.max(0, 1 - (f - B.low) / 6) : 1;
  const BW = 330, BH = 140;
  return (
    <AbsoluteFill style={{top: 290, alignItems: 'center', opacity: sal(f, B.b, 6)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 34, transform: `scale(${interpolate(p, [0, 1], [0.5, 1]) * golpe})`, opacity: Math.min(1, p * 2)}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
          <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 30, letterSpacing: 6, color: '#fff', textShadow: '3px 3px 0 #000'}}>SIN CARGAR</div>
          <div style={{fontFamily: font('Anton'), fontSize: 120, lineHeight: 1, color: AMA, textShadow: SOMBRA}}>DÍA {dia}</div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', filter: 'drop-shadow(5px 5px 0 #000)'}}>
          <div style={{width: BW, height: BH, border: '9px solid #fff', borderRadius: 26, padding: 9, boxSizing: 'border-box', position: 'relative'}}>
            <div style={{height: '100%', width: `${Math.max(4, pct)}%`, background: low ? (blink ? '#fff' : AMA) : AMA, borderRadius: 12}} />
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font('Anton'), fontSize: 76, color: '#fff', WebkitTextStroke: '8px #000', paintOrder: 'stroke fill'}}>{pct}%</div>
          </div>
          <div style={{width: 18, height: 54, background: '#fff', borderRadius: '0 10px 10px 0'}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- fichas técnicas ---------- */
const Reloj: React.FC<{k: number}> = ({k}) => (
  <svg width="120" height="120" viewBox="0 0 120 120" style={{filter: 'drop-shadow(4px 4px 0 #000)'}}>
    <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="12" />
    <circle cx="60" cy="60" r="48" fill="none" stroke={AMA} strokeWidth="12" strokeLinecap="round" strokeDasharray={2 * Math.PI * 48}
      strokeDashoffset={2 * Math.PI * 48 * (1 - k)} transform="rotate(-90 60 60)" />
    <line x1="60" y1="60" x2={60 + 30 * Math.sin(k * 2 * Math.PI)} y2={60 - 30 * Math.cos(k * 2 * Math.PI)} stroke="#fff" strokeWidth="8" strokeLinecap="round" />
  </svg>
);
export const Fichas: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const x = X.fichas.find((c) => f >= c.a && f < Math.max(c.b, c.sub_b ?? 0));
  if (!x) return null;
  const t = f - x.a;
  const k = sp(t, fps, 320, 15);
  const enVal = f < x.b;
  const n = x.cuenta ? Math.round(interpolate(t, [2, 20], [0, x.cuenta], {...clamp, easing: ease})) : 0;
  const valor = x.cuenta ? (x.fmt ?? '+{n}').replace('{n}', String(n)) : x.valor;
  const subK = x.sub_en != null ? sp(f - x.sub_en, fps, 300, 14) : 0;
  const size = x.valor.length > 4 ? 170 : 190;
  const ancho = Math.min(780, valor.length * size * 0.5 + (x.reloj ? 150 : 0) + 80);
  const tiempo = interpolate(t, [0, x.b - x.a], [0, 1], clamp);
  if (HUD !== 'base') return <FichaVar label={x.label} valor={valor} t={t} k={k} o={sal(f, x.b, 5)} />;
  return (
    <AbsoluteFill style={{top: 330, alignItems: 'center', opacity: sal(f, Math.max(x.b, x.sub_b ?? 0), 5)}}>
      {enVal && (
        <>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, opacity: Math.min(1, k * 2), transform: `translateY(${(1 - k) * -30}px)`}}>
            <div style={{width: 14, height: 34, background: AMA, boxShadow: '3px 3px 0 #000'}} />
            <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 34, letterSpacing: 8, color: '#fff', textShadow: '3px 3px 0 #000'}}>{x.label}</div>
          </div>
          <div style={{position: 'relative', marginTop: 14, width: ancho, height: size * 1.1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26}}>
            <Esquinas w={ancho} h={size * 1.1} k={k} />
            {x.reloj && <Reloj k={tiempo} />}
            <div style={{overflow: 'hidden', height: size * 1.1, display: 'flex', alignItems: 'center'}}>
              <div style={{fontFamily: font('Anton'), fontSize: size, lineHeight: 1, color: '#fff', textShadow: '7px 7px 0 #000', transform: `translateY(${interpolate(k, [0, 1], [size, 0])}px)`}}>{valor}</div>
            </div>
          </div>
        </>
      )}
      {x.sub && x.sub_en != null && f >= x.sub_en && (
        <div style={{marginTop: enVal ? 18 : 0, fontFamily: font('Anton'), fontSize: enVal ? 64 : 84, color: AMA, textShadow: SOMBRA, letterSpacing: 2,
          transform: `scale(${interpolate(subK, [0, 1], [0.6, 1])})`, opacity: Math.min(1, subK * 2), textAlign: 'center', maxWidth: 800}}>{x.sub}</div>
      )}
    </AbsoluteFill>
  );
};

/* ---------- lista que se marca (funciones) y pasos numerados (configuración) ---------- */
const Palomita: React.FC<{k: number}> = ({k}) => (
  <div style={{width: 72, height: 72, border: '7px solid #fff', borderRadius: 14, background: k > 0 ? AMA : 'rgba(0,0,0,0.35)', boxShadow: '4px 4px 0 #000', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + 0.25 * Math.sin(Math.min(1, k) * Math.PI)})`}}>
    <svg width="52" height="52" viewBox="0 0 52 52"><path d="M10 27 L22 38 L43 14" fill="none" stroke="#111" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset={60 * (1 - Math.min(1, k))} /></svg>
  </div>
);
const Lista: React.FC<{a: number; b: number; items: [string, number][]; titulo?: string; numerada?: boolean}> = ({a, b, items, titulo, numerada}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < a || f >= b) return null;
  const k0 = sp(f - a, fps, 300, 15);
  if (HUD !== 'base') return <ListaVar a={a} b={b} items={items} titulo={titulo} />;
  return (
    <AbsoluteFill style={{top: 320, alignItems: 'center', opacity: sal(f, b, 5)}}>
      {titulo && (
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, opacity: Math.min(1, k0 * 2)}}>
          <div style={{width: 14, height: 34, background: AMA, boxShadow: '3px 3px 0 #000'}} />
          <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 32, letterSpacing: 6, color: '#fff', textShadow: '3px 3px 0 #000'}}>{titulo}</div>
        </div>
      )}
      <div style={{display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start'}}>
        {items.map(([txt, at], i) => {
          const ki = sp(f - (a + 3 + i * 3), fps, 320, 16);
          const on = sp(f - at, fps, 300, 12);
          const activo = f >= at;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, transform: `translateX(${(1 - ki) * -120}px)`, opacity: Math.min(1, ki * 2) * (activo ? 1 : 0.55)}}>
              {numerada ? (
                <div style={{width: 72, height: 72, borderRadius: 36, background: activo ? AMA : 'rgba(0,0,0,0.4)', border: '6px solid #fff', boxShadow: '4px 4px 0 #000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: font('Anton'), fontSize: 44, color: activo ? '#111' : '#fff', transform: `scale(${1 + 0.25 * Math.sin(Math.min(1, on) * Math.PI) * (activo ? 1 : 0)})`}}>{i + 1}</div>
              ) : (
                <Palomita k={activo ? on : 0} />
              )}
              <div style={{fontFamily: font('Anton'), fontSize: 70, lineHeight: 1, color: activo ? '#fff' : '#ddd', textShadow: SOMBRA}}>{txt}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
export const Checklist: React.FC = () => <>{X.checklists.map((c, i) => <Lista key={i} {...c} />)}</>;
export const Pasos: React.FC = () => <Lista {...X.pasos} numerada />;

/* ---------- título del producto: caída ---------- */
export const Titulo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = X.titulo;
  if (f < T.a || f >= T.b) return null;
  const cae = (at: number) => spring({frame: f - at + 3, fps, config: {stiffness: 420, damping: 13, mass: 0.5}});
  const k1 = cae(T.t1);
  const k2 = cae(T.t2);
  const fuera = interpolate(f, [T.b - 6, T.b], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  return (
    <AbsoluteFill style={{top: 330, alignItems: 'center', transform: `translateY(${fuera * 700}px)`, opacity: 1 - fuera * 0.6}}>
      <div style={{fontFamily: font('Anton'), fontSize: 210, lineHeight: 0.95, color: '#fff', textShadow: '9px 9px 0 #000', transform: `translateY(${(1 - k1) * -300}px)`, opacity: f >= T.t1 - 3 ? 1 : 0, letterSpacing: 4}}>{T.l1}</div>
      <div style={{fontFamily: font('Anton'), fontSize: 118, lineHeight: 1.05, color: AMA, textShadow: '7px 7px 0 #000', transform: `translateY(${(1 - k2) * -300}px)`, opacity: f >= T.t2 - 3 ? 1 : 0, letterSpacing: 3}}>{T.l2}</div>
    </AbsoluteFill>
  );
};

/* ---------- barra de capítulos ---------- */
export const Capitulos: React.FC = () => {
  const f = useCurrentFrame();
  const C = X.capitulos;
  if (f < C.a || f >= C.b) return null;
  // se esconde cuando hay otro elemento arriba (fichas, listas, título)
  const ocupado = X.fichas.some((x) => f >= x.a - 2 && f < Math.max(x.b, x.sub_b ?? 0)) || X.checklists.some((c) => f >= c.a - 2 && f < c.b) || (f >= X.pasos.a - 2 && f < X.pasos.b) || (f >= X.titulo.a - 2 && f < X.titulo.b);
  const n = C.items.length;
  let i = 0;
  C.items.forEach(([, at], j) => { if (f >= at) i = j; });
  const ini = C.items[i][1];
  const fin = i + 1 < n ? C.items[i + 1][1] : C.b;
  const prog = interpolate(f, [ini, fin], [0, 1], clamp);
  const cambio = interpolate(f - ini, [0, 8], [0, 1], {...clamp, easing: ease});
  const SW = 112, G = 10;
  return (
    <AbsoluteFill style={{top: 285, alignItems: 'center', opacity: interpolate(f, [C.a, C.a + 6, C.b - 5, C.b], [0, 1, 1, 0], clamp) * (ocupado ? 0 : 1)}}>
      <div style={{display: 'flex', gap: G, filter: 'drop-shadow(3px 3px 0 #000)'}}>
        {C.items.map((_, j) => (
          <div key={j} style={{width: SW, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.35)', overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${(j < i ? 1 : j === i ? prog : 0) * 100}%`, background: j === i ? AMA : '#fff'}} />
          </div>
        ))}
      </div>
      <div style={{marginTop: 14, fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 30, letterSpacing: 7, color: '#fff', textShadow: '3px 3px 0 #000',
        opacity: cambio, transform: `translateY(${(1 - cambio) * 14}px)`}}>
        <span style={{color: AMA}}>{String(i + 1).padStart(2, '0')}</span> · {C.items[i][0]}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- CTA: 3 variantes (inputProps.cta o tech.json → cta): A caída · B cristal · C gigante ---------- */
const VAR = ((getInputProps() as {cta?: string}).cta ?? (X as unknown as {cta?: string}).cta ?? 'A') as 'A' | 'B' | 'C';
// elegido por el creador: link de la A (caída) + comentario de la C (gigante)
const VB = ((getInputProps() as {cta?: string}).cta ?? 'A') as 'A' | 'B' | 'C';
const VC = ((getInputProps() as {cta?: string}).cta ?? 'C') as 'A' | 'B' | 'C';
const ETIQUETA = !!(getInputProps() as {etiqueta?: boolean}).etiqueta;
const cae = (f: number, fps: number) => spring({frame: f, fps, config: {stiffness: 420, damping: 13, mass: 0.5}});
const IconoLink: React.FC<{s?: number; c?: string}> = ({s = 54, c = '#111'}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);
const Chevrones: React.FC<{t: number; c?: string}> = ({t, c = AMA}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 6}}>
    {[0, 1, 2].map((i) => {
      const ph = ((t / 14 + (2 - i) * 0.33) % 1);
      return (
        <svg key={i} width="70" height="30" viewBox="0 0 70 30" style={{marginTop: -6, opacity: 0.25 + 0.75 * Math.sin(ph * Math.PI), filter: 'drop-shadow(3px 3px 0 #000)'}}>
          <path d="M8 26 L35 6 L62 26" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    })}
  </div>
);

export const Bio: React.FC = () => (CTA2 ? <BioVar /> : <BioBase />);
const BioBase: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = X.bio;
  if (f < B.a || f >= B.b) return null;
  const t = f - B.a;
  const o = sal(f, B.b, 4);
  if (VB === 'A') {
    // caída: cada palabra cae de arriba (mismo efecto que el título), flechas que suben en bucle
    const pal = ['LINK', 'EN', 'MI', 'BIO'];
    return (
      <AbsoluteFill style={{top: 300, alignItems: 'center', opacity: o}}>
        <Chevrones t={t} />
        <div style={{display: 'flex', gap: 22}}>
          {pal.map((p, i) => {
            const k = cae(t - i * 3, fps);
            return <div key={i} style={{fontFamily: font('Montserrat'), fontWeight: 900, fontStyle: 'italic', fontSize: 96, color: p === 'BIO' ? AMA : '#fff', textShadow: '6px 6px 0 #000',
              transform: `translateY(${(1 - k) * -260}px)`, opacity: t >= i * 3 ? 1 : 0}}>{p}</div>;
          })}
        </div>
      </AbsoluteFill>
    );
  }
  if (VB === 'B') {
    // cristal: botón esmerilado con ícono de link que sube desde abajo, como un botón real
    const k = sp(t, fps, 260, 15);
    const pulso = 1 + 0.04 * Math.sin((t / 12) * Math.PI);
    return (
      <AbsoluteFill style={{top: 330, alignItems: 'center', opacity: o}}>
        <div style={{transform: `translateY(${(1 - k) * 160}px) scale(${interpolate(k, [0, 1], [0.7, 1]) * pulso})`, opacity: Math.min(1, k * 2), display: 'flex', alignItems: 'center', gap: 22,
          padding: '22px 40px 22px 24px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)'}}>
          <div style={{width: 88, height: 88, borderRadius: 44, background: AMA, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><IconoLink /></div>
          <div style={{fontFamily: font('Poppins'), fontWeight: 800, fontSize: 66, color: '#fff', textShadow: '0 3px 12px rgba(0,0,0,0.5)'}}>link en mi bio</div>
        </div>
      </AbsoluteFill>
    );
  }
  // C gigante: "LINK" cae enorme con golpe y sacudida; "EN MI BIO" entra deslizando en amarillo
  const k1 = sp(t, fps, 380, 11);
  const k2 = sp(t - 6, fps, 300, 14);
  const shake = t < 10 ? Math.sin(t * 2.6) * (10 - t) * 1.4 : 0;
  return (
    <AbsoluteFill style={{top: 290, alignItems: 'center', opacity: o, transform: `translateX(${shake}px)`}}>
      <div style={{fontFamily: font('Bowlby One'), fontSize: 190, lineHeight: 0.95, color: '#fff', textShadow: '9px 9px 0 #000', transform: `scale(${interpolate(k1, [0, 1], [2.4, 1])})`, opacity: Math.min(1, k1 * 3)}}>LINK</div>
      <div style={{fontFamily: font('Bowlby One'), fontSize: 84, lineHeight: 1.05, color: AMA, textShadow: '6px 6px 0 #000', transform: `translateX(${(1 - k2) * 600}px)`}}>EN MI BIO</div>
    </AbsoluteFill>
  );
};

export const Comentario: React.FC = () => (CTA2 ? <ComentarioVar /> : <ComentarioBase />);
const ComentarioBase: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = X.comentario;
  if (f < c.a || f >= c.b) return null;
  const t = f - c.a;
  const n = c.letras.filter((x) => f >= x).length;
  const cursor = Math.floor(t / 8) % 2 === 0;
  const enviado = f >= c.enviar;
  const s = sp(f - c.enviar, fps, 300, 9);
  const p = sp(t, fps, 300, 13);
  if (VC === 'A') {
    // comentario "real" de la app: avatar, usuario, texto que se escribe y corazón que se llena al enviar
    const texto = (c.texto.charAt(0) + c.texto.slice(1).toLowerCase()).slice(0, n);
    return (
      <AbsoluteFill style={{top: c.y, alignItems: 'center'}}>
        <div style={{transform: `translateY(${(1 - p) * -40}px)`, opacity: Math.min(1, p * 2), width: 800, display: 'flex', alignItems: 'center', gap: 24, padding: '24px 30px', borderRadius: 34,
          background: 'rgba(20,20,20,0.82)', boxShadow: '0 14px 40px rgba(0,0,0,0.45)'}}>
          <div style={{width: 96, height: 96, borderRadius: 48, background: AMA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 50, color: '#111', flexShrink: 0}}>T</div>
          <div style={{flex: 1}}>
            <div style={{fontFamily: font('Montserrat'), fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.6)'}}>tú · ahora</div>
            <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 64, color: '#fff', lineHeight: 1.15, minHeight: 74}}>
              {texto}{!enviado && cursor && <span style={{color: AMA, fontWeight: 400}}>|</span>}
            </div>
          </div>
          <svg width="66" height="66" viewBox="0 0 24 24" style={{transform: `scale(${enviado ? interpolate(s, [0, 1], [1.7, 1]) : 1})`, flexShrink: 0}}>
            <path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2 0 3.6 1.1 5 2.8 1.4-1.7 3-2.8 5-2.8 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21Z"
              fill={enviado ? AMA : 'none'} stroke={enviado ? AMA : 'rgba(255,255,255,0.7)'} strokeWidth="2" />
          </svg>
        </div>
      </AbsoluteFill>
    );
  }
  if (VC === 'B') {
    // barra de cristal tipo campo de texto, minúsculas, botón de enviar
    const texto = c.texto.toLowerCase().slice(0, n);
    return (
      <AbsoluteFill style={{top: c.y, alignItems: 'center'}}>
        <div style={{fontFamily: font('Poppins'), fontWeight: 700, fontSize: 36, color: '#fff', textShadow: '0 3px 12px rgba(0,0,0,0.6)', marginBottom: 14, opacity: Math.min(1, p * 2)}}>comenta y te mando el link</div>
        <div style={{transform: `scale(${interpolate(p, [0, 1], [0.85, 1])})`, opacity: Math.min(1, p * 2), width: 780, display: 'flex', alignItems: 'center', gap: 18, padding: '16px 16px 16px 40px', borderRadius: 999,
          background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)'}}>
          <div style={{flex: 1, fontFamily: font('Poppins'), fontWeight: 800, fontSize: 70, color: '#fff', textShadow: '0 3px 12px rgba(0,0,0,0.4)', minHeight: 90, lineHeight: '90px'}}>
            {texto || <span style={{fontWeight: 500, fontSize: 40, color: 'rgba(255,255,255,0.75)'}}>añade un comentario…</span>}
            {!enviado && n > 0 && cursor && <span style={{fontWeight: 300}}>|</span>}
          </div>
          <div style={{width: 96, height: 96, borderRadius: 48, background: enviado ? AMA : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transform: `scale(${enviado ? interpolate(s, [0, 1], [1.4, 1]) : 1}) translateX(${enviado ? (1 - s) * 30 : 0}px)`}}>
            <svg width="50" height="50" viewBox="0 0 24 24"><path d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z" fill={enviado ? '#111' : '#fff'} /></svg>
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  // C gigante: "COMENTA" chico y la palabra enorme letra por letra, cada una con golpe
  const txt = c.texto;
  return (
    <AbsoluteFill style={{top: c.y - 40, alignItems: 'center'}}>
      <div style={{fontFamily: font('Bowlby One'), fontSize: 54, color: '#fff', textShadow: '5px 5px 0 #000', opacity: Math.min(1, p * 2), transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`}}>COMENTA</div>
      <div style={{display: 'flex', alignItems: 'flex-end', transform: `scale(${enviado ? 1 + 0.12 * Math.sin(Math.min(1, (f - c.enviar) / 8) * Math.PI) : 1})`}}>
        <span style={{fontFamily: font('Bowlby One'), fontSize: 120, color: AMA, textShadow: '6px 6px 0 #000', opacity: n ? 1 : 0}}>“</span>
        {txt.split('').map((ch, i) => {
          const at = c.letras[i];
          const k = sp(f - at, fps, 420, 11);
          return <span key={i} style={{display: 'inline-block', fontFamily: font('Bowlby One'), fontSize: 138, lineHeight: 1, color: AMA, textShadow: '7px 7px 0 #000',
            transform: `scale(${interpolate(k, [0, 1], [2, 1])}) rotate(${(1 - k) * (i % 2 ? 12 : -12)}deg)`, opacity: f >= at ? 1 : 0}}>{ch}</span>;
        })}
        <span style={{fontFamily: font('Bowlby One'), fontSize: 120, color: AMA, textShadow: '6px 6px 0 #000', opacity: enviado ? 1 : 0}}>”</span>
      </div>
    </AbsoluteFill>
  );
};

export const EtiquetaVariante: React.FC = () =>
  ETIQUETA ? (
    <AbsoluteFill style={{top: 1560, alignItems: 'center'}}>
      <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 80, color: '#111', background: AMA, padding: '6px 36px', borderRadius: 16}}>{typeof (getInputProps() as {etiqueta?: unknown}).etiqueta === 'string' ? (getInputProps() as {etiqueta: string}).etiqueta : `OPCIÓN ${VAR}`}</div>
    </AbsoluteFill>
  ) : null;

/* ---------- degradado arriba: solo mientras hay HUD (legibilidad sobre fondos claros o pantallas de la app) ---------- */
const SPANS: [number, number][] = [
  ...X.fichas.map((x) => [x.a, Math.max(x.b, x.sub_b ?? 0)] as [number, number]),
  ...X.checklists.map((c) => [c.a, c.b] as [number, number]), ...(X.modos ? [[X.modos.a, X.modos.b] as [number, number]] : []), [X.pasos.a, X.pasos.b], [X.titulo.a, X.titulo.b], [X.bio.a, X.bio.b], [X.comentario.a, X.comentario.b],
];
export const Sombra: React.FC = () => {
  const f = useCurrentFrame();
  const k = Math.max(0, ...SPANS.filter(([a, b]) => b - a > 8).map(([a, b]) => interpolate(f, [a - 4, a + 2, b - 4, b], [0, 1, 1, 0], clamp)));
  if (k <= 0) return null;
  return <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 28%, rgba(0,0,0,0) 45%)', opacity: k}} />;
};

/* ---------- destello en el contorno del reloj ("este reloj"): anillo blanco que brilla + barrido de luz + estrella ---------- */
export const Destello: React.FC = () => {
  const f = useCurrentFrame();
  const Dd = (X as unknown as {destello?: {a: number; b: number; pico: number; track: [number, number, number][]; r: number}}).destello;
  if (!Dd || f < Dd.a || f >= Dd.b) return null;
  const tr = Dd.track;
  // posición del reloj en el corte (interpolada) → pantalla con la misma cámara virtual
  const fs = tr.map((p) => p[0]);
  const fx = Math.max(fs[0], Math.min(fs[fs.length - 1], f));
  const nx = interpolate(fx, fs, tr.map((p) => p[1]));
  const ny = interpolate(fx, fs, tr.map((p) => p[2]));
  const {tx, ty, z} = camParams(f);
  const x = nx * W * z + tx;
  const y = ny * H * z + ty;
  const R = Dd.r * W * z;
  const t = f - Dd.a;
  const len = Dd.b - Dd.a;
  const k = interpolate(t, [0, 4, len - 6, len], [0, 1, 1, 0], clamp);
  const giro = interpolate(t, [0, len], [-60, 300]);
  const est = interpolate(f, [Dd.pico - 3, Dd.pico, Dd.pico + 8], [0, 1, 0], clamp);
  const ang = (giro * Math.PI) / 180;
  const sx = x + Math.cos(ang) * R;
  const sy = y + Math.sin(ang) * R;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {/* contorno */}
        <circle cx={x} cy={y} r={R} fill="none" stroke="#fff" strokeWidth={4} opacity={0.85 * k} filter="url(#glow)" />
        {/* barrido de luz que recorre el bisel */}
        <circle cx={x} cy={y} r={R} fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={k}
          strokeDasharray={`${R * 1.1} ${2 * Math.PI * R}`} transform={`rotate(${giro - 30} ${x} ${y})`} filter="url(#glow)" />
        {/* estrella de destello en la orilla */}
        <g transform={`translate(${sx} ${sy}) scale(${0.2 + est * 1.1}) rotate(${t * 6})`} opacity={Math.max(est, 0.35 * k)} filter="url(#glow)">
          <path d="M0 -34 L5 -5 L34 0 L5 5 L0 34 L-5 5 L-34 0 L-5 -5 Z" fill="#fff" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- interruptor de modos (cancelación de ruido ↔ transparencia): la pastilla amarilla se desliza al decirlo ---------- */
export const Modos: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const M = X.modos;
  if (!M || f < M.a || f >= M.b) return null;
  const k0 = sp(f - M.a, fps, 300, 15);
  const k = sp(f - M.cambio, fps, 260, 16);
  const SW = 400, SH = 124;
  const golpe = 1 + 0.06 * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);
  if (HUD !== 'base') return <ModosVar titulo={M.titulo} items={M.items} k0={k0} k={k} t={f - M.a} o={sal(f, M.b, 5)} />;
  return (
    <AbsoluteFill style={{top: 330, alignItems: 'center', opacity: sal(f, M.b, 5)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, opacity: Math.min(1, k0 * 2), transform: `translateY(${(1 - k0) * -30}px)`}}>
        <div style={{width: 14, height: 34, background: AMA, boxShadow: '3px 3px 0 #000'}} />
        <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 34, letterSpacing: 8, color: '#fff', textShadow: '3px 3px 0 #000'}}>{M.titulo}</div>
      </div>
      <div style={{position: 'relative', width: SW * 2, height: SH, borderRadius: SH / 2, border: '7px solid #fff', background: 'rgba(0,0,0,0.45)', boxShadow: '6px 6px 0 #000',
        transform: `scale(${interpolate(k0, [0, 1], [0.7, 1]) * golpe})`, opacity: Math.min(1, k0 * 2)}}>
        <div style={{position: 'absolute', top: 6, left: 6 + interpolate(k, [0, 1], [0, SW], clamp), width: SW - 12, height: SH - 12, borderRadius: SH / 2, background: AMA}} />
        {M.items.map((txt, i) => {
          const act = i === 0 ? 1 - k : k;
          return <div key={i} style={{position: 'absolute', top: 0, left: i * SW, width: SW, height: SH, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: font('Anton'), fontSize: 56, letterSpacing: 1, color: act > 0.5 ? '#111' : '#fff', textShadow: act > 0.5 ? 'none' : '3px 3px 0 #000'}}>{txt}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- chispas: destellos de estrella sobre el acabado espejo del estuche ---------- */
export const Chispas: React.FC = () => {
  const f = useCurrentFrame();
  const C = X.chispas ?? [];
  const on = C.filter((c) => f >= c.f - 3 && f < c.f + 12);
  if (!on.length) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <filter id="glowc" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {on.map((c, i) => {
          const e = interpolate(f, [c.f - 3, c.f, c.f + 12], [0, 1, 0], clamp);
          return (
            <g key={i} transform={`translate(${c.x * W} ${c.y * H}) scale(${(0.3 + e) * c.s}) rotate(${(f - c.f) * 5})`} opacity={e} filter="url(#glowc)">
              <path d="M0 -40 L5 -6 L40 0 L5 6 L0 40 L-5 6 L-40 0 L-5 -6 Z" fill="#fff" />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/* ================= variantes de diseño de los textos de arriba (A cristal · B bloque · C línea) ================= */
const VIDRIO: React.CSSProperties = {background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '2px solid rgba(255,255,255,0.55)', boxShadow: '0 18px 50px rgba(0,0,0,0.35)'};
const wipe = (k: number) => `inset(0 ${Math.max(0, (1 - k) * 100)}% 0 0)`;

// etiqueta chica
const EtiquetaVar: React.FC<{txt: string; t: number}> = ({txt, t}) => {
  const {fps} = useVideoConfig();
  const k = sp(t, fps, 300, 16);
  if (HUD === 'A')
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 12, opacity: Math.min(1, k * 2), transform: `translateY(${(1 - k) * 20}px)`}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: AMA}} />
        <div style={{fontFamily: font('Poppins'), fontWeight: 700, fontSize: 32, letterSpacing: 2, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>{txt}</div>
      </div>
    );
  if (HUD === 'B')
    return (
      <div style={{clipPath: wipe(interpolate(t, [0, 6], [0, 1], {...clamp, easing: ease})), transform: 'rotate(-2deg)', background: '#111', padding: '6px 20px', boxShadow: '5px 5px 0 rgba(0,0,0,0.4)'}}>
        <div style={{fontFamily: font('Archivo Black'), fontSize: 34, letterSpacing: 2, color: AMA}}>{txt}</div>
      </div>
    );
  if (HUD === 'D')
    return (
      <div style={{fontFamily: font('Space Grotesk'), fontWeight: 500, fontSize: 30, letterSpacing: 6, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.7)', opacity: Math.min(1, k * 2)}}>
        <span style={{color: AMA}}>[ </span>{revuelto(txt, t, 0)}<span style={{color: AMA}}> ]</span>
      </div>
    );
  if (HUD === 'E')
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 14, opacity: Math.min(1, k * 2), transform: `translateX(${(1 - k) * -40}px)`}}>
        <div style={{width: 8, height: 34, borderRadius: 4, background: AMA}} />
        <div style={{fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 30, letterSpacing: 8, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.6)'}}>{txt}</div>
      </div>
    );
  if (HUD === 'F')
    return (
      <div style={{fontFamily: font('Instrument Serif Italic'), fontStyle: 'italic', fontSize: 62, lineHeight: 1, color: AMA, textShadow: '0 3px 14px rgba(0,0,0,0.55)',
        opacity: Math.min(1, k * 2), transform: `translateY(${(1 - k) * 20}px)`}}>{txt.toLowerCase()}</div>
    );
  const line = interpolate(t, [2, 12], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: Math.min(1, k * 2)}}>
      <div style={{fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 30, letterSpacing: 10, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.6)'}}>{txt}</div>
      <div style={{width: 140 * line, height: 6, borderRadius: 3, background: AMA}} />
    </div>
  );
};

// letras que se enfocan una por una (C)
const LetrasEnfoque: React.FC<{txt: string; t: number; size: number; d0?: number}> = ({txt, t, size, d0 = 3}) => (
  <div style={{display: 'flex', whiteSpace: 'pre'}}>
    {txt.split('').map((ch, i) => {
      const k = interpolate(t - d0 - i * 1.5, [0, 7], [0, 1], {...clamp, easing: ease});
      return <span key={i} style={{fontFamily: font('Unbounded'), fontWeight: 900, fontSize: size, lineHeight: 1.05, color: '#fff', textShadow: '0 6px 24px rgba(0,0,0,0.55)',
        opacity: k, filter: `blur(${(1 - k) * 12}px)`, transform: `translateY(${(1 - k) * 24}px)`, display: 'inline-block'}}>{ch}</span>;
    })}
  </div>
);

const FichaVar: React.FC<{label: string; valor: string; t: number; k: number; o: number}> = ({label, valor, t, k, o}) => {
  const size = valor.length > 6 ? 120 : 150;
  if (HUD === 'A')
    return (
      <AbsoluteFill style={{top: 320, alignItems: 'center', opacity: o}}>
        <div style={{...VIDRIO, borderRadius: 44, padding: '26px 56px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center',
          transform: `translateY(${(1 - k) * 80}px) scale(${interpolate(k, [0, 1], [0.88, 1])})`, opacity: Math.min(1, k * 2)}}>
          <EtiquetaVar txt={label} t={t} />
          <div style={{fontFamily: font('Poppins'), fontWeight: 800, fontSize: size, lineHeight: 1.1, color: '#fff', textShadow: '0 6px 24px rgba(0,0,0,0.35)'}}>{valor}</div>
        </div>
      </AbsoluteFill>
    );
  if (HUD === 'B') {
    const kv = interpolate(t, [3, 10], [0, 1], {...clamp, easing: ease});
    const golpe = 1 + 0.08 * Math.sin(Math.min(1, Math.max(0, (t - 8) / 6)) * Math.PI);
    return (
      <AbsoluteFill style={{top: 320, alignItems: 'center', opacity: o}}>
        <EtiquetaVar txt={label} t={t} />
        <div style={{marginTop: 10, clipPath: wipe(kv), transform: `rotate(-2deg) scale(${golpe})`, background: AMA, padding: '4px 34px 10px', boxShadow: '10px 10px 0 #000'}}>
          <div style={{fontFamily: font('Archivo Black'), fontSize: size * 0.9, lineHeight: 1.05, color: '#111'}}>{valor}</div>
        </div>
      </AbsoluteFill>
    );
  }
  if (HUD === 'D') {
    const scan = interpolate(t, [3, 12], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
    return (
      <AbsoluteFill style={{top: 320, alignItems: 'center', opacity: o}}>
        <EtiquetaVar txt={label} t={t} />
        <div style={{position: 'relative', marginTop: 10}}>
          <div style={{clipPath: wipe(scan), fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: size, lineHeight: 1.05, color: '#fff', textShadow: '0 6px 24px rgba(0,0,0,0.55)', whiteSpace: 'pre'}}>{revuelto(valor, t, 4)}</div>
          {scan < 1 && <div style={{position: 'absolute', top: -6, bottom: -6, left: `${scan * 100}%`, width: 7, background: AMA, boxShadow: `0 0 18px ${AMA}`}} />}
        </div>
      </AbsoluteFill>
    );
  }
  if (HUD === 'E')
    return (
      <AbsoluteFill style={{top: 320, alignItems: 'center', opacity: o}}>
        <EtiquetaVar txt={label} t={t} />
        <div style={{marginTop: 14, opacity: Math.min(1, k * 2), transform: `scale(${interpolate(k, [0, 1], [0.9, 1])})`}}><Relleno txt={valor} size={size * 0.8} k={interpolate(t, [6, 16], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)})} /></div>
      </AbsoluteFill>
    );
  if (HUD === 'F')
    return (
      <AbsoluteFill style={{top: 320, alignItems: 'center', opacity: o}}>
        <EtiquetaVar txt={label} t={t} />
        <Hilo t={t}><Partido txt={valor} t={t} size={size * 0.95} /></Hilo>
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill style={{top: 320, alignItems: 'center', opacity: o}}>
      <EtiquetaVar txt={label} t={t} />
      <div style={{marginTop: 14}}><LetrasEnfoque txt={valor} t={t} size={size * 0.8} /></div>
    </AbsoluteFill>
  );
};

const ListaVar: React.FC<{a: number; b: number; items: [string, number][]; titulo?: string}> = ({a, b, items, titulo}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f - a;
  const k0 = sp(t, fps, 300, 15);
  const filas = items.map(([txt, at], i) => {
    const ki = sp(f - (a + 3 + i * 3), fps, 320, 16);
    const on = sp(f - at, fps, 300, 12);
    const activo = f >= at;
    if (HUD === 'A')
      return (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, opacity: Math.min(1, ki * 2) * (activo ? 1 : 0.5), transform: `translateY(${(1 - ki) * 30}px)`}}>
          <div style={{width: 58, height: 58, borderRadius: 29, background: activo ? AMA : 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${1 + 0.25 * Math.sin(Math.min(1, on) * Math.PI) * (activo ? 1 : 0)})`}}>
            <svg width="36" height="36" viewBox="0 0 52 52"><path d="M10 27 L22 38 L43 14" fill="none" stroke="#111" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset={60 * (1 - (activo ? Math.min(1, on) : 0))} /></svg>
          </div>
          <div style={{fontFamily: font('Poppins'), fontWeight: 800, fontSize: 54, color: '#fff'}}>{txt}</div>
        </div>
      );
    if (HUD === 'B')
      return (
        <div key={i} style={{clipPath: wipe(interpolate(f - (a + 3 + i * 3), [0, 6], [0, 1], {...clamp, easing: ease})), transform: `rotate(${i % 2 ? 1.5 : -1.5}deg) scale(${1 + 0.07 * Math.sin(Math.min(1, on) * Math.PI) * (activo ? 1 : 0)})`,
          background: activo ? AMA : '#111', padding: '6px 24px', boxShadow: '7px 7px 0 rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: 16}}>
          <div style={{fontFamily: font('Archivo Black'), fontSize: 50, color: activo ? '#111' : '#fff'}}>{activo ? '✓ ' : ''}{txt}</div>
        </div>
      );
    const ti = f - (a + 3 + i * 3);
    if (HUD === 'D')
      return (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, opacity: ti >= 0 ? (activo ? 1 : 0.5) : 0}}>
          <div style={{width: 26, height: 26, border: `4px solid ${activo ? AMA : '#fff'}`, background: activo ? AMA : 'transparent', transform: `rotate(${activo ? 45 * Math.min(1, on) : 0}deg)`}} />
          <div style={{fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 56, letterSpacing: 2, color: '#fff', textShadow: '0 3px 14px rgba(0,0,0,0.6)', whiteSpace: 'pre'}}>{revuelto(txt, ti, 0)}</div>
        </div>
      );
    if (HUD === 'E')
      return (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 16, opacity: Math.min(1, ki * 2), transform: `translateX(${(1 - ki) * -60}px)`}}>
          <div style={{width: 16, height: 16, borderRadius: 8, background: activo ? AMA : 'transparent', border: `3px solid ${activo ? AMA : '#fff'}`}} />
          <Relleno txt={txt} size={50} k={interpolate(f - at, [0, 8], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)})} />
        </div>
      );
    if (HUD === 'F')
      return (
        <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 18, opacity: Math.min(1, ki * 2) * (activo ? 1 : 0.5), transform: `translateY(${(1 - ki) * 20}px)`}}>
          <div style={{fontFamily: font('Instrument Serif Italic'), fontStyle: 'italic', fontSize: 52, color: AMA, textShadow: '0 3px 14px rgba(0,0,0,0.55)'}}>{String(i + 1).padStart(2, '0')}</div>
          <div style={{position: 'relative'}}>
            <div style={{fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 54, letterSpacing: 1, color: '#fff', textShadow: '0 3px 14px rgba(0,0,0,0.6)'}}>{txt}</div>
            <div style={{position: 'absolute', left: 0, bottom: -2, height: 3, width: `${(activo ? interpolate(f - at, [0, 8], [0, 1], {...clamp, easing: ease}) : 0) * 100}%`, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.5)'}} />
          </div>
        </div>
      );
    const linea = interpolate(f - at, [0, 8], [0, 1], {...clamp, easing: ease});
    return (
      <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, opacity: Math.min(1, ki * 2) * (activo ? 1 : 0.45), filter: `blur(${(1 - Math.min(1, ki)) * 8}px)`}}>
        <div style={{width: 46 * (activo ? linea : 0.35), height: 8, borderRadius: 4, background: activo ? AMA : '#fff'}} />
        <div style={{fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 56, letterSpacing: 2, color: '#fff', textShadow: '0 3px 14px rgba(0,0,0,0.6)'}}>{txt}</div>
      </div>
    );
  });
  return (
    <AbsoluteFill style={{top: 320, alignItems: 'center', opacity: sal(f, b, 5)}}>
      {HUD === 'A' ? (
        <div style={{...VIDRIO, borderRadius: 40, padding: '24px 44px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start',
          transform: `translateY(${(1 - k0) * 60}px) scale(${interpolate(k0, [0, 1], [0.9, 1])})`, opacity: Math.min(1, k0 * 2)}}>
          {titulo && <EtiquetaVar txt={titulo} t={t} />}
          {filas}
        </div>
      ) : (
        <>
          {titulo && <div style={{marginBottom: 16}}><EtiquetaVar txt={titulo} t={t} /></div>}
          <div style={{display: 'flex', flexDirection: 'column', gap: HUD === 'B' ? 12 : 10, alignItems: HUD === 'B' ? 'center' : 'flex-start'}}>{filas}</div>
        </>
      )}
    </AbsoluteFill>
  );
};

const ModosVar: React.FC<{titulo: string; items: [string, string]; k0: number; k: number; t: number; o: number}> = ({titulo, items, k0, k, t, o}) => {
  const kk = Math.max(0, Math.min(1, k));
  if (HUD === 'A') {
    const SW = 380, SH = 104;
    return (
      <AbsoluteFill style={{top: 330, alignItems: 'center', opacity: o}}>
        <div style={{marginBottom: 16}}><EtiquetaVar txt={titulo} t={t} /></div>
        <div style={{...VIDRIO, position: 'relative', width: SW * 2, height: SH, borderRadius: SH / 2, transform: `translateY(${(1 - k0) * 60}px)`, opacity: Math.min(1, k0 * 2)}}>
          <div style={{position: 'absolute', top: 8, left: 8 + kk * SW, width: SW - 16, height: SH - 16 - 4, borderRadius: SH / 2, background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.25)'}} />
          {items.map((txt, i) => {
            const act = i === 0 ? 1 - kk : kk;
            return <div key={i} style={{position: 'absolute', top: 0, left: i * SW, width: SW, height: SH - 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: font('Poppins'), fontWeight: 800, fontSize: 40, color: act > 0.5 ? '#111' : '#fff'}}>{txt}</div>;
          })}
        </div>
      </AbsoluteFill>
    );
  }
  if (HUD === 'B') {
    return (
      <AbsoluteFill style={{top: 330, alignItems: 'center', opacity: o}}>
        <div style={{marginBottom: 14}}><EtiquetaVar txt={titulo} t={t} /></div>
        <div style={{display: 'flex', gap: 16, clipPath: wipe(interpolate(t, [2, 9], [0, 1], {...clamp, easing: ease}))}}>
          {items.map((txt, i) => {
            const act = i === 0 ? 1 - kk : kk;
            const salto = Math.sin(Math.min(1, kk) * Math.PI) * (act > 0.5 ? 1 : 0);
            return <div key={i} style={{background: act > 0.5 ? AMA : '#111', padding: '8px 24px', transform: `rotate(${i ? 2 : -2}deg) translateY(${-salto * 16}px) scale(${act > 0.5 ? 1.06 : 0.94})`,
              boxShadow: '7px 7px 0 rgba(0,0,0,0.6)', opacity: act > 0.5 ? 1 : 0.75}}>
              <div style={{fontFamily: font('Archivo Black'), fontSize: 44, color: act > 0.5 ? '#111' : '#fff'}}>{txt}</div>
            </div>;
          })}
        </div>
      </AbsoluteFill>
    );
  }
  if (HUD === 'D' || HUD === 'E' || HUD === 'F') {
    const sw = HUD === 'D' ? Math.max(0, t - (Math.round(kk) ? 0 : 0)) : 0;
    return (
      <AbsoluteFill style={{top: 330, alignItems: 'center', opacity: o}}>
        <div style={{marginBottom: 18}}><EtiquetaVar txt={titulo} t={t} /></div>
        <div style={{display: 'flex', alignItems: 'center', gap: HUD === 'F' ? 30 : 40, opacity: Math.min(1, k0 * 2)}}>
          {items.map((txt, i) => {
            const act = i === 0 ? 1 - kk : kk;
            const el = HUD === 'D' ? (
              <div style={{fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 50, color: '#fff', opacity: 0.35 + 0.65 * act, textShadow: '0 3px 14px rgba(0,0,0,0.6)', whiteSpace: 'pre'}}>
                <span style={{color: AMA, opacity: act}}>[ </span>{txt}<span style={{color: AMA, opacity: act}}> ]</span>
              </div>
            ) : HUD === 'E' ? (
              <Relleno txt={txt} size={40} k={act} color={AMA} />
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
                <div style={{width: 14, height: 14, borderRadius: 7, background: AMA, opacity: act, transform: `scale(${act})`}} />
                <div style={{fontFamily: act > 0.5 ? font('Instrument Serif Italic') : font('Space Grotesk'), fontStyle: act > 0.5 ? 'italic' : 'normal', fontWeight: act > 0.5 ? 400 : 700,
                  fontSize: act > 0.5 ? 70 : 44, lineHeight: 1, color: '#fff', opacity: 0.4 + 0.6 * act, textShadow: '0 3px 14px rgba(0,0,0,0.6)'}}>{act > 0.5 ? txt.toLowerCase() : txt}</div>
              </div>
            );
            return (
              <React.Fragment key={i}>
                {i === 1 && HUD === 'F' && <div style={{width: 3, height: 70, background: 'rgba(255,255,255,0.7)'}} />}
                {el}
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }
  void 0;
  // C línea: dos palabras, barra amarilla que se desliza debajo de la activa
  const anchos = [370, 420];
  const x0 = 0, x1 = anchos[0] + 60;
  return (
    <AbsoluteFill style={{top: 330, alignItems: 'center', opacity: o}}>
      <div style={{marginBottom: 18}}><EtiquetaVar txt={titulo} t={t} /></div>
      <div style={{position: 'relative', display: 'flex', gap: 60, opacity: Math.min(1, k0 * 2), filter: `blur(${(1 - Math.min(1, k0)) * 8}px)`}}>
        {items.map((txt, i) => {
          const act = i === 0 ? 1 - kk : kk;
          return <div key={i} style={{width: anchos[i], textAlign: 'center', fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 52, letterSpacing: 1, color: '#fff',
            opacity: 0.4 + 0.6 * act, textShadow: '0 3px 14px rgba(0,0,0,0.6)'}}>{txt}</div>;
        })}
        <div style={{position: 'absolute', bottom: -18, left: x0 + (x1 - x0) * kk, width: anchos[0] + (anchos[1] - anchos[0]) * kk, height: 8, borderRadius: 4, background: AMA}} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- auxiliares de las variantes D (escáner), E (contorno que se llena) y F (serif + hilos) ---------- */
const GLIFOS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%&';
// texto "revuelto": cada letra muestra caracteres al azar y se asienta en la correcta, de izquierda a derecha
const revuelto = (txt: string, t: number, d0: number) =>
  txt.split('').map((ch, i) => {
    if (ch === ' ' || t >= d0 + i * 1.2 + 4) return ch;
    if (t < d0 + i * 1.2 - 2) return ' ';
    return GLIFOS[(Math.floor(t * 1.7) * 7 + i * 13 + ch.charCodeAt(0)) % GLIFOS.length];
  }).join('');

// contorno de la palabra y el relleno que sube como líquido
const Relleno: React.FC<{txt: string; size: number; k: number; color?: string}> = ({txt, size, k, color = '#fff'}) => {
  const base: React.CSSProperties = {fontFamily: font('Unbounded'), fontWeight: 900, fontSize: size, lineHeight: 1.15, whiteSpace: 'pre', letterSpacing: 1};
  return (
    <div style={{position: 'relative', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.55))'}}>
      <div style={{...base, color: 'transparent', WebkitTextStroke: `${Math.max(2, size / 40)}px #fff`}}>{txt}</div>
      <div style={{...base, position: 'absolute', inset: 0, color, clipPath: `inset(${(1 - k) * 100}% 0 0 0)`}}>{txt}</div>
    </div>
  );
};

// letras que entran desde arriba y abajo alternadas, dentro de una máscara
const Partido: React.FC<{txt: string; t: number; size: number}> = ({txt, t, size}) => (
  <div style={{display: 'flex', overflow: 'hidden', padding: '4px 6px'}}>
    {txt.split('').map((ch, i) => {
      const k = interpolate(t - 4 - i * 1.2, [0, 8], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
      return <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: size, lineHeight: 1, color: '#fff',
        textShadow: '0 6px 22px rgba(0,0,0,0.5)', transform: `translateY(${(1 - k) * (i % 2 ? 110 : -110)}%)`}}>{ch}</span>;
    })}
  </div>
);

// hilos finos arriba y abajo que se abren desde el centro
const Hilo: React.FC<{t: number; children: React.ReactNode}> = ({t, children}) => {
  const k = interpolate(t, [0, 10], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const l = <div style={{width: `${k * 100}%`, height: 3, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.5)', alignSelf: 'center'}} />;
  return <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10}}>{l}{children}{l}</div>;
};
