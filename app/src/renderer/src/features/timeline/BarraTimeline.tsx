// Barra de la línea de tiempo: herramientas, recortes pendientes, lo seleccionado e imán/zoom.
import React from 'react';
import {useStore} from 'zustand';
import {nombreSel} from '@shared/elementos';
import {useCortePendiente, useEditor, useModeloCorte} from '@/store';
import {historial} from '@/historial';
import {Icono} from '@/iconos';
import {Atajo} from '@/ui';
import {aplicar, dividir, duplicarElemento, moverSeleccion, quitarSeleccion, recortar, restaurarSeleccion} from './acciones';
import {PPC_MAX, useVista, zoomVista} from './vista';

const BotonB: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {on?: boolean; n: string; atajo?: string}> = ({on, n, atajo, title, children, className = '', ...p}) => (
  <button
    {...p}
    title={title ? `${title}${atajo ? ` (${atajo})` : ''}` : undefined}
    className={`inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${on ? 'bg-acento text-white' : 'text-zinc-300 hover:bg-zinc-800'} ${className}`}
  >
    <Icono n={n} />
    {children}
  </button>
);

const Sep = () => <div className="mx-1 h-4 w-px bg-zinc-800" />;

export const BarraTimeline: React.FC = () => {
  const herramienta = useVista((s) => s.herramienta);
  const iman = useVista((s) => s.iman);
  const ppc = useVista((s) => s.ppc);
  const ppcMin = useVista((s) => s.ppcMin);
  const ajustado = useVista((s) => s.ajustado);
  const rango = useVista((s) => s.rango);
  const set = useVista((s) => s.set);
  const sel = useEditor((s) => s.sel);
  const data = useEditor((s) => s.data);
  const aplicando = useEditor((s) => s.aplicando);
  const trabajo = useEditor((s) => (s.aplicando ? s.trabajos.find((t) => t.proyecto === s.info?.id && t.estado === 'corriendo') : undefined));
  const m = useModeloCorte();
  const pendiente = useCortePendiente();
  const pasado = useStore(useEditor.temporal, (s) => s.pastStates.length);
  const futuro = useStore(useEditor.temporal, (s) => s.futureStates.length);

  const quitadoSeg = (m?.zonas ?? []).reduce((a, [x, y]) => a + (y - x), 0) / 30;
  const conCorte = !!m;
  const enRango = rango && m ? m.bloques.filter((b) => b.b > rango.a && b.a < rango.b) : [];
  const hayTachado = enRango.some((b) => b.quitada);
  const hayVivo = enRango.some((b) => !b.quitada);
  const unaPieza = enRango.length === 1 && !enRango[0].quitada;
  const span = Math.log(PPC_MAX / ppcMin) || 1;
  const val = (Math.log(ppc / ppcMin) / span) * 100;

  return (
    <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-zinc-800 bg-zinc-900/60 px-2" data-testid="barra-timeline" onMouseDown={(e) => e.preventDefault()}>
      <BotonB n="puntero" on={herramienta === 'seleccion'} title="Selección" atajo="V" onClick={() => set({herramienta: 'seleccion'})} data-testid="herramienta-seleccion" />
      <BotonB n="cuchilla" on={herramienta === 'cuchilla'} title="Cuchilla: clic para dividir el corte" atajo="B" disabled={!conCorte} onClick={() => set({herramienta: 'cuchilla'})} data-testid="herramienta-cuchilla" />
      <Sep />
      <BotonB n="dividir" title="Dividir en el cabezal" atajo="S" disabled={!conCorte} onClick={() => dividir()} data-testid="accion-dividir" />
      <BotonB n="recIni" title="Recortar el inicio hasta el cabezal" atajo="Q" disabled={!conCorte && !sel} onClick={() => recortar('ini')} data-testid="accion-recortar-ini" />
      <BotonB n="recFin" title="Recortar el final desde el cabezal" atajo="W" disabled={!conCorte && !sel} onClick={() => recortar('fin')} data-testid="accion-recortar-fin" />
      <BotonB n="quitar" title="Quitar lo seleccionado" atajo="X" disabled={!rango && !sel} onClick={quitarSeleccion} data-testid="accion-quitar" />
      <Sep />
      <BotonB n="deshacer" title="Deshacer" atajo="⌘Z" disabled={!pasado} onClick={() => historial('deshacer')} data-testid="timeline-deshacer" />
      <BotonB n="rehacer" title="Rehacer" atajo="⇧⌘Z" disabled={!futuro} onClick={() => historial('rehacer')} />
      <Sep />

      {/* contexto: lo seleccionado */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden px-1 text-[11px] text-zinc-400" data-testid="contexto-timeline">
        {rango && (
          <>
            <span className="shrink-0 font-mono text-zinc-200">{((rango.b - rango.a) / 30).toFixed(1)} s</span>
            <span className="truncate text-zinc-500">{enRango.map((b) => b.texto).join(' ').slice(0, 90)}</span>
            {hayVivo && (
              <BotonB n="quitar" title="Quitar" atajo="X" className="shrink-0 text-rose-300" onClick={quitarSeleccion} data-testid="ctx-quitar">
                Quitar
              </BotonB>
            )}
            {hayTachado && (
              <BotonB n="restaurar" title="Recuperar lo tachado" atajo="R" className="shrink-0 text-emerald-300" onClick={restaurarSeleccion} data-testid="ctx-restaurar">
                Recuperar
              </BotonB>
            )}
            {unaPieza && (
              <>
                <BotonB n="cuadroAtras" title="Mover el tramo antes" onClick={() => moverSeleccion(-1)} className="shrink-0" />
                <BotonB n="cuadroAdelante" title="Mover el tramo después" onClick={() => moverSeleccion(1)} className="shrink-0" />
              </>
            )}
          </>
        )}
        {!rango && sel && data && (
          <>
            <span className="truncate text-zinc-200">{nombreSel(data, sel)}</span>
            <BotonB n="copiar" title="Duplicar" atajo="⌘D" className="shrink-0" onClick={duplicarElemento} data-testid="ctx-duplicar">
              Duplicar
            </BotonB>
          </>
        )}
        {!rango && !sel && <span className="truncate text-zinc-600">Arrastra sobre el corte para seleccionar palabras, o usa la cuchilla para dividir.</span>}
      </div>

      {/* recortes pendientes */}
      {(pendiente || aplicando) && (
        <button
          data-testid="aplicar-recortes"
          disabled={aplicando}
          onClick={aplicar}
          title="Regenera el video con tus recortes (Enter)"
          className="mr-1 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-acento px-2.5 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:opacity-80"
        >
          {aplicando ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {trabajo ? `${trabajo.titulo}${trabajo.pct !== undefined ? ` ${Math.round(trabajo.pct)}%` : '…'}` : 'Aplicando…'}
            </>
          ) : (
            <>
              <Icono n="check" />
              Aplicar recortes
              {quitadoSeg > 0.05 && <span className="font-mono font-normal opacity-80">−{quitadoSeg.toFixed(1)} s</span>}
              {(m?.agregadas ?? 0) > 0 && <span className="font-normal opacity-80">+{m!.agregadas} pal.</span>}
              <Atajo>↵</Atajo>
            </>
          )}
        </button>
      )}

      <Sep />
      <BotonB n="iman" on={iman} title="Imán: pegar a palabras, cabezal y bordes" atajo="N" onClick={() => set({iman: !iman})} data-testid="iman" />
      <BotonB n="menos" title="Alejar" atajo="−" onClick={() => zoomVista.aplicar(1 / 1.5)} data-testid="zoom-menos" />
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={Number.isFinite(val) ? val : 0}
        className="zoom-slider w-24"
        data-testid="zoom-slider"
        title="Zoom"
        onChange={(e) => zoomVista.aplicar((ppcMin * Math.exp((Number(e.target.value) / 100) * span)) / ppc)}
      />
      <BotonB n="mas" title="Acercar" atajo="+" onClick={() => zoomVista.aplicar(1.5)} data-testid="zoom-mas" />
      <BotonB n="ajustar" on={ajustado} title="Ver todo el video" atajo="0" onClick={() => zoomVista.ajustar()} data-testid="zoom-ajustar" />
    </div>
  );
};

