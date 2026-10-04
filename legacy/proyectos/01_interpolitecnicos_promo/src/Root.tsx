import {Composition} from 'remotion';
import {Promo, TOTAL_FRAMES} from './Promo';

export const RemotionRoot = () => (
  <Composition
    id="Promo"
    component={Promo}
    durationInFrames={TOTAL_FRAMES}
    fps={30}
    width={1080}
    height={1920}
  />
);
