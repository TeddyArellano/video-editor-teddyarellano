// Panel de cortes (estilo Descript): el plan del video como lista de piezas de transcripción. Tachar palabras,
// recortar/extender por palabras, reordenar, velocidad, ganancia y márgenes; agregar piezas desde la transcripción de
// cualquier clip; escuchar el tramo original; y Re-cortar (edl → cortar --verificar → datos) con progreso.
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {agregarPieza, alternarQuitar, dividirPieza, duracionPieza, editarPieza, moverPieza, quitarPieza, textoPieza, type Pieza, type Plan} from '@shared/cortes';
import {aplicarCorte, useCortePendiente, useEditor} from '@/store';
import {pausar} from '@/reloj';
import {Boton, Etiqueta, inputCls, Seccion, Vacio} from '@/ui';

// reproduce un tramo del clip original (para escuchar dónde corta)
const useEscuchar = () => {
  const info = useEditor((s) => s.info)!;
  const audio = useRef<HTMLVideoElement | null>(null);
  const fin = useRef(0);
  return async (clip: string, ini: number, fn: number) => {
    pausar();
    const f = await window.reel.fuenteDe(info.id, clip);
    if (!f) return useEditor.getState().avisar('error', `No encuentro el clip ${clip} en la carpeta del material.`);
    if (!audio.current) {
      audio.current = document.createElement('video');
      audio.current.dataset.testid = 'escucha';
      audio.current.style.display = 'none';
      document.body.appendChild(audio.current);
      audio.current.ontimeupdate = () => audio.current && audio.current.currentTime >= fin.current && audio.current.pause();
    }
    const url = `${info.base}__fuente/${encodeURIComponent(f)}`;
    if (audio.current.src !== url) audio.current.src = url;
    fin.current = fn;
    audio.current.currentTime = Math.max(0, ini);
    audio.current.play();
  };
};

// tabla de LUFS por sección (salida de `reel niveles`): diferencias ≥ 1.5 dB se marcan
const Niveles: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const t = useEditor((s) => s.trabajos.find((x) => x.proyecto === info.id && x.comando[0] === 'niveles' && x.estado === 'ok'));
  if (!t) return null;
  const filas = t.lineas.map((l) => l.msg.match(/^(\S+)\s+(-?\d+\.\d)\s+([+-]\d+\.\d) dB/)).filter(Boolean) as RegExpMatchArray[];
  if (!filas.length) return null;
  return (
    <table className="mb-1 w-full text-[11px]" data-testid="niveles">
      <thead>
        <tr className="text-zinc-500">
          <th className="text-left font-normal">sección</th>
          <th className="text-right font-normal">LUFS</th>
          <th className="text-right font-normal">sugerido</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((m) => (
          <tr key={m[1]}>
            <td className="text-zinc-200">{m[1]}</td>
            <td className="text-right text-zinc-300">{m[2]}</td>
            <td className={`text-right ${Math.abs(Number(m[3])) >= 1.5 ? 'text-amber-300' : 'text-zinc-500'}`}>{m[3]} dB</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const Cortes: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const plan = useEditor((s) => s.plan) as Plan | null;
  const corte = useCortePendiente();
  const pal = useEditor((s) => s.palabras);
  const aplicando = useEditor((s) => s.aplicando);
  const escuchar = useEscuchar();
  const abierta = useEditor((s) => s.piezaAbierta);
  const setAbierta = (n: number | null) => useEditor.getState().set({piezaAbierta: n});
  const [clip, setClip] = useState<string>('');
  const [rango, setRango] = useState<[number, number] | null>(null);
  const [sec, setSec] = useState('');
  const [verif, setVerif] = useState<string | null>(null);
  useEffect(() => {
    if (!clip && info.clips.length) setClip(info.clips[0]);
  }, [info.clips]);

  const set = (p: Plan) => useEditor.getState().editar({plan: p});
  const piezas = plan?.piezas ?? [];
  const totalSeg = useMemo(() => piezas.reduce((a, p) => a + duracionPieza(pal[p.src], p), 0), [piezas, pal]);
  const secs = [...new Set(piezas.map((p) => p.sec))];

  const recortar = async () => {
    const ok = await aplicarCorte({verificar: true});
    if (ok) setVerif(await window.reel.leerTexto(info.id, 'edicion/verificacion.txt'));
  };

  if (!info.clips.length) return <Vacio>El proyecto todavía no tiene transcripciones (edicion/palabras/). Corre Transcribir en el panel Pipeline.</Vacio>;

  return (
    <div data-testid="cortes">
      <Seccion
        titulo={`Plan · ${piezas.length} piezas · ~${totalSeg.toFixed(1)} s`}
        acciones={
          <Boton v={corte ? 'primario' : 'normal'} disabled={aplicando} onClick={recortar} data-testid="recortar" title="edl → cortar --verificar → datos">
            Re-cortar
          </Boton>
        }
      >
        {corte && <div className="text-[11px] text-amber-300">Cambiaste el plan: presiona Re-cortar para ver el resultado.</div>}
        {piezas.length === 0 && <div className="text-[11px] text-zinc-500">Sin piezas. Agrega frases desde la transcripción de abajo.</div>}
        <div className="space-y-1.5">
          {piezas.map((p, i) => {
            const ws = pal[p.src];
            const abierto = abierta === i;
            return (
              <div key={i} className={`rounded-md border ${abierto ? 'border-sky-700 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'}`}>
                <div className="flex cursor-pointer items-start gap-2 p-2" onClick={() => setAbierta(abierto ? null : i)}>
                  <span className="mt-0.5 w-5 shrink-0 text-right text-[10px] text-zinc-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-zinc-500">
                      <span className="rounded bg-zinc-800 px-1 text-zinc-300">{p.sec}</span> {p.src} [{p.de}–{p.a}] · {duracionPieza(ws, p).toFixed(1)} s
                      {p.speed && p.speed !== 1 ? ` · ×${p.speed}` : ''}
                      {p.gain_db ? ` · ${p.gain_db > 0 ? '+' : ''}${p.gain_db} dB` : ''}
                    </div>
                    <div className={`text-xs leading-snug text-zinc-200 ${abierto ? '' : 'line-clamp-2'}`}>{textoPieza(ws, p) || '(sin transcripción)'}</div>
                  </div>
                </div>
                {abierto && ws && (
                  <div className="space-y-2 border-t border-zinc-800 p-2">
                    <div className="text-[11px] text-zinc-500">Clic en una palabra = tacharla (quitar). Alt+clic = dividir la pieza ahí.</div>
                    <div className="text-[13px] leading-6">
                      {ws.slice(p.de, p.a + 1).map((w, k) => {
                        const idx = p.de + k;
                        const fuera = (p.quitar ?? []).includes(idx);
                        return (
                          <span
                            key={idx}
                            onClick={(e) => set(e.altKey ? dividirPieza(plan!, i, idx) : alternarQuitar(plan!, i, idx))}
                            className={`cursor-pointer rounded px-0.5 hover:bg-zinc-700 ${fuera ? 'text-rose-400 line-through' : 'text-zinc-100'}`}
                            title={`#${idx} · ${w[1].toFixed(2)} s`}
                          >
                            {w[0]}{' '}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Boton onClick={() => escuchar(p.src, ws[p.de][1] - 0.4 - (p.mas_inicio ?? 0), ws[p.a][2] + 0.4 + (p.mas_final ?? 0))}>▶ Escuchar</Boton>
                      <Boton onClick={() => set(editarPieza(plan!, i, {de: Math.max(0, p.de - 1)}))} title="Empezar una palabra antes">
                        ← +1
                      </Boton>
                      <Boton onClick={() => set(editarPieza(plan!, i, {de: Math.min(p.a, p.de + 1)}))} title="Empezar una palabra después">
                        → −1
                      </Boton>
                      <Boton onClick={() => set(editarPieza(plan!, i, {a: Math.max(p.de, p.a - 1)}))} title="Terminar una palabra antes">
                        −1 ←
                      </Boton>
                      <Boton onClick={() => set(editarPieza(plan!, i, {a: Math.min(ws.length - 1, p.a + 1)}))} title="Terminar una palabra después">
                        +1 →
                      </Boton>
                      <Boton onClick={() => set(moverPieza(plan!, i, -1))} disabled={i === 0}>
                        ↑
                      </Boton>
                      <Boton onClick={() => set(moverPieza(plan!, i, 1))} disabled={i === piezas.length - 1}>
                        ↓
                      </Boton>
                      <Boton
                        v="peligro"
                        onClick={() => {
                          setAbierta(null);
                          set(quitarPieza(plan!, i));
                        }}
                      >
                        Quitar
                      </Boton>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Etiqueta n="Sección">
                        <input className={inputCls} value={p.sec} onChange={(e) => set(editarPieza(plan!, i, {sec: e.target.value}))} />
                      </Etiqueta>
                      <Etiqueta n="Velocidad">
                        <input type="number" step={0.25} min={0.5} max={16} className={inputCls} value={p.speed ?? 1} onChange={(e) => set(editarPieza(plan!, i, {speed: Number(e.target.value)}))} />
                      </Etiqueta>
                      <Etiqueta n="Ganancia dB">
                        <input type="number" step={0.5} className={inputCls} value={p.gain_db ?? 0} onChange={(e) => set(editarPieza(plan!, i, {gain_db: Number(e.target.value)}))} />
                      </Etiqueta>
                      <Etiqueta n="+ inicio (s)" ayuda="Si se come una sílaba al empezar">
                        <input type="number" step={0.02} min={0} className={inputCls} value={p.mas_inicio ?? ''} onChange={(e) => set(editarPieza(plan!, i, {mas_inicio: e.target.value === '' ? undefined : Number(e.target.value)}))} />
                      </Etiqueta>
                      <Etiqueta n="+ final (s)" ayuda="Si se come una sílaba al terminar">
                        <input type="number" step={0.02} min={0} className={inputCls} value={p.mas_final ?? ''} onChange={(e) => set(editarPieza(plan!, i, {mas_final: e.target.value === '' ? undefined : Number(e.target.value)}))} />
                      </Etiqueta>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Seccion>
      <Seccion titulo="Agregar desde la transcripción">
        <div className="flex gap-1">
          <select className={inputCls} value={clip} onChange={(e) => (setClip(e.target.value), setRango(null))}>
            {info.clips.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <Boton onClick={() => window.reel.correr(info.id, 'Tomas', ['tomas'])} title="Sugerencias de tomas repetidas (edicion/tomas.txt)">
            Tomas
          </Boton>
        </div>
        <div className="text-[11px] text-zinc-500">Clic = inicio; Shift+clic = fin. Las palabras ya usadas en el plan se ven en verde.</div>
        <div className="max-h-72 overflow-auto rounded border border-zinc-800 p-2 text-[13px] leading-6" data-testid="transcripcion-clip">
          {(pal[clip] ?? []).map((w, k) => {
            const usada = piezas.some((p) => p.src === clip && k >= p.de && k <= p.a && !(p.quitar ?? []).includes(k));
            const enRango = rango && k >= Math.min(...rango) && k <= Math.max(...rango);
            return (
              <span
                key={k}
                onClick={(e) => setRango(e.shiftKey && rango ? [rango[0], k] : [k, k])}
                className={`cursor-pointer rounded px-0.5 ${enRango ? 'bg-sky-700 text-white' : usada ? 'text-emerald-400' : 'text-zinc-300'} hover:bg-zinc-700`}
                title={`#${k} · ${w[1].toFixed(2)} s`}
              >
                {w[0]}{' '}
              </span>
            );
          })}
        </div>
        {rango && (
          <div className="flex items-end gap-1">
            <Etiqueta n="Sección">
              <input className={inputCls} list="secs" value={sec} placeholder={secs[secs.length - 1] ?? 'intro'} onChange={(e) => setSec(e.target.value)} />
              <datalist id="secs">
                {secs.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Etiqueta>
            <Boton onClick={() => pal[clip] && escuchar(clip, pal[clip][Math.min(...rango)][1] - 0.3, pal[clip][Math.max(...rango)][2] + 0.3)}>▶</Boton>
            <Boton
              v="primario"
              data-testid="agregar-pieza"
              onClick={() => {
                const pz: Pieza = {src: clip, de: Math.min(...rango), a: Math.max(...rango), sec: sec || secs[secs.length - 1] || 'intro'};
                set(agregarPieza(plan, pz, abierta ?? undefined));
                setRango(null);
              }}
            >
              Agregar pieza{abierta !== null ? ` tras la ${abierta + 1}` : ''}
            </Boton>
          </div>
        )}
      </Seccion>
      <Seccion titulo="Audio">
        <Niveles />
        <div className="flex gap-1">
          <Boton onClick={() => window.reel.correr(info.id, 'Niveles', ['niveles'])}>Medir niveles</Boton>
          <Boton onClick={() => window.reel.correr(info.id, 'Igualar niveles', ['niveles', '--aplicar'])} title="Escribe gain_db en plan.json; luego Re-cortar">
            Igualar niveles
          </Boton>
        </div>
      </Seccion>
      {verif && (
        <Seccion titulo="Verificación del corte (Whisper)" acciones={<Boton v="fantasma" onClick={() => setVerif(null)}>✕</Boton>}>
          <pre className="max-h-64 overflow-auto text-[11px] whitespace-pre-wrap text-zinc-300">{verif}</pre>
        </Seccion>
      )}
    </div>
  );
};
