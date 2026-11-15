// Inspector: propiedades del elemento seleccionado. Cada cambio se aplica a data (vista previa inmediata) y a
// eventos.json (lo que se guarda). También: tiempo (ancla y duración), ir al elemento, duplicar y eliminar, y la
// paleta para agregar elementos nuevos en el cuadro actual.
import React, {useEffect, useState} from 'react';
import {Anclas, FPS} from '@shared/anclas';
import {agregarClave, agregarEvento, aplicarCampos, aplicarLibre, aplicarTiempo, CAMPOS_CLAVE, eventoDe, LISTAS, nombreSel, quitarClave, quitarEvento, valoresEn, type Clave, type Lista, type Obj} from '@shared/elementos';
import {useEditor} from '@/store';
import {ir, tc, useReloj} from '@/reloj';
import {Boton, Etiqueta, inputCls, Seccion, Vacio} from '@/ui';
import {CAMPOS, FUENTES, type Campo} from './campos';

const CAPAS: Lista[] = ['textos', 'formas', 'superpuestos', 'audios', 'ajustes', 'tcortes'];
const AGREGAR: Lista[] = ['labels', 'names', 'images', 'montos', 'emojis', 'calendario', 'patrocinadores', 'fechas', 'zooms', 'sfx'];
export const DIRS_MEDIOS = ['public/logos', 'public/sponsors', 'public/qr', 'public/img', 'public/marca', 'public/perfiles', 'public/broll', 'public/fotos', 'public/medios', 'public/audio', 'public/musica', 'public'];
export const EXT_AUDIO = /\.(wav|mp3|m4a|aac|aiff?)$/i;

const useArchivosPublic = (sub: string) => {
  const info = useEditor((s) => s.info);
  const trabajos = useEditor((s) => s.trabajos.length);
  const [l, setL] = useState<string[]>([]);
  useEffect(() => {
    if (!info) return;
    const dirs = sub === 'sfx' ? ['public/sfx'] : DIRS_MEDIOS;
    Promise.all(dirs.map(async (d) => (await window.reel.listar(info.id, d)).map((f) => (d === 'public' ? f : `${d.slice(7)}/${f}`)))).then((r) => {
      const todos = r.flat().filter((f) => !/^cut(_proxy|_voz)?\.mp4$/.test(f) && !f.startsWith('sfx/'));
      setL(sub === 'sfx' ? r.flat() : sub === 'audio' ? todos.filter((f) => EXT_AUDIO.test(f)) : todos.filter((f) => /\.(png|jpe?g|svg|webp|gif|mp4|mov|m4v|webm)$/i.test(f)));
    });
  }, [info, sub, trabajos]);
  return l;
};

// logos de patrocinadores: uno por renglón. Se guarda al salir del campo (así Enter agrega un renglón sin perderse).
// eventos.json guarda rutas; data.json puede traer {src, ar}.
const LogosInput: React.FC<{v: unknown; set: (v: unknown) => void; sugerencias: string[]}> = ({v, set, sugerencias}) => {
  const texto = (Array.isArray(v) ? v : []).map((x) => (typeof x === 'string' ? x : String((x as {src?: string}).src ?? ''))).join('\n');
  const [borrador, setBorrador] = useState(texto);
  useEffect(() => setBorrador(texto), [texto]);
  return (
    <textarea
      className={inputCls}
      rows={Math.max(2, borrador.split('\n').length + 1)}
      value={borrador}
      placeholder={sugerencias.filter((f) => f.startsWith('sponsors/') || f.startsWith('logos/')).slice(0, 2).join('\n')}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={() => {
        const l = borrador.split('\n').map((x) => x.trim()).filter(Boolean);
        if (l.join('\n') !== texto) set(l);
      }}
    />
  );
};

const Control: React.FC<{c: Campo; v: unknown; set: (v: unknown) => void}> = ({c, v, set}) => {
  const archivos = useArchivosPublic(c.t === 'sfx' ? 'sfx' : c.t === 'audio' ? 'audio' : 'img');
  const info = useEditor((s) => s.info);
  if (c.t === 'bool') return <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-sky-500" />;
  if (c.t === 'opcion' || c.t === 'fuente')
    return (
      <select className={inputCls} value={String(v ?? '')} onChange={(e) => set(e.target.value || undefined)}>
        <option value="">(por defecto)</option>
        {(c.t === 'fuente' ? FUENTES : c.op ?? []).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  if (c.t === 'sfx')
    return (
      <select className={inputCls} value={String(v ?? '')} onChange={(e) => set(e.target.value)}>
        {archivos.map((f) => f.replace(/^sfx\//, '').replace(/\.wav$/, '')).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  if (c.t === 'rango') {
    const n = typeof v === 'number' ? v : undefined;
    const def = c.k === 'opacidad' || c.k === 'intensidad' ? 1 : 0;
    return (
      <div className="flex items-center gap-2">
        <input type="range" className="min-w-0 flex-1 accent-sky-500" min={c.min} max={c.max} step={c.paso ?? 1} value={n ?? def} onChange={(e) => set(Number(e.target.value))} data-testid={`rango-${c.k}`} />
        <input type="number" data-testid={`num-${c.k}`} className={inputCls} style={{width: 68, flex: 'none'}} min={c.min} max={c.max} step={c.paso ?? 1} value={n === undefined ? '' : +n.toFixed(3)} placeholder={String(def)} onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))} />
      </div>
    );
  }
  if (c.t === 'archivo' || c.t === 'audio')
    return (
      <div className="flex gap-1">
        <select className={inputCls} value={String(v ?? '')} onChange={(e) => set(e.target.value)}>
          <option value="">—</option>
          {!archivos.includes(String(v)) && v ? <option>{String(v)}</option> : null}
          {archivos.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <Boton
          title="Importar archivo a public/"
          onClick={async () => {
            const f = await window.reel.elegirArchivo(c.t === 'audio' ? [{name: 'Audio', extensions: ['wav', 'mp3', 'm4a', 'aac', 'aif', 'aiff']}] : [{name: 'Medios', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'mp4', 'mov', 'm4v']}]);
            if (!f || !info) return;
            const nombre = f.split('/').pop()!;
            const sub = c.t === 'audio' ? 'audio' : /\.(mp4|mov|m4v)$/i.test(nombre) ? 'broll' : 'img';
            set(await window.reel.copiarAPublic(info.id, f, `${sub}/${nombre}`));
          }}
        >
          …
        </Boton>
      </div>
    );
  if (c.t === 'color')
    return (
      <div className="flex gap-1">
        <input type="color" value={typeof v === 'string' && v.startsWith('#') && v.length === 7 ? v : '#ffffff'} onChange={(e) => set(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-zinc-700 bg-transparent" />
        <input className={inputCls} value={String(v ?? '')} placeholder="(por defecto)" onChange={(e) => set(e.target.value || undefined)} />
      </div>
    );
  if (c.t === 'num')
    return (
      <input
        type="number"
        className={inputCls}
        value={v === undefined || v === null ? '' : String(v)}
        min={c.min}
        max={c.max}
        step={c.paso ?? 1}
        placeholder="(por defecto)"
        onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    );
  if (c.t === 'logos') return <LogosInput v={v} set={set} sugerencias={archivos} />;
  if (c.t === 'area') return <textarea className={inputCls} rows={2} value={String(v ?? '')} onChange={(e) => set(e.target.value)} />;
  return <input className={inputCls} value={String(v ?? '')} onChange={(e) => set(e.target.value)} />;
};

const textoAncla = (an: unknown) => (an === undefined ? '' : typeof an === 'string' ? an : JSON.stringify(an));

export const Inspector: React.FC = () => {
  const sel = useEditor((s) => s.sel);
  const data = useEditor((s) => s.data);
  const eventos = useEditor((s) => s.eventos);
  const frame = useReloj((s) => s.frame);
  const [ancla, setAncla] = useState('');

  const ev = sel && data ? eventoDe(eventos ?? {}, data, sel) : undefined;
  const item: Obj | undefined = sel && data ? (sel.lista === 'hook' ? data.hook?.elementos?.[sel.i] : data[sel.lista]?.[sel.i]) : undefined;
  useEffect(() => {
    setAncla(textoAncla(ev?.en));
  }, [ev?.en, sel?.lista, sel?.i]);

  const agregar = (l: Lista) => {
    const s = useEditor.getState();
    if (!s.data) return;
    let f = frame;
    if (l === 'tcortes') {
      // la transición se centra en el corte entre tramos más cercano al cabezal
      const bordes = ((s.edl ?? []) as Obj[]).slice(1).map((p) => p.start as number);
      if (bordes.length) f = bordes.reduce((m, b) => (Math.abs(b - frame) < Math.abs(m - frame) ? b : m), bordes[0]) - 6;
    }
    const r = agregarEvento(s.data, s.eventos ?? {}, l, Math.max(0, f));
    s.editar({data: r.data, eventos: r.eventos});
    s.seleccionar(r.sel);
  };

  const paleta = (
    <Seccion titulo={`Agregar en ${tc(frame)}`}>
      <div className="mb-1 text-[10px] tracking-wide text-zinc-500 uppercase">Capas</div>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        {CAPAS.map((l) => (
          <Boton key={l} onClick={() => agregar(l)} data-testid={`agregar-${l}`}>
            + {LISTAS[l].nombre}
          </Boton>
        ))}
      </div>
      <div className="mb-1 text-[10px] tracking-wide text-zinc-500 uppercase">Gráficos de la skill</div>
      <div className="grid grid-cols-2 gap-1.5">
        {AGREGAR.map((l) => (
          <Boton key={l} onClick={() => agregar(l)} data-testid={`agregar-${l}`}>
            + {LISTAS[l].nombre}
          </Boton>
        ))}
      </div>
    </Seccion>
  );

  if (!sel || !data || !item) return <div>{paleta}<Vacio>Selecciona un elemento en el video o en la línea de tiempo para editarlo.</Vacio></div>;

  const claves: Clave[] = Array.isArray(item.claves) ? item.claves : [];
  const animado = (k: string) => claves.length > 0 && (CAMPOS_CLAVE as readonly string[]).includes(k);
  const set = (k: string, v: unknown) => {
    const s = useEditor.getState();
    const r = aplicarLibre(s.data!, s.eventos ?? {}, sel, {[k]: v}, useReloj.getState().frame);
    s.editar({data: r.data, eventos: r.eventos});
  };
  const enCuadro = valoresEn(item, frame);
  const valor = (k: string) => (animado(k) ? +enCuadro[k as keyof typeof enCuadro].toFixed(3) : ev && k in ev ? ev[k] : item[k]);
  const a = sel.lista === 'sfx' ? item.f : sel.lista === 'hook' ? item.at ?? 0 : item.a;
  const b = sel.lista === 'sfx' ? item.f + (item.len ?? 0) : sel.lista === 'hook' ? data.hookEnd : item.b;
  const words = data.words ?? [];
  const A = new Anclas(words);
  const anclaOk = !ancla || (() => {
    try {
      const v = ancla.trim().startsWith('{') ? JSON.parse(ancla) : /^-?\d+(\.\d+)?$/.test(ancla.trim()) ? Number(ancla) : ancla;
      return A.ok(v);
    } catch {
      return false;
    }
  })();

  const aplicarAncla = () => {
    if (!ev || !anclaOk || !ancla) return;
    const v = ancla.trim().startsWith('{') ? JSON.parse(ancla) : /^-?\d+(\.\d+)?$/.test(ancla.trim()) ? Number(ancla) : ancla.trim();
    const s = useEditor.getState();
    const fa = Math.round(A.t(v)! * FPS);
    const r = aplicarCampos(s.data!, s.eventos ?? {}, sel, {});
    // nuevo inicio exacto: se escribe el ancla tal cual y se mueve el elemento en data
    const e2 = eventoDe(r.eventos, s.data!, sel);
    if (e2) e2.en = v;
    const d2 = r.data[sel.lista]?.[sel.i];
    if (d2 && sel.lista !== 'sfx' && sel.lista !== 'hook') {
      const len = d2.b - d2.a;
      d2.a = fa;
      d2.b = fa + len;
    } else if (d2 && sel.lista === 'sfx') d2.f = fa;
    s.editar({data: r.data, eventos: r.eventos});
  };

  return (
    <div data-testid="inspector">
      <Seccion
        titulo={nombreSel(data, sel)}
        acciones={
          <div className="flex gap-1">
            <Boton v="fantasma" onClick={() => ir(a + 2)} title="Ir al elemento">
              ⤳
            </Boton>
            <Boton
              v="peligro"
              data-testid="eliminar"
              onClick={() => {
                const s = useEditor.getState();
                const r = quitarEvento(s.data!, s.eventos ?? {}, sel);
                s.seleccionar(null);
                s.editar({data: r.data, eventos: r.eventos});
              }}
            >
              Eliminar
            </Boton>
          </div>
        }
      >
        <div className="text-[11px] text-zinc-500">
          {tc(a)} → {tc(b)} · {((b - a) / FPS).toFixed(2)} s{sel.lista === 'hook' ? ' · el gancho dura hasta hookEnd' : ''}
        </div>
        {sel.lista !== 'hook' && ev && (
          <>
            <Etiqueta n="Empieza en (ancla)" ayuda='"sec:palabra#n", "palabra", segundos o {"palabra","sec","n","offset"}. Arrastra en la línea de tiempo para pegarlo a otra palabra.'>
              <div className="flex gap-1">
                <input className={`${inputCls} ${anclaOk ? '' : 'border-rose-500'}`} value={ancla} onChange={(e) => setAncla(e.target.value)} onBlur={aplicarAncla} onKeyDown={(e) => e.key === 'Enter' && aplicarAncla()} data-testid="ancla" />
              </div>
              {!anclaOk && <div className="mt-1 text-[11px] text-rose-400">Esa palabra no está en el corte.</div>}
            </Etiqueta>
            {sel.lista !== 'sfx' && (
              <Etiqueta n="Duración (s)">
                <input
                  type="number"
                  step={0.1}
                  min={0.2}
                  className={inputCls}
                  value={+((b - a) / FPS).toFixed(2)}
                  onChange={(e) => {
                    const s = useEditor.getState();
                    const r = aplicarTiempo(s.data!, s.eventos ?? {}, sel, a, a + Number(e.target.value) * FPS, true);
                    s.editar({data: r.data, eventos: r.eventos});
                  }}
                />
              </Etiqueta>
            )}
          </>
        )}
        {sel.lista === 'hook' && (
          <Etiqueta n="Aparece en el cuadro (at)">
            <input type="number" className={inputCls} value={item.at ?? ''} onChange={(e) => set('at', e.target.value === '' ? undefined : Number(e.target.value))} />
          </Etiqueta>
        )}
      </Seccion>
      <Seccion titulo="Propiedades">
        {CAMPOS[sel.lista].map((c) => (
          <Etiqueta key={c.k} n={animado(c.k) ? `◆ ${c.n}` : c.n} ayuda={c.ayuda}>
            <Control c={c} v={valor(c.k)} set={(v) => set(c.k, v)} />
          </Etiqueta>
        ))}
      </Seccion>
      {LISTAS[sel.lista].movible && sel.lista !== 'hook' && (
        <Seccion
          titulo="Fotogramas clave"
          acciones={
            <Boton
              data-testid="agregar-clave"
              title="Guarda posición, escala, giro y opacidad en este cuadro. Con claves, mover el elemento edita la clave del cuadro actual."
              onClick={() => {
                const s = useEditor.getState();
                const r = agregarClave(s.data!, s.eventos ?? {}, sel, useReloj.getState().frame);
                s.editar({data: r.data, eventos: r.eventos});
              }}
            >
              ◆ Clave aquí
            </Boton>
          }
        >
          {claves.length === 0 ? (
            <div className="text-[11px] text-zinc-500">Sin claves: el elemento se queda quieto. Agrega una clave, mueve el cabezal, cambia la posición y se anima entre las dos.</div>
          ) : (
            <div className="flex flex-col gap-1" data-testid="claves">
              {[...claves]
                .sort((p, q) => p.t - q.t)
                .map((c) => {
                  const f = (item.a ?? 0) + Math.round(c.t * FPS);
                  const aqui = Math.abs(f - frame) <= 0;
                  return (
                    <div key={c.t} className={`flex items-center gap-2 rounded px-1.5 py-1 text-[11px] ${aqui ? 'bg-sky-900/50 text-sky-100' : 'bg-zinc-800/60 text-zinc-300'}`}>
                      <button className="font-mono hover:text-white" onClick={() => ir(f)} title="Ir a la clave">
                        ◆ {tc(f)}
                      </button>
                      <span className="flex-1 truncate text-zinc-500">
                        {CAMPOS_CLAVE.filter((k) => typeof c[k] === 'number' && c[k] !== ({dx: 0, dy: 0, escala: 1, rot: 0, opacidad: 1} as Record<string, number>)[k])
                          .map((k) => `${k} ${+(c[k] as number).toFixed(2)}`)
                          .join(' · ') || 'base'}
                      </span>
                      <button
                        className="text-zinc-500 hover:text-rose-400"
                        title="Quitar clave"
                        onClick={() => {
                          const s = useEditor.getState();
                          const r = quitarClave(s.data!, s.eventos ?? {}, sel, c.t);
                          s.editar({data: r.data, eventos: r.eventos});
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </Seccion>
      )}
      {paleta}
    </div>
  );
};
