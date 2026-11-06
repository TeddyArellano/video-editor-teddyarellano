// Notas de revisión locales (edicion/notas.json): se agregan en el cuadro actual, se ven en la línea de tiempo y
// Claude las lee y aplica (las marca "aplicado" con una respuesta). Mismo esquema que la página de revisión.
import React, {useState} from 'react';
import type {Obj} from '@shared/elementos';
import {useEditor} from '@/store';
import {ir, tc, useReloj} from '@/reloj';
import {Boton, inputCls, Seccion} from '@/ui';
import {pedirAClaude} from '../claude/PanelClaude';

export type Nota = {id: string; t: number; texto: string; autor: string; estado: 'pendiente' | 'aplicado'; respuesta?: string; version?: number; creado: number};

export const Notas: React.FC = () => {
  const notas = (useEditor((s) => s.notas) ?? []) as Nota[];
  const frame = useReloj((s) => s.frame);
  const [texto, setTexto] = useState('');
  const set = (l: Nota[]) => useEditor.getState().editar({notas: l as unknown as Obj[]});
  const ordenadas = [...notas].sort((a, b) => a.t - b.t);
  const pendientes = notas.filter((n) => n.estado === 'pendiente').length;

  return (
    <div data-testid="notas">
      <Seccion titulo={`Nota en ${tc(frame)}`}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            set([...notas, {id: crypto.randomUUID(), t: +(frame / 30).toFixed(2), texto: texto.trim(), autor: 'creador', estado: 'pendiente', creado: Date.now()}]);
            setTexto('');
          }}
        >
          <textarea className={inputCls} rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="p. ej. sube la etiqueta, corta antes de “eh”…" data-testid="nota-texto" />
          <div className="flex gap-1">
            <Boton v="primario" type="submit" data-testid="nota-agregar">
              Agregar nota
            </Boton>
            <Boton
              disabled={!pendientes}
              onClick={() => pedirAClaude('Aplica las notas pendientes de edicion/notas.json (cada una en su tiempo t, en segundos del video). Márcalas "aplicado" con una respuesta breve.')}
            >
              Claude: aplicar {pendientes} pendientes
            </Boton>
          </div>
        </form>
      </Seccion>
      <div className="space-y-1.5 p-3">
        {ordenadas.map((n) => (
          <div key={n.id} className={`rounded-md border p-2 text-xs ${n.estado === 'aplicado' ? 'border-emerald-900 bg-emerald-950/30' : 'border-zinc-800 bg-zinc-900/60'}`}>
            <div className="flex items-center gap-2">
              <button className="font-mono text-sky-400 hover:underline" onClick={() => ir(Math.round(n.t * 30))}>
                {tc(Math.round(n.t * 30))}
              </button>
              <span className={`text-[10px] ${n.estado === 'aplicado' ? 'text-emerald-400' : 'text-rose-400'}`}>{n.estado}</span>
              <div className="flex-1" />
              <button
                className="text-[11px] text-zinc-400 hover:text-white"
                onClick={() => set(notas.map((x) => (x.id === n.id ? {...x, estado: x.estado === 'aplicado' ? 'pendiente' : 'aplicado'} : x)))}
              >
                {n.estado === 'aplicado' ? 'reabrir' : 'marcar aplicada'}
              </button>
              <button className="text-zinc-500 hover:text-rose-400" onClick={() => set(notas.filter((x) => x.id !== n.id))}>
                ✕
              </button>
            </div>
            <div className="mt-1 text-zinc-200">{n.texto}</div>
            {n.respuesta && <div className="mt-1 border-l-2 border-emerald-700 pl-2 text-zinc-400">{n.respuesta}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
