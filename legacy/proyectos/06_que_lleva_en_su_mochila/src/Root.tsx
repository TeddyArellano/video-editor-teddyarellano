import {Composition} from 'remotion';
import {Mochila, TOTAL_FRAMES} from './Mochila';

export const RemotionRoot = () => (
  <Composition id="Mochila" component={Mochila} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} />
);
