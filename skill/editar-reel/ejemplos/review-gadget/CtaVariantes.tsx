// Propuestas del cierre ("link en mi bio" + "comenta FLOW"), inputProps.cta2 = D | E | F | G (o tech.json → cta2).
//   D línea   → mismo lenguaje que los textos de arriba C: Space Grotesk espaciada + Unbounded que se enfoca + línea amarilla
//   E serif   → Outfit en minúsculas + Instrument Serif itálica enorme que se "escribe" con un trazo debajo
//   F espejo  → Archivo Black cromado (como el acabado espejo) con destello que lo cruza y giro 3D al entrar
//   G mensaje → la historia completa: botón de link, comentario que se escribe y llega el DM "aquí está tu link"
import React from 'react';
import {AbsoluteFill, Easing, getInputProps, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import tech from '../tech.json';
import {clamp, font} from '../theme';

const AMA = '#FFD60A';
export const CTA2 = ((getInputProps() as {cta2?: string}).cta2 ?? (tech as {cta2?: string}).cta2 ?? '') as '' | 'D' | 'E' | 'F' | 'G';
type C = {a: number; b: number; texto: string; letras: number[]; enviar: number; y: number; mensaje?: number};
const X = tech as unknown as {bio: {a: number; b: number}; comentario: C};
const ease = Easing.out(Easing.cubic);
const sp = (f: number, fps: number, stiff = 260, damp = 14) => spring({frame: f, fps, config: {damping: damp, stiffness: stiff, mass: 0.6}});
const sal = (f: number, b: number, n = 5) => interpolate(f, [b - n, b], [1, 0], clamp);
const SOMBRA = '0 6px 24px rgba(0,0,0,0.55)';

// flecha fina que se dibuja hacia arriba (señala el perfil)
const FlechaArriba: React.FC<{t: number; c?: string; s?: number}> = ({t, c = AMA, s = 90}) => {
  const k = interpolate(t, [0, 10], [0, 1], {...clamp, easing: ease});
  const bob = Math.sin(t / 6) * 6;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" style={{transform: `translateY(${bob}px)`, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.5))'}}>
      <path d="M20 36 V6 M8 17 L20 5 L32 17" fill="none" stroke={c} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
    </svg>
  );
};
const enfoque = (t: number, i: number, d = 1.5) => {
  const k = interpolate(t - i * d, [0, 7], [0, 1], {...clamp, easing: ease});
  return {opacity: k, filter: `blur(${(1 - k) * 12}px)`, transform: `translateY(${(1 - k) * 24}px)`, display: 'inline-block'} as React.CSSProperties;
};
// relleno cromado: degradado plateado + destello diagonal que lo cruza en `g` (0→1)
const cromo = (g: number): React.CSSProperties => ({
  backgroundImage: `linear-gradient(105deg, transparent ${g * 160 - 40}%, rgba(255,255,255,0.95) ${g * 160 - 25}%, transparent ${g * 160 - 10}%), linear-gradient(180deg, #ffffff 0%, #d9dde3 38%, #7d838c 52%, #e9ecf0 70%, #a7adb6 100%)`,
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.55))',
});
const IconoLink: React.FC<{s?: number; c?: string}> = ({s = 46, c = '#111'}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

/* ================= LINK EN MI BIO ================= */
export const BioVar: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = X.bio;
  if (f < B.a || f >= B.b) return null;
  const t = f - B.a;
  const o = sal(f, B.b, 4);
  if (CTA2 === 'D') {
    const line = interpolate(t, [4, 14], [0, 1], {...clamp, easing: ease});
    return (
      <AbsoluteFill style={{top: 270, alignItems: 'center', opacity: o}}>
        <FlechaArriba t={t} />
        <div style={{fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 34, letterSpacing: 12, color: '#fff', textShadow: SOMBRA, marginTop: 6, ...enfoque(t, 0)}}>LINK EN MI</div>
        <div style={{display: 'flex'}}>
          {'BIO'.split('').map((ch, i) => (
            <span key={i} style={{fontFamily: font('Unbounded'), fontWeight: 900, fontSize: 170, lineHeight: 1.05, color: '#fff', textShadow: SOMBRA, ...enfoque(t, i, 2)}}>{ch}</span>
          ))}
        </div>
        <div style={{width: 260 * line, height: 8, borderRadius: 4, background: AMA, marginTop: 4}} />
      </AbsoluteFill>
    );
  }
  if (CTA2 === 'E') {
    const k1 = interpolate(t, [0, 8], [0, 1], {...clamp, easing: ease});
    const k2 = interpolate(t, [4, 13], [0, 1], {...clamp, easing: ease});
    return (
      <AbsoluteFill style={{top: 300, alignItems: 'center', opacity: o}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
          <div style={{fontFamily: font('Outfit'), fontWeight: 800, fontSize: 84, color: '#fff', textShadow: SOMBRA, opacity: k1, filter: `blur(${(1 - k1) * 10}px)`, transform: `translateY(${(1 - k1) * 30}px)`}}>link en mi</div>
          <div style={{fontFamily: font('Instrument Serif Italic'), fontStyle: 'italic', fontSize: 190, lineHeight: 0.9, color: AMA, textShadow: SOMBRA,
            clipPath: `inset(-20% ${(1 - k2) * 100}% -20% -10%)`, transform: `translateY(${(1 - k2) * 12}px)`}}>bio</div>
        </div>
        <svg width="560" height="40" viewBox="0 0 560 40" style={{marginTop: -6}}>
          <path d="M10 26 C 140 8, 300 36, 550 14" fill="none" stroke={AMA} strokeWidth="5" strokeLinecap="round" pathLength={1} strokeDasharray={1}
            strokeDashoffset={1 - interpolate(t, [8, 18], [0, 1], {...clamp, easing: ease})} />
        </svg>
      </AbsoluteFill>
    );
  }
  if (CTA2 === 'F') {
    const k = sp(t, fps, 240, 15);
    const g = interpolate(t, [6, 20], [0, 1], clamp);
    return (
      <AbsoluteFill style={{top: 300, alignItems: 'center', opacity: o, perspective: 900}}>
        <div style={{fontFamily: font('Archivo Black'), fontSize: 116, lineHeight: 1, letterSpacing: 2, ...cromo(g),
          transform: `rotateX(${(1 - k) * 85}deg) scale(${interpolate(k, [0, 1], [0.8, 1])})`, opacity: Math.min(1, k * 2)}}>LINK EN</div>
        <div style={{fontFamily: font('Archivo Black'), fontSize: 116, lineHeight: 1, letterSpacing: 2, ...cromo(Math.max(0, g - 0.15)),
          transform: `rotateX(${(1 - sp(t - 4, fps, 240, 15)) * 85}deg)`, opacity: t >= 4 ? 1 : 0}}>MI BIO</div>
      </AbsoluteFill>
    );
  }
  // G: botón tipo perfil que cae desde arriba, con brillo que pasa
  const k = sp(t, fps, 300, 13);
  const g = interpolate(t, [8, 22], [-0.3, 1.3], clamp);
  return (
    <AbsoluteFill style={{top: 300, alignItems: 'center', opacity: o}}>
      <div style={{transform: `translateY(${(1 - k) * -220}px)`, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 20, padding: '20px 44px 20px 22px',
        borderRadius: 999, background: '#fff', boxShadow: '0 16px 40px rgba(0,0,0,0.4)'}}>
        <div style={{width: 84, height: 84, borderRadius: 42, background: AMA, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><IconoLink /></div>
        <div style={{fontFamily: font('Outfit'), fontWeight: 800, fontSize: 64, color: '#111'}}>link en mi bio</div>
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${g * 100 - 15}%, rgba(255,214,10,0.55) ${g * 100}%, transparent ${g * 100 + 15}%)`}} />
      </div>
    </AbsoluteFill>
  );
};

/* ================= COMENTA "FLOW" ================= */
export const ComentarioVar: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = X.comentario;
  if (f < c.a || f >= c.b) return null;
  const t = f - c.a;
  const n = c.letras.filter((x) => f >= x).length;
  const enviado = f >= c.enviar;
  const te = f - c.enviar;
  const p = sp(t, fps, 300, 14);
  const txt = c.texto;
  if (CTA2 === 'D') {
    const line = interpolate(te, [0, 10], [0, 1], {...clamp, easing: ease});
    const lab = interpolate(t, [2, 12], [0, 1], {...clamp, easing: ease});
    return (
      <AbsoluteFill style={{top: c.y - 30, alignItems: 'center'}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, ...enfoque(t, 0)}}>
          <div style={{fontFamily: font('Space Grotesk'), fontWeight: 700, fontSize: 36, letterSpacing: 14, color: '#fff', textShadow: SOMBRA}}>COMENTA</div>
          <div style={{width: 140 * lab, height: 6, borderRadius: 3, background: AMA}} />
        </div>
        <div style={{display: 'flex', marginTop: 8}}>
          {txt.split('').map((ch, i) => {
            const k = interpolate(f - c.letras[i], [0, 7], [0, 1], {...clamp, easing: ease});
            return <span key={i} style={{fontFamily: font('Unbounded'), fontWeight: 900, fontSize: 190, lineHeight: 1.05, color: enviado ? AMA : '#fff', textShadow: SOMBRA,
              opacity: k, filter: `blur(${(1 - k) * 14}px)`, transform: `translateY(${(1 - k) * 30}px)`, display: 'inline-block'}}>{ch}</span>;
          })}
        </div>
        <div style={{width: 520 * line, height: 8, borderRadius: 4, background: AMA}} />
        <div style={{fontFamily: font('Space Grotesk'), fontWeight: 500, fontSize: 30, letterSpacing: 6, color: '#fff', textShadow: SOMBRA, marginTop: 18, ...enfoque(te - 6, 0)}}>Y TE LO MANDO POR DM</div>
      </AbsoluteFill>
    );
  }
  if (CTA2 === 'E') {
    const k1 = interpolate(t, [0, 8], [0, 1], {...clamp, easing: ease});
    // la palabra se "escribe" de izquierda a derecha al ritmo de las letras
    const w = n === 0 ? 0 : interpolate(f, [c.letras[0], c.letras[c.letras.length - 1] + 6], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
    const trazo = interpolate(te, [0, 12], [0, 1], {...clamp, easing: ease});
    const fl = txt.charAt(0) + txt.slice(1).toLowerCase();
    return (
      <AbsoluteFill style={{top: c.y - 50, alignItems: 'center'}}>
        <div style={{fontFamily: font('Outfit'), fontWeight: 800, fontSize: 70, color: '#fff', textShadow: SOMBRA, opacity: k1, filter: `blur(${(1 - k1) * 10}px)`, transform: `translateY(${(1 - k1) * 24}px)`}}>comenta</div>
        <div style={{fontFamily: font('Instrument Serif Italic'), fontStyle: 'italic', fontSize: 230, lineHeight: 0.95, color: AMA, textShadow: SOMBRA, padding: '0 30px',
          clipPath: `inset(-20% ${(1 - w) * 100}% -20% 0)`, transform: `scale(${enviado ? 1 + 0.06 * Math.sin(Math.min(1, te / 10) * Math.PI) : 1})`}}>{fl}</div>
        <svg width="620" height="50" viewBox="0 0 620 50" style={{marginTop: -24}}>
          <path d="M14 30 C 160 6, 330 46, 470 22 S 590 18, 606 30" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - trazo}
            style={{filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.5))'}} />
        </svg>
        <div style={{fontFamily: font('Outfit'), fontWeight: 600, fontSize: 40, color: '#fff', textShadow: SOMBRA, marginTop: 6, opacity: interpolate(te, [6, 14], [0, 1], clamp)}}>y te mando el link por mensaje</div>
      </AbsoluteFill>
    );
  }
  if (CTA2 === 'F') {
    const g = interpolate(te, [0, 16], [0, 1], clamp);
    return (
      <AbsoluteFill style={{top: c.y - 30, alignItems: 'center', perspective: 1000}}>
        <div style={{fontFamily: font('Archivo Black'), fontSize: 58, letterSpacing: 10, ...cromo(interpolate(t, [0, 16], [0, 1], clamp)), opacity: Math.min(1, p * 2),
          transform: `rotateX(${(1 - p) * 80}deg)`}}>COMENTA</div>
        <div style={{display: 'flex', transform: `scale(${enviado ? 1 + 0.08 * Math.sin(Math.min(1, te / 9) * Math.PI) : 1})`}}>
          {txt.split('').map((ch, i) => {
            const k = sp(f - c.letras[i], fps, 260, 13);
            return <span key={i} style={{display: 'inline-block', fontFamily: font('Archivo Black'), fontSize: 200, lineHeight: 1.05, ...cromo(g),
              transform: `rotateY(${(1 - k) * -100}deg)`, opacity: f >= c.letras[i] ? 1 : 0}}>{ch}</span>;
          })}
        </div>
      </AbsoluteFill>
    );
  }
  // G: comentario que se escribe en la app y luego llega el DM con el link
  const cursor = Math.floor(t / 8) % 2 === 0;
  const msj = c.mensaje ?? c.enviar + 30;
  const kd = sp(f - msj, fps, 280, 15);
  return (
    <AbsoluteFill style={{top: c.y, alignItems: 'center'}}>
      <div style={{transform: `translateY(${(1 - p) * 40}px)`, opacity: Math.min(1, p * 2) * interpolate(f, [msj, msj + 6], [1, 0.0], clamp), width: 820, display: 'flex', alignItems: 'center', gap: 22,
        padding: '22px 28px', borderRadius: 34, background: 'rgba(18,18,18,0.86)', boxShadow: '0 14px 40px rgba(0,0,0,0.45)'}}>
        <div style={{width: 88, height: 88, borderRadius: 44, background: AMA, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font('Outfit'), fontWeight: 800, fontSize: 44, color: '#111'}}>tú</div>
        <div style={{flex: 1}}>
          <div style={{fontFamily: font('Outfit'), fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.55)'}}>{enviado ? 'comentario publicado' : 'escribiendo…'}</div>
          <div style={{fontFamily: font('Outfit'), fontWeight: 800, fontSize: 72, color: '#fff', lineHeight: 1.1, minHeight: 80}}>
            {txt.slice(0, n)}{!enviado && cursor && <span style={{color: AMA, fontWeight: 600}}>|</span>}
          </div>
        </div>
        <div style={{width: 84, height: 84, borderRadius: 42, flexShrink: 0, background: enviado ? AMA : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${enviado ? interpolate(sp(te, fps, 300, 9), [0, 1], [1.5, 1]) : 1})`}}>
          <svg width="44" height="44" viewBox="0 0 24 24"><path d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z" fill={enviado ? '#111' : '#fff'} /></svg>
        </div>
      </div>
      {f >= msj && (
        <div style={{position: 'absolute', top: -60, transform: `translateY(${(1 - kd) * -260}px)`, width: 860, display: 'flex', alignItems: 'center', gap: 22, padding: '22px 28px', borderRadius: 38,
          background: 'rgba(255,255,255,0.94)', boxShadow: '0 18px 44px rgba(0,0,0,0.4)'}}>
          <div style={{width: 88, height: 88, borderRadius: 24, background: '#111', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><IconoLink c={AMA} /></div>
          <div style={{flex: 1}}>
            <div style={{fontFamily: font('Outfit'), fontWeight: 800, fontSize: 34, color: '#111'}}>Mensaje nuevo</div>
            <div style={{fontFamily: font('Outfit'), fontWeight: 600, fontSize: 40, color: '#333'}}>aquí está tu link de los Flowbuds</div>
          </div>
          <div style={{fontFamily: font('Outfit'), fontWeight: 600, fontSize: 28, color: '#888', alignSelf: 'flex-start'}}>ahora</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
