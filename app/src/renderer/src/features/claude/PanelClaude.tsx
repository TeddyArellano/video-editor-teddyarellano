// Panel de Claude: pedir cambios de criterio (gancho, tomas, eventos…) a Claude Code con la skill /editar-reel.
// Antes de cada pedido se toma una foto de los archivos editables; al terminar se muestra qué cambió y se puede
// revertir con un clic (la vista previa ya se actualizó sola por el vigilante de archivos).
import React, {useEffect, useRef, useState} from 'react';
import type {Archivo, EventoClaude} from '@shared/tipos';
import {nombreSel} from '@shared/elementos';
import {corto, diffJSON} from '@shared/diff';
import {ARCHIVO_DE, guardar, useEditor, type Doc} from '@/store';
import {tc, useReloj} from '@/reloj';
import {Boton, inputCls, Seccion} from '@/ui';

type Msg = {de: 'yo' | 'claude' | 'herramienta' | 'error'; texto: string};
const DOCS: Doc[] = ['eventos', 'plan', 'estilo', 'notas'];

// revisar = antes de aplicar lo que propone Claude se ve el diff (Aplicar / Descartar). Sin revisar: se aplica y se puede revertir.
type Estado = {
  msgs: Msg[];
  sesion: string | null;
  foto: Partial<Record<Doc, string>> | null; // archivos antes del pedido (JSON en texto)
  propuesta: Partial<Record<Doc, string>> | null; // lo que dejó Claude (modo revisar, aún sin aplicar)
  aplicado: Partial<Record<Doc, string>> | null; // lo que dejó Claude (modo directo, ya aplicado)
  cambiados: Doc[];
  revisar: boolean;
};
let estado: Estado = {msgs: [], sesion: null, foto: null, propuesta: null, aplicado: null, cambiados: [], revisar: true};
try {
  estado.revisar = localStorage.getItem('reel.claude.revisar') !== '0';
} catch {
  /* sin localStorage */
}
const oyentes = new Set<() => void>();
const actualizar = (p: Partial<Estado>) => {
  estado = {...estado, ...p};
  oyentes.forEach((f) => f());
};
// mientras Claude trabaja en modo revisar, la app no recarga sus cambios (App.tsx lo consulta)
export const claudeRevisando = () => !!estado.sesion && estado.revisar;

const leerTodo = async () => {
  const info = useEditor.getState().info!;
  const r: Partial<Record<Doc, string>> = {};
  for (const d of DOCS) {
    const c = await window.reel.leer(info.id, ARCHIVO_DE[d]);
    r[d] = c ? JSON.stringify(c.contenido) : '';
  }
  return r;
};
const vacio = (d: Doc) => (d === 'notas' ? [] : {});
const escribirTodo = async (docs: Doc[], fuente: Partial<Record<Doc, string>>) => {
  const info = useEditor.getState().info!;
  for (const d of docs) {
    const actual = await window.reel.leer(info.id, ARCHIVO_DE[d] as Archivo);
    await window.reel.escribir(info.id, ARCHIVO_DE[d] as Archivo, fuente[d] ? JSON.parse(fuente[d]!) : vacio(d), actual?.hash ?? null);
    await useEditor.getState().recargar(d);
  }
  if (docs.some((d) => d === 'eventos' || d === 'estilo')) window.reel.correr(info.id, 'Datos', ['datos']);
};

export const pedirAClaude = async (texto: string) => {
  const s = useEditor.getState();
  if (!s.info || estado.sesion) return;
  s.set({panel: 'claude'});
  await guardar(false);
  const f = useReloj.getState().frame;
  const ctx = [`Cuadro actual del editor: ${f} (${tc(f)}).`, s.sel && s.data ? `Elemento seleccionado: ${nombreSel(s.data, s.sel)} (lista ${s.sel.lista}, índice ${s.sel.i}).` : ''].filter(Boolean).join(' ');
  const foto = await leerTodo();
  actualizar({msgs: [...estado.msgs, {de: 'yo', texto}], foto, propuesta: null, cambiados: []});
  const sesion = await window.reel.claude(s.info.id, `${texto}\n\n(${ctx})`);
  actualizar({sesion});
};

const alTerminar = async () => {
  if (!estado.foto) return actualizar({sesion: null});
  const ahora = await leerTodo();
  const cambiados = DOCS.filter((d) => ahora[d] !== estado.foto![d]);
  if (estado.revisar && cambiados.length) {
    // se guarda la propuesta y los archivos vuelven a como estaban: nada cambia hasta "Aplicar"
    actualizar({sesion: null, cambiados, propuesta: ahora});
    await escribirTodo(cambiados, estado.foto);
    await useEditor.getState().recargar('data');
    return;
  }
  actualizar({sesion: null, cambiados, propuesta: null, aplicado: ahora});
  for (const d of [...cambiados, 'data' as Doc]) await useEditor.getState().recargar(d);
  // si Claude cambió eventos/estilo y no regeneró data.json, se regenera aquí para que la vista previa lo muestre
  const info = useEditor.getState().info;
  if (info && cambiados.some((d) => d === 'eventos' || d === 'estilo')) window.reel.correr(info.id, 'Datos', ['datos']);
};

const Diff: React.FC<{doc: Doc; antes?: string; despues?: string}> = ({doc, antes, despues}) => {
  const cambios = diffJSON(antes ? JSON.parse(antes) : vacio(doc), despues ? JSON.parse(despues) : vacio(doc));
  return (
    <div className="rounded border border-zinc-800 bg-black/30 p-2 text-[11px]" data-testid={`diff-${doc}`}>
      <div className="mb-1 font-mono text-zinc-400">
        {ARCHIVO_DE[doc]} · {cambios.length} cambio{cambios.length === 1 ? '' : 's'}
      </div>
      <div className="max-h-56 space-y-0.5 overflow-auto font-mono">
        {cambios.slice(0, 200).map((c, k) => (
          <div key={k} className="break-all">
            <span className="text-zinc-300">{c.ruta || '(todo)'}</span>{' '}
            {c.tipo !== 'nuevo' && <span className="text-rose-400 line-through">{corto(c.antes)}</span>}
            {c.tipo === 'cambio' && <span className="text-zinc-500"> → </span>}
            {c.tipo !== 'quitado' && <span className="text-emerald-400">{corto(c.despues)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
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
    await escribirTodo(estado.cambiados, estado.foto);
    actualizar({cambiados: [], msgs: [...estado.msgs, {de: 'herramienta', texto: 'Cambios de Claude revertidos.'}]});
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
        {estado.propuesta && !estado.sesion && (
          <div className="space-y-2 rounded-md border border-sky-800 bg-sky-950/30 p-2" data-testid="propuesta">
            <div className="text-[11px] text-sky-200">Claude propone estos cambios (todavía no se aplican):</div>
            {estado.cambiados.map((d) => (
              <Diff key={d} doc={d} antes={estado.foto?.[d]} despues={estado.propuesta?.[d]} />
            ))}
            <div className="flex justify-end gap-1">
              <Boton v="fantasma" onClick={() => actualizar({propuesta: null, cambiados: [], msgs: [...estado.msgs, {de: 'herramienta', texto: 'Propuesta descartada.'}]})}>
                Descartar
              </Boton>
              <Boton
                v="primario"
                onClick={async () => {
                  const p = estado.propuesta!;
                  const docs = estado.cambiados;
                  actualizar({propuesta: null, msgs: [...estado.msgs, {de: 'herramienta', texto: 'Cambios aplicados.'}]});
                  await escribirTodo(docs, p);
                }}
              >
                Aplicar
              </Boton>
            </div>
          </div>
        )}
        {estado.cambiados.length > 0 && !estado.propuesta && !estado.sesion && (
          <div className="space-y-2 rounded-md border border-zinc-700 p-2 text-[11px] text-zinc-300">
            {estado.aplicado &&
              estado.cambiados.map((d) => <Diff key={d} doc={d} antes={estado.foto?.[d]} despues={estado.aplicado?.[d]} />)}
            <div className="flex items-center gap-2">
              Cambió: {estado.cambiados.map((d) => ARCHIVO_DE[d]).join(', ')}
              <div className="flex-1" />
              <Boton v="peligro" onClick={revertir}>
                Revertir
              </Boton>
            </div>
          </div>
        )}
        <div ref={fin} />
      </div>
      <Seccion
        titulo="Pedir a Claude"
        acciones={
          <label className="flex items-center gap-1 text-[10px] text-zinc-400" title="Ver el diff de lo que propone Claude antes de aplicarlo">
            <input
              type="checkbox"
              className="accent-sky-500"
              checked={estado.revisar}
              onChange={(e) => {
                actualizar({revisar: e.target.checked});
                try {
                  localStorage.setItem('reel.claude.revisar', e.target.checked ? '1' : '0');
                } catch {
                  /* sin localStorage */
                }
              }}
            />
            revisar antes de aplicar
          </label>
        }
      >
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
