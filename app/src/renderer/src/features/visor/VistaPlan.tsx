// Vista del plan (cambios al instante): reproduce el plan pendiente directamente desde los clips originales, en su
// orden nuevo y con los tramos extendidos, SIN esperar a "Aplicar recortes". Encima va la plantilla real sin su cámara
// (sinCamara) con los cuadros de data.json traducidos al plan (shared/planDatos): subtítulos, gráficos, b-roll, capas,
// sonidos y música. La cámara virtual y el ajuste fino de silencios se ven al aplicar (`reel cortar` + `reel datos`).
// Sin data.json (proyecto sin corte) quedan los subtítulos propios de esta vista.
import {Player} from '@remotion/player';
import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, Series, Video, useCurrentFrame} from 'remotion';
import {Reel} from '@plantilla/Reel';
import {datosParaPlan} from '@shared/planDatos';
import type {TramoEdl} from '@shared/cortes';
import {usePropsPlantilla} from '@/plantilla';
import {tramosPlan, type Plan, type TramoPlan} from '@shared/cortes';
import {useEditor} from '@/store';

type TramoUrl = TramoPlan & {url: string; frames: number};
const FPS = 30;

// subtítulo palabra por palabra: grupos de hasta 3 palabras; la que se está diciendo va en amarillo
const GRUPO = 3;
const Subtitulo: React.FC<{t: TramoUrl}> = ({t}) => {
  const f = useCurrentFrame();
  const ahora = t.in + (f / FPS) * t.speed; // segundo del clip original
  const ws = t.palabras;
  if (!ws.length) return null;
  let i = ws.findIndex((w) => w[2] > ahora);
  if (i < 0) i = ws.length - 1;
  const g = Math.floor(i / GRUPO) * GRUPO;
  return (
    <div data-testid="subtitulo-plan" style={{position: 'absolute', left: 40, right: 40, bottom: 300, textAlign: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 64, lineHeight: 1.15, textTransform: 'uppercase', textShadow: '0 4px 12px #000, 0 0 3px #000'}}>
      {ws.slice(g, g + GRUPO).map((w, k) => (
        <span key={k} style={{color: g + k === i && ahora >= w[1] ? '#FFD400' : '#fff', marginRight: 16}}>
          {w[0]}
        </span>
      ))}
    </div>
  );
};

const ReelPlantilla = Reel as unknown as React.FC<Record<string, unknown>>;
const PlanComp: React.FC<{tramos: TramoUrl[]; graficos: Record<string, unknown> | null}> = ({tramos, graficos}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <Series>
      {tramos.map((t, i) => (
        <Series.Sequence key={i} durationInFrames={t.frames}>
          <Video
            src={t.url}
            startFrom={Math.round(t.in * FPS)}
            endAt={Math.round(t.out * FPS) + 1}
            playbackRate={t.speed}
            volume={Math.min(4, Math.pow(10, (t.gain_db ?? 0) / 20))}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
          {!graficos && <Subtitulo t={t} />}
        </Series.Sequence>
      ))}
    </Series>
    {graficos && (
      <AbsoluteFill data-testid="graficos-plan">
        <ReelPlantilla {...graficos} />
      </AbsoluteFill>
    )}
  </AbsoluteFill>
);

export const VistaPlan: React.FC<{w: number; h: number}> = ({w, h}) => {
  const info = useEditor((s) => s.info)!;
  const plan = useEditor((s) => s.plan) as Plan | null;
  const palabras = useEditor((s) => s.palabras);
  const [archivos, setArchivos] = useState<Record<string, string | null>>({});
  const tramos = useMemo(() => tramosPlan(plan, palabras), [plan, palabras]);
  useEffect(() => {
    const faltan = [...new Set(tramos.map((t) => t.src))].filter((c) => !(c in archivos));
    if (!faltan.length) return;
    Promise.all(faltan.map(async (c) => [c, await window.reel.fuenteDe(info.id, c)] as const)).then((r) => setArchivos((a) => ({...a, ...Object.fromEntries(r)})));
  }, [tramos, info.id]);
  const conUrl: TramoUrl[] = tramos
    .filter((t) => archivos[t.src])
    .map((t) => ({...t, url: `${info.base}__fuente/${encodeURIComponent(archivos[t.src]!)}`, frames: Math.max(1, Math.round(((t.out - t.in) / t.speed) * FPS))}));
  const total = conUrl.reduce((s, t) => s + t.frames, 0);
  const props = usePropsPlantilla();
  const edl = useEditor((s) => s.edl) as TramoEdl[] | null;
  const clave = conUrl.map((t) => `${t.src}${t.in}${t.out}${t.speed}`).join('|');
  const graficos = useMemo(() => {
    if (!props?.data || conUrl.length !== tramos.length) return null;
    const d = datosParaPlan(props.data as Record<string, unknown>, edl, conUrl);
    return d ? {...props, data: d, sinCamara: true} : null;
  }, [props, edl, clave]);
  if (!conUrl.length) return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Cargando los clips originales…</div>;
  return (
    <div data-testid="vista-plan" data-tramos={conUrl.length} data-cuadros={total}>
      <Player component={PlanComp} inputProps={{tramos: conUrl, graficos}} durationInFrames={total} fps={FPS} compositionWidth={1080} compositionHeight={1920} style={{width: w, height: h}} controls autoPlay={false} acknowledgeRemotionLicense />
    </div>
  );
};
