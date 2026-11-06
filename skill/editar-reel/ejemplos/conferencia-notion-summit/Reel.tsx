// Composición "Reel": orden de capas = video → b-roll → intro 3D (capa pre-renderizada si existe) → gancho → persona recortada (gancho "detrás") → gráficos → transiciones → cierre → sonido.
// No hace falta tocar este archivo para un video nuevo: el contenido sale de data.json (reel datos) y el look de estilo.json.
// Estilo vlog: src/vlog.json (vlog.py datos) activa el gancho cinético, los golpes de cámara, el B/N cómico, las ráfagas de fotos y el globo.
import React from 'react';
import {AbsoluteFill, Sequence, getInputProps, interpolate, useCurrentFrame} from 'remotion';
import {GanchoOpciones} from './components/GanchoOpciones';
import {Camera, HookForeground} from './components/Camera';
import {Captions} from './components/Captions';
import {Hook} from './components/Hook';
import {GV, GanchoCinetico, hookCam} from './components/GanchoCinetico';
import {Fotos} from './components/Fotos';
import {Globo} from './components/Globo';
import vlog from './vlog.json';
import {Calendario, EmojiSticker, Gamer, Monto} from './components/Extras';
import {IntroEspacioCapa} from './components/IntroEspacio';
import {BRoll, Counter, EndCard, FastBadge, Images, Labels, NameTag, Sound, Transition} from './components/Overlays';
import {CIERRE_LEN, CUT, D, E} from './theme';
import {CtaFollow, ctaBlur, ctaDim} from './components/CtaFollow';
import {Freeze} from 'remotion';

// gancho elegido: inputProps {"gancho":"a|b|c"} o src/gancho.json (lo escribe la entrega final)
const GP = ((getInputProps() as {gancho?: string}).gancho ?? 'a') || 'a';

export const TOTAL_FRAMES = CUT + CIERRE_LEN;

// blanco y negro puntual (recurso cómico, p. ej. "no, no me refiero a…"): vlog.json → "bn": [[a, b], …]
const BN = ((vlog as {bn?: [number, number][]}).bn ?? []) as [number, number][];
const bn = (f: number) => {
  const r = BN.find(([a, b]) => f >= a && f < b);
  return r ? `grayscale(${interpolate(f, [r[0], r[0] + 3], [0, 1], {extrapolateRight: 'clamp'})}) contrast(1.15)` : undefined;
};
const CameraFX: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{filter: [bn(f), D.cierre ? `blur(${ctaBlur(f)}px) brightness(${ctaDim(f)})` : ''].filter(Boolean).join(' ') || undefined, transform: `scale(${hookCam(f)})`}}>
      {f >= CUT ? <Freeze frame={CUT - 1}><Camera muted /></Freeze> : <Camera />}
    </AbsoluteFill>
  );
};

export const Reel: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence durationInFrames={CUT + CIERRE_LEN}>
      <CameraFX />
    </Sequence>
    {D.broll.map((b, i) => (
      <Sequence key={i} from={b.a} durationInFrames={b.b - b.a}>
        <BRoll src={b.src} len={b.b - b.a} />
      </Sequence>
    ))}
    <IntroEspacioCapa />
    <Gamer />
    {GP ? <GanchoOpciones v={GP} /> : GV ? <GanchoCinetico /> : <Hook capa={D.hook?.detras ? 'detras' : 'todo'} />}
    {D.hook?.detras && <HookForeground />}
    {D.hook?.detras && <Hook capa="delante" />}
    <Counter />
    <FastBadge />
    <NameTag />
    <Labels />
    <Images />
    <Fotos />
    <Globo />
    <EmojiSticker />
    <Calendario />
    <Monto />
    <Captions />
    {D.transitions.map((t, i) => (
      <Sequence key={i} from={t.f} durationInFrames={t.len}>
        <Transition texto={t.texto} a={t.a ?? E.colores.a} b={t.b ?? E.colores.b} len={t.len} />
      </Sequence>
    ))}
    <CtaFollow />
    <Sound />
  </AbsoluteFill>
);
