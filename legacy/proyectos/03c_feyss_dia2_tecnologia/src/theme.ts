import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as loadSilkscreen} from '@remotion/google-fonts/Silkscreen';

export const mont = loadMontserrat('normal', {weights: ['700', '800', '900'], subsets: ['latin']}).fontFamily;
loadMontserrat('italic', {weights: ['900'], subsets: ['latin']});
export const pixel = loadSilkscreen('normal', {weights: ['700'], subsets: ['latin']}).fontFamily;

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  yellow: '#FFE81A',
  green: '#3CFF3C',
  guinda: '#7B1E3C',
  white: '#FFFFFF',
  ink: '#0A0A0A',
};

export const sec = (s: number) => Math.round(s * FPS);
