// Panel de subtítulos: la transcripción del corte sincronizada con el video. Clic = ir a la palabra; doble clic =
// corregir el texto. Botones por palabra: resaltar (color), énfasis (sola y grande) y cortar bloque aquí.
import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {Palabra} from '@shared/anclas';
import type {Obj} from '@shared/elementos';
import {alternarCorte, alternarEnfasis, alternarResaltar, corregir, palabraEn} from '@shared/subtitulos';
import {useEditor} from '@/store';
import {ir, useReloj} from '@/reloj';
import {Boton, inputCls, Seccion, Vacio} from '@/ui';

export const Subtitulos: React.FC = () => {
  const data = useEditor((s) => s.data);
  const eventos = useEditor((s) => s.eventos);
  const frame = useReloj((s) => s.frame);
  const [elegida, setElegida] = useState<number | null>(null);
  const [editando, setEditando] = useState<{i: number; t: string} | null>(null);
  const [filtro, setFiltro] = useState('');
  const lista = useRef<HTMLDivElement>(null);
  const words: Palabra[] = data?.words ?? [];
  const actual = palabraEn(words, frame);

  useEffect(() => {
    const el = lista.current?.querySelector(`[data-w="${actual}"]`);
    if (el && useReloj.getState().jugando) el.scrollIntoView({block: 'nearest'});
  }, [actual]);

  const porSeccion = useMemo(() => {
    const g: {sec: string; ws: number[]}[] = [];
    words.forEach((w, i) => {
      if (!g.length || g[g.length - 1].sec !== w.sec) g.push({sec: w.sec, ws: []});
      g[g.length - 1].ws.push(i);
    });
    return g;
  }, [words]);

  if (!data) return <Vacio>Sin datos todavía.</Vacio>;
  const aplicar = (fn: (d: Obj, e: Obj, i: number) => {data: Obj; eventos: Obj}, i: number) => {
    const s = useEditor.getState();
    const r = fn(s.data!, s.eventos ?? {}, i);
    s.editar({data: r.data, eventos: r.eventos});
  };
  const sel = elegida !== null ? words[elegida] : null;
  const fixes = Object.entries((eventos?.fix ?? {}) as Record<string, string>);

  return (
    <div className="flex h-full flex-col" data-testid="subtitulos">
      <Seccion titulo="Palabra">
        <div className="min-h-[68px]">
        {sel && elegida !== null ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-1 text-sm font-semibold ${sel.enf ? 'bg-amber-500 text-black' : sel.key ? 'text-amber-300' : ''}`}>{sel.text}</span>
              <span className="text-[11px] text-zinc-500">
                #{elegida} · {sel.sec} · {sel.start.toFixed(2)} s
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              <Boton onClick={() => setEditando({i: elegida, t: sel.text})}>Corregir</Boton>
              <Boton onClick={() => aplicar(alternarResaltar, elegida)} className={sel.key && !sel.enf ? 'ring-1 ring-amber-400' : ''} title="Color acento en todas las apariciones">
                Resaltar
              </Boton>
              <Boton onClick={() => aplicar(alternarEnfasis, elegida)} className={sel.enf ? 'ring-1 ring-amber-400' : ''} title="Sale sola, grande, con golpe">
                Énfasis
              </Boton>
              <Boton onClick={() => aplicar(alternarCorte, elegida)} className={sel.corte ? 'ring-1 ring-sky-400' : ''} title="Empieza un bloque nuevo aquí">
                Cortar bloque
              </Boton>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500">Clic en una palabra para elegirla (y saltar a ella); doble clic para corregirla.</div>
        )}
        </div>
        {editando && (
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const s = useEditor.getState();
              const r = corregir(s.data!, s.eventos ?? {}, editando.i, editando.t);
              s.editar({data: r.data, eventos: r.eventos});
              setEditando(null);
            }}
          >
            <input autoFocus className={inputCls} value={editando.t} onChange={(e) => setEditando({...editando, t: e.target.value})} data-testid="corregir-input" />
            <Boton v="primario" type="submit">
              OK
            </Boton>
          </form>
        )}
      </Seccion>
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <input className={inputCls} placeholder="Buscar en la transcripción…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </div>
      <div ref={lista} className="min-h-0 flex-1 overflow-auto px-3 py-2 text-[13px] leading-7">
        {porSeccion.map((g, k) => (
          <div key={k} className="mb-3">
            <div className="mb-1 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">{g.sec}</div>
            {g.ws.map((i) => {
              const w = words[i];
              const coincide = filtro && w.text.toLowerCase().includes(filtro.toLowerCase());
              return (
                <React.Fragment key={i}>
                  {w.corte && i > 0 && <span className="mx-0.5 text-sky-500">¦</span>}
                  <span
                    data-w={i}
                    onClick={(e) => {
                      setElegida(i);
                      if (e.detail >= 2) setEditando({i, t: w.text});
                      else ir(Math.round(w.start * 30) + 1);
                    }}
                    className={`cursor-pointer rounded px-0.5 ${i === actual ? 'bg-sky-700 text-white' : ''} ${i === elegida ? 'outline outline-1 outline-sky-400' : ''} ${
                      w.enf ? 'bg-amber-500/80 text-black' : w.key ? 'text-amber-300' : 'text-zinc-200'
                    } ${coincide ? 'underline decoration-fuchsia-400 decoration-2' : ''}`}
                  >
                    {w.text}
                  </span>{' '}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
      {fixes.length > 0 && (
        <Seccion titulo={`Correcciones (${fixes.length})`}>
          <div className="max-h-28 space-y-1 overflow-auto text-[11px]">
            {fixes.map(([a, b]) => (
              <div key={a} className="flex items-center justify-between gap-2">
                <span className="truncate text-zinc-400">
                  {a} → <span className="text-zinc-100">{b}</span>
                </span>
                <button
                  className="text-zinc-500 hover:text-rose-400"
                  onClick={() => {
                    const s = useEditor.getState();
                    const e = JSON.parse(JSON.stringify(s.eventos ?? {}));
                    delete e.fix[a];
                    if (!Object.keys(e.fix).length) delete e.fix;
                    s.editar({eventos: e});
                  }}
                  title="Quitar corrección (vuelve al texto de Whisper después de Actualizar datos)"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Seccion>
      )}
    </div>
  );
};
