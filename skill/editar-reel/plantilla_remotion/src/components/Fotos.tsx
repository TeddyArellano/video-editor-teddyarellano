// Ráfagas de fotos (estilo vlog; src/vlog.json → "fotos", lo genera `vlog.py datos`): cada foto < 1 s, tal cual
// (sin marco ni destello: "satura mucho"), entra con zoom y sonido de obturador; la siguiente la reemplaza.
import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {VLOG, asset, clamp, derivado} from '../theme';

type Foto = {a: number; b: number; src: string; rot: number};
const F = derivado(() => ((VLOG as {fotos?: Foto[]}).fotos ?? []) as Foto[]);

const Una: React.FC<{x: Foto}> = ({x}) => {
  const f = useCurrentFrame(); // relativo a x.a
  const {fps} = useVideoConfig();
  const len = x.b - x.a;
  const p = spring({frame: f, fps, config: {damping: 13, stiffness: 260, mass: 0.6}});
  const out = interpolate(f, [len - 3, len], [1, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', top: 380, opacity: out}}>
        <div style={{width: 920, transform: `rotate(${(1 - p) * x.rot * 2}deg) scale(${interpolate(p, [0, 1], [1.3, 1], clamp)})`}}>
          <Img src={asset(x.src)} style={{width: '100%', display: 'block'}} />
        </div>
      </AbsoluteFill>
      <Audio src={asset('sfx/shutter.wav')} volume={0.45} />
    </AbsoluteFill>
  );
};

export const Fotos: React.FC = () => (
  <>
    {F().map((x, i) => (
      <Sequence key={i} from={x.a} durationInFrames={x.b - x.a} layout="none">
        <Una x={x} />
      </Sequence>
    ))}
  </>
);
