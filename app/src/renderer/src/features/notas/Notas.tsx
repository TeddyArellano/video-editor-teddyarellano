// Notas de revisión locales (edicion/notas.json): se agregan en el cuadro actual, se ven en la línea de tiempo y
// Claude las lee y aplica (las marca "aplicado" con una respuesta). Mismo esquema que la página de revisión.
import React, {useState} from 'react';
import type {Obj} from '@shared/elementos';
import {useEditor} from '@/store';
import {ir, tc, useReloj} from '@/reloj';
import {Boton, inputCls, Seccion} from '@/ui';
import {pedirAClaude} from '../claude/PanelClaude';

export type Nota = {id: string; t: number; texto: string; autor: string; estado: 'pendiente' | 'aplicado'; respuesta?: string; version?: number; creado: number};

// página de revisión (SKILL.md §4): `reel revision --renderizar` prepara el borrador web y revision.html. Publicarla en
// claude.ai requiere la herramienta Artifact, que solo tiene una sesión interactiva de Claude (el `claude -p` de la app no):
// la app copia el pedido exacto para pegarlo en Claude Code.
export const pedidoPublicar = (ruta: string) =>
  `/editar-reel Publica la página de revisión del proyecto ${ruta} siguiendo SKILL.md §4 (la página y el borrador web ya están listos en edicion/revision/: haz los pasos 2–4 y dame el link).`;

const Revision: React.FC = () => {
  const info = useEditor((s) => s.info)!;
  const t = useEditor((s) => s.trabajos.find((x) => x.proyecto === info.id && x.comando[0] === 'revision'));
  return (
    <Seccion titulo="Página de revisión (para compartir)">
      <div className="text-[11px] text-zinc-500">Borrador web + página con notas por código de tiempo para revisar desde el celular o con otras personas.</div>
      <div className="flex flex-wrap gap-1">
        <Boton onClick={() => window.reel.correr(info.id, 'Página de revisión', ['revision', '--renderizar'])} disabled={t?.estado === 'corriendo'} data-testid="preparar-revision">
          Preparar página
        </Boton>
        {t?.estado === 'ok' && (
          <>
            <Boton onClick={() => window.reel.mostrarEnFinder(`${info.ruta}/edicion/revision/revision.html`)}>Mostrar en Finder</Boton>
            <Boton
              v="primario"
              data-testid="publicar-revision"
              title="Publicar en claude.ai necesita la herramienta Artifact, que solo tiene una sesión interactiva de Claude (no el modo -p de la app)"
              onClick={async () => {
                await window.reel.copiar(pedidoPublicar(info.ruta));
                useEditor.getState().avisar('ok', 'Pedido copiado: pégalo en Claude Code (en la terminal) para publicar la página en claude.ai.');
              }}
            >
              Copiar pedido para publicarla
            </Boton>
          </>
        )}
      </div>
      {t && <div className={`text-[11px] ${t.estado === 'error' ? 'text-rose-300' : 'text-zinc-400'}`} data-testid="estado-revision">{t.estado === 'corriendo' ? 'preparando…' : t.estado === 'ok' ? '✓ edicion/revision/revision.html lista' : t.ultimo}</div>}
    </Seccion>
  );
};

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
              onClick={() => pedirAClaude('Aplica las notas pendientes de Reel Studio: lístalas con `reel notas -p <proyecto>`, aplica cada una en su tiempo y márcala con `reel notas -p <proyecto> --marcar <id> --respuesta "qué hiciste"`.')}
            >
              Claude: aplicar {pendientes} pendientes
            </Boton>
          </div>
        </form>
      </Seccion>
      <Revision />
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
