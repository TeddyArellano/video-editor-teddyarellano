// Panel de estilo: src/estilo.json del proyecto (colores, subtítulos, cámara, etiquetas, montos, SFX automáticos…).
// Los cambios se ven al instante en la vista previa. También: cambiar de preset, aplicar marca y guardar como preset.
import React, {useEffect, useState} from 'react';
import type {Obj} from '@shared/elementos';
import {useEditor} from '@/store';
import {Boton, Etiqueta, inputCls, Seccion, Vacio} from '@/ui';
import {FUENTES, type Campo} from '../inspector/campos';

const GRUPOS: {k: string; n: string; campos: Campo[]}[] = [
  {k: 'colores', n: 'Colores', campos: ['acento', 'texto', 'contorno', 'a', 'b', 'pildora'].map((k) => ({k, t: 'color', n: k}))},
  {
    k: 'subtitulos',
    n: 'Subtítulos',
    campos: [
      {k: 'fuente', t: 'fuente', n: 'Fuente'},
      {k: 'size', t: 'num', n: 'Tamaño', paso: 2},
      {k: 'top', t: 'num', n: 'Altura (top)', paso: 10},
      {k: 'peso', t: 'num', n: 'Peso', paso: 100},
      {k: 'italic', t: 'bool', n: 'Cursiva'},
      {k: 'contorno', t: 'num', n: 'Contorno', paso: 1},
      {k: 'maxPalabras', t: 'num', n: 'Máx. palabras por bloque', min: 1, max: 8},
      {k: 'maxChars', t: 'num', n: 'Máx. caracteres por bloque', min: 4, max: 40},
      {k: 'mayus', t: 'bool', n: 'Mayúsculas'},
      {k: 'simple', t: 'bool', n: 'Sencillos (sin animación)'},
      {k: 'sombra', t: 'texto', n: 'Sombra (CSS)'},
    ],
  },
  {
    k: 'camara',
    n: 'Cámara',
    campos: [
      {k: 'empuje', t: 'num', n: 'Empuje lento', paso: 0.01},
      {k: 'ancla_y', t: 'num', n: 'Altura de la cara (ancla_y)', paso: 0.01},
      {k: 'zoom_objeto', t: 'num', n: 'Zoom a objetos', paso: 0.05},
      {k: 'caras', t: 'num', n: 'Caras a encuadrar', min: 1, max: 4},
    ],
  },
  {
    k: 'etiqueta',
    n: 'Etiquetas',
    campos: [
      {k: 'variante', t: 'opcion', n: 'Variante', op: ['barra', 'tarjeta', 'hud']},
      {k: 'fuente', t: 'fuente', n: 'Fuente'},
      {k: 'size', t: 'num', n: 'Tamaño', paso: 2},
      {k: 'top', t: 'num', n: 'Altura (top)', paso: 10},
      {k: 'bg', t: 'color', n: 'Fondo'},
      {k: 'color', t: 'color', n: 'Color'},
      {k: 'ocultar_subs', t: 'bool', n: 'Ocultar subtítulos mientras se ve'},
    ],
  },
  {k: 'monto', n: 'Montos', campos: [{k: 'estilo', t: 'opcion', n: 'Estilo', op: ['pixel', 'golpe']}]},
  {k: 'contador', n: 'Contador', campos: [{k: 'titulo', t: 'texto', n: 'Título'}, {k: 'fuente', t: 'fuente', n: 'Fuente'}, {k: 'fuente_num', t: 'fuente', n: 'Fuente del número'}]},
  {k: 'nombre', n: 'Nombres', campos: [{k: 'fuente', t: 'fuente', n: 'Fuente'}, {k: 'sub_fuente', t: 'fuente', n: 'Fuente del subtítulo'}]},
  {k: 'cierre', n: 'Cierre', campos: [{k: 'fuente', t: 'fuente', n: 'Fuente'}, {k: 'peso', t: 'num', n: 'Peso', paso: 100}, {k: 'italic', t: 'bool', n: 'Cursiva'}]},
  {
    k: 'sfx_auto',
    n: 'SFX automáticos',
    campos: [
      {k: 'objeto', t: 'texto', n: 'Objeto'},
      {k: 'objeto_vol', t: 'num', n: 'Vol. objeto', paso: 0.02},
      {k: 'zoom', t: 'texto', n: 'Zoom'},
      {k: 'zoom_vol', t: 'num', n: 'Vol. zoom', paso: 0.02},
      {k: 'transicion', t: 'texto', n: 'Transición'},
      {k: 'aparece', t: 'texto', n: 'Aparece (etiquetas…)'},
      {k: 'aparece_vol', t: 'num', n: 'Vol. aparece', paso: 0.02},
    ],
  },
];

const Campo1: React.FC<{c: Campo; v: unknown; set: (v: unknown) => void}> = ({c, v, set}) => {
  if (c.t === 'bool') return <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-sky-500" />;
  if (c.t === 'fuente' || c.t === 'opcion')
    return (
      <select className={inputCls} value={String(v ?? '')} onChange={(e) => set(e.target.value || undefined)}>
        <option value="">(ninguno)</option>
        {(c.t === 'fuente' ? FUENTES : c.op ?? []).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  if (c.t === 'color')
    return (
      <div className="flex gap-1">
        <input type="color" value={typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000'} onChange={(e) => set(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-zinc-700 bg-transparent" />
        <input className={inputCls} value={String(v ?? '')} onChange={(e) => set(e.target.value || undefined)} />
      </div>
    );
  if (c.t === 'num')
    return <input type="number" step={c.paso ?? 1} min={c.min} max={c.max} className={inputCls} value={v === undefined ? '' : String(v)} onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))} />;
  return <input className={inputCls} value={String(v ?? '')} onChange={(e) => set(e.target.value || undefined)} />;
};

export const Estilo: React.FC = () => {
  const estilo = useEditor((s) => s.estilo);
  const info = useEditor((s) => s.info)!;
  const [abierto, setAbierto] = useState<string>('colores');
  const [cat, setCat] = useState<{estilos: {id: string; nombre: string}[]; marcas: {id: string; nombre: string}[]}>({estilos: [], marcas: []});
  const [nuevoId, setNuevoId] = useState('');
  useEffect(() => {
    window.reel.estilos().then(setCat);
  }, []);
  if (!estilo) return <Vacio>El proyecto no tiene src/estilo.json.</Vacio>;

  const set = (g: string, k: string, v: unknown) => {
    const e: Obj = JSON.parse(JSON.stringify(useEditor.getState().estilo));
    e[g] = e[g] ?? {};
    if (v === undefined) delete e[g][k];
    else e[g][k] = v;
    useEditor.getState().editar({estilo: e});
  };

  return (
    <div data-testid="estilo">
      <Seccion titulo="Preset y marca">
        <Etiqueta n="Cambiar a un estilo de la skill (reemplaza src/estilo.json)">
          <select
            className={inputCls}
            value=""
            onChange={async (ev) => {
              const id = ev.target.value;
              if (!id || !confirm(`¿Reemplazar el estilo del proyecto por "${id}"? Puedes deshacer con ⌘Z.`)) return;
              const nuevo = (await window.reel.leerEstilo(id)) as Obj;
              const marca = (estilo as Obj).marca;
              useEditor.getState().editar({estilo: marca ? {...nuevo, marca} : nuevo});
            }}
          >
            <option value="">Elegir…</option>
            {cat.estilos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} ({e.id})
              </option>
            ))}
          </select>
        </Etiqueta>
        <Etiqueta n="Aplicar marca (colores y logos)">
          <select
            className={inputCls}
            value=""
            onChange={(ev) => ev.target.value && window.reel.correr(info.id, `Marca ${ev.target.value}`, ['marca', ev.target.value])}
          >
            <option value="">Elegir…</option>
            {cat.marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Etiqueta>
        <div className="flex gap-1">
          <input className={inputCls} placeholder="id-del-preset" value={nuevoId} onChange={(e) => setNuevoId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
          <Boton
            disabled={!nuevoId}
            onClick={async () => {
              try {
                await window.reel.guardarEstilo(nuevoId, {...estilo, nombre: (estilo as Obj).nombre ?? nuevoId});
                useEditor.getState().avisar('ok', `Guardado como estilos/${nuevoId}.json en la skill.`);
                window.reel.estilos().then(setCat);
              } catch (e) {
                useEditor.getState().avisar('error', String(e));
              }
            }}
            title="Guarda este estilo como preset de la skill (estilos/<id>.json)"
          >
            Guardar preset
          </Boton>
        </div>
      </Seccion>
      {GRUPOS.map((g) => (
        <div key={g.k} className="border-b border-zinc-800">
          <button className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-zinc-300 uppercase hover:bg-zinc-900" onClick={() => setAbierto(abierto === g.k ? '' : g.k)}>
            {g.n}
            <span className="text-zinc-500">{abierto === g.k ? '−' : '+'}</span>
          </button>
          {abierto === g.k && (
            <div className="grid grid-cols-2 gap-2 px-3 pb-3">
              {g.campos.map((c) => (
                <Etiqueta key={c.k} n={c.n}>
                  <Campo1 c={c} v={(estilo as Obj)[g.k]?.[c.k]} set={(v) => set(g.k, c.k, v)} />
                </Etiqueta>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
