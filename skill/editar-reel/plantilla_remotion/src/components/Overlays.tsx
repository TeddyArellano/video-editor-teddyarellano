// Elementos sobre el video. Todos dentro de la zona segura (SAFE) y los bloques centrados con márgenes simétricos.
import React from 'react';
import {AbsoluteFill, Audio, Easing, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera} from './Camera';
import {Pos} from './Pos';
import {CIERRE_LEN, CUT, D, E, H, SAFE, SIDE, W, asset, clamp, font, secAt, stroke, topLibre} from '../theme';

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
        <span style={{fontFamily: font('Bungee'), fontSize: 56, color: '#E53935'}}>x{(r as number[])[2] ?? 2}</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- trazo de marcador: bloque con orillas de brocha que se pinta de izquierda a derecha ---------- */
const BRUSH = 'polygon(1% 12%, 6% 2%, 22% 6%, 40% 0%, 61% 5%, 80% 1%, 97% 7%, 100% 30%, 98% 55%, 100% 82%, 95% 97%, 76% 93%, 55% 100%, 34% 94%, 14% 99%, 3% 92%, 0% 68%, 2% 40%)';
export const Marker: React.FC<{p: number; bg: string; color: string; size: number; fuente?: string; rot?: number; children: React.ReactNode}> = ({p, bg, color, size, fuente = 'Anton', rot = -2, children}) => (
  <div style={{position: 'relative', display: 'inline-block', transform: `rotate(${rot}deg)`, maxWidth: W - 2 * SIDE}}>
    <div style={{position: 'absolute', inset: '-6px -26px', background: bg, clipPath: BRUSH, transform: `scaleX(${p})`, transformOrigin: 'left center'}} />
    <div style={{position: 'relative', fontFamily: font(fuente), fontWeight: 900, fontSize: size, lineHeight: 1.08, color, textAlign: 'center', letterSpacing: 1.5, clipPath: `inset(-20% ${100 - Math.min(1, p) * 100}% -20% -5%)`}}>
      {children}
    </div>
  </div>
);
const wipe = (frame: number, a: number) => interpolate(frame, [a, a + 9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});

/* ---------- etiqueta de nombre (arriba a la derecha) ---------- */
export const NameTag: React.FC = () => {
  const frame = useCurrentFrame();
  const i = D.names.findIndex((x) => frame >= x.a && frame < x.b);
  const t = D.names[i];
  const {p, out} = useSpan(t?.a ?? 0, t?.b ?? 0);
  if (!t) return null;
  const color = t.color ?? secAt(t.a).color ?? E.colores.pildora;
  return (
    <AbsoluteFill style={{top: SAFE.top + 10, right: SAFE.right, left: 'auto', width: 520, alignItems: 'flex-end', opacity: out}}>
      <Pos k={`names:${i}`} o={t} align="flex-end">
      <div style={{fontFamily: font('Anton'), fontSize: 74, lineHeight: 1, color: '#fff', ...stroke(9, '#000'), transform: `translateX(${(1 - p) * 300}px) rotate(-3deg)`}}>{t.nombre}</div>
      {t.sub && (
        <div style={{marginTop: 6, marginRight: 20}}>
          <Marker p={wipe(frame, t.a + 6)} bg={E.colores.acento} color="#111" size={34} fuente="Montserrat" rot={-3}>{t.sub}</Marker>
        </div>
      )}
      </Pos>
    </AbsoluteFill>
  );
};

/* ---------- etiqueta centrada bajo los subtítulos (dato, título) ---------- */
// Variantes de etiqueta (Brigadas Otoño 2026: el trazo de marcador "se ve medio feo"). estilo.json → etiqueta.variante:
//   "barra"   = tercio inferior tipo noticiero (barra amarilla + degradado guinda), entra deslizando
//   "tarjeta" = tarjeta blanca con pin de ubicación guinda, pop corto
//   "hud"     = marco con esquinas amarillas sobre fondo oscuro translúcido
// texto "RÓTULO|NOMBRE": lo de antes de "|" va chico arriba; lo demás grande.
const Pin: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path fill={color} d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
);
const LabelVar: React.FC<{v: string; texto: string; f: number}> = ({v, texto, f}) => {
  const [k, m] = texto.includes('|') ? texto.split('|') : ['', texto];
  const g = E.colores.pildora, y = E.colores.acento;
  const ein = interpolate(f, [0, 7], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (v === 'barra')
    return (
      <div style={{alignSelf: 'flex-start', marginLeft: SAFE.left, maxWidth: W - SAFE.left - 60, transform: `translateX(${(1 - ein) * -700}px)`, display: 'flex'}}>
        <div style={{width: 12, background: y}} />
        <div style={{padding: '14px 40px 12px 22px', background: `linear-gradient(90deg, ${g} 0%, ${g}F2 70%, ${g}00 100%)`}}>
          {k && <div style={{fontFamily: font('Montserrat'), fontWeight: 700, fontSize: 30, letterSpacing: 4, color: y}}>{k}</div>}
          <div style={{fontFamily: font('Anton'), fontSize: 62, lineHeight: 1.05, color: '#fff'}}>{m}</div>
        </div>
      </div>
    );
  if (v === 'tarjeta')
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 18, background: '#fff', borderRadius: 26, padding: '18px 30px 18px 20px', maxWidth: W - 2 * SIDE + 60,
        boxShadow: '0 14px 34px rgba(0,0,0,0.45)', transform: `scale(${interpolate(ein, [0, 1], [0.85, 1])})`, opacity: ein}}>
        <div style={{flex: '0 0 auto', width: 76, height: 76, borderRadius: 38, background: g, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Pin size={46} color="#fff" /></div>
        <div>
          {k && <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 26, letterSpacing: 2, color: g}}>{k}</div>}
          <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 42, lineHeight: 1.1, color: '#111'}}>{m}</div>
        </div>
      </div>
    );
  const c = (pos: React.CSSProperties) => <div style={{position: 'absolute', width: 34, height: 34, borderColor: y, borderStyle: 'solid', borderWidth: 0, ...pos}} />;
  return (
    <div style={{position: 'relative', padding: '18px 36px', background: 'rgba(10,10,10,0.55)', maxWidth: W - 2 * SIDE + 60, textAlign: 'center', opacity: ein,
      transform: `scale(${interpolate(ein, [0, 1], [1.08, 1])})`}}>
      {c({top: -4, left: -4, borderTopWidth: 6, borderLeftWidth: 6})}{c({top: -4, right: -4, borderTopWidth: 6, borderRightWidth: 6})}
      {c({bottom: -4, left: -4, borderBottomWidth: 6, borderLeftWidth: 6})}{c({bottom: -4, right: -4, borderBottomWidth: 6, borderRightWidth: 6})}
      {k && <div style={{fontFamily: font('Montserrat'), fontWeight: 700, fontSize: 28, letterSpacing: 6, color: y}}>{k}</div>}
      <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 46, lineHeight: 1.12, letterSpacing: 1, color: '#fff'}}>{m}</div>
    </div>
  );
};

export const Labels: React.FC = () => {
  const frame = useCurrentFrame();
  const i = D.labels.findIndex((x) => frame >= x.a && frame < x.b);
  const t = D.labels[i];
  const {out} = useSpan(t?.a ?? 0, t?.b ?? 0);
  if (!t) return null;
  const L = E.etiqueta;
  const v = (L as unknown as {variante?: string}).variante;
  if (v)
    return (
      <AbsoluteFill style={{top: L.top, alignItems: 'center', opacity: out}}>
        <Pos k={`labels:${i}`} o={t}><LabelVar v={v} texto={t.texto} f={frame - t.a} /></Pos>
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill style={{top: L.top, alignItems: 'center', opacity: out}}>
      <Pos k={`labels:${i}`} o={t}><Marker p={wipe(frame, t.a)} bg={t.color ?? E.colores.pildora} color="#fff" size={L.size}>{t.texto}</Marker></Pos>
    </AbsoluteFill>
  );
};

/* ---------- imágenes: sin tarjeta ni sombra, cada una con una entrada distinta (pop, izq, cae, der, giro, sube); tarjeta solo para QR ---------- */
const ENTRADAS = ['pop', 'izq', 'cae', 'der', 'giro', 'sube'] as const;
export const Images: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const idx = D.images.findIndex((x) => frame >= x.a && frame < x.b);
  const im = D.images[idx];
  if (!im) return null;
  const p = spring({frame: frame - im.a, fps, config: {damping: 11, stiffness: 170, mass: 0.7}});
  const out = interpolate(frame, [im.b - 5, im.b], [1, 0], clamp);
  const libre = Math.max(...Array.from({length: Math.ceil((im.b - im.a) / 5) + 1}, (_, k) => topLibre(Math.min(im.b - 1, im.a + k * 5))));
  const top = im.pos === 'arriba' ? libre : im.pos === 'centro' ? 560 : 770;
  const e = ENTRADAS[idx % ENTRADAS.length];
  const q = 1 - p;
  const tr =
    e === 'izq' ? `translateX(${q * -900}px) rotate(${q * -20}deg)`
    : e === 'der' ? `translateX(${q * 900}px) rotate(${q * 20}deg)`
    : e === 'cae' ? `translateY(${q * -900}px) rotate(${q * 8}deg)`
    : e === 'sube' ? `translateY(${q * 900}px)`
    : e === 'giro' ? `perspective(1200px) rotateY(${q * 100}deg) scale(${interpolate(p, [0, 1], [0.6, 1], clamp)})`
    : `scale(${interpolate(p, [0, 1], [0, 1], clamp)}) rotate(${q * -12}deg)`;
  const flota = Math.sin((frame - im.a) / 14) * 6;
  if (im.pos === 'completa') {
    // cartel/banner GRANDE (Brigadas Otoño 2026: "mucho más grande, no importa que agarre toda la pantalla"): centrado, casi todo el ancho
    const s = interpolate(p, [0, 1], [0.85, 1], clamp);
    return (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)'}}>
        <Pos k={`images:${idx}`} o={im}><Img src={asset(im.src)} style={{width: im.ancho ?? 1020, display: 'block', borderRadius: 18, transform: `scale(${s})`, boxShadow: '0 24px 60px rgba(0,0,0,0.55)'}} /></Pos>
      </AbsoluteFill>
    );
  }
  if (im.src.startsWith('perfiles/')) {
    // captura de Instagram COMPLETA, centrada en x e y, pop simple (el creador: "que esté bien centrada"; nada de giros/laterales)
    const s = interpolate(p, [0, 1], [0.55, 1], clamp);
    return (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: out * Math.min(1, p * 3)}}>
        <Pos k={`images:${idx}`} o={im}><Img src={asset(im.src)} style={{width: im.ancho, display: 'block', borderRadius: 34, transform: `scale(${s * interpolate(frame, [im.a, im.b], [1, 1.03])})`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)'}} /></Pos>
      </AbsoluteFill>
    );
  }
  if (im.tarjeta) {
    // tarjeta blanca SOLO para QR (para que se lea); logos e imágenes van sin tarjeta (preferencia del creador)
    return (
      <AbsoluteFill style={{top: im.top ?? top, alignItems: 'center', opacity: out}}>
        <Pos k={`images:${idx}`} o={im}><div style={{maxWidth: W - 2 * SIDE, transform: `scale(${interpolate(p, [0, 1], [0.5, 1], clamp)})`}}>
          {/* sin título ni texto = QR "sencillo y funcional" (Brigadas Otoño 2026): solo un borde blanco delgado, el QR grande */}
          <div style={{background: '#fff', borderRadius: im.titulo || im.texto ? 34 : 16, padding: im.titulo || im.texto ? '26px 30px' : 10, textAlign: 'center', boxShadow: im.titulo || im.texto ? undefined : '0 10px 30px rgba(0,0,0,0.4)'}}>
            {im.titulo && <div style={{fontFamily: font('Montserrat'), fontWeight: 800, fontSize: 30, color: '#777', marginBottom: 6}}>{im.titulo}</div>}
            {im.texto && <div style={{fontFamily: font('Montserrat'), fontWeight: 900, fontSize: 40, color: '#111', marginBottom: 16}}>{im.texto}</div>}
            <Img src={asset(im.src)} style={{width: im.ancho, display: 'block', margin: '0 auto'}} />
          </div>
        </div></Pos>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{top, alignItems: 'center', opacity: out * Math.min(1, p * 3)}}>
      <Pos k={`images:${idx}`} o={im}><div style={{transform: `${tr} translateY(${flota}px)`}}>
        <Img src={asset(im.src)} style={{width: im.ancho, maxWidth: W - 2 * 110, display: 'block', borderRadius: im.src.startsWith('perfiles/') ? 28 : 0}} />
      </div></Pos>
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
  // CORTE DIRECTO, sin fundido (Brigadas Otoño 2026: "no pongas un degradado, solo pon el video de golpe")
  return (
    <AbsoluteFill>
      <OffthreadVideo src={asset(src)} muted style={{width: W, height: H, objectFit: 'cover', transform: `scale(${interpolate(frame, [0, len], [1.1, 1])})`}} />
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
        <Audio src={asset(`sfx/${s.src}.wav`)} volume={s.v} />
      </Sequence>
    ))}
    {D.musica && (
      <Sequence durationInFrames={CUT + CIERRE_LEN}>
        <Audio src={asset(D.musica.src)} volume={D.musica.vol ?? 0.12} />
      </Sequence>
    )}
  </>
);
