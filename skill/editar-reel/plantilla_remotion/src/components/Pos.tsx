// Envoltorio de posición libre (ver theme.ts → libre). Se comporta como el contenedor flex en columna centrado de cada
// elemento, así que sin dx/dy/escala/rot el dibujo es idéntico al de antes. `k` = "<lista>:<índice>" para Reel Studio.
import React from 'react';
import {Libre, libre} from '../theme';

export const Pos: React.FC<{k: string; o?: Libre | null; align?: 'center' | 'flex-start' | 'flex-end'; children: React.ReactNode}> = ({k, o, align = 'center', children}) => (
  <div data-reel={k} style={{display: 'flex', flexDirection: 'column', alignItems: align, alignSelf: 'stretch', transform: libre(o)}}>
    {children}
  </div>
);
