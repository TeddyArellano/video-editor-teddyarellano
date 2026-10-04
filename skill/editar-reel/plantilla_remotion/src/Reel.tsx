// Composición "Reel": orden de capas = video → b-roll → gancho → persona recortada (gancho "detrás") → gráficos → transiciones → cierre → sonido.
// No hace falta tocar este archivo para un video nuevo: el contenido sale de data.json (reel datos) y el look de estilo.json.
import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Camera, HookForeground} from './components/Camera';
import {Captions} from './components/Captions';
import {Hook} from './components/Hook';
import {Calendario, EmojiSticker, Gamer, Monto} from './components/Extras';
import {BRoll, Counter, EndCard, FastBadge, Images, Labels, NameTag, Sound, Transition} from './components/Overlays';
import {CIERRE_LEN, CUT, D, E} from './theme';

export const TOTAL_FRAMES = CUT + CIERRE_LEN;

export const Reel: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence durationInFrames={CUT}>
      <Camera />
    </Sequence>
    {D.broll.map((b, i) => (
      <Sequence key={i} from={b.a} durationInFrames={b.b - b.a}>
        <BRoll src={b.src} len={b.b - b.a} />
      </Sequence>
    ))}
    <Gamer />
    <Hook capa={D.hook?.detras ? 'detras' : 'todo'} />
    {D.hook?.detras && <HookForeground />}
    {D.hook?.detras && <Hook capa="delante" />}
    <Counter />
    <FastBadge />
    <NameTag />
    <Labels />
    <Images />
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
