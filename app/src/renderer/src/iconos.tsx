// Iconos de trazo (inline: la app no depende de internet ni de otra librería).
import React from 'react';

const trazos: Record<string, React.ReactNode> = {
  atras: <path d="M15 18l-6-6 6-6" />,
  deshacer: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />,
  rehacer: <path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />,
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  pausa: <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none" />,
  inicio: <path d="M6 5v14M19 5.5v13L9 12z" fill="currentColor" />,
  cuadroAtras: <path d="M15 6l-6 6 6 6" />,
  cuadroAdelante: <path d="M9 6l6 6-6 6" />,
  puntero: <path d="M5 3l14 8-6 2-2 6z" fill="currentColor" />,
  cuchilla: <path d="M4 20L20 4M14 4h6v6M9.5 14.5L4 20" />,
  dividir: <path d="M12 3v18M4 7h5l-2-2M4 7l3 2M20 17h-5l2 2M20 17l-3-2" />,
  recIni: <path d="M5 4v16M9 12h11M13 8l-4 4 4 4" />,
  recFin: <path d="M19 4v16M15 12H4M11 8l4 4-4 4" />,
  quitar: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />,
  restaurar: <path d="M4 12a8 8 0 108-8H7M7 4L4 7l3 3" />,
  iman: <path d="M6 3v9a6 6 0 0012 0V3h-4v9a2 2 0 01-4 0V3zM6 7h4M14 7h4" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  ajustar: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  copiar: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4V4h11v1" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" />
    </>
  ),
  carpeta: <path d="M3 6h6l2 3h10v10H3z" />,
  elementos: <path d="M4 5h16M4 12h10M4 19h7" />,
  subtitulos: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 14h4M13 14h4M7 10h10" />
    </>
  ),
  estilo: <path d="M12 3a9 9 0 100 18c2 0 2-2 1-3s0-3 2-3h3a3 3 0 003-3c0-5-4-9-9-9z" />,
  tijera: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.5 7.5L20 19M8.5 16.5L20 5" />
    </>
  ),
  pipeline: <path d="M4 6h8M4 12h16M12 18h8M15 3v6M9 9v6M9 15v6" />,
  notas: <path d="M4 4h16v12H9l-5 4z" />,
  claude: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export type NombreIcono = keyof typeof trazos;

export const Icono: React.FC<{n: string; t?: number; className?: string}> = ({n, t = 14, className}) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {trazos[n]}
  </svg>
);
