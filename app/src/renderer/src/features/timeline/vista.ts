// Estado de la línea de tiempo que no pertenece al proyecto (no entra al historial): zoom, herramienta, imán y rango seleccionado.
import {create} from 'zustand';

export const PPC_MAX = 40;
export type Herramienta = 'seleccion' | 'cuchilla';
export type Rango = {a: number; b: number};

type Vista = {
  ppc: number; // píxeles por cuadro
  ppcMin: number; // el zoom que hace caber todo el video
  ajustado: boolean; // sigue ajustado al ancho si la ventana o el video cambian
  herramienta: Herramienta;
  iman: boolean;
  rango: Rango | null;
  arrastrando: boolean; // mientras se arrastra con el ratón, el cabezal no mueve la vista
  set: (p: Partial<Vista>) => void;
};

export const useVista = create<Vista>()((set) => ({ppc: 2, ppcMin: 0.1, ajustado: true, herramienta: 'seleccion', iman: true, rango: null, arrastrando: false, set: (p) => set(p)}));

// lo registra Timeline: zoom alrededor del cabezal o del puntero, conservando ese punto en pantalla
export const zoomVista: {aplicar: (factor: number, clientX?: number) => void; ajustar: () => void} = {aplicar: () => {}, ajustar: () => {}};
