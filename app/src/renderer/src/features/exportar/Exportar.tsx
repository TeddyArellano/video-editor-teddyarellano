// Exportar (un botón, como CapCut): calidad, formatos (9:16 + 16:9 / 1:1 / 4:5), relleno, SRT y portada, carpeta de
// destino y compartir. Por debajo encadena `reel render [--4k] [--formatos …] [--modo …]` y `reel extras`.
import React, {useEffect, useState} from 'react';
import {guardar, useEditor} from '@/store';
import {Boton, Etiqueta, inputCls} from '@/ui';
import type {EstadoRedes} from '@shared/tipos';

type Calidad = 'borrador' | 'final' | '4k';
const FORMATOS = [
  {f: '16:9', n: 'Horizontal 16:9 (YouTube)'},
  {f: '1:1', n: 'Cuadrado 1:1 (feed)'},
  {f: '4:5', n: 'Vertical 4:5 (feed de Instagram)'},
];
const PREF = 'reel-exportar';
type Pref = {calidad: Calidad; formatos: string[]; modo: 'fondo' | 'recorte'; extras: boolean; carpeta: string; abrir: boolean};
const leerPref = (): Pref => {
  try {
    return {calidad: 'final', formatos: [], modo: 'fondo', extras: true, carpeta: '', abrir: true, ...JSON.parse(localStorage.getItem(PREF) ?? '{}')};
  } catch {
    return {calidad: 'final', formatos: [], modo: 'fondo', extras: true, carpeta: '', abrir: true};
  }
};

// Publicar: con la cuenta conectada (Preferencias → Redes) sube directo por la API oficial (TikTok: a la bandeja de
// entrada para terminar en la app; Instagram: publica el Reel con el texto del post). Sin cuenta, abre la página de
// subida, deja el video a la vista en Finder y copia el texto del post ("<nombre> - post.txt").
const REDES = [
  ['tiktok', 'TikTok'],
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube Shorts'],
] as const;
const Publicar: React.FC<{video?: string; post: string}> = ({video, post}) => {
  const [aviso, setAviso] = useState('');
  const [redes, setRedes] = useState<EstadoRedes | null>(null);
  const [subiendo, setSubiendo] = useState<{red: string; texto: string; fraccion?: number} | null>(null);
  useEffect(() => {
    window.reel.estadoRedes().then(setRedes);
    return window.reel.onSubida(setSubiendo);
  }, []);
  if (!video) return null;
  const directo = (k: string) => (k === 'tiktok' ? !!redes?.tiktok.conectada : k === 'instagram' ? !!redes?.instagram.configurada : false);
  return (
    <div className="rounded-md border border-zinc-800 p-2">
      <div className="mb-1.5 text-[11px] text-zinc-400">Publicar</div>
      <div className="flex flex-wrap gap-1.5">
        {REDES.map(([k, n]) => (
          <Boton
            key={k}
            data-testid={`publicar-${k}`}
            disabled={!!subiendo && !aviso}
            title={directo(k) ? 'Sube directo con tu cuenta conectada' : 'Abre la página de subida (conecta la cuenta en Preferencias → Redes para subir directo)'}
            onClick={async () => {
              setAviso('');
              if (directo(k) && k !== 'youtube') {
                setSubiendo({red: k, texto: `${n}: empezando…`});
                const r = await window.reel.subirA(k, video, post);
                setSubiendo(null);
                setAviso(r.ok ? r.mensaje : `✗ ${n}: ${r.error}`);
                return;
              }
              const copiado = await window.reel.publicar(k, video, post);
              setAviso(`Se abrió ${n}: arrastra el video desde Finder${copiado ? ' y pega la descripción (ya está copiada)' : ''}.`);
            }}
          >
            {directo(k) ? `↑ ${n}` : n}
          </Boton>
        ))}
      </div>
      {subiendo && (
        <div className="mt-1.5 text-[11px] text-zinc-300" data-testid="progreso-subida">
          {subiendo.texto}
          {subiendo.fraccion !== undefined && <div className="mt-1 h-1 rounded bg-zinc-800"><div className="h-1 rounded bg-sky-500" style={{width: `${Math.round(subiendo.fraccion * 100)}%`}} /></div>}
        </div>
      )}
      {aviso && <div className={`mt-1.5 text-[11px] ${aviso.startsWith('✗') ? 'text-rose-400' : 'text-emerald-300'}`} data-testid="aviso-publicar">{aviso}</div>}
    </div>
  );
};

export const Exportar: React.FC<{cerrar: () => void}> = ({cerrar}) => {
  const info = useEditor((s) => s.info)!;
  const [p, setP] = useState<Pref>(leerPref);
  const [nota, setNota] = useState('');
  const [estado, setEstado] = useState<'listo' | 'exportando' | 'hecho' | 'error'>('listo');
  const [salidas, setSalidas] = useState<string[]>([]);
  useEffect(() => {
    try {
      localStorage.setItem(PREF, JSON.stringify(p));
    } catch {
      /* comodidad */
    }
  }, [p]);
  const cambiar = (c: Partial<Pref>) => setP((x) => ({...x, ...c}));

  const exportar = async () => {
    setEstado('exportando');
    await guardar(true);
    const borrador = p.calidad === 'borrador';
    const pasos: {titulo: string; comando: string[]}[] = [
      borrador
        ? {titulo: 'Borrador', comando: ['render', '--borrador']}
        : {titulo: `Render final${p.calidad === '4k' ? ' 4K' : ''}`, comando: ['render', ...(p.calidad === '4k' ? ['--4k'] : []), ...(nota ? ['--nota', nota] : []), ...(p.formatos.length ? ['--formatos', p.formatos.join(','), '--modo', p.modo] : [])]},
    ];
    if (borrador && p.formatos.length) pasos.push({titulo: 'Formatos', comando: ['formato', ...p.formatos, '--modo', p.modo, '--entrada', `${info.ruta}/edicion/borrador.mp4`]});
    if (p.extras && !borrador) pasos.push({titulo: 'SRT y portada', comando: ['extras']});
    const ok = await window.reel.cadena(info.id, pasos);
    if (!ok) return setEstado('error');
    const base = borrador ? `${info.ruta}/edicion/borrador` : `${info.carpeta}/${info.nombre}${p.calidad === '4k' ? ' 4K' : ''}`;
    const sufijo = (f: string) => ` ${f.replace(':', 'x')}${p.modo === 'recorte' ? ' recorte' : ''}`;
    let l = [`${base}.mp4`, ...p.formatos.map((f) => `${base}${sufijo(f)}.mp4`)];
    if (p.extras && !borrador) l.push(`${info.carpeta}/${info.nombre}.srt`, `${info.carpeta}/${info.nombre} - portada.jpg`);
    l = (await Promise.all(l.map(async (f) => ((await window.reel.existe(f)) ? f : null)))).filter(Boolean) as string[];
    if (p.carpeta) l = await Promise.all(l.map((f) => window.reel.copiarA(f, p.carpeta)));
    setSalidas(l);
    setEstado('hecho');
    if (p.abrir && l[0]) window.reel.mostrarEnFinder(l[0]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onPointerDown={(e) => e.target === e.currentTarget && estado !== 'exportando' && cerrar()} data-testid="exportar">
      <div className="w-[460px] rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-2xl">
        <div className="mb-4 flex items-center">
          <h2 className="flex-1 text-base font-semibold">Exportar</h2>
          <button className="text-zinc-500 hover:text-white" onClick={cerrar} disabled={estado === 'exportando'}>
            ✕
          </button>
        </div>
        {estado === 'hecho' ? (
          <div className="flex flex-col gap-3">
            <div className="text-sm text-emerald-300">✓ Listo. {salidas.length} archivo{salidas.length === 1 ? '' : 's'}:</div>
            <div className="flex flex-col gap-1 text-[11px] text-zinc-300">
              {salidas.map((f) => (
                <button key={f} className="truncate text-left hover:text-white" onClick={() => window.reel.mostrarEnFinder(f)} title={f}>
                  {f.split('/').pop()}
                </button>
              ))}
            </div>
            <Publicar video={salidas.find((f) => f.endsWith('.mp4'))} post={`${info.carpeta}/${info.nombre} - post.txt`} />
            <div className="flex gap-2">
              <Boton v="primario" onClick={() => window.reel.compartir(salidas.filter((f) => f.endsWith('.mp4')))} data-testid="compartir">
                Compartir…
              </Boton>
              <Boton onClick={() => salidas[0] && window.reel.mostrarEnFinder(salidas[0])}>Mostrar en Finder</Boton>
              <div className="flex-1" />
              <Boton onClick={cerrar}>Cerrar</Boton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Etiqueta n="Calidad">
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['borrador', 'Borrador', '540×960, rápido'],
                    ['final', 'Final', '1080×1920'],
                    ['4k', '4K', '2160×3840, lento'],
                  ] as const
                ).map(([k, n, d]) => (
                  <button key={k} data-testid={`calidad-${k}`} onClick={() => cambiar({calidad: k})} className={`rounded-md border px-2 py-1.5 text-left text-xs ${p.calidad === k ? 'border-acento bg-acento/15' : 'border-zinc-700 hover:border-zinc-500'}`}>
                    <div className="font-medium">{n}</div>
                    <div className="text-[10px] text-zinc-500">{d}</div>
                  </button>
                ))}
              </div>
            </Etiqueta>
            <Etiqueta n="Formatos" ayuda="Siempre se exporta el vertical 9:16. Los demás se hacen a partir de él.">
              <div className="flex flex-col gap-1">
                {FORMATOS.map((x) => (
                  <label key={x.f} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="accent-sky-500" data-testid={`formato-${x.f}`} checked={p.formatos.includes(x.f)} onChange={(e) => cambiar({formatos: e.target.checked ? [...p.formatos, x.f] : p.formatos.filter((f) => f !== x.f)})} />
                    {x.n}
                  </label>
                ))}
              </div>
            </Etiqueta>
            {p.formatos.length > 0 && (
              <Etiqueta n="Cómo llenar el cuadro">
                <select className={inputCls} value={p.modo} onChange={(e) => cambiar({modo: e.target.value as Pref['modo']})}>
                  <option value="fondo">Fondo desenfocado (no se pierde nada)</option>
                  <option value="recorte">Recortar alrededor de la cara</option>
                </select>
              </Etiqueta>
            )}
            {p.calidad !== 'borrador' && (
              <>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="accent-sky-500" checked={p.extras} onChange={(e) => cambiar({extras: e.target.checked})} />
                  Subtítulos .srt y portada
                </label>
                <Etiqueta n="Nota de la versión (opcional)">
                  <input className={inputCls} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="qué cambió (va a edicion/cambios.md)" />
                </Etiqueta>
              </>
            )}
            <Etiqueta n="Guardar en">
              <div className="flex gap-1">
                <input className={inputCls} readOnly value={p.carpeta || `${info.carpeta} (carpeta del material)`} title={p.carpeta || info.carpeta} />
                <Boton onClick={async () => cambiar({carpeta: (await window.reel.elegirCarpeta('Carpeta de destino')) ?? p.carpeta})}>…</Boton>
                {p.carpeta && <Boton onClick={() => cambiar({carpeta: ''})}>↺</Boton>}
              </div>
            </Etiqueta>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" className="accent-sky-500" checked={p.abrir} onChange={(e) => cambiar({abrir: e.target.checked})} />
              Mostrar en Finder al terminar
            </label>
            {estado === 'error' && <div className="text-xs text-rose-400">Algo falló. Revisa la cola de trabajos (abajo a la derecha) para ver el detalle.</div>}
            <div className="mt-1 flex justify-end gap-2">
              <Boton onClick={cerrar} disabled={estado === 'exportando'}>
                Cancelar
              </Boton>
              <Boton v="primario" onClick={exportar} disabled={estado === 'exportando' || !info.estado.cortado} data-testid="exportar-ya">
                {estado === 'exportando' ? 'Exportando…' : 'Exportar'}
              </Boton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
