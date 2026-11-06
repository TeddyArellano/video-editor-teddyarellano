// CTA final para que te sigan: los últimos ~4 s el video se desenfoca y aparece tu foto, @usuario y un botón "SÍGUEME" que se "presiona" y pasa a "SIGUIENDO".
// Dura CUT-60 → fin (la extensión de 2 s la da data.cierre.dur). Foto: public/cta/teddy.jpg (IMG_1444).
import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CUT, D, clamp, font} from '../theme';

export const CTA_USER = '@teddyarellano';
const A = CUT - 60;         // empieza el desenfoque
const AV = CUT - 34;        // entra la foto
const HD = CUT - 24;        // entra el @
const BT = CUT - 12;        // entra el botón
const PR = CUT + 16;        // se "presiona"
const AM = '#FFD60A';

export const ctaBlur = (f: number) => interpolate(f, [A, CUT - 14], [0, 15], {...clamp, easing: Easing.inOut(Easing.cubic)});
export const ctaDim = (f: number) => interpolate(f, [A, CUT - 14], [1, 0.55], clamp);

export const CtaFollow: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!D.cierre || f < AV - 2) return null;
  const sp = (a: number, damping = 12, stiffness = 200) => spring({frame: f - a, fps, config: {damping, stiffness, mass: 0.7}});
  const av = sp(AV);
  const hd = sp(HD, 13, 180);
  const bt = sp(BT, 11, 220);
  const pres = interpolate(f, [PR, PR + 3, PR + 8], [1, 0.9, 1], clamp);
  const sigue = f >= PR + 3;
  const cambio = sp(PR + 3, 10, 260);
  const flota = Math.sin(f / 16) * 4;
  const T = {fontFamily: font('Montserrat')};
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30, paddingTop: 40}}>
      <div style={{width: 300, height: 300, borderRadius: 150, padding: 8, background: `conic-gradient(${AM}, #fff, ${AM})`,
        transform: `translateY(${flota}px) scale(${interpolate(av, [0, 1], [0.4, 1])})`, opacity: Math.min(1, av * 2), boxShadow: '0 10px 40px rgba(0,0,0,0.5)'}}>
        <Img src={staticFile('cta/teddy.jpg')} style={{width: '100%', height: '100%', borderRadius: 150, objectFit: 'cover', display: 'block'}} />
      </div>
      <div style={{...T, fontWeight: 800, fontSize: 70, color: '#fff', letterSpacing: -1, textShadow: '0 5px 0 rgba(0,0,0,0.6), 0 0 24px rgba(0,0,0,0.5)',
        transform: `translateY(${interpolate(hd, [0, 1], [40, 0])}px)`, opacity: Math.min(1, hd * 2)}}>
        {CTA_USER}
      </div>
      <div style={{transform: `scale(${interpolate(bt, [0, 1], [0.5, 1]) * pres})`, opacity: Math.min(1, bt * 2)}}>
        <div style={{...T, fontWeight: 900, fontSize: 46, padding: '20px 54px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 16,
          background: sigue ? '#fff' : AM, color: '#111', boxShadow: '0 8px 0 rgba(0,0,0,0.45)'}}>
          {sigue ? (
            <>
              <svg width="44" height="44" viewBox="0 0 24 24" style={{transform: `scale(${interpolate(cambio, [0, 1], [0.3, 1])})`}}>
                <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#111" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              SIGUIENDO
            </>
          ) : 'SÍGUEME'}
        </div>
      </div>
      <div style={{...T, fontWeight: 700, fontSize: 34, color: '#fff', opacity: interpolate(f, [BT + 6, BT + 18], [0, 0.9], clamp), textShadow: '0 4px 0 rgba(0,0,0,0.6)', marginTop: 4}}>
        para más contenido así
      </div>
      <Sequence from={AV}><Audio src={staticFile('sfx/pop.wav')} volume={0.28} /></Sequence>
      <Sequence from={HD}><Audio src={staticFile('sfx/whoosh2.wav')} volume={0.16} /></Sequence>
      <Sequence from={PR}><Audio src={staticFile('sfx/click.wav')} volume={0.4} /></Sequence>
      <Sequence from={PR + 3}><Audio src={staticFile('sfx/ding.wav')} volume={0.3} /></Sequence>
    </AbsoluteFill>
  );
};
