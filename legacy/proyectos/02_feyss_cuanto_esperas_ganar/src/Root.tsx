import {Composition} from 'remotion';
import {Entrevista, TOTAL_FRAMES} from './Entrevista';

export const RemotionRoot = () => (
  <Composition id="Entrevista" component={Entrevista} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} />
);
