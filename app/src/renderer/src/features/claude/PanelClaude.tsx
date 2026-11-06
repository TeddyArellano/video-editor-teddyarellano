// Panel de Claude: pedir cambios de criterio (gancho, tomas, eventos…) a Claude Code con la skill /editar-reel.
// Antes de cada pedido se toma una foto de los archivos editables; al terminar se muestra qué cambió y se puede
// revertir con un clic (la vista previa ya se actualizó sola por el vigilante de archivos).
import React, {useEffect, useRef, useState} from 'react';
import type {Archivo, EventoClaude} from '@shared/tipos';
import {nombreSel} from '@shared/elementos';
import {ARCHIVO_DE, guardar, useEditor, type Doc} from '@/store';
import {tc, useReloj} from '@/reloj';
import {Boton, inputCls, Seccion} from '@/ui';

type Msg = {de: 'yo' | 'claude' | 'herramienta' | 'error'; texto: string};
const DOCS: Doc[] = ['eventos', 'plan', 'estilo', 'notas'];

type Estado = {msgs: Msg[]; sesion: string | null; foto: Partial<Record<Doc, string>> | null; cambiados: Doc[]};
let estado: Estado = {msgs: [], sesion: null, foto: null, cambiados: []};
const oyentes = new Set<() => void>();
const actualizar = (p: Partial<Estado>) => {
  estado = {...estado, ...p};
  oyentes.forEach((f) => f());
};

const leerTodo = async () => {
  const info = useEditor.getState().info!;
  const r: Partial<Record<Doc, string>> = {};
  for (const d of DOCS) {
    const c = await window.reel.leer(info.id, ARCHIVO_DE[d]);
    r[d] = c ? JSON.stringify(c.contenido) : '';
  }
  return r;
};

export const pedirAClaude = async (texto: string) => {
  const s = useEditor.getState();
  if (!s.info || estado.sesion) return;
  s.set({panel: 'claude'});
  await guardar(false);
  const f = useReloj.getState().frame;
  const ctx = [`Cuadro actual del editor: ${f} (${tc(f)}).`, s.sel && s.data ? `Elemento seleccionado: ${nombreSel(s.data, s.sel)} (lista ${s.sel.lista}, índice ${s.sel.i}).` : ''].filter(Boolean).join(' ');
  const foto = await leerTodo();
  actualizar({msgs: [...estado.msgs, {de: 'yo', texto}], foto, cambiados: []});
  const sesion = await window.reel.claude(s.info.id, `${texto}\n\n(${ctx})`);
  actualizar({sesion});
};

const alTerminar = async () => {
  if (!estado.foto) return actualizar({sesion: null});
  const ahora = await leerTodo();
  const cambiados = DOCS.filter((d) => ahora[d] !== estado.foto![d]);
  actualizar({sesion: null, cambiados});
  // asegura que la vista previa tenga lo último (el vigilante ya lo hizo; esto cubre data.json)
  for (const d of [...cambiados, 'data' as Doc]) await useEditor.getState().recargar(d);
  // si Claude cambió eventos/estilo y no regeneró data.json, se regenera aquí para que la vista previa lo muestre
  const info = useEditor.getState().info;
  if (info && cambiados.some((d) => d === 'eventos' || d === 'estilo')) window.reel.correr(info.id, 'Datos', ['datos']);
};

export const PanelClaude: React.FC = () => {
  const [, forzar] = useState(0);
  const [texto, setTexto] = useState('');
  const fin = useRef<HTMLDivElement>(null);
  const info = useEditor((s) => s.info)!;
  useEffect(() => {
    const f = () => forzar((x) => x + 1);
    oyentes.add(f);
    return () => {
      oyentes.delete(f);
    };
  }, []);
  useEffect(() => {
    fin.current?.scrollIntoView({block: 'end'});
  }, [estado.msgs.length]);

  const revertir = async () => {
    if (!estado.foto) return;
    for (const d of estado.cambiados) {
      const actual = await window.reel.leer(info.id, ARCHIVO_DE[d] as Archivo);
      const previo = estado.foto[d] ? JSON.parse(estado.foto[d]!) : d === 'notas' ? [] : {};
      await window.reel.escribir(info.id, ARCHIVO_DE[d] as Archivo, previo, actual?.hash ?? null);
      await useEditor.getState().recargar(d);
    }
    actualizar({cambiados: [], msgs: [...estado.msgs, {de: 'herramienta', texto: 'Cambios de Claude revertidos.'}]});
    if (estado.cambiados.some((d) => d === 'eventos' || d === 'estilo')) window.reel.correr(info.id, 'Datos', ['datos']);
  };

  const rapido = [
    'Mejora el gancho de los primeros segundos',
    'Revisa el plan y propón mejores tomas (sin muletillas ni repeticiones)',
    'Propón eventos (etiquetas, énfasis, SFX, zooms) para este video',
    'Revisa que nada se salga de la zona segura ni tape la cara',
  ];

  return (
    <div className="flex h-full flex-col" data-testid="claude">
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {estado.msgs.length === 0 && (
          <div className="text-xs leading-relaxed text-zinc-500">
            Pídele a Claude cambios de criterio. Trabaja con la skill /editar-reel sobre los mismos archivos que ves aquí; la vista previa se actualiza sola. Usa tu sesión de Claude Code.
          </div>
        )}
        {estado.msgs.map((m, i) => (
          <div
            key={i}
            className={`rounded-md px-2.5 py-1.5 text-xs whitespace-pre-wrap ${
              m.de === 'yo' ? 'ml-8 bg-sky-900/50 text-sky-100' : m.de === 'claude' ? 'mr-4 bg-zinc-800 text-zinc-100' : m.de === 'error' ? 'bg-rose-950 text-rose-200' : 'font-mono text-[10px] break-all text-zinc-500'
            }`}
          >
            {m.texto}
          </div>
        ))}
        {estado.sesion && <div className="animate-pulse text-[11px] text-zinc-500">Claude está trabajando…</div>}
        {estado.cambiados.length > 0 && !estado.sesion && (
          <div className="flex items-center gap-2 rounded-md border border-zinc-700 p-2 text-[11px] text-zinc-300">
            Cambió: {estado.cambiados.map((d) => ARCHIVO_DE[d]).join(', ')}
            <div className="flex-1" />
            <Boton v="peligro" onClick={revertir}>
              Revertir
            </Boton>
          </div>
        )}
        <div ref={fin} />
      </div>
      <Seccion titulo="Pedir a Claude">
        <div className="flex flex-wrap gap-1">
          {rapido.map((r) => (
            <button key={r} disabled={!!estado.sesion} onClick={() => pedirAClaude(r)} className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300 hover:border-sky-600 disabled:opacity-40">
              {r}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (texto.trim()) pedirAClaude(texto.trim());
            setTexto('');
          }}
          className="flex gap-1"
        >
          <textarea
            className={inputCls}
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
            placeholder="p. ej. haz el gancho más corto y agrega un zoom cuando dice 'mochila'"
          />
          {estado.sesion ? (
            <Boton v="peligro" type="button" onClick={() => window.reel.claudeCancelar(estado.sesion!)}>
              Parar
            </Boton>
          ) : (
            <Boton v="primario" type="submit">
              Enviar
            </Boton>
          )}
        </form>
      </Seccion>
    </div>
  );
};

// eventos de Claude (globales, para que no se pierdan si se cambia de panel)
window.reel?.onClaude((e: EventoClaude) => {
  if (e.sesion !== estado.sesion) return;
  if (e.tipo === 'texto') actualizar({msgs: [...estado.msgs, {de: 'claude', texto: e.texto}]});
  else if (e.tipo === 'herramienta') actualizar({msgs: [...estado.msgs, {de: 'herramienta', texto: e.texto}]});
  else if (e.tipo === 'error') actualizar({msgs: [...estado.msgs, {de: 'error', texto: e.texto}]});
  else if (e.tipo === 'fin') alTerminar();
});
