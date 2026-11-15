// Editor: barra superior, vista previa (centro), paneles (derecha) y línea de tiempo (abajo, con altura ajustable). Atajos de teclado.
import React, {useEffect, useState} from 'react';
import {atajos, cargarPalabras, guardar, hayCortePendiente, pedirDatos, useCortePendiente, useEditor} from '@/store';
import {accionDe} from '@shared/atajos';
import {agregarClave, agregarEvento, LISTAS, type Lista} from '@shared/elementos';
import {alternar, ir, mover, tc, useReloj} from '@/reloj';
import {historial} from '@/historial';
import {Boton} from '@/ui';
import {Icono} from '@/iconos';
import {Visor} from '../visor/Visor';
import {Timeline} from '../timeline/Timeline';
import {aplicar, dividir, duplicarElemento, empujarElemento, irCorte, marcar, quitarSeleccion, recortar, restaurarSeleccion} from '../timeline/acciones';
import {useVista, zoomVista} from '../timeline/vista';
import {Inspector} from '../inspector/Inspector';
import {Subtitulos} from '../subtitulos/Subtitulos';
import {Estilo} from '../estilo/Estilo';
import {Cortes} from '../cortes/Cortes';
import {Pipeline, BarraTrabajos} from '../pipeline/Pipeline';
import {PanelClaude} from '../claude/PanelClaude';
import {Notas} from '../notas/Notas';
import {Preferencias} from '../preferencias/Preferencias';
import {Medios} from '../medios/Medios';
import {Exportar} from '../exportar/Exportar';

const PANELES = [
  {id: 'medios', n: 'Medios', i: 'medios'},
  {id: 'inspector', n: 'Elementos', i: 'elementos'},
  {id: 'subtitulos', n: 'Subtítulos', i: 'subtitulos'},
  {id: 'estilo', n: 'Estilo', i: 'estilo'},
  {id: 'cortes', n: 'Cortes', i: 'tijera'},
  {id: 'pipeline', n: 'Pipeline', i: 'pipeline'},
  {id: 'notas', n: 'Notas', i: 'notas'},
  {id: 'claude', n: 'Claude', i: 'claude'},
];

const enCampo = (e: KeyboardEvent) => {
  const t = e.target as HTMLInputElement;
  return t && ((t.tagName === 'INPUT' && t.type !== 'range') || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

// fotograma clave del elemento seleccionado en el cabezal (atajo ⌥K)
const claveEnCabezal = () => {
  const s = useEditor.getState();
  if (!s.sel || !s.data || s.sel.lista === 'hook' || !LISTAS[s.sel.lista].movible) return;
  const r = agregarClave(s.data, s.eventos ?? {}, s.sel, useReloj.getState().frame);
  s.editar({data: r.data, eventos: r.eventos});
  s.avisar('info', 'Fotograma clave agregado');
};
const agregarEnCabezal = (l: Lista) => {
  const s = useEditor.getState();
  if (!s.data) return;
  const r = agregarEvento(s.data, s.eventos ?? {}, l, useReloj.getState().frame);
  s.editar({data: r.data, eventos: r.eventos});
  s.seleccionar(r.sel);
  s.set({panel: 'inspector'});
};

// proyectos con componentes propios: la vista previa los compila (deps.ts); si falla, usa la plantilla ("aproximada")
const InsigniaPropios: React.FC<{lista: string[]}> = ({lista}) => {
  const p = useEditor((s) => s.propios);
  if (p.estado === 'listo')
    return (
      <span data-testid="insignia-propios" className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] text-emerald-200" title={`La vista previa usa los componentes del proyecto (${lista.join(', ')}), igual que el render.`}>
        componentes del proyecto
      </span>
    );
  return (
    <span data-testid="insignia-propios" className="rounded bg-violet-900/50 px-1.5 py-0.5 text-[10px] text-violet-200" title={p.estado === 'error' ? `No se pudieron compilar los componentes del proyecto:\n${p.error}\nLa vista previa usa la plantilla de la skill.` : `Compilando los componentes del proyecto (${lista.join(', ')})…`}>
      {p.estado === 'compilando' ? 'compilando componentes…' : 'vista aproximada'}
    </span>
  );
};

const ALTO_TL = 'reel-alto-timeline';
const altoInicial = () => {
  try {
    return Number(localStorage.getItem(ALTO_TL)) || 280;
  } catch {
    return 280;
  }
};

// se suscribe al cuadro aparte: el resto del editor no se redibuja 30 veces por segundo
const Transporte: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const calidad = useEditor((s) => s.calidad);
  const frame = useReloj((s) => s.frame);
  const total = useReloj((s) => s.total);
  const jugando = useReloj((s) => s.jugando);
  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-t border-zinc-800 px-3 text-xs">
      <Boton v="fantasma" onClick={() => ir(0)} title="Inicio (Home)">
        <Icono n="inicio" />
      </Boton>
      <Boton v="fantasma" onClick={() => mover(-1)} title="Cuadro anterior (←)">
        <Icono n="cuadroAtras" />
      </Boton>
      <button onClick={alternar} data-testid="play" title="Reproducir / pausar (Espacio)" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 transition hover:bg-white">
        <Icono n={jugando ? 'pausa' : 'play'} t={15} />
      </button>
      <Boton v="fantasma" onClick={() => mover(1)} title="Cuadro siguiente (→)">
        <Icono n="cuadroAdelante" />
      </Boton>
      <span className="ml-2 font-mono text-[13px] text-zinc-100 tabular-nums" data-testid="tiempo">
        {tc(frame)} <span className="text-zinc-600">/ {tc(Math.max(0, total - 1))}</span>
      </span>
      <span className="ml-1 font-mono text-[10px] text-zinc-600">{frame}</span>
      <div className="flex-1" />
      <BarraTrabajos />
      {!info.estado.proxy && info.estado.cortado && (
        <Boton v="fantasma" onClick={() => window.reel.correr(info.id, 'Proxy', ['proxy'])} title="Crea public/cut_proxy.mp4 (540×960) para que la vista previa sea fluida">
          Crear proxy
        </Boton>
      )}
      <select
        className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-zinc-300"
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
  );
};

export const Editor: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const panel = useEditor((s) => s.panel);
  const sucios = useEditor((s) => s.sucios);
  const pendiente = useCortePendiente();
  const [pref, setPref] = useState(false);
  const [exportar, setExportar] = useState(false);
  const [altoTL, setAltoTL] = useState(altoInicial);

  useEffect(() => {
    cargarPalabras(info.id, info.clips);
  }, [info.id, info.clips.join(',')]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (enCampo(e)) return;
      const id = accionDe(e, atajos.mapa);
      if (!id) return;
      const v = useVista.getState();
      const hacer: Record<string, () => unknown> = {
        play: alternar,
        cuadroAtras: () => mover(-1),
        cuadroAdelante: () => mover(1),
        segAtras: () => mover(-30),
        segAdelante: () => mover(30),
        inicio: () => ir(0),
        fin: () => ir(useReloj.getState().total - 1),
        corteAnterior: () => irCorte(-1),
        corteSiguiente: () => irCorte(1),
        deshacer: () => historial('deshacer'),
        rehacer: () => historial('rehacer'),
        guardar: () => guardar(true),
        exportar: () => setExportar(true),
        dividir: () => dividir(),
        duplicar: () => duplicarElemento(),
        recortarIni: () => recortar('ini'),
        recortarFin: () => recortar('fin'),
        marcarA: () => marcar('a'),
        marcarB: () => marcar('b'),
        quitar: () => quitarSeleccion(),
        recuperar: () => restaurarSeleccion(),
        aplicar: () => hayCortePendiente(useEditor.getState()) && aplicar(),
        empujarAtras: () => empujarElemento(-1),
        empujarAdelante: () => empujarElemento(1),
        empujarAtras5: () => empujarElemento(-5),
        empujarAdelante5: () => empujarElemento(5),
        clave: () => claveEnCabezal(),
        texto: () => agregarEnCabezal('textos'),
        deseleccionar: () => (v.set({rango: null, herramienta: 'seleccion'}), useEditor.getState().seleccionar(null)),
        cuchilla: () => v.set({herramienta: 'cuchilla'}),
        seleccion: () => v.set({herramienta: 'seleccion'}),
        iman: () => v.set({iman: !v.iman}),
        acercar: () => zoomVista.aplicar(1.5),
        alejar: () => zoomVista.aplicar(1 / 1.5),
        verTodo: () => zoomVista.ajustar(),
      };
      if (!hacer[id]) return;
      // las flechas arriba/abajo, Espacio y las de ⌘ no deben llegar al navegador (desplazar, guardar página…)
      if (['play', 'corteAnterior', 'corteSiguiente', 'deshacer', 'rehacer', 'guardar', 'exportar', 'duplicar', 'clave'].includes(id) || e.metaKey || e.ctrlKey) e.preventDefault();
      hacer[id]();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const volver = async () => {
    await guardar(false);
    await window.reel.cerrar(info.id);
    useEditor.getState().cerrar();
  };

  const redimensionar = (e: React.PointerEvent) => {
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = altoTL;
    let ultimo = h0;
    const mov = (ev: PointerEvent) => {
      ultimo = Math.max(150, Math.min(window.innerHeight - 320, h0 + y0 - ev.clientY));
      setAltoTL(ultimo);
    };
    const fin = () => {
      window.removeEventListener('pointermove', mov);
      window.removeEventListener('pointerup', fin);
      try {
        localStorage.setItem(ALTO_TL, String(ultimo));
      } catch {
        /* solo es una comodidad */
      }
    };
    window.addEventListener('pointermove', mov);
    window.addEventListener('pointerup', fin);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100" data-testid="editor">
      {/* barra superior */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-800 pr-3 pl-20" style={{WebkitAppRegion: 'drag'} as React.CSSProperties}>
        <div className="flex min-w-0 items-center gap-2" style={{WebkitAppRegion: 'no-drag'} as React.CSSProperties}>
          <Boton v="fantasma" onClick={volver} title="Volver a la biblioteca" data-testid="volver">
            <Icono n="atras" />
          </Boton>
          <div className="max-w-[340px] truncate text-[13px] font-semibold" title={info.ruta}>
            {info.nombre}
          </div>
          {info.estilo && <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">{info.estilo}</span>}
          <span className="flex items-center gap-1 text-[11px] text-zinc-500" data-testid="estado-guardado">
            <span className={`h-1.5 w-1.5 rounded-full ${sucios.length ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <span>{sucios.length ? 'guardando…' : 'guardado'}</span>
          </span>
          {pendiente && <span className="rounded bg-acento/20 px-1.5 py-0.5 text-[10px] text-rose-200">recortes sin aplicar</span>}
          {info.estado.componentesPropios.length > 0 && <InsigniaPropios lista={info.estado.componentesPropios} />}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5" style={{WebkitAppRegion: 'no-drag'} as React.CSSProperties}>
          <Boton v="fantasma" onClick={() => historial('deshacer')} title="Deshacer (⌘Z)" data-testid="deshacer">
            <Icono n="deshacer" />
          </Boton>
          <Boton v="fantasma" onClick={() => historial('rehacer')} title="Rehacer (⇧⌘Z)">
            <Icono n="rehacer" />
          </Boton>
          <Boton v="fantasma" onClick={() => setPref(true)} title="Preferencias">
            <Icono n="ajustes" />
          </Boton>
          <div className="mx-1 h-4 w-px bg-zinc-800" />
          <Boton onClick={() => pedirDatos()} title="Regenerar src/data.json (reel datos)">
            Actualizar datos
          </Boton>
          <Boton onClick={() => window.reel.correr(info.id, 'Borrador', ['render', '--borrador'])}>Borrador</Boton>
          <Boton v="primario" onClick={() => setExportar(true)} data-testid="abrir-exportar" title="Exportar (⌘E): calidad, formatos, SRT, portada y compartir">
            <span className="flex items-center gap-1.5">
              <Icono n="exportar" t={14} />
              Exportar
            </span>
          </Boton>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {/* centro: vista previa + transporte */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-3">
            <Visor />
          </div>
          <Transporte />
        </div>
        {/* derecha: paneles */}
        <div className="flex w-[368px] shrink-0 flex-col border-l border-zinc-800">
          <div className="flex shrink-0 border-b border-zinc-800">
            {PANELES.map((p) => (
              <button
                key={p.id}
                data-testid={`tab-${p.id}`}
                onClick={() => useEditor.getState().set({panel: p.id})}
                className={`flex flex-1 flex-col items-center gap-1 border-b-2 pt-2 pb-1.5 text-[10px] transition ${panel === p.id ? 'border-acento text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                <Icono n={p.i} t={15} />
                {p.n}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {panel === 'medios' && <Medios />}
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
      <div className="relative shrink-0 border-t border-zinc-800" style={{height: altoTL}}>
        <div data-testid="asa-timeline" onPointerDown={redimensionar} className="absolute -top-1 right-0 left-0 z-50 h-2 cursor-row-resize hover:bg-acento/40" title="Arrastra para cambiar la altura" />
        <Timeline />
      </div>
      {pref && <Preferencias cerrar={() => setPref(false)} />}
      {exportar && <Exportar cerrar={() => setExportar(false)} />}
    </div>
  );
};
