// Lienzo de edición sobre la vista previa: clic para seleccionar un elemento (los componentes de la plantilla marcan
// cada elemento movible con data-reel="<lista>:<i>"), arrastrar para moverlo, esquina para escalar, perilla para rotar.
// Imanes: centro x = 540 y bordes de la zona segura. Al soltar se escriben dx/dy/escala/rot en eventos.json.
import React, {useEffect, useRef, useState} from 'react';
import {aplicarCampos, LISTAS, type Lista, type Obj, type Sel} from '@shared/elementos';
import {useEditor} from '@/store';
import {useReloj} from '@/reloj';

const SAFE = {x0: 125, x1: 905, y0: 260, y1: 1500};
const IMAN = 10; // px de composición

type Caja = {cx: number; cy: number; w: number; h: number}; // en px de composición, sin la transformación libre
type Valores = {dx: number; dy: number; escala: number; rot: number};

const valoresDe = (data: Obj, sel: Sel): Valores => {
  const x: Obj = sel.lista === 'hook' ? data.hook?.elementos?.[sel.i] ?? {} : data[sel.lista]?.[sel.i] ?? {};
  return {dx: x.dx ?? 0, dy: x.dy ?? 0, escala: x.escala ?? 1, rot: x.rot ?? 0};
};

const transformDe = (v: Valores, hook: boolean) => {
  const t: string[] = [];
  if (v.dx || v.dy) t.push(`translate(${v.dx}px, ${v.dy}px)`);
  if (!hook && v.rot) t.push(`rotate(${v.rot}deg)`);
  if (v.escala !== 1) t.push(`scale(${v.escala})`);
  return t.join(' ');
};

export const Lienzo: React.FC<{escala: number; guias: boolean}> = ({escala, guias}) => {
  const raiz = useRef<HTMLDivElement>(null);
  const sel = useEditor((s) => s.sel);
  const data = useEditor((s) => s.data);
  const frame = useReloj((s) => s.frame);
  const jugando = useReloj((s) => s.jugando);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [vivo, setVivo] = useState<Valores | null>(null); // valores durante el arrastre
  const [imanes, setImanes] = useState<{x?: number; y?: number}>({});
  const [hover, setHover] = useState<{k: string; r: DOMRect} | null>(null);

  const contenedor = () => raiz.current?.parentElement ?? null;
  const elementoDe = (k: string) => contenedor()?.querySelector<HTMLElement>(`[data-reel="${k}"]`) ?? null;
  const clave = sel ? `${sel.lista}:${sel.i}` : null;

  // mide el elemento seleccionado (sin su transformación libre) después de que la vista previa lo dibuja
  useEffect(() => {
    if (!clave || !data || vivo) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const el = elementoDe(clave);
        const r0 = raiz.current?.getBoundingClientRect();
        if (!el || !r0 || !sel) return setCaja(null);
        const c = (el.firstElementChild as HTMLElement) ?? el;
        const prev = el.style.transform;
        el.style.transform = 'none';
        const r = c.getBoundingClientRect();
        el.style.transform = prev;
        if (r.width === 0 && r.height === 0) return setCaja(null);
        setCaja({cx: (r.left + r.width / 2 - r0.left) / escala, cy: (r.top + r.height / 2 - r0.top) / escala, w: Math.max(c.offsetWidth, 20), h: Math.max(c.offsetHeight, 20)});
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [clave, data, frame, escala, vivo]);

  // ---------------------------------------------------------------- selección con clic
  const buscar = (e: React.PointerEvent | React.MouseEvent): string | null => {
    const cont = contenedor();
    if (!cont) return null;
    for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
      if (!cont.contains(el) || raiz.current?.contains(el)) continue;
      const m = (el as HTMLElement).closest?.('[data-reel]');
      if (m && cont.contains(m)) {
        // el envoltorio ocupa todo el ancho: solo cuenta si el clic cae sobre su contenido
        const c = (m.firstElementChild as HTMLElement) ?? m;
        const r = c.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return m.getAttribute('data-reel');
      }
    }
    return null;
  };

  const alClic = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const k = buscar(e);
    if (!k) return useEditor.getState().seleccionar(null);
    const [lista, i] = k.split(':');
    useEditor.getState().seleccionar({lista: lista as Lista, i: Number(i)});
    useEditor.getState().set({panel: 'inspector'});
  };

  const alMover = (e: React.PointerEvent) => {
    if (jugando) return setHover(null);
    const k = buscar(e);
    if (!k || k === clave) return setHover(null);
    const c = (elementoDe(k)?.firstElementChild as HTMLElement) ?? elementoDe(k);
    if (c) setHover({k, r: c.getBoundingClientRect()});
  };

  // ---------------------------------------------------------------- arrastre (mover / escalar / rotar)
  const empezar = (modo: 'mover' | 'escalar' | 'rotar') => (e: React.PointerEvent) => {
    if (!sel || !caja || !data) return;
    e.stopPropagation();
    e.preventDefault();
    const hook = sel.lista === 'hook';
    const v0 = valoresDe(data, sel);
    const el = elementoDe(`${sel.lista}:${sel.i}`);
    const r0 = raiz.current!.getBoundingClientRect();
    const centro = {x: r0.left + (caja.cx + v0.dx) * escala, y: r0.top + (caja.cy + v0.dy) * escala};
    const p0 = {x: e.clientX, y: e.clientY};
    const d0 = Math.hypot(p0.x - centro.x, p0.y - centro.y) || 1;
    const a0 = Math.atan2(p0.y - centro.y, p0.x - centro.x);
    let v = {...v0};
    const mov = (ev: PointerEvent) => {
      if (modo === 'mover') {
        let dx = v0.dx + (ev.clientX - p0.x) / escala;
        let dy = v0.dy + (ev.clientY - p0.y) / escala;
        const im: {x?: number; y?: number} = {};
        if (!ev.altKey) {
          const cx = caja.cx + dx;
          const w2 = (caja.w * v.escala) / 2;
          const h2 = (caja.h * v.escala) / 2;
          if (Math.abs(cx - 540) < IMAN) (dx = 540 - caja.cx), (im.x = 540);
          else if (Math.abs(cx - w2 - SAFE.x0) < IMAN) (dx = SAFE.x0 + w2 - caja.cx), (im.x = SAFE.x0);
          else if (Math.abs(cx + w2 - SAFE.x1) < IMAN) (dx = SAFE.x1 - w2 - caja.cx), (im.x = SAFE.x1);
          const cy = caja.cy + dy;
          if (Math.abs(cy - h2 - SAFE.y0) < IMAN) (dy = SAFE.y0 + h2 - caja.cy), (im.y = SAFE.y0);
          else if (Math.abs(cy + h2 - SAFE.y1) < IMAN) (dy = SAFE.y1 - h2 - caja.cy), (im.y = SAFE.y1);
          else if (Math.abs(cy - 960) < IMAN) (dy = 960 - caja.cy), (im.y = 960);
        }
        setImanes(im);
        v = {...v, dx: Math.round(dx), dy: Math.round(dy)};
      } else if (modo === 'escalar') {
        const d = Math.hypot(ev.clientX - centro.x, ev.clientY - centro.y);
        v = {...v, escala: Math.max(0.2, Math.min(5, Math.round(v0.escala * (d / d0) * 100) / 100))};
      } else {
        const a = Math.atan2(ev.clientY - centro.y, ev.clientX - centro.x);
        let rot = v0.rot + ((a - a0) * 180) / Math.PI;
        if (!ev.shiftKey) for (const s of [-90, -45, 0, 45, 90]) if (Math.abs(rot - s) < 3) rot = s;
        v = {...v, rot: Math.round(rot * 10) / 10};
      }
      setVivo(v);
      if (el) el.style.transform = transformDe(v, hook) + (hook && v.rot !== v0.rot ? ` rotate(${v.rot - v0.rot}deg)` : '');
    };
    const fin = () => {
      window.removeEventListener('pointermove', mov);
      window.removeEventListener('pointerup', fin);
      setImanes({});
      setVivo(null);
      if (v.dx === v0.dx && v.dy === v0.dy && v.escala === v0.escala && v.rot === v0.rot) return;
      const s = useEditor.getState();
      const campos: Obj = {dx: v.dx, dy: v.dy, escala: v.escala, rot: v.rot};
      const r = aplicarCampos(s.data!, s.eventos ?? {}, sel, campos);
      s.editar({data: r.data, eventos: r.eventos});
    };
    window.addEventListener('pointermove', mov);
    window.addEventListener('pointerup', fin);
  };

  const v = vivo ?? (sel && data ? valoresDe(data, sel) : null);
  const movible = sel ? LISTAS[sel.lista].movible : false;
  const r0 = raiz.current?.getBoundingClientRect();

  return (
    <div
      ref={raiz}
      className="absolute inset-0"
      style={{cursor: jugando ? 'default' : 'crosshair', pointerEvents: jugando ? 'none' : 'auto'}}
      onPointerDown={alClic}
      onPointerMove={alMover}
      onPointerLeave={() => setHover(null)}
      data-testid="lienzo"
    >
      {guias && (
        <svg className="pointer-events-none absolute inset-0" width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none">
          <rect x={SAFE.x0} y={SAFE.y0} width={SAFE.x1 - SAFE.x0} height={SAFE.y1 - SAFE.y0} fill="none" stroke="#22d3ee" strokeOpacity={0.45} strokeDasharray="14 10" strokeWidth={3} />
          <line x1={540} x2={540} y1={0} y2={1920} stroke="#22d3ee" strokeOpacity={0.25} strokeWidth={2} />
        </svg>
      )}
      {imanes.x !== undefined && <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-fuchsia-400" style={{left: imanes.x * escala}} />}
      {imanes.y !== undefined && <div className="pointer-events-none absolute left-0 right-0 h-px bg-fuchsia-400" style={{top: imanes.y * escala}} />}
      {hover && r0 && (
        <div
          className="pointer-events-none absolute rounded-sm border border-dashed border-sky-300/70"
          style={{left: hover.r.left - r0.left, top: hover.r.top - r0.top, width: hover.r.width, height: hover.r.height}}
        />
      )}
      {sel && caja && v && !jugando && (
        <div
          data-testid="seleccion"
          className="absolute"
          style={{
            left: (caja.cx + v.dx) * escala,
            top: (caja.cy + v.dy) * escala,
            width: caja.w * v.escala * escala,
            height: caja.h * v.escala * escala,
            transform: `translate(-50%, -50%) rotate(${v.rot}deg)`,
          }}
        >
          <div
            className="absolute inset-0 rounded-sm border-2 border-sky-400"
            style={{cursor: movible ? 'move' : 'default', boxShadow: '0 0 0 1px rgba(0,0,0,.5)'}}
            onPointerDown={movible ? empezar('mover') : undefined}
          />
          {movible && (
            <>
              <div className="absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-sky-400 bg-white" onPointerDown={empezar('escalar')} title="Escalar" />
              <div className="absolute left-1/2 -top-7 h-4 w-4 -translate-x-1/2 cursor-grab rounded-full border-2 border-sky-400 bg-white" onPointerDown={empezar('rotar')} title="Rotar (Shift: sin imán)" />
              <div className="absolute left-1/2 -top-3 h-3 w-px -translate-x-1/2 bg-sky-400" />
            </>
          )}
          {vivo && (
            <div className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-sky-200">
              dx {vivo.dx} · dy {vivo.dy} · ×{vivo.escala} · {vivo.rot}°
            </div>
          )}
        </div>
      )}
    </div>
  );
};
