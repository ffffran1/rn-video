import { isValidTime } from './time';

/**
 * Ni AVPlayer (iOS) ni ExoPlayer (Android) exponen un flag "isLive" a través de
 * react-native-video, así que se infiere a partir de las señales que sí llegan:
 *
 * - Duración 0 / NaN / Infinity en `onLoad`: típico de un stream en vivo.
 * - iOS: el final del rango buscable (`seekableDuration`) crece con el tiempo.
 * - Android: `currentTime` es relativo a la ventana live, que se desplaza, por
 *   lo que casi no avanza aunque el video se esté reproduciendo.
 *
 * Todas las funciones son puras (reciben `now`) para poder testearlas.
 */

export type LiveDetectionState = {
  /** Resultado de la detección; una vez `true` no vuelve a `false` para esa fuente. */
  detected: boolean;
  /** Duración reportada en `onLoad`. */
  loadDuration: number;
  /** Muestra inicial usada para comparar el avance del tiempo. */
  sample: { wallTime: number; mediaTime: number; seekable: number } | null;
};

/** Segundos de reproducción continua necesarios antes de decidir. */
export const LIVE_SAMPLE_WINDOW_S = 4;
/** Cuánto debe crecer el rango buscable (s) para considerarlo en vivo. */
export const LIVE_SEEKABLE_GROWTH_S = 2;
/** Por debajo de esta proporción tiempo-de-media / tiempo-real se considera en vivo. */
export const LIVE_STALLED_RATIO = 0.35;

export function createLiveDetection(): LiveDetectionState {
  return { detected: false, loadDuration: 0, sample: null };
}

export function liveDetectionOnLoad(duration: number): LiveDetectionState {
  return {
    detected: !isValidTime(duration) || duration === 0,
    loadDuration: isValidTime(duration) ? duration : 0,
    sample: null,
  };
}

/** Descarta la muestra en curso (pausa, buffering, seek). */
export function resetLiveSample(state: LiveDetectionState): LiveDetectionState {
  return state.sample ? { ...state, sample: null } : state;
}

export type LiveProgressInput = {
  now: number; // ms (Date.now())
  currentTime: number;
  seekableDuration: number;
  /** Solo se toman muestras mientras se reproduce sin buffering. */
  isAdvancing: boolean;
};

export function liveDetectionOnProgress(
  state: LiveDetectionState,
  input: LiveProgressInput
): LiveDetectionState {
  if (state.detected) return state;
  if (!input.isAdvancing) return resetLiveSample(state);

  const { now, currentTime, seekableDuration } = input;

  // El rango buscable superó claramente la duración inicial: la fuente crece.
  if (
    state.loadDuration > 0 &&
    isValidTime(seekableDuration) &&
    seekableDuration - state.loadDuration > LIVE_SEEKABLE_GROWTH_S
  ) {
    return { ...state, detected: true, sample: null };
  }

  if (!state.sample) {
    return {
      ...state,
      sample: { wallTime: now, mediaTime: currentTime, seekable: seekableDuration },
    };
  }

  const elapsedWall = (now - state.sample.wallTime) / 1000;
  if (elapsedWall < LIVE_SAMPLE_WINDOW_S) return state;

  const elapsedMedia = currentTime - state.sample.mediaTime;
  const seekableGrowth = seekableDuration - state.sample.seekable;

  const detected =
    seekableGrowth > LIVE_SEEKABLE_GROWTH_S ||
    elapsedMedia / elapsedWall < LIVE_STALLED_RATIO;

  return { ...state, detected, sample: null };
}

/** Borde del directo (en la escala de tiempo del reproductor). */
export function getLiveEdge(seekableDuration: number, currentTime: number): number {
  return isValidTime(seekableDuration) ? Math.max(seekableDuration, currentTime) : currentTime;
}

/** Segundos de retraso respecto del borde del directo. */
export function getLiveLatency(seekableDuration: number, currentTime: number): number {
  return Math.max(0, getLiveEdge(seekableDuration, currentTime) - currentTime);
}

export function isAtLiveEdge(
  seekableDuration: number,
  currentTime: number,
  toleranceSeconds: number
): boolean {
  return getLiveLatency(seekableDuration, currentTime) <= toleranceSeconds;
}
