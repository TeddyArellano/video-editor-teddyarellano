// Línea de tiempo: barra de herramientas + pistas (secciones, corte, subtítulos, gancho, eventos, zooms, SFX y notas).
//   Corte: clic = cabezal + seleccionar el tramo; arrastrar = seleccionar por palabras; bordes = recortar por palabra.
//   Elementos: arrastrar = mover; bordes = estirar; imanes a palabras, cabezal y otros bordes (Alt = libre).
//   Cuchilla o S = dividir. Nada de esto re-corta el video: lo quitado se ve tachado y la vista previa lo salta hasta "Aplicar".
// El cabezal se mueve por DOM directo y los bloques van memoizados: reproducir o arrastrar no redibuja las pistas.
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {CHUNKS} from '@plantilla/components/Captions';
import {ajustarBorde, objetivoBorde, rangoAPalabras, type BloqueCorte, type ModeloCorte, type Plan} from '@shared/cortes';
import {aplicarTiempo, bloques, LISTAS, LISTAS_TIEMPO, type Bloque, type Lista, type Obj, type Sel} from '@shared/elementos';
import {useEditor, useModeloCorte} from '@/store';
import {irSuave, ir, tc, useReloj} from '@/reloj';
import {conPlantilla, usePropsPlantilla} from '@/plantilla';
import {BarraTimeline} from './BarraTimeline';
import {dividir} from './acciones';
import {PPC_MAX, useVista, zoomVista} from './vista';

const ALTO = 22;
const ALTO_CORTE = 38;
const ETIQUETA = 104;
const COLORES_SEC = ['#334155', '#3f3f46', '#1e3a5f', '#3b2f4a', '#2f4a3b', '#4a3b2f'];
const UMBRAL_IMAN = 7; // píxeles

type ArrElemento = {sel: Sel; da: number; db: number; guia: number | null};
type ArrBorde = {id: number; lado: 'ini' | 'fin'; a: number; b: number; delta: number; texto: string};

// ---- piezas memoizadas (solo se redibuja la que cambia)
const BloqueElemento = React.memo<{b: Bloque; carril: number; ppc: number; activo: boolean; da: number; db: number; empezar: (b: Bloque, modo: 'mover' | 'ini' | 'fin', e: React.PointerEvent) => void}>(({b, carril, ppc, activo, da, db, empezar}) => {
  const a = b.a + da;
  const fin = b.b + db;
  return (
    <div
      data-testid={`bloque-${b.sel.lista}-${b.sel.i}`}
      className={`group absolute flex cursor-grab items-center overflow-hidden rounded-[4px] px-1.5 text-[10px] leading-none font-medium text-white active:cursor-grabbing ${activo ? 'z-10 ring-[1.5px] ring-white' : 'hover:brightness-125'}`}
      style={{left: ETIQUETA + a * ppc, width: Math.max(6, (fin - a) * ppc), height: ALTO, top: 3 + carril * (ALTO + 2), background: b.color + (activo ? '' : 'd0')}}
      onPointerDown={(e) => empezar(b, 'mover', e)}
      title={`${LISTAS[b.sel.lista as Lista].nombre}: ${b.texto}  ${tc(a)}–${tc(fin)}`}
    >
      <span className="pointer-events-none truncate">{b.texto}</span>
      {b.sel.lista !== 'sfx' && b.sel.lista !== 'hook' && (
        <>
          <div data-testid={`borde-ini-${b.sel.lista}-${b.sel.i}`} className="absolute top-0 left-0 h-full w-2 cursor-ew-resize group-hover:bg-white/30" onPointerDown={(e) => empezar(b, 'ini', e)} />
          <div data-testid={`borde-fin-${b.sel.lista}-${b.sel.i}`} className="absolute top-0 right-0 h-full w-2 cursor-ew-resize group-hover:bg-white/30" onPointerDown={(e) => empezar(b, 'fin', e)} />
        </>
      )}
    </div>
  );
});

const BloqueTramo = React.memo<{b: BloqueCorte; m: ModeloCorte; ppc: number; activo: boolean; arr: ArrBorde | null; alBorde: (b: BloqueCorte, lado: 'ini' | 'fin', e: React.PointerEvent) => void; alBloque: (b: BloqueCorte, e: React.PointerEvent) => void; alDoble: (b: BloqueCorte) => void}>(
  ({b, m, ppc, activo, arr, alBorde, alBloque, alDoble}) => {
    const a = arr ? arr.a : b.a;
    const fin = arr ? arr.b : b.b;
    const w = Math.max(3, (fin - a) * ppc);
    const palabras = ppc >= 2.2 && !b.quitada ? m.pal.slice(b.i0, b.i1 + 1) : null;
    return (
      <div
        data-testid={`corte-${b.id}`}
        data-quitada={b.quitada || undefined}
        data-a={b.a}
        data-b={b.b}
        className={`group absolute overflow-hidden rounded-[5px] text-[10px] leading-none ${b.quitada ? 'rayado text-rose-200/80' : b.speed !== 1 ? 'bg-orange-900/80 text-orange-50' : 'bg-zinc-700 text-zinc-50'} ${activo ? 'z-10 ring-[1.5px] ring-acento' : ''} ${arr ? 'opacity-80' : ''}`}
        style={{left: ETIQUETA + a * ppc, width: w, height: ALTO_CORTE, top: 3}}
        onPointerDown={(e) => alBloque(b, e)}
        onDoubleClick={() => alDoble(b)}
        title={`${b.quitada ? 'Se quitará al aplicar · ' : ''}${tc(b.a)}–${tc(b.b)} · ${b.src}${b.speed !== 1 ? ` ×${b.speed}` : ''}\n${b.texto}`}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center">
          {palabras
            ? palabras.map((p) => (
                <span key={p.i} className="absolute truncate border-l border-black/25 pl-[3px]" style={{left: (p.f0 - b.a) * ppc, width: (p.f1 - p.f0) * ppc}}>
                  {p.texto}
                </span>
              ))
            : w > 30 && <span className={`truncate px-1.5 ${b.quitada ? 'line-through' : ''}`}>{b.speed !== 1 ? `×${b.speed} ` : ''}{b.texto}</span>}
        </div>
        {arr && <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-acento" />}
        {!b.quitada && (
          <>
            <div data-testid={`corte-borde-ini-${b.id}`} className="absolute top-0 left-0 h-full w-2.5 cursor-col-resize border-l-2 border-transparent group-hover:border-acento" onPointerDown={(e) => alBorde(b, 'ini', e)} />
            <div data-testid={`corte-borde-fin-${b.id}`} className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize border-r-2 border-transparent group-hover:border-acento" onPointerDown={(e) => alBorde(b, 'fin', e)} />
          </>
        )}
      </div>
    );
  },
);

// cabezal y código de tiempo: se actualizan por DOM directo a 30 fps, sin tocar React
const Cabezal: React.FC<{scroll: React.RefObject<HTMLDivElement | null>; empezar: (e: React.PointerEvent) => void}> = ({scroll, empezar}) => {
  const linea = useRef<HTMLDivElement>(null);
  const ppc = useVista((s) => s.ppc);
  useEffect(() => {
    const pintar = (f: number) => {
      if (linea.current) linea.current.style.transform = `translateX(${ETIQUETA + f * useVista.getState().ppc}px)`;
    };
    pintar(useReloj.getState().frame);
    return useReloj.subscribe((s, p) => {
      if (s.frame === p.frame) return;
      pintar(s.frame);
      const el = scroll.current;
      if (!el || useVista.getState().arrastrando) return;
      // seguir el cabezal: al reproducir pasa de página; si un salto lo saca de la vista, se centra
      const x = ETIQUETA + s.frame * useVista.getState().ppc;
      if (x < el.scrollLeft + ETIQUETA || x > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = Math.max(0, x - (s.jugando ? ETIQUETA + 40 : el.clientWidth / 2));
    });
  }, [scroll]);
  useLayoutEffect(() => {
    if (linea.current) linea.current.style.transform = `translateX(${ETIQUETA + useReloj.getState().frame * ppc}px)`;
  }, [ppc]);
  return (
    <div ref={linea} data-testid="cabezal" className="pointer-events-none absolute top-0 bottom-0 left-0 z-40 w-px bg-acento" style={{willChange: 'transform'}}>
      {/* solo la cabeza se agarra: la línea no debe tapar los bordes de los tramos cuando el cabezal cae justo en un corte */}
      <div className="pointer-events-auto absolute -left-[6px] top-0 h-3 w-[13px] cursor-ew-resize bg-acento" style={{clipPath: 'polygon(0 0,100% 0,100% 45%,50% 100%,0 45%)'}} onPointerDown={empezar} />
    </div>
  );
};

const TiempoRegla: React.FC = () => {
  const frame = useReloj((s) => s.frame);
  return <span data-testid="tiempo-regla">{tc(frame)}</span>;
};

export const Timeline: React.FC = () => {
  const data = useEditor((s) => s.data);
  const props = usePropsPlantilla();
  const notas = useEditor((s) => s.notas);
  const sel = useEditor((s) => s.sel);
  const total = useReloj((s) => s.total);
  const m = useModeloCorte();
  const ppc = useVista((s) => s.ppc);
  const ppcMin = useVista((s) => s.ppcMin);
  const herramienta = useVista((s) => s.herramienta);
  const rango = useVista((s) => s.rango);
  const scroll = useRef<HTMLDivElement>(null);
  const guiaCuchilla = useRef<HTMLDivElement>(null);
  const [arr, setArr] = useState<ArrElemento | null>(null);
  const [arrBorde, setArrBorde] = useState<ArrBorde | null>(null);
  const [arrRango, setArrRango] = useState<{a: number; b: number} | null>(null);
  const anclaZoom = useRef<{f: number; x: number} | null>(null);
  const vivo = useRef({ppc, total, m});
  vivo.current = {ppc, total, m};

  // ---- zoom y ajuste al ancho
  const ajustar = () => {
    const el = scroll.current;
    if (!el) return;
    const t = vivo.current.total;
    const fit = Math.max(0.03, (el.clientWidth - ETIQUETA - 24) / Math.max(1, t));
    useVista.getState().set({ppc: Math.min(PPC_MAX, fit), ppcMin: Math.min(fit, PPC_MAX), ajustado: true});
    el.scrollLeft = 0;
  };
  useLayoutEffect(() => {
    zoomVista.ajustar = ajustar;
    zoomVista.aplicar = (factor, clientX) => {
      const el = scroll.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const v = useVista.getState();
      const n = Math.max(v.ppcMin, Math.min(PPC_MAX, v.ppc * factor));
      if (n === v.ppc) return;
      const fCabezal = useReloj.getState().frame;
      const x = clientX !== undefined ? clientX - r.left : ETIQUETA + fCabezal * v.ppc - el.scrollLeft;
      const f = (el.scrollLeft + x - ETIQUETA) / v.ppc;
      anclaZoom.current = {f, x};
      v.set({ppc: n, ajustado: n <= v.ppcMin * 1.001});
    };
  }, []);
  useLayoutEffect(() => {
    const el = scroll.current;
    const a = anclaZoom.current;
    if (el && a) el.scrollLeft = Math.max(0, ETIQUETA + a.f * ppc - a.x);
    anclaZoom.current = null;
  }, [ppc]);
  useEffect(() => {
    if (total <= 1) return;
    const el = scroll.current;
    if (!el) return;
    const v = useVista.getState();
    const fit = Math.max(0.03, (el.clientWidth - ETIQUETA - 24) / total);
    if (v.ajustado) ajustar();
    else v.set({ppcMin: Math.min(fit, PPC_MAX)});
    const ro = new ResizeObserver(() => {
      const w = useVista.getState();
      const nuevo = Math.max(0.03, (el.clientWidth - ETIQUETA - 24) / vivo.current.total);
      if (w.ajustado) ajustar();
      else w.set({ppcMin: Math.min(nuevo, PPC_MAX)});
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [total > 1, total]);

  // rueda: pellizco/⌘/Alt = zoom en el puntero; sin tecla = desplazar en horizontal (hace falta listener no pasivo)
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        zoomVista.aplicar(Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.004)), e.clientX);
        return;
      }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) return;
      if (el.scrollHeight <= el.clientHeight + 1) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', h, {passive: false});
    return () => el.removeEventListener('wheel', h);
  }, []);

  const chunks = useMemo(() => conPlantilla(props, () => CHUNKS().map((c) => ({from: c.from, to: c.to, enf: !!c.enf, texto: c.words.map((w) => w.text).join(' ')}))) ?? [], [props]);
  const todos = useMemo(() => (data ? bloques(data) : []), [data]);
  const filas = useMemo(() => {
    const f: {id: string; nombre: string; bloques: Bloque[]; carril: Map<Bloque, number>; n: number}[] = [];
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
    const agregar = (id: string, nombre: string, bs: Bloque[]) => bs.length && f.push({id, nombre, bloques: bs, ...carriles(bs)});
    agregar('hook', 'Gancho', todos.filter((b) => b.sel.lista === 'hook'));
    for (const l of LISTAS_TIEMPO) agregar(l, LISTAS[l].nombre + (l === 'labels' || l === 'zooms' ? 's' : ''), todos.filter((b) => b.sel.lista === l));
    return f;
  }, [todos]);

  // ---- imanes para mover elementos
  const imanes = useMemo(() => {
    const otros = new Set<number>();
    for (const b of todos) (otros.add(b.a), otros.add(b.b)); // los cortes ya están cubiertos: empiezan en una palabra
    const palabras = (data?.words ?? []).map((w: Obj) => Math.round(w.start * 30)) as number[];
    return {otros: [...otros], palabras};
  }, [todos, data]);

  const cuadroDe = (e: {clientX: number}) => {
    const el = scroll.current!;
    return Math.max(0, Math.round((e.clientX - el.getBoundingClientRect().left + el.scrollLeft - ETIQUETA) / vivo.current.ppc));
  };

  // arrastre genérico con pointer events; pasa cerca de las orillas y la línea se desplaza sola
  const seguirPuntero = (mover: (ev: PointerEvent) => void, soltar: (ev: PointerEvent) => void) => {
    const el = scroll.current!;
    useVista.getState().set({arrastrando: true});
    const mov = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (ev.clientX > r.right - 30) el.scrollLeft += 18;
      else if (ev.clientX < r.left + ETIQUETA + 20) el.scrollLeft -= 18;
      mover(ev);
    };
    const fin = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mov);
      window.removeEventListener('pointerup', fin);
      useVista.getState().set({arrastrando: false});
      soltar(ev);
    };
    window.addEventListener('pointermove', mov);
    window.addEventListener('pointerup', fin);
  };

  const empezarScrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    irSuave(cuadroDe(e));
    seguirPuntero((ev) => irSuave(cuadroDe(ev)), (ev) => (irSuave(cuadroDe(ev)), ir(cuadroDe(ev))));
  };

  // ---- elementos: mover, estirar
  const refElemento = useRef<(b: Bloque, modo: 'mover' | 'ini' | 'fin', e: React.PointerEvent) => void>(() => {});
  refElemento.current = (b, modo, e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    useEditor.getState().seleccionar(b.sel);
    useEditor.getState().set({panel: 'inspector'});
    useVista.getState().set({rango: null});
    const x0 = e.clientX;
    const ppc0 = vivo.current.ppc;
    let movido = false;
    let pegar = true;
    let ultimo = {da: 0, db: 0};
    seguirPuntero(
      (ev) => {
        const d = Math.round((ev.clientX - x0) / ppc0);
        if (Math.abs(ev.clientX - x0) > 3) movido = true;
        if (!movido) return;
        const iman = useVista.getState().iman && !ev.altKey;
        const umbral = UMBRAL_IMAN / ppc0;
        const fCab = useReloj.getState().frame;
        const cercano = (l: number[], f: number) => l.reduce((m2, x) => (Math.abs(x - f) < Math.abs(m2 - f) ? x : m2), Infinity);
        const otros = [...imanes.otros.filter((x) => x !== b.a && x !== b.b), fCab];
        let da = modo === 'fin' ? 0 : d;
        let db = modo === 'ini' ? 0 : d;
        let guia: number | null = null;
        pegar = false;
        if (iman) {
          if (modo === 'fin') {
            const fin = b.b + db;
            const x = cercano([...otros, ...imanes.palabras], fin);
            if (Math.abs(x - fin) <= umbral) ((db = x - b.b), (guia = x));
          } else {
            const ini = b.a + da;
            const x = cercano(otros, ini);
            const finMov = b.b + db;
            const y = modo === 'mover' ? cercano(otros, finMov) : Infinity;
            // la palabra más cercana es lo que se guarda como ancla: otro imán solo gana si queda claramente más cerca
            const w = cercano(imanes.palabras, ini);
            const dW = Number.isFinite(w) ? Math.abs(w - ini) : Infinity;
            if (Math.abs(x - ini) <= umbral && Math.abs(x - ini) < dW && Math.abs(x - ini) <= Math.abs(y - finMov)) {
              da = x - b.a;
              if (modo === 'mover') db = da;
              guia = x;
            } else if (Math.abs(y - finMov) <= umbral && Math.abs(y - finMov) < dW) {
              db = y - b.b;
              da = db;
              guia = y;
            } else if (Number.isFinite(w)) {
              da = w - b.a;
              if (modo === 'mover') db = da;
              guia = w;
              pegar = true;
            }
          }
        }
        if (modo === 'ini' && b.a + da > b.b - 3) da = b.b - 3 - b.a;
        if (modo === 'fin' && b.b + db < b.a + 3) db = b.a + 3 - b.b;
        ultimo = {da, db};
        setArr({sel: b.sel, da, db, guia});
      },
      () => {
        setArr(null);
        if (!movido) return ir(Math.max(b.a, Math.min(b.b - 1, cuadroDe(e))));
        const s = useEditor.getState();
        if (!s.data) return;
        const r = aplicarTiempo(s.data, s.eventos ?? {}, b.sel, b.a + ultimo.da, b.b + ultimo.db, pegar);
        s.editar({data: r.data, eventos: r.eventos});
      },
    );
  };
  const empezarElemento = useRef((b: Bloque, modo: 'mover' | 'ini' | 'fin', e: React.PointerEvent) => refElemento.current(b, modo, e)).current;

  // ---- corte: seleccionar por palabras, recortar por los bordes, cuchilla
  const refBloque = useRef<(b: BloqueCorte, e: React.PointerEvent) => void>(() => {});
  refBloque.current = (b, e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (useVista.getState().herramienta === 'cuchilla') return dividir(cuadroDe(e));
    const f0 = cuadroDe(e);
    empezarRango(f0, e, () => {
      useEditor.getState().seleccionar(null);
      useVista.getState().set({rango: {a: b.a, b: b.b}});
      ir(f0);
    });
  };
  const alBloque = useRef((b: BloqueCorte, e: React.PointerEvent) => refBloque.current(b, e)).current;
  const alDoble = useRef((b: BloqueCorte) => {
    if (b.quitada) return;
    useEditor.getState().set({panel: 'cortes', piezaAbierta: b.pieza});
  }).current;

  const refBorde = useRef<(b: BloqueCorte, lado: 'ini' | 'fin', e: React.PointerEvent) => void>(() => {});
  refBorde.current = (b, lado, e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const x0 = e.clientX;
    const ppc0 = vivo.current.ppc;
    const s0 = useEditor.getState();
    const plan = s0.plan as Plan;
    const pal = s0.palabras;
    const mod = vivo.current.m!;
    let kFinal = lado === 'ini' ? b.k0 : b.k1;
    seguirPuntero(
      (ev) => {
        const dF = Math.round((ev.clientX - x0) / ppc0);
        const k = objetivoBorde(plan, b, pal, lado, dF);
        kFinal = k;
        const base = lado === 'ini' ? b.k0 : b.k1;
        const delta = lado === 'ini' ? base - k : k - base; // + agrega palabras, − las quita
        let a = b.a;
        let fin = b.b;
        const dentro = mod.pal.slice(b.i0, b.i1 + 1).find((p) => p.k === k);
        if (dentro) {
          if (lado === 'ini') a = dentro.f0;
          else fin = dentro.f1;
        } else if (lado === 'ini') a = b.a + Math.min(0, dF);
        else fin = b.b + Math.max(0, dF);
        const W = pal[b.src];
        const texto = delta === 0 ? '' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} palabra${Math.abs(delta) === 1 ? '' : 's'} · «${W[k][0]}»`;
        setArrBorde({id: b.id, lado, a, b: fin, delta, texto});
      },
      () => {
        setArrBorde(null);
        const base = lado === 'ini' ? b.k0 : b.k1;
        if (kFinal !== base) useEditor.getState().editar({plan: ajustarBorde(plan, b, lado, kFinal)});
      },
    );
  };
  const alBorde = useRef((b: BloqueCorte, lado: 'ini' | 'fin', e: React.PointerEvent) => refBorde.current(b, lado, e)).current;

  // arrastrar sobre el corte o sobre el fondo selecciona un rango (ajustado a palabras al soltar); un clic solo llama a alClic
  const empezarRango = (f0: number, e: React.PointerEvent, alClic: () => void) => {
    const x0 = e.clientX;
    let movido = false;
    let ultimo = {a: f0, b: f0};
    seguirPuntero(
      (ev) => {
        if (Math.abs(ev.clientX - x0) > 4) movido = true;
        if (!movido) return;
        const f = cuadroDe(ev);
        ultimo = {a: Math.min(f0, f), b: Math.max(f0, f)};
        setArrRango(ultimo);
      },
      () => {
        setArrRango(null);
        if (!movido) return alClic();
        const mod = vivo.current.m;
        if (!mod) return;
        const [a, b] = rangoAPalabras(mod, ultimo.a, ultimo.b);
        useEditor.getState().seleccionar(null);
        useVista.getState().set({rango: {a, b}});
        ir(a);
      },
    );
  };

  const alFondo = (e: React.PointerEvent) => {
    if (e.button === 1) {
      // botón central: desplazar
      e.preventDefault();
      const el = scroll.current!;
      const x0 = e.clientX;
      const s0 = el.scrollLeft;
      return seguirPuntero((ev) => (el.scrollLeft = s0 - (ev.clientX - x0)), () => {});
    }
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-etiqueta]')) return;
    const f0 = cuadroDe(e);
    if (useVista.getState().herramienta === 'cuchilla') return dividir(f0);
    empezarRango(f0, e, () => {
      useEditor.getState().seleccionar(null);
      useVista.getState().set({rango: null});
      ir(f0);
    });
  };

  const moverCuchilla = (e: React.PointerEvent) => {
    if (herramienta !== 'cuchilla' || !guiaCuchilla.current) return;
    guiaCuchilla.current.style.transform = `translateX(${ETIQUETA + cuadroDe(e) * vivo.current.ppc}px)`;
  };

  // ---- pistas memoizadas: solo se recalculan si cambian los datos o el zoom
  const X = (f: number) => ETIQUETA + f * ppc;
  const secciones = useMemo(
    () =>
      (data?.secs ?? []).map((s: Obj, i: number) => (
        <div key={s.id + i} className="absolute top-[2px] overflow-hidden rounded-[3px] px-1.5 text-[9px] leading-[14px] tracking-wide text-zinc-200 uppercase" style={{left: X(s.a), width: (s.b - s.a) * ppc, height: 14, background: s.color ?? COLORES_SEC[i % COLORES_SEC.length]}}>
          {s.id}
        </div>
      )),
    [data?.secs, ppc],
  );
  const subs = useMemo(
    () =>
      chunks.map((c, i) => (
        <div
          key={i}
          className={`absolute top-[3px] overflow-hidden rounded-[3px] px-1 text-[9px] leading-[22px] ${c.enf ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
          style={{left: X(c.from), width: Math.max(3, (c.to - c.from) * ppc - 1), height: ALTO}}
          title={c.texto}
          onPointerDown={(e) => {
            if (e.button !== 0 || useVista.getState().herramienta === 'cuchilla') return;
            e.stopPropagation();
            ir(c.from + 1);
            useEditor.getState().set({panel: 'subtitulos'});
          }}
        >
          {c.texto}
        </div>
      )),
    [chunks, ppc],
  );
  const marcas = useMemo(() => {
    const paso = ppc > 18 ? 5 : ppc > 8 ? 15 : ppc > 4 ? 30 : ppc > 1.5 ? 60 : ppc > 0.6 ? 150 : ppc > 0.25 ? 300 : 900;
    const l: React.ReactNode[] = [];
    for (let f = 0; f <= total; f += paso)
      l.push(
        <div key={f} className="absolute top-0 h-full border-l border-zinc-700/80 pl-1 font-mono text-[9px] leading-[20px] text-zinc-500" style={{left: X(f)}}>
          {paso < 30 ? tc(f) : tc(f).replace(/\.\d+$/, '')}
        </div>,
      );
    return l;
  }, [ppc, total]);

  if (!data) return <div className="h-full" />;
  const ancho = ETIQUETA + total * ppc + 24; // el mismo margen que al ajustar: viendo todo el video no debe haber nada que desplazar
  const rangoVis = arrRango ?? rango;

  const fila = (titulo: string, contenido: React.ReactNode, key: string, alto = ALTO) => (
    <div key={key} className="relative border-b border-zinc-800/70" style={{height: alto + 6, width: ancho}} data-testid={`fila-${key}`}>
      <div data-etiqueta className="sticky left-0 z-20 flex h-full items-center bg-zinc-950 pl-3 text-[11px] text-zinc-500" style={{width: ETIQUETA}}>
        {titulo}
      </div>
      <div className="absolute inset-0">{contenido}</div>
    </div>
  );

  return (
    <div className="flex h-full flex-col" data-testid="panel-timeline">
      <BarraTimeline />
      <div
        ref={scroll}
        className={`relative min-h-0 flex-1 overflow-auto bg-zinc-950 select-none ${herramienta === 'cuchilla' ? 'cursor-crosshair' : ''}`}
        onPointerDown={alFondo}
        onPointerMove={moverCuchilla}
        data-testid="timeline"
        data-ppc={ppc.toFixed(3)}
        data-ppc-min={ppcMin.toFixed(3)}
      >
        <div style={{width: ancho}} className="relative">
          <div data-testid="regla" className="sticky top-0 z-30 h-5 cursor-ew-resize border-b border-zinc-800 bg-zinc-900" style={{width: ancho}} onPointerDown={empezarScrub}>
            <div data-etiqueta className="sticky left-0 z-20 flex h-full items-center bg-zinc-900 pl-3 font-mono text-[10px] text-zinc-400" style={{width: ETIQUETA}}>
              <TiempoRegla />
            </div>
            {marcas}
          </div>
          {fila('Secciones', secciones, 'secs', 12)}
          {m ? (
            fila(
              'Corte',
              m.bloques.map((b) => (
                <BloqueTramo key={`${b.id}-${b.a}`} b={b} m={m} ppc={ppc} activo={!!rango && b.a >= rango.a && b.b <= rango.b} arr={arrBorde?.id === b.id ? arrBorde : null} alBorde={alBorde} alBloque={alBloque} alDoble={alDoble} />
              )),
              'corte',
              ALTO_CORTE,
            )
          ) : (
            <div className="px-3 py-2 text-[11px] text-zinc-600" data-testid="corte-no-disponible">
              El corte necesita edl_final.json y la transcripción para editarse aquí.
            </div>
          )}
          {fila('Subtítulos', subs, 'subs')}
          {filas.map((f) =>
            fila(
              f.nombre,
              f.bloques.map((b) => {
                const a = arr && arr.sel.lista === b.sel.lista && arr.sel.i === b.sel.i ? arr : null;
                const activo = !!sel && sel.lista === b.sel.lista && sel.i === b.sel.i;
                return <BloqueElemento key={`${b.sel.lista}:${b.sel.i}`} b={b} carril={f.carril.get(b) ?? 0} ppc={ppc} activo={activo} da={a?.da ?? 0} db={a?.db ?? 0} empezar={empezarElemento} />;
              }),
              f.id,
              f.n * (ALTO + 2) - 2,
            ),
          )}
          {(notas ?? []).length > 0 &&
            fila(
              'Notas',
              (notas ?? []).map((n: Obj) => (
                <div
                  key={n.id}
                  className={`absolute top-[4px] h-[18px] w-[18px] -translate-x-1/2 cursor-pointer rounded-full text-center text-[10px] leading-[18px] ${n.estado === 'aplicado' ? 'bg-emerald-600' : 'bg-rose-500'}`}
                  style={{left: X(Math.round(n.t * 30))}}
                  title={n.texto}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    ir(Math.round(n.t * 30));
                    useEditor.getState().set({panel: 'notas'});
                  }}
                >
                  ✎
                </div>
              )),
              'notas',
            )}
          {/* rango seleccionado */}
          {rangoVis && <div data-testid="rango" data-a={rangoVis.a} data-b={rangoVis.b} className="pointer-events-none absolute top-5 bottom-0 z-[15] border-x border-acento bg-acento/15" style={{left: X(rangoVis.a), width: Math.max(1, (rangoVis.b - rangoVis.a) * ppc)}} />}
          {/* imán activo */}
          {arr?.guia != null && <div data-testid="guia-iman" className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-amber-300" style={{left: X(arr.guia)}} />}
          {herramienta === 'cuchilla' && <div ref={guiaCuchilla} className="pointer-events-none absolute top-0 bottom-0 left-0 z-30 w-px border-l border-dashed border-white/70" />}
          <Cabezal scroll={scroll} empezar={empezarScrub} />
          {arrBorde?.texto && (
            <div data-testid="pista-borde" className="pointer-events-none fixed z-50 -translate-x-1/2 rounded bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-900 shadow-lg" style={{left: (scroll.current?.getBoundingClientRect().left ?? 0) + X(arrBorde.lado === 'ini' ? arrBorde.a : arrBorde.b) - (scroll.current?.scrollLeft ?? 0), top: (scroll.current?.getBoundingClientRect().top ?? 0) - 6}}>
              {arrBorde.texto}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
