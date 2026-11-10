// Pantalla de inicio: todos los videos (los abiertos aquí y los editados con la skill), buscar, abrir y crear.
import React, {useEffect, useMemo, useState} from 'react';
import type {Herramientas, Reciente} from '@shared/tipos';
import {Boton, inputCls} from '@/ui';
import {Icono} from '@/iconos';
import {NuevoProyecto} from '../pipeline/NuevoProyecto';
import {Preferencias} from '../preferencias/Preferencias';
import {useEditor} from '@/store';

const haceCuanto = (t: number) => {
  if (!t) return '';
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  return new Date(t).toLocaleDateString('es-MX', {day: 'numeric', month: 'short', year: 'numeric'});
};

const Tarjeta: React.FC<{r: Reciente; abrir: (ruta: string) => void}> = ({r, abrir}) => {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    window.reel.miniatura(r.ruta).then((x) => vivo && setImg(x));
    return () => {
      vivo = false;
    };
  }, [r.ruta, r.editado]);
  const soloSkill = !r.abierto;
  return (
    <button onClick={() => abrir(r.ruta)} data-testid="reciente" data-ruta={r.ruta} className="group min-w-0 text-left" title={r.ruta.replace(/^\/Users\/[^/]+/, '~')}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800 transition group-hover:ring-2 group-hover:ring-acento">
        {img ? <img src={img} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-zinc-700"><Icono n="tijera" t={26} /></div>}
        {r.estilo && <span className="absolute top-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-zinc-200 backdrop-blur">{r.estilo}</span>}
        {soloSkill && <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-zinc-200 backdrop-blur" title="Editado con la skill; todavía no lo abres aquí"><Icono n="claude" t={10} />skill</span>}
      </div>
      <div className="mt-2 truncate text-[13px] font-medium text-zinc-100">{r.nombre}</div>
      <div className="mt-0.5 truncate text-[11px] text-zinc-500">{haceCuanto(Math.max(r.abierto, r.editado))}</div>
    </button>
  );
};

export const Biblioteca: React.FC<{abrir: (ruta: string) => void}> = ({abrir}) => {
  const [rec, setRec] = useState<Reciente[]>([]);
  const [herr, setHerr] = useState<Herramientas | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [pref, setPref] = useState(false);
  const [q, setQ] = useState('');
  const reparando = useEditor((s) => s.trabajos.find((t) => t.titulo === 'Instalar / reparar toolkit'));
  const buscando = useEditor((s) => s.trabajos.find((t) => t.titulo === 'Buscar videos' && (t.estado === 'en_cola' || t.estado === 'corriendo')));
  useEffect(() => {
    const cargar = () => window.reel.recientes().then(setRec);
    cargar();
    window.reel.herramientas().then(setHerr);
    return window.reel.onRecientes(cargar); // la skill registró o editó un video mientras la app está abierta
  }, []);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rec.filter((r) => `${r.nombre} ${r.estilo} ${r.ruta}`.toLowerCase().includes(t)) : rec;
  }, [rec, q]);

  const buscarCarpeta = async () => {
    const c = await window.reel.elegirCarpeta('Buscar videos en esta carpeta');
    if (c) await window.reel.buscarProyectos(c);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100" data-testid="biblioteca">
      <div className="h-10 shrink-0" style={{WebkitAppRegion: 'drag'} as React.CSSProperties} />
      <div className="mx-auto w-full max-w-6xl flex-1 overflow-auto px-8 pb-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reel Studio</h1>
            <p className="mt-1 text-sm text-zinc-500">Cada video que editas con la skill aparece aquí solo.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Boton v="fantasma" onClick={() => setPref(true)} title="Preferencias" data-testid="abrir-preferencias">
              <Icono n="ajustes" />
            </Boton>
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
          <div className="mb-6 rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 text-xs text-amber-200" data-testid="aviso-toolkit">
            <div className="mb-2 font-semibold">Primer arranque: falta preparar el toolkit de la skill</div>
            <div className="mb-2">{herr.detalles.join(' · ')}</div>
            <div className="flex items-center gap-2">
              <Boton v="primario" disabled={reparando?.estado === 'corriendo'} onClick={() => window.reel.repararToolkit()}>
                Instalar / reparar toolkit
              </Boton>
              <span className="text-amber-300/80">
                {reparando
                  ? reparando.estado === 'corriendo'
                    ? `instalando… ${reparando.ultimo ?? ''}`
                    : reparando.estado === 'ok'
                      ? '✓ listo'
                      : `✗ ${reparando.ultimo ?? ''}`
                  : 'corre install.sh del repo (Homebrew, Whisper, Python, binarios Swift, Remotion)'}
              </span>
              {reparando?.estado === 'ok' && <Boton onClick={() => window.reel.herramientas().then(setHerr)}>Verificar de nuevo</Boton>}
            </div>
          </div>
        )}
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Recientes{rec.length > 0 && <span className="ml-1.5 font-normal text-zinc-600">{rec.length}</span>}
          </h2>
          <div className="flex-1" />
          <div className="relative w-64">
            <span className="absolute top-1/2 left-2 -translate-y-1/2 text-zinc-500"><Icono n="buscar" t={13} /></span>
            <input className={`${inputCls} pl-7`} placeholder="Buscar video…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="buscar-reciente" />
          </div>
          <Boton v="fantasma" onClick={buscarCarpeta} disabled={!!buscando} title="Agrega a la lista los videos que encuentre en una carpeta" data-testid="buscar-videos">
            <Icono n="carpeta" />
            {buscando ? 'Buscando…' : 'Buscar videos…'}
          </Boton>
        </div>
        {rec.length === 0 && <p className="text-sm text-zinc-500">Todavía no hay videos. Edita uno con /editar-reel o abre una carpeta.</p>}
        {rec.length > 0 && visibles.length === 0 && <p className="text-sm text-zinc-500">Ningún video coincide con “{q}”.</p>}
        <div className="grid gap-x-4 gap-y-5" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))'}} data-testid="lista-recientes">
          {visibles.map((r) => (
            <Tarjeta key={r.ruta} r={r} abrir={abrir} />
          ))}
        </div>
      </div>
      {nuevo && <NuevoProyecto cerrar={() => setNuevo(false)} abrir={abrir} />}
      {pref && <Preferencias cerrar={() => setPref(false)} />}
    </div>
  );
};
