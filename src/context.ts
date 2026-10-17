import { createContext, useContext } from 'react';
import type { VideoPlayerApi } from './types';

export const VideoPlayerContext = createContext<VideoPlayerApi | null>(null);

/**
 * Accede al estado y los comandos del `<VideoPlayer>` más cercano. Pensado para
 * construir controles propios dentro de `renderControls` o de cualquier
 * `render*`.
 */
export function useVideoPlayer(): VideoPlayerApi {
  const api = useContext(VideoPlayerContext);
  if (!api) {
    throw new Error('useVideoPlayer() debe usarse dentro de un <VideoPlayer>.');
  }
  return api;
}
