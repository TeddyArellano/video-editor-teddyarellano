import React from 'react';
import {AbsoluteFill, OffthreadVideo, random, staticFile, useCurrentFrame, Easing, interpolate} from 'remotion';
import edl from './edl.json';
import face from './face.json';
import {H, W} from './theme';

// Per-clip virtual camera: zoom start/end, where the face should sit vertically,
// and whether the clip opens with a zoom "punch".
type Shot = {z0: number; z1: number; ty: number; punch?: number};
export const SHOTS: Shot[] = [
  {z0: 1.3, z1: 1.44, ty: 0.44, punch: 0.1}, // Llegó el momento del torneo
  {z0: 1.64, z1: 1.72, ty: 0.42, punch: 0.08}, // Es hora de demostrar
  {z0: 1.06, z1: 1.14, ty: 0.54}, // Inscripciones abiertas (wide: room for graphics)
  {z0: 1.42, z1: 1.3, ty: 0.44, punch: 0.06}, // Reúne a tu equipo (pull-out)
  {z0: 1.12, z1: 1.15, ty: 0.56}, // Games (face low, logos on top)
  {z0: 1.15, z1: 1.18, ty: 0.56},
  {z0: 1.2, z1: 1.62, ty: 0.44, punch: 0.1}, // ¿Están listos? (dramatic push)
  {z0: 1.55, z1: 1.62, ty: 0.42, punch: 0.07}, // No te pierdas
  {z0: 1.18, z1: 1.24, ty: 0.56}, // 6 de octubre (calendar on top)
  {z0: 1.52, z1: 1.64, ty: 0.42, punch: 0.08}, // Asegura tu lugar
  {z0: 1.16, z1: 1.22, ty: 0.57}, // Link card
  {z0: 1.2, z1: 1.3, ty: 0.58, punch: 0.06}, // Nos vemos en la arena (QR stays on screen)
];

export type Clip = {start: number; frames: number; text: string};
export const CLIPS = edl as unknown as Clip[];
export const CUT_FRAMES = CLIPS[CLIPS.length - 1].start + CLIPS[CLIPS.length - 1].frames;

export const clipIndexAt = (f: number) => {
  for (let i = CLIPS.length - 1; i >= 0; i--) if (f >= CLIPS[i].start) return i;
  return 0;
};

// Moments with an extra camera shake (frame, strength px)
const SHAKES: [number, number][] = [
  [247, 26],
  [497, 30],
  [650, 22],
  [860, 30],
];

export const cameraTransform = (frame: number) => {
  const f = Math.min(frame, CUT_FRAMES - 1);
  const i = clipIndexAt(f);
  const clip = CLIPS[i];
  const shot = SHOTS[i];
  const local = f - clip.start;
  const p = clip.frames > 1 ? local / (clip.frames - 1) : 0;
  const z = interpolate(p, [0, 1], [shot.z0, shot.z1], {easing: Easing.inOut(Easing.quad)});
  const punch = 1 + (shot.punch ?? 0) * Math.exp(-local / 3.2);
  const zEff = Math.max(1, z * punch) * 1.025;

  const fx = face.x[f] ?? 0.5;
  const fy = face.y[f] ?? 0.49;

  // Handheld-style drift
  let dx = 7 * Math.sin(frame / 19) + 3 * Math.sin(frame / 7.1 + 1.3);
  let dy = 6 * Math.sin(frame / 23 + 0.7) + 2.5 * Math.sin(frame / 8.3);
  const rot = 0.35 * Math.sin(frame / 41) + 0.12 * Math.sin(frame / 13);

  for (const [s0, amp] of SHAKES) {
    const d = frame - s0;
    if (d >= 0 && d < 14) {
      const k = amp * Math.exp(-d / 3.5);
      dx += (random(`sx${s0}-${d}`) - 0.5) * 2 * k;
      dy += (random(`sy${s0}-${d}`) - 0.5) * 2 * k;
    }
  }

  let tx = W * 0.5 - fx * W * zEff + dx;
  let ty = H * shot.ty - fy * H * zEff + dy;
  tx = Math.min(0, Math.max(W - W * zEff, tx));
  ty = Math.min(0, Math.max(H - H * zEff, ty));
  return {tx, ty, z: zEff, rot};
};

export const CameraView: React.FC<{muted?: boolean; volume?: number; offsetX?: number; style?: React.CSSProperties}> = ({
  muted,
  volume = 1,
  offsetX = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const {tx, ty, z, rot} = cameraTransform(frame);
  return (
    <AbsoluteFill style={{overflow: 'hidden', ...style}}>
      <AbsoluteFill style={{transform: `rotate(${rot}deg) scale(1.012)`}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: W,
            height: H,
            transformOrigin: '0 0',
            transform: `translate(${tx + offsetX}px, ${ty}px) scale(${z})`,
          }}
        >
          <OffthreadVideo src={staticFile('cut.mp4')} muted={muted} volume={volume} style={{width: W, height: H}} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
