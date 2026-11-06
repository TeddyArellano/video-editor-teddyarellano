// Pantalla de inicio: proyectos recientes, abrir una carpeta y crear un proyecto nuevo.
import React, {useEffect, useState} from 'react';
import type {Herramientas, Reciente} from '@shared/tipos';
import {Boton} from '@/ui';
import {NuevoProyecto} from '../pipeline/NuevoProyecto';

export const Biblioteca: React.FC<{abrir: (ruta: string) => void}> = ({abrir}) => {
  const [rec, setRec] = useState<Reciente[]>([]);
  const [herr, setHerr] = useState<Herramientas | null>(null);
  const [nuevo, setNuevo] = useState(false);
  useEffect(() => {
    window.reel.recientes().then(setRec);
    window.reel.herramientas().then(setHerr);
  }, []);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100" data-testid="biblioteca">
      <div className="h-10 shrink-0" style={{WebkitAppRegion: 'drag'} as React.CSSProperties} />
      <div className="mx-auto w-full max-w-4xl flex-1 overflow-auto px-8 pb-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reel Studio</h1>
            <p className="mt-1 text-sm text-zinc-400">Editor visual de la skill /editar-reel. Abre un proyecto o crea uno nuevo.</p>
          </div>
          <div className="flex gap-2">
            <Boton onClick={() => setNuevo(true)}>+ Nuevo proyecto</Boton>
            <Boton
              v="primario"
              data-testid="abrir-carpeta"
              onClick={async () => {
                const r = await window.reel.elegirCarpeta('Abrir proyecto (carpeta del material o proyecto_remotion)');
                if (r) abrir(r);
              }}
            >
              Abrir carpeta…
            </Boton>
          </div>
        </div>
        {herr && !herr.toolkit && (
          <div className="mb-6 rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 text-xs text-amber-200">
            El toolkit no está completo: {herr.detalles.join(' · ')}. Corre <code>zsh skill/editar-reel/setup.sh</code> (o <code>install.sh</code>) en el repo.
          </div>
        )}
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Recientes</h2>
        {rec.length === 0 && <p className="text-sm text-zinc-500">Aún no has abierto proyectos.</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rec.map((r) => (
            <button
              key={r.ruta}
              onClick={() => abrir(r.ruta)}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-left transition hover:border-sky-600 hover:bg-zinc-900"
            >
              <div className="truncate text-sm font-medium">{r.nombre}</div>
              <div className="mt-0.5 truncate text-[11px] text-zinc-500">{r.ruta.replace(/^\/Users\/[^/]+/, '~')}</div>
              <div className="mt-1 text-[11px] text-zinc-500">
                {r.estilo && <span className="mr-2 rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">{r.estilo}</span>}
                {new Date(r.abierto).toLocaleString('es-MX', {dateStyle: 'medium', timeStyle: 'short'})}
              </div>
            </button>
          ))}
        </div>
      </div>
      {nuevo && <NuevoProyecto cerrar={() => setNuevo(false)} abrir={abrir} />}
    </div>
  );
};
