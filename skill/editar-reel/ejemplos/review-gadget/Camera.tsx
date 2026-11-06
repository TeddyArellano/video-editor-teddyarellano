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
      // lento: acercamiento progresivo de principio a fin (gancho), sin regreso
      if ((z as {lento?: boolean}).lento) return {k: interpolate(f, [z.a, z.b], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)}), cx: z.cx, cy: z.cy, z: z.z};
      const r = Math.min(20, Math.floor((z.b - z.a) / 2)); // entrada/salida lenta (antes 9 cuadros: se sentía brusco)
      const k = interpolate(f, [z.a, z.a + r, z.b - r, z.b], [0, 1, 1, 0], {...clamp, easing: Easing.inOut(Easing.sin)});
      return {k, cx: z.cx, cy: z.cy, z: z.z};
    }
  }
  return {k: 0, cx: 0.5, cy: 0.5, z: 1};
};

// `reel render --borrador` pasa {proxy:true}: usa el corte en baja resolución (mucho más rápido)
const PROXY = !!(getInputProps() as {proxy?: boolean}).proxy;

// gancho: la cámara vibra con el ruido de la calle y se calma de golpe al ponerse los audífonos (data.temblor)
const TEM = (D as {temblor?: {a: number; b: number; amp: number}}).temblor;
const temblor = (f: number) => {
  if (!TEM || f < TEM.a || f >= TEM.b + 8) return {x: 0, y: 0, k: 0};
  const k = interpolate(f, [TEM.b - 4, TEM.b + 8], [1, 0], clamp);
  const a = TEM.amp * k;
  return {x: a * (Math.sin(f * 2.1) * 0.6 + Math.sin(f * 5.3 + 1) * 0.4), y: a * (Math.sin(f * 1.7 + 2) * 0.6 + Math.sin(f * 4.1) * 0.4), k};
};
export const camParams = (frame: number) => {
  const f = Math.max(0, Math.min(frame, CUT - 1));
  const o = objZoom(f);
  const z0 = zoomAt(f);
  // zoom pequeño RELATIVO al encuadre (o.z = factor, p. ej. 1.12) y el centro solo se acerca a medias al objeto: sin paneos bruscos
  const sh = temblor(f);
  const z = z0 * (1 + (o.z - 1) * o.k) * (1 + (sh.k * 2.4 * (TEM?.amp ?? 0)) / W);
  const fx = D.track.x[f] ?? 0.5;
  const fy = D.track.y[f] ?? 0.4;
  const cx = fx + (o.cx - fx) * o.k * 0.5;
  const cy = fy + (o.cy - fy) * o.k * 0.5;
  let tx = W * 0.5 - cx * W * z;
  let ty = H * E.camara.ancla_y - cy * H * z;
  tx = Math.min(0, Math.max(W - W * z, tx + sh.x));
  ty = Math.min(0, Math.max(H - H * z, ty + sh.y));
  return {tx, ty, z};
};
// pausa en silencio: el audio de la toma se apaga mientras se pone los audífonos y vuelve en la siguiente frase (data.silencio)
const SIL = (D as {silencio?: {a: number; b: number; fin: number}}).silencio;
const volCut = (f: number) => (SIL && f >= SIL.a && f < SIL.fin ? interpolate(f, [SIL.a, SIL.b], [1, 0], clamp) : 1);

export const camTransform = (frame: number) => {
  const {tx, ty, z} = camParams(frame);
  return `translate(${tx}px, ${ty}px) scale(${z})`;
};

export const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: camTransform(frame)}}>
        <OffthreadVideo src={staticFile(PROXY ? 'cut_proxy.mp4' : 'cut.mp4')} volume={volCut} style={{width: W, height: H}} />
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
