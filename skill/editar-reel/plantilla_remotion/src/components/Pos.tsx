// Envoltorio de posición libre (ver theme.ts → libre). Se comporta como el contenedor flex en columna centrado de cada
// elemento, así que sin dx/dy/escala/rot el dibujo es idéntico al de antes. `k` = "<lista>:<índice>" para Reel Studio.
// Con fotogramas clave (o.claves) la posición, escala, giro y opacidad se interpolan en el cuadro actual (theme.ts → conClaves).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Libre, conClaves, libre} from '../theme';

export const Pos: React.FC<{k: string; o?: Libre | null; align?: 'center' | 'flex-start' | 'flex-end'; children: React.ReactNode}> = ({k, o, align = 'center', children}) => {
  const f = useCurrentFrame();
  const v = conClaves(o, f);
  const op = v?.opacidad;
  return (
    <div data-reel={k} style={{display: 'flex', flexDirection: 'column', alignItems: align, alignSelf: 'stretch', transform: libre(v), ...(op !== undefined && op !== 1 ? {opacity: Math.max(0, Math.min(1, op))} : {})}}>
      {children}
    </div>
  );
};
