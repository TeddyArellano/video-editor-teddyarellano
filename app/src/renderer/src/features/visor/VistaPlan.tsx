// Vista del plan (cambios al instante): reproduce el plan pendiente directamente desde los clips originales, en su
// orden nuevo y con los tramos extendidos, SIN esperar a "Aplicar recortes". Solo video y voz: los gráficos, la cámara
// virtual y el ajuste fino de silencios se ven después de aplicar (los calcula `reel cortar` + `reel datos`).
import {Player} from '@remotion/player';
import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, Series, Video} from 'remotion';
import {tramosPlan, type Plan, type TramoPlan} from '@shared/cortes';
import {useEditor} from '@/store';

type TramoUrl = TramoPlan & {url: string; frames: number};
const FPS = 30;

const PlanComp: React.FC<{tramos: TramoUrl[]}> = ({tramos}) => (
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
          <div style={{position: 'absolute', left: 24, bottom: 260, right: 24, color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 44, textShadow: '0 3px 8px #000', textAlign: 'center'}}>{t.texto}</div>
        </Series.Sequence>
      ))}
    </Series>
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
  if (!conUrl.length) return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Cargando los clips originales…</div>;
  return (
    <div data-testid="vista-plan" data-tramos={conUrl.length} data-cuadros={total}>
      <Player component={PlanComp} inputProps={{tramos: conUrl}} durationInFrames={total} fps={FPS} compositionWidth={1080} compositionHeight={1920} style={{width: w, height: h}} controls autoPlay={false} acknowledgeRemotionLicense />
    </div>
  );
};
