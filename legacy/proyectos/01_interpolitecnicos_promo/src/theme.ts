import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';

export const anton = loadAnton('normal', {weights: ['400'], subsets: ['latin']}).fontFamily;
export const mont = loadMontserrat('normal', {
  weights: ['700', '800', '900'],
  subsets: ['latin'],
}).fontFamily;

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  guinda: '#8C1D40',
  guindaHot: '#B3204F',
  guindaDeep: '#2A0714',
  gold: '#FFC83D',
  white: '#FFFFFF',
  ink: '#0E0A0C',
};

export const sec = (s: number) => Math.round(s * FPS);
