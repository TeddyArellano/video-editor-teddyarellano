import {Composition} from 'remotion';
import {Reel, TOTAL_FRAMES} from './Reel';
import {INTRO3D_LEN, IntroEspacio} from './components/IntroEspacio';

// "Capa3D" = solo la intro 3D con fondo transparente; `reel capas` la renderiza una vez (ProRes 4444) y Reel la reusa.
export const RemotionRoot = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Capa3D" component={IntroEspacio} durationInFrames={INTRO3D_LEN} fps={30} width={1080} height={1920} />
  </>
);
