// Pipeline: todos los pasos de la skill con botones (inventario → SDR → transcribir → … → render final → extras),
// utilidades (logos, QR, b-roll, recorte, intro 3D), versiones y la cola de trabajos con progreso.
import React, {useEffect, useState} from 'react';
import type {Trabajo} from '@shared/tipos';
import {useEditor} from '@/store';
import {useReloj} from '@/reloj';
import {Boton, Etiqueta, inputCls, Seccion} from '@/ui';

const correr = (titulo: string, comando: string[]) => {
  const info = useEditor.getState().info!;
  return window.reel.correr(info.id, titulo, comando);
};

export const BarraTrabajos: React.FC = () => {
  const trabajos = useEditor((s) => s.trabajos);
  const activo = trabajos.find((t) => t.estado === 'corriendo');
  const enCola = trabajos.filter((t) => t.estado === 'en_cola').length;
  if (!activo) return enCola ? <span className="text-[11px] text-zinc-500">{enCola} en cola</span> : null;
  return (
    <button className="flex items-center gap-2 text-[11px] text-zinc-300" onClick={() => useEditor.getState().set({panel: 'pipeline'})} data-testid="barra-trabajo">
      <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
      {activo.titulo}
      {activo.pct !== undefined && (
        <span className="inline-block h-1.5 w-24 overflow-hidden rounded bg-zinc-800">
          <span className="block h-full bg-sky-500" style={{width: `${activo.pct}%`}} />
        </span>
      )}
      {enCola > 0 && <span className="text-zinc-500">+{enCola}</span>}
    </button>
  );
};

const FilaTrabajo: React.FC<{t: Trabajo}> = ({t}) => {
  const [ver, setVer] = useState(false);
  const color = t.estado === 'ok' ? 'text-emerald-400' : t.estado === 'error' ? 'text-rose-400' : t.estado === 'corriendo' ? 'text-sky-400' : 'text-zinc-500';
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/50 p-2 text-[11px]" data-testid="trabajo">
      <div className="flex items-center gap-2">
        <span className={`font-medium ${color}`}>{t.estado === 'corriendo' ? '●' : t.estado === 'ok' ? '✓' : t.estado === 'error' ? '✗' : '○'}</span>
        <span className="flex-1 truncate text-zinc-200">{t.titulo}</span>
        {t.inicio && t.fin && <span className="text-zinc-500">{((t.fin - t.inicio) / 1000).toFixed(1)} s</span>}
        {(t.estado === 'corriendo' || t.estado === 'en_cola') && (
          <button className="text-zinc-500 hover:text-rose-400" onClick={() => window.reel.cancelar(t.id)}>
            cancelar
          </button>
        )}
        {t.estado === 'error' && (
          <button className="text-zinc-400 hover:text-white" onClick={() => correr(t.titulo, t.comando)}>
            reintentar
          </button>
        )}
        <button className="text-zinc-500 hover:text-white" onClick={() => setVer(!ver)}>
          {ver ? 'ocultar' : 'log'}
        </button>
      </div>
      {t.estado === 'corriendo' && t.pct !== undefined && (
        <div className="mt-1 h-1 overflow-hidden rounded bg-zinc-800">
          <div className="h-full bg-sky-500 transition-all" style={{width: `${t.pct}%`}} />
        </div>
      )}
      {t.ultimo && <div className={`mt-1 truncate ${t.estado === 'error' ? 'text-rose-300' : 'text-zinc-500'}`}>{t.ultimo}</div>}
      {ver && (
        <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/50 p-1.5 text-[10px] whitespace-pre-wrap text-zinc-400">
          {t.lineas.map((l) => `${l.tipo === 'error' ? '✗ ' : l.tipo === 'ok' ? '✓ ' : l.tipo === 'aviso' ? '⚠ ' : ''}${l.msg}`).join('\n')}
        </pre>
      )}
    </div>
  );
};

export const Pipeline: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const trabajos = useEditor((s) => s.trabajos).filter((t) => t.proyecto === info.id || t.proyecto === '');
  const frame = useReloj((s) => s.frame);
  const [nota, setNota] = useState('');
  const [k4, setK4] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [mic, setMic] = useState('');
  const [logos, setLogos] = useState('');
  const [broll, setBroll] = useState({clip: '', de: 0, dur: 3});
  const [cambios, setCambios] = useState<string | null>(null);
  const [versiones, setVersiones] = useState<string[]>([]);
  const e = info.estado;

  useEffect(() => {
    window.reel.leerTexto(info.id, 'edicion/cambios.md').then(setCambios);
    window.reel.listar(info.id, 'versiones').then(setVersiones);
  }, [info, trabajos.length]);

  const paso = (n: string, hecho: boolean, boton: React.ReactNode, ayuda?: string) => (
    <div className="flex items-center gap-2 py-0.5" title={ayuda}>
      <span className={`w-3 text-center text-[11px] ${hecho ? 'text-emerald-400' : 'text-zinc-600'}`}>{hecho ? '✓' : '○'}</span>
      <span className="flex-1 text-xs text-zinc-300">{n}</span>
      {boton}
    </div>
  );

  return (
    <div data-testid="pipeline">
      <Seccion titulo="Material">
        {paso('Inventario', true, <Boton onClick={() => correr('Inventario', ['inventario'])}>Correr</Boton>, 'Duración, HDR, hojas de contacto')}
        {paso('SDR (HDR → SDR, color de Apple)', true, <Boton onClick={() => correr('SDR', ['sdr'])}>Correr</Boton>)}
        <div className="flex gap-1 py-0.5">
          <input className={inputCls} placeholder="Nombres para Whisper (opcional)" value={prompt} onChange={(ev) => setPrompt(ev.target.value)} />
          <Boton onClick={() => correr('Transcribir', ['transcribir', ...(prompt ? ['--prompt', prompt] : [])])} data-testid="transcribir">
            Transcribir
          </Boton>
        </div>
        {paso('Transcripción', e.transcrito, <span className="text-[11px] text-zinc-500">{info.clips.length} clips</span>)}
        <div className="flex gap-1 py-0.5">
          <select className={inputCls} value={mic} onChange={(ev) => setMic(ev.target.value)}>
            <option value="">Micrófono externo para el clip…</option>
            {info.clips.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <Boton
            disabled={!mic}
            onClick={async () => {
              const f = await window.reel.elegirArchivo([{name: 'Audio', extensions: ['wav', 'mp3', 'm4a', 'aiff', 'aif']}]);
              if (f) correr(`Audio externo ${mic}`, ['audio', mic, f]);
            }}
            title="Sincroniza el audio de un micrófono externo con el clip (correlación) y lo usa en vez del de la cámara"
          >
            Elegir audio…
          </Boton>
        </div>
      </Seccion>
      <Seccion titulo="Edición">
        {paso('Plan (edicion/plan.json)', e.plan, <Boton onClick={() => useEditor.getState().set({panel: 'cortes'})}>Editar</Boton>)}
        {paso('Corte (public/cut.mp4)', e.cortado, <Boton onClick={() => window.reel.cadena(info.id, [{titulo: 'EDL', comando: ['edl']}, {titulo: 'Cortar', comando: ['cortar', '--verificar']}, {titulo: 'Datos', comando: ['datos']}])}>Re-cortar</Boton>)}
        {paso('Datos (src/data.json)', e.datos, <Boton onClick={() => correr('Datos', ['datos'])}>Actualizar</Boton>)}
        {paso('Zooms a manos/objetos', false, <Boton onClick={() => window.reel.cadena(info.id, [{titulo: 'Zooms', comando: ['zooms']}, {titulo: 'Datos', comando: ['datos']}])}>Proponer</Boton>, 'Propone cx/cy de los zooms de eventos.json')}
        {paso('Énfasis en la voz', false, <Boton onClick={() => correr('Énfasis (sugerencias)', ['enfasis'])}>Sugerir</Boton>, 'Mira el log: palabras con *** son fuertes')}
        {paso('Recorte de la persona (gancho detrás)', false, <Boton onClick={() => window.reel.cadena(info.id, [{titulo: 'Recorte', comando: ['recorte']}, {titulo: 'Datos', comando: ['datos']}])}>Generar</Boton>)}
        {paso('Intro 3D (capa)', false, <Boton onClick={() => correr('Intro 3D', ['capas'])}>Renderizar</Boton>)}
      </Seccion>
      <Seccion titulo="Render">
        {paso('Borrador (540×960)', e.borrador, <Boton onClick={() => correr('Borrador', ['render', '--borrador'])}>Renderizar</Boton>)}
        {e.borrador && (
          <Boton v="fantasma" onClick={() => window.reel.mostrarEnFinder(`${info.ruta}/edicion/borrador.mp4`)}>
            Mostrar borrador en Finder
          </Boton>
        )}
        <Etiqueta n="Nota de esta versión (va a edicion/cambios.md)">
          <input className={inputCls} value={nota} onChange={(ev) => setNota(ev.target.value)} placeholder="p. ej. etiqueta más arriba, corte del final" />
        </Etiqueta>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={k4} onChange={(ev) => setK4(ev.target.checked)} className="accent-sky-500" /> 4K (2160×3840, ~4× más lento)
        </label>
        <div className="flex gap-1">
          <Boton v="primario" data-testid="render-final" onClick={() => correr(`Render final${k4 ? ' 4K' : ''}`, ['render', ...(nota ? ['--nota', nota] : []), ...(k4 ? ['--4k'] : [])])}>
            Render final
          </Boton>
          <Boton onClick={() => correr('Extras (SRT + portada)', ['extras', '--frame', String(frame)])} title="Subtítulos .srt y portada con el cuadro actual">
            SRT + portada (cuadro {frame})
          </Boton>
        </div>
        {e.final && (
          <Boton v="fantasma" onClick={() => window.reel.mostrarEnFinder(`${info.carpeta}/${info.nombre}.mp4`)}>
            Mostrar video final en Finder
          </Boton>
        )}
        {versiones.length > 0 && <div className="text-[11px] text-zinc-500">Versiones anteriores: {versiones.join(' · ')}</div>}
        {cambios && (
          <details className="text-[11px] text-zinc-400">
            <summary className="cursor-pointer text-zinc-300">Historial (cambios.md)</summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{cambios}</pre>
          </details>
        )}
      </Seccion>
      <Seccion titulo="Utilidades">
        <div className="flex gap-1">
          <input className={inputCls} placeholder="Logos: Google, Coursera, …" value={logos} onChange={(ev) => setLogos(ev.target.value)} />
          <Boton disabled={!logos.trim()} onClick={() => correr('Logos', ['logos', ...logos.split(',').map((x) => x.trim()).filter(Boolean)])}>
            Buscar
          </Boton>
        </div>
        <Boton
          onClick={async () => {
            const f = await window.reel.elegirArchivo([{name: 'Foto', extensions: ['heic', 'jpg', 'jpeg', 'png']}]);
            if (f) correr('QR', ['qr', f]);
          }}
        >
          QR desde foto…
        </Boton>
        <div className="grid grid-cols-[1fr_70px_60px_auto] gap-1">
          <select className={inputCls} value={broll.clip} onChange={(ev) => setBroll({...broll, clip: ev.target.value})}>
            <option value="">Clip para b-roll…</option>
            {info.clips.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input type="number" className={inputCls} title="Desde (s del clip)" value={broll.de} onChange={(ev) => setBroll({...broll, de: Number(ev.target.value)})} />
          <input type="number" className={inputCls} title="Duración (s)" value={broll.dur} onChange={(ev) => setBroll({...broll, dur: Number(ev.target.value)})} />
          <Boton disabled={!broll.clip} onClick={() => correr('B-roll', ['broll', broll.clip, '--de', String(broll.de), '--dur', String(broll.dur)])}>
            Crear
          </Boton>
        </div>
        <div className="flex flex-wrap gap-1">
          <Boton onClick={() => correr('Actualizar plantilla', ['actualizar'])} title="Copia la plantilla nueva de la skill (con respaldo)">
            Actualizar plantilla
          </Boton>
          <Boton onClick={() => correr('Limpiar caché', ['limpiar'])}>Limpiar caché</Boton>
          <Boton onClick={() => window.reel.mostrarEnFinder(info.ruta)}>Abrir en Finder</Boton>
        </div>
      </Seccion>
      <Seccion titulo={`Trabajos (${trabajos.length})`}>
        {trabajos.length === 0 && <div className="text-[11px] text-zinc-500">Nada todavía.</div>}
        <div className="space-y-1.5">
          {trabajos.slice(0, 25).map((t) => (
            <FilaTrabajo key={t.id} t={t} />
          ))}
        </div>
      </Seccion>
    </div>
  );
};
