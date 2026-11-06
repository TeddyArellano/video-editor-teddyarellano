// Utilidades del pipeline que necesitan algo más que un botón: hojas de contacto del inventario, b-roll marcando
// entrada y salida en un visor del clip ORIGINAL, y dividir el proyecto en partes.
import React, {useEffect, useRef, useState} from 'react';
import {useEditor} from '@/store';
import {Boton, Etiqueta, inputCls, Seccion} from '@/ui';

const correr = (titulo: string, comando: string[]) => window.reel.correr(useEditor.getState().info!.id, titulo, comando);

// hojas de contacto (edicion/hojas/*.jpg) + tabla de inventario.json
export const Hojas: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const trabajos = useEditor((s) => s.trabajos);
  const [hojas, setHojas] = useState<string[]>([]);
  const [inv, setInv] = useState<{clip: string; dur?: number; hdr?: boolean; res?: string}[]>([]);
  const [grande, setGrande] = useState<string | null>(null);
  const ultimo = trabajos.find((t) => t.proyecto === info.id && t.comando[0] === 'inventario' && t.estado === 'ok')?.id;
  useEffect(() => {
    window.reel.listar(info.id, 'edicion/hojas').then((l) => setHojas(l.filter((f) => /\.jpe?g$/i.test(f))));
    window.reel.leerTexto(info.id, 'edicion/inventario.json').then((t) => setInv(t ? JSON.parse(t).videos ?? [] : []));
  }, [info.id, ultimo]);
  if (!hojas.length && !inv.length) return null;
  return (
    <Seccion titulo={`Inventario · ${inv.length} clips`}>
      {inv.length > 0 && (
        <table className="w-full text-[11px]" data-testid="inventario">
          <tbody>
            {inv.map((v) => (
              <tr key={v.clip} className="border-b border-zinc-800/60">
                <td className="py-0.5 text-zinc-200">{v.clip}</td>
                <td className="text-right text-zinc-400">{v.dur ? `${Number(v.dur).toFixed(1)} s` : ''}</td>
                <td className="text-right text-zinc-500">{v.hdr ? 'HDR' : 'SDR'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="grid grid-cols-2 gap-1.5" data-testid="hojas">
        {hojas.map((h) => (
          <button key={h} onClick={() => setGrande(h)} className="overflow-hidden rounded border border-zinc-800 hover:border-sky-600" title={h}>
            <img src={`${info.base}__edicion/hojas/${encodeURIComponent(h)}`} className="block w-full" alt={h} />
            <div className="truncate px-1 text-left text-[10px] text-zinc-400">{h.replace(/\.jpe?g$/i, '')}</div>
          </button>
        ))}
      </div>
      {grande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8" onClick={() => setGrande(null)}>
          <img src={`${info.base}__edicion/hojas/${encodeURIComponent(grande)}`} className="max-h-full max-w-full rounded" alt={grande} />
        </div>
      )}
    </Seccion>
  );
};

// b-roll: visor del clip original (reel-media://…/__fuente/) con "Marcar entrada" y "Marcar salida"
export const BRollMarcar: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const [clip, setClip] = useState('');
  const [archivo, setArchivo] = useState<string | null>(null);
  const [ent, setEnt] = useState<number | null>(null);
  const [sal, setSal] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    setEnt(null);
    setSal(null);
    if (clip) window.reel.fuenteDe(info.id, clip).then(setArchivo);
    else setArchivo(null);
  }, [clip, info.id]);
  const t = () => +(video.current?.currentTime ?? 0).toFixed(2);
  const listo = clip && ent !== null && sal !== null && sal > ent;
  return (
    <div className="space-y-1.5" data-testid="broll">
      <select className={inputCls} value={clip} onChange={(e) => setClip(e.target.value)}>
        <option value="">B-roll desde un clip…</option>
        {info.clips.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      {archivo && (
        <>
          <video ref={video} src={`${info.base}__fuente/${encodeURIComponent(archivo)}`} controls muted className="max-h-56 w-full rounded bg-black" data-testid="broll-video" />
          <div className="flex flex-wrap items-center gap-1">
            <Boton onClick={() => setEnt(t())} data-testid="broll-entrada">
              [ Entrada {ent !== null ? `${ent.toFixed(2)} s` : ''}
            </Boton>
            <Boton onClick={() => setSal(t())} data-testid="broll-salida">
              Salida {sal !== null ? `${sal.toFixed(2)} s` : ''} ]
            </Boton>
            <input className={`${inputCls} w-28`} placeholder="nombre" value={nombre} onChange={(e) => setNombre(e.target.value.replace(/[^\w-]/g, '_'))} />
            <Boton
              v="primario"
              disabled={!listo}
              data-testid="broll-crear"
              onClick={() => correr('B-roll', ['broll', clip, '--de', String(ent), '--dur', String(+(sal! - ent!).toFixed(2)), ...(nombre ? ['--nombre', nombre] : [])])}
            >
              Crear {listo ? `(${(sal! - ent!).toFixed(1)} s)` : ''}
            </Boton>
          </div>
        </>
      )}
    </div>
  );
};

// dividir: un proyecto por parte (secciones de plan.json)
export const Dividir: React.FC = () => {
  const plan = useEditor((s) => s.plan);
  const secs = [...new Set(((plan?.piezas ?? []) as {sec: string}[]).map((p) => p.sec))];
  const [partes, setPartes] = useState('');
  const [nombres, setNombres] = useState('');
  const ps = partes.split('\n').map((x) => x.trim()).filter(Boolean);
  const ns = nombres.split('\n').map((x) => x.trim()).filter(Boolean);
  return (
    <div className="space-y-1.5" data-testid="dividir">
      <div className="text-[11px] text-zinc-500">Secciones del plan: {secs.join(', ') || '—'}. Una parte por línea (secciones separadas por coma) y un nombre por línea.</div>
      <div className="grid grid-cols-2 gap-1">
        <Etiqueta n="Partes">
          <textarea className={inputCls} rows={3} value={partes} onChange={(e) => setPartes(e.target.value)} placeholder={'intro,p1\np2,p3'} data-testid="dividir-partes" />
        </Etiqueta>
        <Etiqueta n="Nombres">
          <textarea className={inputCls} rows={3} value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder={'Parte 1\nParte 2'} data-testid="dividir-nombres" />
        </Etiqueta>
      </div>
      <Boton disabled={!ps.length || ps.length !== ns.length} onClick={() => correr('Dividir', ['dividir', '--partes', ...ps, '--nombres', ...ns])} data-testid="dividir-correr">
        Dividir en {ps.length || '…'} proyectos
      </Boton>
    </div>
  );
};
