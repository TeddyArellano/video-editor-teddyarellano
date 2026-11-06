// Composición "Reel": orden de capas = video → b-roll → intro 3D (capa pre-renderizada si existe) → gancho → persona recortada (gancho "detrás") → gráficos → transiciones → cierre → sonido.
// No hace falta tocar este archivo para un video nuevo: el contenido sale de data.json (reel datos) y el look de estilo.json.
// Estilo vlog: src/vlog.json (vlog.py datos) activa el gancho cinético, los golpes de cámara, el B/N cómico, las ráfagas de fotos y el globo.
import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Camera, HookForeground} from './components/Camera';
import {Captions} from './components/Captions';
import {Hook} from './components/Hook';
import {GV, GanchoCinetico, hookCam} from './components/GanchoCinetico';
import {Fotos} from './components/Fotos';
import {Globo} from './components/Globo';
import {Calendario, EmojiSticker, Gamer, Monto} from './components/Extras';
import {IntroEspacioCapa} from './components/IntroEspacio';
import {BRoll, Counter, EndCard, FastBadge, Images, Labels, NameTag, Sound, Transition} from './components/Overlays';
import {CIERRE_LEN, CUT, D, Datos, E, VLOG, cargarFuentes, derivado, setDatos, totalFrames} from './theme';

// duración con los datos por defecto (src/data.json); la app calcula la suya con totalFrames(data)
export const TOTAL_FRAMES = totalFrames(D);

// blanco y negro puntual (recurso cómico, p. ej. "no, no me refiero a…"): vlog.json → "bn": [[a, b], …]
const BN = derivado(() => ((VLOG as {bn?: [number, number][]}).bn ?? []) as [number, number][]);
const bn = (f: number) => {
  const r = BN().find(([a, b]) => f >= a && f < b);
  return r ? `grayscale(${interpolate(f, [r[0], r[0] + 3], [0, 1], {extrapolateRight: 'clamp'})}) contrast(1.15)` : undefined;
};
const CameraFX: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{filter: bn(f), transform: `scale(${hookCam(f)})`}}>
      <Camera />
    </AbsoluteFill>
  );
};

// props (todas opcionales): {data, estilo, vlog, land, base, proxy, fuentes}. Sin props usa los JSON de src/ (render normal);
// `reel render --borrador` pasa {proxy: true}.
export const Reel: React.FC<Datos> = (props) => {
  setDatos(props);
  cargarFuentes(props.fuentes); // sin props: public/fonts del proyecto
  return <ReelCapas />;
};

const ReelCapas: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence durationInFrames={CUT}>
      <CameraFX />
    </Sequence>
    {D.broll.map((b, i) => (
      <Sequence key={i} from={b.a} durationInFrames={b.b - b.a}>
        <BRoll src={b.src} len={b.b - b.a} />
      </Sequence>
    ))}
    <IntroEspacioCapa />
    <Gamer />
    {GV() ? <GanchoCinetico /> : <Hook capa={D.hook?.detras ? 'detras' : 'todo'} />}
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
    {CIERRE_LEN > 0 && (
      <Sequence from={CUT} durationInFrames={CIERRE_LEN}>
        <EndCard />
      </Sequence>
    )}
    <Sound />
  </AbsoluteFill>
);
