// Vista previa: la composición "Reel" de la plantilla de la skill (la misma del render) en @remotion/player,
// alimentada con los datos en memoria. Encima va el lienzo de edición (selección y arrastre).
import {Player, type PlayerRef} from '@remotion/player';
import {Reel} from '@plantilla/Reel';
import {totalFrames, type Data} from '@plantilla/theme';
import React, {useEffect, useRef, useState} from 'react';
import {useEditor} from '@/store';
import {player, useReloj} from '@/reloj';
import {usePropsPlantilla} from '@/plantilla';
import {Lienzo} from './Lienzo';

export const Visor: React.FC = () => {
  const data = useEditor((s) => s.data);
  const info = useEditor((s) => s.info);
  const ref = useRef<PlayerRef>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({w: 360, h: 640});
  const [guias, setGuias] = useState(true);

  const props = usePropsPlantilla();
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
    const fu = (e: {detail: {frame: number}}) => useReloj.setState({frame: e.detail.frame});
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
    <div ref={caja} className="relative flex h-full w-full items-center justify-center" data-testid="visor">
      <div className="relative" style={{width: tam.w, height: tam.h}}>
        <Player
          ref={ref}
          component={Reel as unknown as React.FC<Record<string, unknown>>}
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
      </div>
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
