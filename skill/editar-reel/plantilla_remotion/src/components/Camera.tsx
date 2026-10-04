// Cámara virtual: un encuadre por sección (sigue las caras), acercamiento lento, cambios con easing (sin "golpes")
// y zooms suaves a las manos/objeto (data.zooms). El mismo transform se usa para los recortes del gancho "detrás".
import React from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, getInputProps, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {CUT, D, E, H, W, clamp} from '../theme';

const zoomAt = (f: number) => {
  const i = Math.max(0, D.secs.findIndex((s) => f >= s.a && f < s.b));
  const s = D.secs[i] ?? D.secs[D.secs.length - 1];
  const z = s.zoom * (1 + E.camara.empuje * ((f - s.a) / Math.max(1, s.b - s.a)));
  if (i === 0) return z;
  const zp = D.secs[i - 1].zoom * (1 + E.camara.empuje);
  return zp + (z - zp) * interpolate(f - s.a, [0, 15], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
};

const objZoom = (f: number) => {
  for (const z of D.zooms) {
    if (f >= z.a && f < z.b) {
      const k = interpolate(f, [z.a, z.a + 9, z.b - 9, z.b], [0, 1, 1, 0], {...clamp, easing: Easing.inOut(Easing.cubic)});
      return {k, cx: z.cx, cy: z.cy, z: z.z};
    }
  }
  return {k: 0, cx: 0.5, cy: 0.5, z: 1};
};

// `reel render --borrador` pasa {proxy:true}: usa el corte en baja resolución (mucho más rápido)
const PROXY = !!(getInputProps() as {proxy?: boolean}).proxy;

export const camTransform = (frame: number) => {
  const f = Math.max(0, Math.min(frame, CUT - 1));
  const o = objZoom(f);
  const z0 = zoomAt(f);
  const z = z0 + (o.z - z0) * o.k;
  const fx = D.track.x[f] ?? 0.5;
  const fy = D.track.y[f] ?? 0.4;
  const cx = fx + (o.cx - fx) * o.k;
  const cy = fy + (o.cy - fy) * o.k;
  let tx = W * 0.5 - cx * W * z;
  let ty = H * (E.camara.ancla_y + 0.1 * o.k) - cy * H * z;
  tx = Math.min(0, Math.max(W - W * z, tx));
  ty = Math.min(0, Math.max(H - H * z, ty));
  return `translate(${tx}px, ${ty}px) scale(${z})`;
};

export const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: camTransform(frame)}}>
        <OffthreadVideo src={staticFile(PROXY ? 'cut_proxy.mp4' : 'cut.mp4')} style={{width: W, height: H}} />
      </div>
    </AbsoluteFill>
  );
};

// Persona recortada (public/hookfg/NNNN.png, generada con `reel recorte`) dibujada ENCIMA del texto del gancho.
export const HookForeground: React.FC = () => {
  const frame = useCurrentFrame();
  if (!D.hookfg || frame >= D.hookfg || frame >= D.hookEnd + 8) return null;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: camTransform(frame)}}>
        <Img src={staticFile(`hookfg/${String(frame).padStart(4, '0')}.png`)} style={{width: W, height: H}} />
      </div>
    </AbsoluteFill>
  );
};
