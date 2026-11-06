// Gancho de los primeros segundos, armado con una lista de elementos (data.hook.elementos):
//   texto    → una línea con fuente/tamaño/color propios (anim: pop | slide | rise | letras)
//   stickers → píldoras rotadas con "VS" en medio (ej. 1ER SEMESTRE VS 9NO SEMESTRE)
//   nota     → post-it amarillo con letra a mano
//   pildora  → etiqueta tipo evento/área
//   imagen   → logo (public/<src>)
// Todo centrado en x = 540 dentro de la zona segura. Sin subtítulos mientras dura el gancho.
import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {HOOK_START, D, E, HookEl, SIDE, W, clamp, fitSize, font, stroke} from '../theme';

const Line: React.FC<{el: HookEl; at: number}> = ({el, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 10, stiffness: 220, mass: 0.7}});
  const anim = el.anim ?? 'pop';
  const size = fitSize(el.texto ?? '', el.size ?? 80, el.fuente, W - 2 * SIDE, el.italic);
  const base: React.CSSProperties = {
    fontFamily: font(el.fuente),
    fontWeight: el.peso ?? 400,
    fontStyle: el.italic ? 'italic' : 'normal',
    fontSize: size,
    lineHeight: 1.0,
    color: el.color ?? '#fff',
    whiteSpace: 'nowrap',
    marginTop: el.mt ?? 0,
    alignSelf: el.align === 'left' ? 'flex-start' : el.align === 'right' ? 'flex-end' : 'center',
    ...stroke(el.contorno ?? 12),
    textShadow: el.sombra === false ? undefined : `${Math.round(size / 18)}px ${Math.round(size / 15)}px 0 #111`,
  };
  if (anim === 'letras') {
    // cada letra sube con retraso (estilo "las letras aparecen detrás de mí")
    return (
      <div style={{...base, transform: `rotate(${el.rot ?? 0}deg)`}}>
        {[...(el.texto ?? '')].map((ch, i) => {
          const q = spring({frame: frame - at - i * 2, fps, config: {damping: 11, stiffness: 180}});
          return (
            <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - q) * 160}px)`, opacity: Math.min(1, q * 1.6), whiteSpace: 'pre'}}>
              {ch}
            </span>
          );
        })}
      </div>
    );
  }
  const tr =
    anim === 'slide'
      ? `translateX(${(1 - p) * -300}px)`
      : anim === 'rise'
        ? `translateY(${(1 - p) * 120}px)`
        : `scale(${interpolate(p, [0, 1], [0.3, 1], clamp)})`;
  return <div style={{...base, opacity: Math.min(1, p * 2), transform: `${tr} rotate(${el.rot ?? 0}deg)`}}>{el.texto}</div>;
};

const Stickers: React.FC<{el: HookEl; at: number}> = ({el, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items = el.items ?? [];
  const one = (t: {texto: string; bg: string; rot?: number}, k: number) => {
    const a = at + k * 14;
    const p = spring({frame: frame - a, fps, config: {damping: 9, stiffness: 260, mass: 0.7}});
    return (
      <div
        key={k}
        style={{
          fontFamily: font(el.fuente ?? 'Lilita One'),
          fontSize: el.size ?? 44,
          color: '#fff',
          background: t.bg,
          padding: '8px 16px 4px',
          borderRadius: 14,
          border: '5px solid #fff',
          boxShadow: '6px 8px 0 rgba(0,0,0,0.85)',
          whiteSpace: 'nowrap',
          transform: `rotate(${t.rot ?? (k ? 4 : -5)}deg) scale(${frame < a ? 0 : interpolate(p, [0, 1], [2.2, 1], clamp)})`,
          opacity: frame < a ? 0 : Math.min(1, p * 2),
        }}
      >
        {t.texto}
      </div>
    );
  };
  const vsAt = at + 8;
  const vs = spring({frame: frame - vsAt, fps, config: {damping: 7, stiffness: 300, mass: 0.6}});
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: el.mt ?? 18}}>
      {items[0] && one(items[0], 0)}
      {el.vs && items.length > 1 && (
        <div
          style={{
            fontFamily: font('Bangers'),
            fontSize: (el.size ?? 44) * 2.1,
            color: E.colores.b,
            ...stroke(8, '#fff'),
            textShadow: '5px 6px 0 #111',
            transform: `scale(${frame < vsAt ? 0 : interpolate(vs, [0, 1], [3, 1], clamp)}) rotate(${Math.sin(frame / 4) * 2}deg)`,
          }}
        >
          {el.vs}
        </div>
      )}
      {items.slice(1).map((t, k) => one(t, k + 1))}
    </div>
  );
};

const Box: React.FC<{el: HookEl; at: number}> = ({el, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 200}});
  // antes de `at` se dibuja invisible para que el bloque no salte al aparecer
  if (el.tipo === 'imagen')
    return <Img src={staticFile(el.src ?? '')} style={{width: el.ancho ?? 300, marginTop: el.mt ?? 0, transform: `scale(${interpolate(p, [0, 1], [0.4, 1], clamp)})`, opacity: Math.min(1, p * 2)}} />;
  const nota = el.tipo === 'nota';
  return (
    <div
      style={{
        marginTop: el.mt ?? 24,
        fontFamily: font(el.fuente ?? (nota ? 'Permanent Marker' : 'Montserrat')),
        fontWeight: el.peso ?? (nota ? 400 : 900),
        fontSize: el.size ?? (nota ? 32 : 34),
        color: el.color ?? (nota ? '#222' : '#fff'),
        background: el.bg ?? (nota ? E.colores.acento : E.colores.pildora),
        padding: nota ? '12px 22px' : '10px 26px',
        borderRadius: nota ? 0 : 40,
        whiteSpace: 'nowrap',
        transform: `rotate(${el.rot ?? (nota ? -2 : 0)}deg) translateY(${(1 - p) * 60}px)`,
        opacity: Math.min(1, p * 2),
        boxShadow: '4px 6px 0 rgba(0,0,0,0.5)',
      }}
    >
      {el.texto}
    </div>
  );
};

// capa: 'todo' (normal) | 'detras' | 'delante'. Con gancho.detras se dibuja dos veces (detrás y delante de la persona);
// en cada pasada los elementos de la otra capa quedan invisibles para conservar el mismo acomodo.
export const Hook: React.FC<{capa?: 'todo' | 'detras' | 'delante'}> = ({capa = 'todo'}) => {
  const frame = useCurrentFrame();
  const h = D.hook;
  if (!h || frame < HOOK_START || frame >= D.hookEnd + 8) return null;
  const out = interpolate(frame, [D.hookEnd - 4, D.hookEnd + 8], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: out}}>
      {/* elementos con "top": posición absoluta (p. ej. logo arriba de la cabeza; Brigadas Otoño 2026) */}
      {h.elementos.map((el, i) =>
        el.top === undefined ? null : (
          <div key={'abs' + i} style={{position: 'absolute', top: el.top, left: 0, width: W, display: 'flex', justifyContent: 'center'}}>
            <Box el={{...el, mt: 0}} at={el.at ?? 2} />
          </div>
        ),
      )}
      <div style={{position: 'absolute', top: h.top ?? 820, left: SIDE, width: W - 2 * SIDE, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {h.elementos.map((el, i) => {
          if (el.top !== undefined) return null;
          const at = el.at ?? 2 + i * 8;
          const visible = capa === 'todo' || (capa === 'delante') === !!el.delante;
          const node = el.tipo === 'texto' ? <Line el={el} at={at} /> : el.tipo === 'stickers' ? <Stickers el={el} at={at} /> : <Box el={el} at={at} />;
          return (
            <div key={i} style={{visibility: visible ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch'}}>
              {node}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
