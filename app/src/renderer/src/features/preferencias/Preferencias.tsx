// Preferencias: rutas (skill y Python del toolkit), tema, calidad por defecto de la vista previa, atajos de teclado,
// estado del toolkit (con instalar/reparar) y buscar actualizaciones (git del repo + reinstalar la app).
import React, {useEffect, useState} from 'react';
import type {EstadoActualizacion, Herramientas, Preferencias as Prefs} from '@shared/tipos';
import {useEditor} from '@/store';
import {Boton, Etiqueta, inputCls} from '@/ui';
import {ACCIONES, combosDe, comboDe, conflictos, textoCombo, type Atajos} from '@shared/atajos';
import {ponerAtajos} from '@/store';

// gestos del ratón (no se pueden cambiar): los atajos de teclado salen de shared/atajos.ts y se editan abajo
export const GESTOS: [string, string][] = [
  ['Alt al arrastrar', 'Sin imanes (lienzo) / sin pegar a palabra (línea de tiempo)'],
  ['⇧ al rotar', 'Rotación libre (sin saltos de 45°)'],
  ['Pellizco / ⌘ o Alt + rueda', 'Zoom de la línea de tiempo'],
  ['Rueda / botón central', 'Desplazar la línea de tiempo'],
  ['Doble clic (Subtítulos)', 'Corregir la palabra'],
  ['Alt + clic (Cortes)', 'Dividir la pieza en esa palabra'],
  ['Arrastrar desde Medios o Finder', 'Agregar el archivo en ese punto de la línea de tiempo'],
];

// tabla de atajos editable: clic en la combinación → presiona la nueva (Esc cancela, ⌫ la quita)
const EditorAtajos: React.FC<{propios: Atajos; guardar: (a: Atajos) => void}> = ({propios, guardar}) => {
  const [grabando, setGrabando] = useState<string | null>(null);
  useEffect(() => {
    if (!grabando) return;
    const k = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') return setGrabando(null);
      const c = comboDe(e);
      if (!c) return; // solo un modificador: seguir esperando
      const a = ACCIONES.find((x) => x.id === grabando)!;
      const n = {...propios, [a.id]: e.key === 'Backspace' && !e.metaKey ? [] : [c]};
      guardar(n);
      setGrabando(null);
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [grabando, propios]);
  const choques = new Map(conflictos(propios));
  const grupos = [...new Set(ACCIONES.map((a) => a.grupo))];
  return (
    <div data-testid="pref-atajos">
      {grupos.map((g) => (
        <div key={g} className="mb-3">
          <div className="mb-1 text-[10px] tracking-wide text-zinc-500 uppercase">{g}</div>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1 text-xs">
            {ACCIONES.filter((a) => a.grupo === g).map((a) => {
              const combos = combosDe(a, propios);
              const choca = combos.some((c) => choques.has(c));
              return (
                <React.Fragment key={a.id}>
                  <span className="text-zinc-400">{a.n}</span>
                  <button
                    data-testid={`atajo-${a.id}`}
                    onClick={() => setGrabando(a.id)}
                    title="Clic y presiona la nueva combinación (Esc cancela, ⌫ la deja sin atajo)"
                    className={`min-w-[96px] rounded px-1.5 py-0.5 text-center font-mono text-[11px] ${grabando === a.id ? 'animate-pulse bg-acento text-white' : choca ? 'bg-amber-900/60 text-amber-100' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}
                  >
                    {grabando === a.id ? 'presiona…' : combos.length ? combos.map(textoCombo).join(' / ') : '—'}
                  </button>
                  <button className={`text-[11px] ${propios[a.id] ? 'text-zinc-400 hover:text-white' : 'invisible'}`} title="Volver al valor por defecto" onClick={() => {
                    const n = {...propios};
                    delete n[a.id];
                    guardar(n);
                  }}>
                    ↺
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
      {choques.size > 0 && <div className="mb-2 text-[11px] text-amber-300">Hay combinaciones repetidas (en ámbar): solo una de las acciones responderá.</div>}
    </div>
  );
};

export const aplicarTema = (tema: Prefs['tema']) => {
  document.documentElement.dataset.tema = tema;
};

export const Preferencias: React.FC<{cerrar: () => void}> = ({cerrar}) => {
  const [p, setP] = useState<Prefs | null>(null);
  const [herr, setHerr] = useState<Herramientas | null>(null);
  const [act, setAct] = useState<EstadoActualizacion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const trabajos = useEditor((s) => s.trabajos);
  useEffect(() => {
    window.reel.preferencias().then(setP);
    window.reel.herramientas().then(setHerr);
  }, []);
  const guardar = async (cambio: Partial<Prefs>) => {
    const n = await window.reel.guardarPreferencias(cambio);
    setP(n);
    if (cambio.tema) aplicarTema(n.tema);
    if (cambio.atajos) ponerAtajos(n.atajos);
    if (cambio.skill !== undefined || cambio.python !== undefined) setHerr(await window.reel.herramientas());
  };
  const actualizando = trabajos.find((t) => t.titulo === 'Actualizar Reel Studio');
  const reparando = trabajos.find((t) => t.titulo === 'Instalar / reparar toolkit');
  const probando = trabajos.find((t) => t.titulo === 'Probar toolkit');
  if (!p) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" data-testid="preferencias" onClick={cerrar}>
      <div className="max-h-[88vh] w-[620px] overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Preferencias</h2>
          <Boton v="fantasma" onClick={cerrar}>
            Cerrar
          </Boton>
        </div>

        <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">Rutas</h3>
        <div className="space-y-2">
          <Etiqueta n={`Skill editar-reel (vacío = automático${herr ? `: ${herr.skill}` : ''})`}>
            <div className="flex gap-1">
              <input className={inputCls} value={p.skill} placeholder="automático" onChange={(e) => setP({...p, skill: e.target.value})} onBlur={() => guardar({skill: p.skill})} data-testid="pref-skill" />
              <Boton
                onClick={async () => {
                  const r = await window.reel.elegirCarpeta('Carpeta skill/editar-reel');
                  if (r) guardar({skill: r});
                }}
              >
                Elegir…
              </Boton>
            </div>
          </Etiqueta>
          <Etiqueta n={`Python del toolkit (vacío = ${herr?.python ?? '~/.reels-toolkit/venv/bin/python'})`}>
            <div className="flex gap-1">
              <input className={inputCls} value={p.python} placeholder="automático" onChange={(e) => setP({...p, python: e.target.value})} onBlur={() => guardar({python: p.python})} />
              <Boton
                onClick={async () => {
                  const r = await window.reel.elegirArchivo();
                  if (r) guardar({python: r});
                }}
              >
                Elegir…
              </Boton>
            </div>
          </Etiqueta>
        </div>

        <h3 className="mt-5 mb-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">Apariencia y vista previa</h3>
        <div className="grid grid-cols-2 gap-2">
          <Etiqueta n="Tema">
            <select className={inputCls} value={p.tema} onChange={(e) => guardar({tema: e.target.value as Prefs['tema']})} data-testid="pref-tema">
              <option value="oscuro">Oscuro</option>
              <option value="claro">Claro</option>
            </select>
          </Etiqueta>
          <Etiqueta n="Calidad al abrir un proyecto">
            <select className={inputCls} value={p.calidad} onChange={(e) => guardar({calidad: e.target.value as Prefs['calidad']})}>
              <option value="proxy">Proxy (fluido, si existe)</option>
              <option value="completa">Calidad completa</option>
            </select>
          </Etiqueta>
        </div>

        <h3 className="mt-5 mb-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">Toolkit</h3>
        <div className="rounded-md border border-zinc-800 p-2 text-xs" data-testid="pref-toolkit">
          {herr?.toolkit ? (
            <span className="text-emerald-400">✓ Toolkit completo (Python, reel.py, binarios Swift, Whisper, Remotion)</span>
          ) : (
            <span className="text-amber-300">Falta: {herr?.detalles.join(' · ')}</span>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Boton onClick={() => window.reel.repararToolkit()} disabled={reparando?.estado === 'corriendo'}>
              Instalar / reparar toolkit
            </Boton>
            <Boton onClick={() => window.reel.probarToolkit()} disabled={probando?.estado === 'corriendo'} data-testid="probar-toolkit">
              Probar toolkit
            </Boton>
            {probando && (
              <span className={`text-[11px] ${probando.estado === 'ok' ? 'text-emerald-400' : probando.estado === 'error' ? 'text-rose-300' : 'text-zinc-400'}`} data-testid="resultado-prueba">
                {probando.estado === 'corriendo' ? `probando… ${probando.ultimo ?? ''}` : probando.estado === 'ok' ? `✓ ${probando.lineas.filter((l) => l.tipo === 'ok').pop()?.msg ?? 'OK'}` : `✗ ${probando.ultimo ?? ''}`}
              </span>
            )}
            {reparando && <span className="truncate text-[11px] text-zinc-400">{reparando.estado === 'corriendo' ? 'instalando… (puede tardar varios minutos)' : reparando.estado}</span>}
          </div>
        </div>

        <h3 className="mt-5 mb-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">Actualizaciones</h3>
        <div className="rounded-md border border-zinc-800 p-2 text-xs" data-testid="pref-actualizaciones">
          <div className="flex items-center gap-2">
            <Boton
              disabled={buscando}
              onClick={async () => {
                setBuscando(true);
                setAct(await window.reel.buscarActualizaciones());
                setBuscando(false);
              }}
              data-testid="buscar-actualizaciones"
            >
              {buscando ? 'Buscando…' : 'Buscar actualizaciones'}
            </Boton>
            {act && !act.error && (
              <span className="text-zinc-300" data-testid="estado-actualizacion">
                {act.atras > 0 ? `Hay ${act.atras} cambio${act.atras === 1 ? '' : 's'} nuevo${act.atras === 1 ? '' : 's'} en ${act.rama}` : `Al día (${act.rama})`}
              </span>
            )}
            {act?.error && <span className="text-rose-300">{act.error}</span>}
          </div>
          {act && !act.error && <div className="mt-1 text-[11px] text-zinc-500">Última versión local: {act.ultimo}</div>}
          {act && act.atras > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <Boton v="primario" disabled={act.cambiosLocales || actualizando?.estado === 'corriendo'} onClick={() => window.reel.actualizarApp()}>
                Actualizar ahora
              </Boton>
              {act.cambiosLocales && <span className="text-[11px] text-amber-300">Hay cambios sin guardar en el repo: haz commit antes de actualizar.</span>}
            </div>
          )}
          {actualizando && (
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span className="text-zinc-400">{actualizando.estado === 'corriendo' ? 'Actualizando…' : actualizando.estado === 'ok' ? '✓ Actualizada.' : `✗ ${actualizando.ultimo ?? ''}`}</span>
              {actualizando.estado === 'ok' && (
                <Boton v="primario" onClick={() => window.reel.reiniciar()}>
                  Reiniciar Reel Studio
                </Boton>
              )}
            </div>
          )}
        </div>

        <h3 className="mt-5 mb-2 flex items-center text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
          <span className="flex-1">Atajos de teclado</span>
          {Object.keys(p.atajos ?? {}).length > 0 && (
            <Boton v="fantasma" onClick={() => guardar({atajos: {}})}>
              Restaurar todos
            </Boton>
          )}
        </h3>
        <EditorAtajos propios={p.atajos ?? {}} guardar={(a) => guardar({atajos: a})} />
        <div className="mt-3 grid grid-cols-[180px_1fr] gap-x-3 gap-y-1 text-xs">
          {GESTOS.map(([k, d]) => (
            <React.Fragment key={k}>
              <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-center font-mono text-[11px] text-zinc-200">{k}</kbd>
              <span className="text-zinc-400">{d}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
