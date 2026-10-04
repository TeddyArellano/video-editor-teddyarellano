import {Composition} from 'remotion';
import {Unboxing, TOTAL_FRAMES} from './Unboxing';

export const RemotionRoot = () => (
  <Composition id="Unboxing" component={Unboxing} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} />
);
