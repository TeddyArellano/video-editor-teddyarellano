// Piezas de interfaz pequeñas y reutilizables (tema oscuro tipo editor de video).
import React from 'react';

export const Boton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {v?: 'primario' | 'normal' | 'peligro' | 'fantasma'}> = ({v = 'normal', className = '', ...p}) => (
  <button
    {...p}
    className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
      v === 'primario'
        ? 'bg-acento text-white hover:brightness-110'
        : v === 'peligro'
          ? 'bg-rose-700/80 text-white hover:bg-rose-600'
          : v === 'fantasma'
            ? 'text-zinc-300 hover:bg-zinc-800'
            : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
    } ${className}`}
  />
);

export const Atajo: React.FC<{children: React.ReactNode}> = ({children}) => <kbd className="rounded bg-black/25 px-1 font-mono text-[9px] leading-[14px] font-normal">{children}</kbd>;

export const Etiqueta: React.FC<{n: string; ayuda?: string; children: React.ReactNode}> = ({n, ayuda, children}) => (
  <label className="block">
    <span className="mb-1 block text-[11px] text-zinc-400" title={ayuda}>
      {n}
      {ayuda && <span className="ml-1 text-zinc-600">ⓘ</span>}
    </span>
    {children}
  </label>
);

export const inputCls = 'w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-acento';

export const Seccion: React.FC<{titulo: string; children: React.ReactNode; acciones?: React.ReactNode}> = ({titulo, children, acciones}) => (
  <div className="border-b border-zinc-800 px-3 py-3">
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-[11px] font-semibold tracking-wide text-zinc-300 uppercase">{titulo}</h3>
      {acciones}
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

export const Vacio: React.FC<{children: React.ReactNode}> = ({children}) => <div className="p-4 text-center text-xs leading-relaxed text-zinc-500">{children}</div>;
