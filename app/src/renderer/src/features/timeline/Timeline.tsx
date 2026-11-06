// Línea de tiempo multipista: secciones, tramos del corte, subtítulos (los mismos bloques que dibuja la plantilla),
// gancho, eventos (etiquetas, imágenes, montos…), zooms, SFX y notas. Arrastrar = mover; bordes = estirar.
// Al soltar, el inicio se pega a la palabra más cercana (Alt = sin pegar) y se guarda como ancla en eventos.json.
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {CHUNKS} from '@plantilla/components/Captions';
import {aplicarTiempo, bloques, LISTAS, LISTAS_TIEMPO, type Bloque, type Lista, type Obj, type Sel} from '@shared/elementos';
import {useEditor} from '@/store';
import {ir, tc, useReloj} from '@/reloj';
import {conPlantilla, usePropsPlantilla} from '@/plantilla';

const ALTO = 22;
const ETIQUETA = 92;
const COLORES_SEC = ['#334155', '#3f3f46', '#1e3a5f', '#3b2f4a', '#2f4a3b', '#4a3b2f'];

type Arrastre = {sel: Sel; modo: 'mover' | 'ini' | 'fin'; x0: number; a0: number; b0: number; da: number; db: number};

export const Timeline: React.FC = () => {
  const data = useEditor((s) => s.data);
  const props = usePropsPlantilla();
  const edl = useEditor((s) => s.edl);
  const notas = useEditor((s) => s.notas);
  const sel = useEditor((s) => s.sel);
  const frame = useReloj((s) => s.frame);
  const total = useReloj((s) => s.total);
  const scroll = useRef<HTMLDivElement>(null);
  const [ppc, setPpc] = useState(2.2); // píxeles por cuadro
  const [arr, setArr] = useState<Arrastre | null>(null);

  // ancho inicial: que quepa todo el video
  useEffect(() => {
    const w = scroll.current?.clientWidth ?? 1000;
    if (total > 1) setPpc(Math.max(0.15, Math.min(6, (w - ETIQUETA - 20) / total)));
  }, [total > 1]);

  const chunks = useMemo(
    () => conPlantilla(props, () => CHUNKS().map((c) => ({from: c.from, to: c.to, enf: !!c.enf, texto: c.words.map((w) => w.text).join(' ')}))) ?? [],
    [props],
  );

  const todos = useMemo(() => (data ? bloques(data) : []), [data]);
  // bloques que se enciman en el tiempo van en sub-carriles (si no, uno tapa al otro y no se puede agarrar)
  const carriles = (bs: Bloque[]) => {
    const fin: number[] = [];
    const carril = new Map<Bloque, number>();
    for (const b of [...bs].sort((x, y) => x.a - y.a)) {
      let k = fin.findIndex((e) => e <= b.a);
      if (k < 0) k = fin.push(0) - 1;
      fin[k] = b.b;
      carril.set(b, k);
    }
    return {carril, n: Math.max(1, fin.length)};
  };
  const filas = useMemo(() => {
    const f: {id: string; nombre: string; bloques: Bloque[]}[] = [];
    const hook = todos.filter((b) => b.sel.lista === 'hook');
    if (hook.length) f.push({id: 'hook', nombre: 'Gancho', bloques: hook});
    for (const l of LISTAS_TIEMPO) {
      const bs = todos.filter((b) => b.sel.lista === l);
      if (bs.length) f.push({id: l, nombre: LISTAS[l].nombre + (l === 'labels' ? 's' : l === 'zooms' ? 's' : ''), bloques: bs});
    }
    return f;
  }, [todos]);

  // seguir el cursor de reproducción
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const x = ETIQUETA + frame * ppc;
    if (x < el.scrollLeft + ETIQUETA || x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = Math.max(0, x - el.clientWidth / 3);
  }, [frame, ppc]);

  if (!data) return <div className="h-full" />;
  const ancho = ETIQUETA + total * ppc + 40;
  const X = (f: number) => ETIQUETA + f * ppc;

  const cuadroDe = (e: React.MouseEvent | PointerEvent) => {
    const el = scroll.current!;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.round((e.clientX - r.left + el.scrollLeft - ETIQUETA) / ppc));
  };

  const empezar = (b: Bloque, modo: Arrastre['modo']) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    useEditor.getState().seleccionar(b.sel);
    useEditor.getState().set({panel: 'inspector'});
    const st: Arrastre = {sel: b.sel, modo, x0: e.clientX, a0: b.a, b0: b.b, da: 0, db: 0};
    let movido = false;
    const mov = (ev: PointerEvent) => {
      const d = Math.round((ev.clientX - st.x0) / ppc);
      if (Math.abs(ev.clientX - st.x0) > 3) movido = true;
      st.da = modo === 'fin' ? 0 : d;
      st.db = modo === 'ini' ? 0 : d;
      if (modo === 'ini' && st.a0 + st.da > st.b0 - 3) st.da = st.b0 - 3 - st.a0;
      if (modo === 'fin' && st.b0 + st.db < st.a0 + 3) st.db = st.a0 + 3 - st.b0;
      setArr({...st});
    };
    const fin = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mov);
      window.removeEventListener('pointerup', fin);
      setArr(null);
      if (!movido) return ir(b.a + 1);
      const s = useEditor.getState();
      if (!s.data) return;
      const r = aplicarTiempo(s.data, s.eventos ?? {}, b.sel, st.a0 + st.da, st.b0 + st.db, !ev.altKey);
      s.editar({data: r.data, eventos: r.eventos});
    };
    window.addEventListener('pointermove', mov);
    window.addEventListener('pointerup', fin);
  };

  const buscarEnRegla = (e: React.PointerEvent) => {
    ir(cuadroDe(e));
    const mov = (ev: PointerEvent) => ir(cuadroDe(ev));
    const fin = () => {
      window.removeEventListener('pointermove', mov);
      window.removeEventListener('pointerup', fin);
    };
    window.addEventListener('pointermove', mov);
    window.addEventListener('pointerup', fin);
  };

  const zoom = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const el = scroll.current!;
    const f = cuadroDe(e);
    const n = Math.max(0.1, Math.min(14, ppc * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    setPpc(n);
    requestAnimationFrame(() => (el.scrollLeft = ETIQUETA + f * n - (e.clientX - el.getBoundingClientRect().left)));
  };

  const paso = ppc > 4 ? 30 : ppc > 1.5 ? 60 : ppc > 0.6 ? 150 : ppc > 0.25 ? 300 : 900;
  const marcas = [];
  for (let f = 0; f <= total; f += paso) marcas.push(f);

  const fila = (titulo: string, contenido: React.ReactNode, key: string, alto = ALTO) => (
    <div key={key} className="relative border-b border-zinc-800/80" style={{height: alto + 6, width: ancho}} data-testid={`fila-${key}`}>
      <div className="sticky left-0 z-20 flex h-full items-center bg-zinc-950 pl-2 text-[11px] text-zinc-400" style={{width: ETIQUETA}}>
        {titulo}
      </div>
      <div className="absolute inset-0">{contenido}</div>
    </div>
  );

  const bloqueVista = (b: Bloque, carril = 0) => {
    const activo = sel && sel.lista === b.sel.lista && sel.i === b.sel.i;
    const ar = arr && arr.sel.lista === b.sel.lista && arr.sel.i === b.sel.i ? arr : null;
    const a = b.a + (ar?.da ?? 0);
    const bb = b.b + (ar?.db ?? 0);
    const w = Math.max(6, (bb - a) * ppc);
    return (
      <div
        key={`${b.sel.lista}:${b.sel.i}`}
        data-testid={`bloque-${b.sel.lista}-${b.sel.i}`}
        className={`absolute top-[3px] flex cursor-grab items-center overflow-hidden rounded px-1 text-[10px] leading-none text-white ${activo ? 'ring-2 ring-white' : ''}`}
        style={{left: X(a), width: w, height: ALTO, top: 3 + carril * (ALTO + 2), background: b.color + (activo ? '' : 'cc')}}
        onPointerDown={empezar(b, 'mover')}
        title={`${LISTAS[b.sel.lista as Lista].nombre}: ${b.texto}  ${tc(a)}–${tc(bb)}`}
      >
        <span className="pointer-events-none truncate">{b.texto}</span>
        {b.sel.lista !== 'sfx' && b.sel.lista !== 'hook' && (
          <>
            <div className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-white/50" onPointerDown={empezar(b, 'ini')} />
            <div className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-white/50" onPointerDown={empezar(b, 'fin')} />
          </>
        )}
      </div>
    );
  };

  return (
    <div ref={scroll} className="relative h-full overflow-auto bg-zinc-950 select-none" onWheel={zoom} data-testid="timeline">
      <div style={{width: ancho}} className="relative">
        {/* regla */}
        <div className="sticky top-0 z-30 h-6 border-b border-zinc-700 bg-zinc-900" style={{width: ancho}} onPointerDown={buscarEnRegla}>
          <div className="sticky left-0 z-20 flex h-full items-center bg-zinc-900 pl-2 text-[10px] text-zinc-500" style={{width: ETIQUETA}}>
            {tc(frame)}
          </div>
          {marcas.map((f) => (
            <div key={f} className="absolute top-0 h-full border-l border-zinc-700 pl-1 text-[10px] text-zinc-500" style={{left: X(f)}}>
              {tc(f).replace(/\.\d+$/, '')}
            </div>
          ))}
        </div>
        {fila(
          'Secciones',
          (data.secs ?? []).map((s: Obj, i: number) => (
            <div key={s.id + i} className="absolute top-[3px] overflow-hidden rounded px-1 text-[10px] leading-[22px] text-zinc-200" style={{left: X(s.a), width: (s.b - s.a) * ppc, height: ALTO, background: s.color ?? COLORES_SEC[i % COLORES_SEC.length]}}>
              {s.id}
            </div>
          )),
          'secs',
        )}
        {edl &&
          fila(
            'Tramos',
            edl.map((p: Obj, i: number) => (
              <div
                key={i}
                className="absolute top-[3px] overflow-hidden rounded-sm border-r border-zinc-950 px-1 text-[9px] leading-[22px] text-zinc-300"
                style={{left: X(p.start), width: p.frames * ppc, height: ALTO, background: p.speed !== 1 ? '#7c2d12' : i % 2 ? '#27272a' : '#3f3f46'}}
                title={`${p.src} ${p.in?.toFixed?.(2)}–${p.out?.toFixed?.(2)} s${p.speed !== 1 ? ` ×${p.speed}` : ''}\n${p.text ?? ''}`}
                onPointerDown={() => ir(p.start + 1)}
              >
                {p.speed !== 1 ? `×${p.speed} ` : ''}
                {p.src}
              </div>
            )),
            'tramos',
          )}
        {fila(
          'Subtítulos',
          chunks.map((c, i) => (
            <div
              key={i}
              className={`absolute top-[3px] overflow-hidden rounded-sm px-1 text-[9px] leading-[22px] ${c.enf ? 'bg-amber-600 text-black' : 'bg-zinc-700 text-zinc-100'}`}
              style={{left: X(c.from), width: Math.max(3, (c.to - c.from) * ppc - 1), height: ALTO}}
              title={c.texto}
              onPointerDown={() => {
                ir(c.from + 1);
                useEditor.getState().set({panel: 'subtitulos'});
              }}
            >
              {c.texto}
            </div>
          )),
          'subs',
        )}
        {filas.map((f) => {
          const {carril, n} = carriles(f.bloques);
          return fila(f.nombre, f.bloques.map((b) => bloqueVista(b, carril.get(b) ?? 0)), f.id, n * (ALTO + 2) - 2);
        })}
        {(notas ?? []).length > 0 &&
          fila(
            'Notas',
            (notas ?? []).map((n: Obj) => (
              <div
                key={n.id}
                className={`absolute top-[4px] h-[18px] w-[18px] -translate-x-1/2 cursor-pointer rounded-full text-center text-[10px] leading-[18px] ${n.estado === 'aplicado' ? 'bg-emerald-600' : 'bg-rose-500'}`}
                style={{left: X(Math.round(n.t * 30))}}
                title={n.texto}
                onPointerDown={() => {
                  ir(Math.round(n.t * 30));
                  useEditor.getState().set({panel: 'notas'});
                }}
              >
                ✎
              </div>
            )),
            'notas',
          )}
        {/* cabezal */}
        <div className="pointer-events-none absolute top-0 bottom-0 z-40 w-px bg-red-500" style={{left: X(frame)}}>
          <div className="absolute -left-[5px] top-0 h-3 w-[11px] bg-red-500" style={{clipPath: 'polygon(0 0,100% 0,50% 100%)'}} />
        </div>
      </div>
    </div>
  );
};
