import type { OnVideoErrorData } from 'react-native-video';
import type { VideoPlayerError } from '../types';

export function normalizeError(event: OnVideoErrorData | undefined): VideoPlayerError {
  const error = event?.error ?? {};
  const message =
    error.localizedDescription ||
    error.errorString ||
    error.error ||
    error.localizedFailureReason ||
    'Error desconocido al reproducir el video';
  const code = error.errorCode ?? (error.code !== undefined ? String(error.code) : undefined);
  return { message, code, raw: event };
}
