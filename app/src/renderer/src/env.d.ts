/// <reference types="vite/client" />
import type {ReelAPI} from '@shared/tipos';

declare global {
  interface Window {
    reel: ReelAPI;
  }
}
