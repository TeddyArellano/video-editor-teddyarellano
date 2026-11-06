import {Config} from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setConcurrency(8);
Config.setChromiumOpenGlRenderer('angle'); // WebGL para la intro 3D (three.js)
