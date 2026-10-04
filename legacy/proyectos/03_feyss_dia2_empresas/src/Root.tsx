import {Composition} from 'remotion';
import {Vacantes, TOTAL_FRAMES} from './Vacantes';

export const RemotionRoot = () => (
  <Composition id="Vacantes" component={Vacantes} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} />
);
