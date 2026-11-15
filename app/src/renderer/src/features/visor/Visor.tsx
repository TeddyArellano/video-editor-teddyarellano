// Vista previa: la composición "Reel" de la plantilla de la skill (la misma del render) en @remotion/player,
// alimentada con los datos en memoria. Encima va el lienzo de edición (selección y arrastre).
import {Player, type PlayerRef} from '@remotion/player';
import {Reel} from '@plantilla/Reel';
import {totalFrames, type Data} from '@plantilla/theme';
import React, {useEffect, useRef, useState} from 'react';
import {modeloDe, useCortePendiente, useEditor} from '@/store';
import {VistaPlan} from './VistaPlan';
import {useComponentesPropios} from '@/deps';
import {enScrub, player, useReloj} from '@/reloj';
import {usePropsPlantilla} from '@/plantilla';
import {Lienzo} from './Lienzo';
import {aceptaSoltar, soltarEn} from '../medios/importar';

const GAMMA = 1.13;

export const Visor: React.FC = () => {
  const data = useEditor((s) => s.data);
  const info = useEditor((s) => s.info);
  const ref = useRef<PlayerRef>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({w: 360, h: 640});
  const [guias, setGuias] = useState(true);
  const pendiente = useCortePendiente();
  const [verPlan, setVerPlan] = useState(false);
  useEffect(() => {
    if (!pendiente) setVerPlan(false);
  }, [pendiente]);

  const props = usePropsPlantilla();
  // proyectos con componentes propios: se compilan al vuelo y la vista previa usa los del proyecto (como el render)
  const verDatos = useEditor((s) => s.hashes.data);
  const propios = useComponentesPropios(info, verDatos);
  useEffect(() => {
    useEditor.getState().set({propios: {estado: propios.estado, error: propios.error, editable: propios.editable}});
  }, [propios.estado, propios.error, propios.editable]);
  const vistaExacta = useEditor((s) => s.vistaExacta);
  const usarPropios = propios.estado === 'listo' && (vistaExacta ?? !!propios.editable);
  const total = data ? Math.max(1, totalFrames(data as unknown as Data)) : 1;

  useEffect(() => {
    useReloj.setState({total});
  }, [total]);

  // tamaño 9:16 que cabe en el área
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const h = Math.max(200, Math.min(r.height - 8, ((r.width - 8) * 16) / 9));
      setTam({w: Math.round((h * 9) / 16), h: Math.round(h)});
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const p = ref.current;
    player.ref = p;
    if (!p) return;
    const fu = (e: {detail: {frame: number}}) => {
      if (enScrub()) return;
      const f = e.detail.frame;
      // lo recortado y aún no aplicado se salta al reproducir: el resultado se oye sin esperar a re-cortar
      const z = useReloj.getState().jugando ? modeloDe(useEditor.getState())?.zonas.find(([a, b]) => f >= a && f < b) : undefined;
      if (z) {
        if (z[1] >= useReloj.getState().total) {
          p.pause();
          p.seekTo(Math.max(0, z[0] - 1));
        } else p.seekTo(z[1]);
        return;
      }
      useReloj.setState({frame: f});
    };
    const pl = () => useReloj.setState({jugando: true});
    const pa = () => useReloj.setState({jugando: false});
    p.addEventListener('frameupdate', fu);
    p.addEventListener('play', pl);
    p.addEventListener('pause', pa);
    return () => {
      p.removeEventListener('frameupdate', fu);
      p.removeEventListener('play', pl);
      p.removeEventListener('pause', pa);
    };
  }, [data !== null]);

  if (!data || !info) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-zinc-400">
        {info?.estado.cortado ? 'Falta src/data.json: corre "Actualizar datos".' : 'Este proyecto aún no tiene corte (public/cut.mp4). Ve a la pestaña Cortes o al pipeline.'}
      </div>
    );
  }
  return (
    <div
      ref={caja}
      className="relative flex h-full w-full items-center justify-center"
      data-testid="visor"
      onDragOver={(e) => aceptaSoltar(e) && (e.preventDefault(), (e.dataTransfer.dropEffect = 'copy'))}
      onDrop={(e) => {
        if (!aceptaSoltar(e)) return;
        e.preventDefault();
        soltarEn(e, useReloj.getState().frame);
      }}
    >
      {/* corrección de color de la vista previa: el <video> de Chromium muestra los medios tonos más claros que el
          render (≈ render^0.88, medido contra remotion still); esta gamma solo se aplica a los videos, no a los gráficos */}
      <svg width="0" height="0" style={{position: 'absolute'}} aria-hidden>
        <filter id="reel-gamma" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="gamma" amplitude={1} exponent={GAMMA} offset={0} />
            <feFuncG type="gamma" amplitude={1} exponent={GAMMA} offset={0} />
            <feFuncB type="gamma" amplitude={1} exponent={GAMMA} offset={0} />
          </feComponentTransfer>
        </filter>
      </svg>
      <div className="relative vista-video" style={{width: tam.w, height: tam.h}}>
        <Player
          ref={ref}
          component={usarPropios && propios.Reel ? propios.Reel : (Reel as unknown as React.FC<Record<string, unknown>>)}
          inputProps={props as unknown as Record<string, unknown>}
          durationInFrames={total}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          style={{width: tam.w, height: tam.h, background: '#000'}}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          acknowledgeRemotionLicense
          numberOfSharedAudioTags={8}
        />
        <Lienzo escala={tam.w / 1080} guias={guias} />
        {verPlan && (
          <div className="absolute inset-0 z-30 bg-black">
            <VistaPlan w={tam.w} h={tam.h} />
          </div>
        )}
      </div>
      {pendiente && (
        <button
          data-testid="ver-plan"
          className={`absolute top-2 right-2 rounded px-2 py-1 text-[11px] ${verPlan ? 'bg-sky-600 text-white' : 'bg-zinc-800/90 text-zinc-200 hover:bg-zinc-700'}`}
          onClick={() => {
            player.ref?.pause();
            setVerPlan(!verPlan);
          }}
          title="Reproduce los recortes sin aplicar (orden nuevo y tramos extendidos) directamente desde los clips originales. Solo video y voz."
        >
          {verPlan ? '✕ Volver a la vista del video' : '▶ Ver el plan nuevo'}
        </button>
      )}
      {verPlan && <div className="absolute top-9 right-2 max-w-[220px] rounded bg-black/70 px-2 py-1 text-[10px] text-zinc-300">Vista del plan: orden y tramos nuevos desde los clips originales, sin gráficos. Aplica (Enter) para ver el resultado final.</div>}
      <button
        className="absolute bottom-2 right-2 rounded bg-zinc-800/80 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
        onClick={() => setGuias(!guias)}
        title="Mostrar/ocultar zona segura"
      >
        {guias ? 'Ocultar guías' : 'Zona segura'}
      </button>
    </div>
  );
};
