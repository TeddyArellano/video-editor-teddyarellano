// Editor: barra superior, vista previa (centro), paneles (derecha) y línea de tiempo (abajo). Atajos de teclado.
import React, {useEffect} from 'react';
import {useStore} from 'zustand';
import {quitarEvento} from '@shared/elementos';
import {guardar, pedirDatos, useEditor} from '@/store';
import {alternar, ir, mover, tc, useReloj} from '@/reloj';
import {Boton} from '@/ui';
import {Visor} from '../visor/Visor';
import {Timeline} from '../timeline/Timeline';
import {Inspector} from '../inspector/Inspector';
import {Subtitulos} from '../subtitulos/Subtitulos';
import {Estilo} from '../estilo/Estilo';
import {Cortes} from '../cortes/Cortes';
import {Pipeline, BarraTrabajos} from '../pipeline/Pipeline';
import {PanelClaude} from '../claude/PanelClaude';
import {Notas} from '../notas/Notas';

const PANELES = [
  {id: 'inspector', n: 'Elementos'},
  {id: 'subtitulos', n: 'Subtítulos'},
  {id: 'estilo', n: 'Estilo'},
  {id: 'cortes', n: 'Cortes'},
  {id: 'pipeline', n: 'Pipeline'},
  {id: 'notas', n: 'Notas'},
  {id: 'claude', n: 'Claude'},
];

const enCampo = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

export const deshacer = () => useEditor.temporal.getState().undo();
export const rehacer = () => useEditor.temporal.getState().redo();

export const Editor: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const panel = useEditor((s) => s.panel);
  const sucios = useEditor((s) => s.sucios);
  const corte = useEditor((s) => s.corteDesactualizado);
  const calidad = useEditor((s) => s.calidad);
  const frame = useReloj((s) => s.frame);
  const total = useReloj((s) => s.total);
  const jugando = useReloj((s) => s.jugando);
  const pasado = useStore(useEditor.temporal, (s) => s.pastStates.length);
  const futuro = useStore(useEditor.temporal, (s) => s.futureStates.length);

  // tras deshacer/rehacer hay que guardar lo restaurado
  const historial = (fn: () => void) => {
    fn();
    const s = useEditor.getState();
    useEditor.setState({sucios: ['eventos', 'estilo', 'plan', 'notas'].filter((d) => s[d as 'eventos'] !== null) as typeof s.sucios, verEdicion: s.verEdicion + 1});
    guardar(true);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (enCampo(e)) return;
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        return historial(e.shiftKey ? rehacer : deshacer);
      }
      if (cmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        return guardar(true);
      }
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        return alternar();
      }
      if (e.key === 'ArrowLeft') return mover(e.shiftKey ? -30 : -1);
      if (e.key === 'ArrowRight') return mover(e.shiftKey ? 30 : 1);
      if (e.key.toLowerCase() === 'j') return mover(-30);
      if (e.key.toLowerCase() === 'l') return mover(30);
      if (e.key === 'Home') return ir(0);
      if (e.key === 'End') return ir(useReloj.getState().total - 1);
      if (e.key === 'Escape') return useEditor.getState().seleccionar(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && useEditor.getState().sel) {
        const s = useEditor.getState();
        const r = quitarEvento(s.data!, s.eventos ?? {}, s.sel!);
        s.seleccionar(null);
        s.editar({data: r.data, eventos: r.eventos});
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const volver = async () => {
    await guardar(false);
    await window.reel.cerrar(info.id);
    useEditor.getState().cerrar();
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100" data-testid="editor">
      {/* barra superior */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-800 pr-3 pl-20" style={{WebkitAppRegion: 'drag'} as React.CSSProperties}>
        <div className="flex items-center gap-2" style={{WebkitAppRegion: 'no-drag'} as React.CSSProperties}>
          <Boton v="fantasma" onClick={volver} title="Volver a la biblioteca">
            ←
          </Boton>
          <div className="max-w-[340px] truncate text-sm font-medium" title={info.ruta}>
            {info.nombre}
          </div>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{info.estilo}</span>
          <span className="text-[11px] text-zinc-500" data-testid="estado-guardado">
            {sucios.length ? 'guardando…' : 'guardado'}
          </span>
          {corte && <span className="rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-200">corte desactualizado</span>}
          {info.estado.componentesPropios.length > 0 && (
            <span className="rounded bg-violet-900/50 px-1.5 py-0.5 text-[10px] text-violet-200" title={`El proyecto tiene componentes propios (${info.estado.componentesPropios.join(', ')}). La vista previa usa la plantilla de la skill; el render usa los del proyecto.`}>
              vista aproximada
            </span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5" style={{WebkitAppRegion: 'no-drag'} as React.CSSProperties}>
          <Boton v="fantasma" disabled={!pasado} onClick={() => historial(deshacer)} title="Deshacer (⌘Z)" data-testid="deshacer">
            ↶
          </Boton>
          <Boton v="fantasma" disabled={!futuro} onClick={() => historial(rehacer)} title="Rehacer (⇧⌘Z)">
            ↷
          </Boton>
          <Boton onClick={() => pedirDatos()} title="Regenerar src/data.json (reel datos)">
            Actualizar datos
          </Boton>
          <Boton onClick={() => window.reel.correr(info.id, 'Borrador', ['render', '--borrador'])}>Borrador</Boton>
          <Boton v="primario" onClick={() => useEditor.getState().set({panel: 'pipeline'})}>
            Render final…
          </Boton>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {/* centro: vista previa + transporte */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-3">
            <Visor />
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2 border-t border-zinc-800 px-3 text-xs">
            <Boton v="fantasma" onClick={() => ir(0)} title="Inicio (Home)">
              ⏮
            </Boton>
            <Boton v="fantasma" onClick={() => mover(-1)} title="Cuadro anterior (←)">
              ◀︎
            </Boton>
            <Boton v="primario" onClick={alternar} className="w-16" data-testid="play">
              {jugando ? 'Pausa' : 'Play'}
            </Boton>
            <Boton v="fantasma" onClick={() => mover(1)} title="Cuadro siguiente (→)">
              ▶︎
            </Boton>
            <span className="font-mono text-zinc-300" data-testid="tiempo">
              {tc(frame)} / {tc(Math.max(0, total - 1))}
            </span>
            <span className="text-zinc-600">cuadro {frame}</span>
            <div className="flex-1" />
            <BarraTrabajos />
            <select
              className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-[11px]"
              value={calidad}
              onChange={(e) => useEditor.getState().set({calidad: e.target.value as 'proxy' | 'completa'})}
              title="Calidad de la vista previa"
            >
              <option value="proxy" disabled={!info.estado.proxy}>
                Proxy (fluido){info.estado.proxy ? '' : ' — falta'}
              </option>
              <option value="completa">Calidad completa</option>
            </select>
          </div>
        </div>
        {/* derecha: paneles */}
        <div className="flex w-[360px] shrink-0 flex-col border-l border-zinc-800">
          <div className="flex shrink-0 flex-wrap gap-0.5 border-b border-zinc-800 p-1">
            {PANELES.map((p) => (
              <button
                key={p.id}
                data-testid={`tab-${p.id}`}
                onClick={() => useEditor.getState().set({panel: p.id})}
                className={`rounded px-2 py-1 text-[11px] ${panel === p.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {p.n}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {panel === 'inspector' && <Inspector />}
            {panel === 'subtitulos' && <Subtitulos />}
            {panel === 'estilo' && <Estilo />}
            {panel === 'cortes' && <Cortes />}
            {panel === 'pipeline' && <Pipeline />}
            {panel === 'notas' && <Notas />}
            {panel === 'claude' && <PanelClaude />}
          </div>
        </div>
      </div>
      <div className="h-[230px] shrink-0 border-t border-zinc-800">
        <Timeline />
      </div>
    </div>
  );
};
