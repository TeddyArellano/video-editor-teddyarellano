import {Composition} from 'remotion';
import {Suenos, TOTAL_FRAMES} from './Suenos';

export const RemotionRoot = () => (
  <Composition id="Suenos" component={Suenos} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} />
);
