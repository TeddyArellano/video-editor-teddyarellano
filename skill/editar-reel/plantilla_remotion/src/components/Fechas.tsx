// Rango de fechas (nació en Feria Zumpango 2026): dos hojas de calendario "DEL 30 NOVIEMBRE" → "AL 9 DICIEMBRE" con una
// flecha que se dibuja entre ellas y, opcional, un letrero final ("¡10 DÍAS DE FERIA!"). Cada hoja entra en su palabra
// (a = 1ª hoja, f2 = 2ª hoja, fl = flecha). Mientras se ve, los subtítulos se ocultan (salvo ocultar_subs: false).
// Datos: data.json → fechas (eventos.json → "fechas").
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {D, Libre, W, clamp, font, stroke, type Fecha} from '../theme';
import {Pos} from './Pos';

const activa = (f: number) => (D.fechas ?? []).find((x) => f >= x.a && f < x.b);
// para Captions: con un rango de fechas en pantalla no hay subtítulos
export const fechasOcultanSubs = (f: number) => {
  const x = activa(f);
  return !!x && x.ocultar_subs !== false;
};

const Hoja: React.FC<{t: number; dia: string; mes: string; tag: string; color: string; rot: number; fuera: number}> = ({t, dia, mes, tag, color, rot, fuera}) => {
  const {fps} = useVideoConfig();
  const p = spring({frame: t, fps, config: {damping: 10, stiffness: 200, mass: 0.7}});
  if (t < 0) return <div style={{width: 300, height: 340}} />;
  const s = interpolate(p, [0, 1], [0.1, 1]) * interpolate(fuera, [0, 1], [1, 0.4]);
  const r = interpolate(p, [0, 1], [rot * 4, rot]);
  const y = interpolate(p, [0, 1], [180, 0]);
  return (
    <div style={{position: 'relative', width: 300, height: 340, transform: `translateY(${y}px) scale(${s}) rotate(${r}deg)`, opacity: 1 - fuera}}>
      {/* etiqueta DEL / AL */}
      {tag ? (
        <div
          style={{
            position: 'absolute', top: -70, left: '50%', transform: 'translateX(-50%) rotate(-4deg)', zIndex: 3,
            background: '#FFD60A', color: '#111', fontFamily: font('Anton'), fontSize: 50, lineHeight: 1, whiteSpace: 'nowrap',
            padding: '8px 22px 6px', borderRadius: 12, border: '4px solid #111', boxShadow: '0 5px 0 #111',
          }}
        >
          {tag}
        </div>
      ) : null}
      <div
        style={{
          width: 300, height: 340, borderRadius: 26, overflow: 'hidden', background: '#fff',
          border: '6px solid #111', boxShadow: '0 12px 0 #111, 0 18px 30px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{background: color, height: 92, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '6px solid #111'}}>
          <span style={{fontFamily: font('Anton'), fontSize: mes.length > 10 ? 36 : 44, color: '#fff', letterSpacing: 1, ...stroke(5, '#111')}}>{mes}</span>
        </div>
        <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <span style={{fontFamily: font('Anton'), fontSize: dia.length > 2 ? 130 : 190, lineHeight: 1, color: '#111', marginTop: 6}}>{dia}</span>
        </div>
      </div>
      {/* argollas */}
      {[70, 230].map((x) => (
        <div key={x} style={{position: 'absolute', top: -14, left: x - 9, width: 18, height: 40, borderRadius: 9, background: '#333', border: '4px solid #111', zIndex: 2}} />
      ))}
    </div>
  );
};

const Flecha: React.FC<{t: number; fuera: number; id: string}> = ({t, fuera, id}) => {
  const k = interpolate(t, [0, 8], [0, 1], clamp);
  const pulso = 1 + Math.max(0, Math.sin((t - 8) / 4)) * 0.06 * (t > 8 ? 1 : 0);
  return (
    <svg width={150} height={120} viewBox="0 0 150 120" style={{opacity: 1 - fuera, transform: `scale(${pulso})`, overflow: 'visible'}}>
      <defs>
        <clipPath id={id}>
          <rect x={0} y={0} width={150 * k} height={120} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <path d="M8 45 H88 V18 L142 60 L88 102 V75 H8 Z" fill="#FFD60A" stroke="#111" strokeWidth={8} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

export const Fechas: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const x: Fecha | undefined = activa(f);
  if (!x) return null;
  const i = (D.fechas ?? []).indexOf(x);
  const fuera = interpolate(f, [x.b - 7, x.b], [0, 1], clamp);
  const top = x.top ?? 1100;
  const banner = f - (x.f2 + 12);
  const pb = spring({frame: banner, fps, config: {damping: 9, stiffness: 220, mass: 0.6}});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top, left: 0, width: W}}>
        <Pos k={`fechas:${i}`} o={x as Libre}>
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18}}>
            <Hoja t={f - x.a} dia={x.dia1} mes={x.mes1} tag={x.tag1 ?? 'DEL'} color={x.color1 ?? '#E5157A'} rot={-5} fuera={fuera} />
            <div style={{width: 150, display: 'flex', justifyContent: 'center'}}>{f >= x.fl && <Flecha t={f - x.fl} fuera={fuera} id={`fechas-flecha-${i}`} />}</div>
            <Hoja t={f - x.f2} dia={x.dia2} mes={x.mes2} tag={x.tag2 ?? 'AL'} color={x.color2 ?? '#6A2C91'} rot={5} fuera={fuera} />
          </div>
          {x.banner && banner >= 0 ? (
            <div
              style={{
                marginTop: 30, width: W, textAlign: 'center',
                fontFamily: font('Anton'), fontSize: 92, color: '#FFD60A', ...stroke(14, '#111'),
                textShadow: '0 7px 0 #111',
                transform: `scale(${interpolate(pb, [0, 1], [2.2, 1]) * (1 - fuera * 0.6)}) rotate(-3deg)`,
                opacity: Math.min(1, pb * 2) * (1 - fuera),
              }}
            >
              {x.banner}
            </div>
          ) : null}
        </Pos>
      </div>
    </AbsoluteFill>
  );
};
