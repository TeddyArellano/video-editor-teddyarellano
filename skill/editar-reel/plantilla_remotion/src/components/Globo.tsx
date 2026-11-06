// Globo terráqueo de puntos (estilo vlog; src/vlog.json → "globo"): para frases de "todo el mundo", presencia global, universidades…
// Probado en IEEE ESCOM: "la comunidad técnica más grande de todo el mundo… presencia en muchísimas universidades".
// Continentes = puntos de tierra (src/land.json, de Natural Earth 110m vía world-atlas) en proyección ortográfica.
// Entra con zoom, gira, salen pines con pulso en varias ciudades, arcos desde CDMX y birretes 🎓 en "universidades";
// sale con un zoom que lo atraviesa.
import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {W, clamp} from '../theme';
import land from '../land.json';
import vlog from '../vlog.json';

const L = land as [number, number][];
const AMA = '#FFD60A';
type GloboV = {a: number; b: number; arcos: number; pines: number; birretes?: number; origen?: [number, number]; ciudades?: [number, number][]; centro?: number};
const GLB = (vlog as {globo?: GloboV}).globo;
const G = GLB ? {a: GLB.a, mundo: GLB.arcos, presencia: GLB.pines, univ: GLB.birretes ?? 1e9, b: GLB.b} : {a: -1, mundo: -1, presencia: -1, univ: -1, b: -1};

// lugares de referencia (solo ubicaciones, no datos)
const CIUDADES0: [number, number][] = [
  [-99.1, 19.4], [-74, 40.7], [-46.6, -23.5], [-74.1, 4.7], [-79.4, 43.7], [-3.7, 40.4], [-0.1, 51.5], [2.35, 48.86],
  [3.4, 6.5], [31.2, 30], [28, -26.2], [37.6, 55.8], [77.2, 28.6], [103.8, 1.35], [116.4, 39.9], [139.7, 35.7], [151.2, -33.9], [-58.4, -34.6],
];
// la primera ciudad es el origen de los arcos (por defecto Ciudad de México)
const CIUDADES: [number, number][] = GLB?.ciudades ?? (GLB?.origen ? [GLB.origen, ...CIUDADES0.slice(1)] : CIUDADES0);
const CX = W / 2;
const CY = 760;
const R = 330;
const rad = Math.PI / 180;

// ortográfica con rotación (lambda = longitud al centro, phi = inclinación)
const proj = (lon: number, lat: number, lam: number, phi: number, r: number) => {
  const l = (lon + lam) * rad;
  const p = lat * rad;
  const x = Math.cos(p) * Math.sin(l);
  const y0 = Math.sin(p);
  const z0 = Math.cos(p) * Math.cos(l);
  const y = y0 * Math.cos(phi * rad) - z0 * Math.sin(phi * rad);
  const z = y0 * Math.sin(phi * rad) + z0 * Math.cos(phi * rad);
  return {x: CX + x * r, y: CY - y * r, z};
};

export const Globo: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (G.a < 0 || G.b < 0 || f < G.a - 2 || f >= G.b + 6) return null;
  const len = G.b - G.a;
  const bg = interpolate(f, [G.a - 2, G.a + 5, G.b, G.b + 6], [0, 0.88, 0.88, 0], clamp);
  const ent = spring({frame: f - G.a, fps, config: {damping: 13, stiffness: 120, mass: 0.8}});
  const sale = interpolate(f, [G.b, G.b + 6], [1, 2.6], {...clamp, easing: Easing.in(Easing.cubic)});
  const op = interpolate(f, [G.b, G.b + 6], [1, 0], clamp);
  const r = R * interpolate(ent, [0, 1], [0.15, 1], clamp) * sale;
  // giro: rápido al entrar, luego lento de América hacia el Atlántico (para que se vean pines y arcos)
  const lam = -(GLB?.centro ?? -115) - 80 * interpolate(f, [G.a, G.b + 6], [0, 1], {...clamp, easing: Easing.out(Easing.quad)}) + 60 * (1 - ent);
  const phi = 24;

  const dots = L.map(([lo, la], i) => {
    const q = proj(lo, la, lam, phi, r);
    if (q.z <= 0.02) return null;
    const s = (3.2 + 3.4 * q.z) * (r / R);
    return <div key={i} style={{position: 'absolute', left: q.x - s / 2, top: q.y - s / 2, width: s, height: s, borderRadius: '50%', background: '#fff', opacity: 0.35 + 0.65 * q.z}} />;
  });

  // pines: desde "presencia" uno tras otro
  const pinAt = (k: number) => G.presencia + k * Math.max(2, Math.floor((G.univ - G.presencia + 6) / CIUDADES.length));
  const pins = CIUDADES.map(([lo, la], k) => {
    const a0 = pinAt(k);
    if (f < a0) return null;
    const q = proj(lo, la, lam, phi, r);
    if (q.z <= 0.05) return null;
    const p = spring({frame: f - a0, fps, config: {damping: 9, stiffness: 260, mass: 0.5}});
    const ring = ((f - a0) % 24) / 24;
    return (
      <React.Fragment key={k}>
        <div style={{position: 'absolute', left: q.x - 40 * ring, top: q.y - 40 * ring, width: 80 * ring, height: 80 * ring, borderRadius: '50%', border: `4px solid ${AMA}`, opacity: (1 - ring) * q.z}} />
        <div style={{position: 'absolute', left: q.x - 11, top: q.y - 11, width: 22, height: 22, borderRadius: '50%', background: AMA, border: '4px solid #111', transform: `scale(${p})`}} />
        {f >= G.univ + k * 2 && (
          <div style={{position: 'absolute', left: q.x - 38, top: q.y - 92, fontSize: 66, transform: `scale(${spring({frame: f - G.univ - k * 2, fps, config: {damping: 8, stiffness: 240}})})`}}>🎓</div>
        )}
      </React.Fragment>
    );
  });

  // arcos desde Ciudad de México hacia las demás ciudades (se dibujan desde "mundo")
  const arcos = CIUDADES.slice(1).map(([lo, la], k) => {
    const a0 = G.mundo + k * 3;
    if (f < a0) return null;
    const prog = interpolate(f, [a0, a0 + 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    const [lo0, la0] = CIUDADES[0];
    const N = 28;
    const pts: string[] = [];
    let vis = true;
    for (let i = 0; i <= Math.round(N * prog); i++) {
      const t = i / N;
      const lo1 = lo0 + (lo - lo0) * t;
      const la1 = la0 + (la - la0) * t;
      const q = proj(lo1, la1, lam, phi, r * (1 + 0.22 * Math.sin(Math.PI * t)));
      if (q.z < 0) vis = false;
      pts.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`);
    }
    if (!vis || pts.length < 2) return null;
    return <polyline key={k} points={pts.join(' ')} fill="none" stroke={AMA} strokeWidth={4} strokeLinecap="round" opacity={0.85} />;
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #16205A 0%, #060818 70%)', opacity: bg}} />
      <AbsoluteFill style={{opacity: op}}>
        {/* océano */}
        <div style={{position: 'absolute', left: CX - r, top: CY - r, width: 2 * r, height: 2 * r, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #3557D6 0%, #18287A 55%, #0B1240 100%)', boxShadow: `0 0 ${80 * (r / R)}px #4C7DFF88`}} />
        {dots}
        <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>{arcos}</svg>
        {pins}
      </AbsoluteFill>
      {/* sonido: whoosh al entrar, pop por pin (cada otro), ding en "universidades" */}
      <Sequence from={G.a - 2} durationInFrames={30} layout="none"><Audio src={staticFile('sfx/whoosh.wav')} volume={0.22} /></Sequence>
      {CIUDADES.map((_, k) => (k % 2 === 0 ? (
        <Sequence key={k} from={pinAt(k)} durationInFrames={20} layout="none"><Audio src={staticFile('sfx/pop.wav')} volume={0.13} /></Sequence>
      ) : null))}
      <Sequence from={G.univ} durationInFrames={40} layout="none"><Audio src={staticFile('sfx/ding.wav')} volume={0.2} /></Sequence>
    </AbsoluteFill>
  );
};
