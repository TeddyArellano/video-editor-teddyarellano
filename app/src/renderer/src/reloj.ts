// Cuadro actual y control del reproductor (separado del store del editor: cambia 30 veces por segundo).
import type {PlayerRef} from '@remotion/player';
import {create} from 'zustand';

type Reloj = {frame: number; jugando: boolean; total: number; set: (p: Partial<Reloj>) => void};
export const useReloj = create<Reloj>()((set) => ({frame: 0, jugando: false, total: 1, set: (p) => set(p)}));

export const player: {ref: PlayerRef | null} = {ref: null};

export const ir = (f: number) => {
  const {total} = useReloj.getState();
  const g = Math.max(0, Math.min(total - 1, Math.round(f)));
  player.ref?.seekTo(g);
  useReloj.setState({frame: g});
};
export const mover = (d: number) => ir((player.ref?.getCurrentFrame() ?? useReloj.getState().frame) + d);
export const alternar = () => player.ref?.toggle();
export const pausar = () => player.ref?.pause();

export const tc = (f: number, fps = 30) => {
  const s = Math.floor(f / fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${String(f % fps).padStart(2, '0')}`;
};
