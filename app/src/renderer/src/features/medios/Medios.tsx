// Panel Medios: la biblioteca del proyecto (videos, imágenes y audio de public/). Importar (botón o soltar desde Finder),
// escuchar/ver, y agregar al cuadro actual con "+" o arrastrando a la línea de tiempo o a la vista previa.
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useEditor} from '@/store';
import {useReloj, tc} from '@/reloj';
import {Boton, Seccion, Vacio, inputCls} from '@/ui';
import {DIRS_MEDIOS} from '../inspector/Inspector';
import {EXTENSIONES, MIME_MEDIO, agregarMedio, aceptaSoltar, correrYLeer, importar, quitarFondo, tipoDe, type Como, type TipoMedio} from './importar';

const GRUPOS: {t: TipoMedio; n: string}[] = [
  {t: 'video', n: 'Videos'},
  {t: 'imagen', n: 'Imágenes'},
  {t: 'audio', n: 'Audio'},
];
const OPCIONES: Record<TipoMedio, {como: Como; n: string}[]> = {
  video: [
    {como: 'superpuestos', n: 'Encima (PiP)'},
    {como: 'completo', n: 'Pantalla completa'},
    {como: 'broll', n: 'B-roll (sin audio)'},
  ],
  imagen: [
    {como: 'superpuestos', n: 'Encima'},
    {como: 'completo', n: 'Pantalla completa'},
    {como: 'images', n: 'Imagen con animación'},
  ],
  audio: [{como: 'audios', n: 'Pista de audio'}],
};

const Miniatura: React.FC<{url: string; t: TipoMedio}> = ({url, t}) => {
  const [sonando, setSonando] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  if (t === 'imagen') return <img src={url} className="h-full w-full object-contain" draggable={false} />;
  if (t === 'video') return <video src={`${url}#t=0.5`} muted preload="metadata" className="h-full w-full object-cover" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => (e.currentTarget.pause(), (e.currentTarget.currentTime = 0.5))} />;
  return (
    <button
      className="flex h-full w-full items-center justify-center text-2xl text-emerald-300 hover:text-white"
      title={sonando ? 'Detener' : 'Escuchar'}
      onClick={(e) => {
        e.stopPropagation();
        const a = audio.current;
        if (!a) return;
        if (sonando) a.pause();
        else a.play().catch(() => {});
      }}
    >
      {sonando ? '■' : '♪'}
      <audio ref={audio} src={url} onPlay={() => setSonando(true)} onPause={() => setSonando(false)} onEnded={() => setSonando(false)} />
    </button>
  );
};

export const Medios: React.FC = () => {
  const info = useEditor((s) => s.info);
  const trabajos = useEditor((s) => s.trabajos.length);
  const [archivos, setArchivos] = useState<string[]>([]);
  const [filtro, setFiltro] = useState('');
  const [ver, setVer] = useState(0);
  const [encima, setEncima] = useState(false);

  useEffect(() => {
    if (!info) return;
    Promise.all(DIRS_MEDIOS.map(async (d) => (await window.reel.listar(info.id, d)).map((f) => (d === 'public' ? f : `${d.slice(7)}/${f}`)))).then((r) =>
      setArchivos([...new Set(r.flat())].filter((f) => tipoDe(f) && !/^cut(_proxy|_voz)?\.mp4$/.test(f) && !f.startsWith('sfx/'))),
    );
  }, [info, ver, trabajos]);

  const grupos = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return GRUPOS.map((g) => ({...g, l: archivos.filter((f) => tipoDe(f) === g.t && (!q || f.toLowerCase().includes(q)))}));
  }, [archivos, filtro]);

  if (!info) return null;
  const base = `${info.base}`;

  const traer = async (rutas: string[]) => {
    if (!rutas.length) return;
    await importar(rutas);
    setVer((v) => v + 1);
  };

  return (
    <div
      data-testid="panel-medios"
      className={`min-h-full ${encima ? 'bg-sky-950/40 outline-2 -outline-offset-4 outline-sky-500 outline-dashed' : ''}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        traer([...e.dataTransfer.files].map((x) => window.reel.rutaDeArchivo(x)).filter(Boolean));
      }}
    >
      <Seccion
        titulo="Medios del proyecto"
        acciones={
          <Boton v="primario" data-testid="importar-medios" onClick={async () => traer(await window.reel.elegirArchivos([{name: 'Video, imagen o audio', extensions: EXTENSIONES}]))}>
            Importar…
          </Boton>
        }
      >
        <div className="mb-2 text-[11px] text-zinc-500">
          Arrastra un archivo a la línea de tiempo o a la vista previa, o usa <b>+</b> para ponerlo en el cabezal. También puedes soltar archivos de Finder aquí.
        </div>
        <input className={inputCls} placeholder="Buscar…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </Seccion>
      <TextoAVoz alTerminar={() => setVer((v) => v + 1)} />
      {archivos.length === 0 && <Vacio>Aún no hay medios en public/. Importa videos, fotos o música.</Vacio>}
      {grupos.map(
        (g) =>
          g.l.length > 0 && (
            <Seccion key={g.t} titulo={`${g.n} (${g.l.length})`}>
              <div className="grid grid-cols-2 gap-2">
                {g.l.map((f) => (
                  <Tarjeta key={f} f={f} t={g.t} url={base + f.split('/').map(encodeURIComponent).join('/')} />
                ))}
              </div>
            </Seccion>
          ),
      )}
    </div>
  );
};

// texto a voz (voces de macOS): genera public/audio/voz….wav y lo agrega como pista de audio en el cabezal
const TextoAVoz: React.FC<{alTerminar: () => void}> = ({alTerminar}) => {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [voces, setVoces] = useState<{nombre: string; idioma: string}[]>([]);
  const [voz, setVoz] = useState('');
  const [vel, setVel] = useState(185);
  const [generando, setGenerando] = useState(false);
  useEffect(() => {
    if (!abierto || voces.length) return;
    correrYLeer<{voces: {nombre: string; idioma: string}[]}>('Voces', ['tts', '--voces']).then((r) => {
      setVoces(r?.voces ?? []);
      setVoz(r?.voces?.[0]?.nombre ?? '');
    });
  }, [abierto]);
  return (
    <Seccion titulo="Texto a voz" acciones={<Boton v="fantasma" onClick={() => setAbierto(!abierto)} data-testid="abrir-tts">{abierto ? 'Ocultar' : 'Abrir'}</Boton>}>
      {abierto && (
        <div className="flex flex-col gap-1.5" data-testid="tts">
          <textarea className={inputCls} rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe lo que dirá la voz en off…" data-testid="tts-texto" />
          <div className="flex gap-1">
            <select className={inputCls} value={voz} onChange={(e) => setVoz(e.target.value)}>
              {voces.length === 0 && <option>cargando voces…</option>}
              {voces.map((v) => (
                <option key={v.nombre} value={v.nombre}>
                  {v.nombre.replace(/ \(Spanish \((.+)\)\)$/, ' ($1)')} · {v.idioma.replace('es_', '')}
                </option>
              ))}
            </select>
            <input type="number" className={inputCls} style={{width: 70, flex: 'none'}} value={vel} min={90} max={360} step={5} onChange={(e) => setVel(Number(e.target.value))} title="Palabras por minuto" />
          </div>
          <Boton
            v="primario"
            disabled={!texto.trim() || generando}
            data-testid="tts-generar"
            onClick={async () => {
              setGenerando(true);
              const f = useReloj.getState().frame;
              const r = await correrYLeer<{archivo: string}>('Texto a voz', ['tts', texto, ...(voz ? ['--voz', voz] : []), '--velocidad', String(vel)]);
              setGenerando(false);
              if (!r?.archivo) return useEditor.getState().avisar('error', 'No se pudo generar la voz.');
              alTerminar();
              await agregarMedio(r.archivo, f, 'audios');
              setTexto('');
            }}
          >
            {generando ? 'Generando…' : 'Generar y agregar en el cabezal'}
          </Boton>
        </div>
      )}
    </Seccion>
  );
};

const Tarjeta: React.FC<{f: string; t: TipoMedio; url: string}> = ({f, t, url}) => {
  const [menu, setMenu] = useState(false);
  const agregar = (como?: Como) => {
    setMenu(false);
    agregarMedio(f, useReloj.getState().frame, como);
  };
  return (
    <div
      className="group relative overflow-hidden rounded-md border border-zinc-800 bg-zinc-900"
      draggable
      data-testid={`medio-${f}`}
      onDragStart={(e) => {
        e.dataTransfer.setData(MIME_MEDIO, f);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      title={`${f}\nArrastra a la línea de tiempo o usa + para ponerlo en ${tc(useReloj.getState().frame)}`}
    >
      <div className="h-20 bg-black">
        <Miniatura url={url} t={t} />
      </div>
      <div className="flex items-center gap-1 px-1.5 py-1">
        <span className="min-w-0 flex-1 truncate text-[10px] text-zinc-300">{f.split('/').pop()}</span>
        <button className="rounded bg-zinc-700 px-1.5 text-[11px] leading-5 text-white hover:bg-acento" onClick={() => agregar()} title="Agregar en el cabezal" data-testid={`agregar-medio-${f}`}>
          +
        </button>
        {(OPCIONES[t].length > 1 || t !== 'audio') && (
          <button className="rounded px-1 text-[11px] leading-5 text-zinc-400 hover:text-white" onClick={() => setMenu((m) => !m)} title="Agregar como…">
            ▾
          </button>
        )}
      </div>
      {menu && (
        <div className="absolute inset-x-1 bottom-8 z-10 flex flex-col rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
          {OPCIONES[t].map((o) => (
            <button key={o.como} className="rounded px-2 py-1 text-left text-[11px] text-zinc-200 hover:bg-zinc-800" onClick={() => agregar(o.como)}>
              {o.n}
            </button>
          ))}
          {t !== 'audio' && !/ sin fondo\.(webm|png)$/.test(f) && (
            <button
              data-testid={`sinfondo-${f}`}
              className="rounded border-t border-zinc-800 px-2 py-1 text-left text-[11px] text-sky-300 hover:bg-zinc-800"
              onClick={() => {
                setMenu(false);
                quitarFondo(f, useReloj.getState().frame);
              }}
            >
              Quitar fondo (deja a la persona)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// para soltar en la vista previa / línea de tiempo
export {aceptaSoltar};
