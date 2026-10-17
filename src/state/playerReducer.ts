import type { VideoPlayerError, VideoPlayerStatus } from '../types';
import {
  createLiveDetection,
  liveDetectionOnLoad,
  liveDetectionOnProgress,
  resetLiveSample,
  type LiveDetectionState,
} from '../utils/live';
import { isValidTime } from '../utils/time';

export type PlayerState = {
  /** Lo que el usuario/app pidió: reproducir o pausar. */
  wantsToPlay: boolean;
  isLoaded: boolean;
  isBuffering: boolean;
  isSeeking: boolean;
  ended: boolean;
  error: VideoPlayerError | null;
  currentTime: number;
  duration: number;
  playableDuration: number;
  seekableDuration: number;
  live: LiveDetectionState;
  /** Se incrementa en cada reintento para remontar el reproductor nativo. */
  reloadKey: number;
};

export type PlayerAction =
  | { type: 'LOAD_START' }
  | { type: 'LOADED'; duration: number; currentTime: number }
  | {
      type: 'PROGRESS';
      now: number;
      currentTime: number;
      playableDuration: number;
      seekableDuration: number;
    }
  | { type: 'BUFFER'; isBuffering: boolean }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK_START'; time: number }
  | { type: 'SEEK_END'; time: number }
  | { type: 'ENDED' }
  | { type: 'ERROR'; error: VideoPlayerError }
  | { type: 'RETRY' }
  | { type: 'SOURCE_CHANGED'; autoPlay: boolean };

export function createInitialState(autoPlay: boolean): PlayerState {
  return {
    wantsToPlay: autoPlay,
    isLoaded: false,
    isBuffering: false,
    isSeeking: false,
    ended: false,
    error: null,
    currentTime: 0,
    duration: 0,
    playableDuration: 0,
    seekableDuration: 0,
    live: createLiveDetection(),
    reloadKey: 0,
  };
}

const safe = (value: number, fallback: number) => (isValidTime(value) ? value : fallback);

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoaded: false, error: null, ended: false };

    case 'LOADED':
      return {
        ...state,
        isLoaded: true,
        isBuffering: false,
        error: null,
        duration: safe(action.duration, 0),
        currentTime: safe(action.currentTime, 0),
        live: liveDetectionOnLoad(action.duration),
      };

    case 'PROGRESS': {
      const currentTime = safe(action.currentTime, state.currentTime);
      const seekableDuration = safe(action.seekableDuration, state.seekableDuration);
      return {
        ...state,
        currentTime: state.isSeeking ? state.currentTime : currentTime,
        playableDuration: safe(action.playableDuration, state.playableDuration),
        seekableDuration,
        live: liveDetectionOnProgress(state.live, {
          now: action.now,
          currentTime,
          seekableDuration,
          isAdvancing:
            state.wantsToPlay && state.isLoaded && !state.isBuffering && !state.isSeeking,
        }),
      };
    }

    case 'BUFFER':
      return {
        ...state,
        isBuffering: action.isBuffering,
        live: action.isBuffering ? resetLiveSample(state.live) : state.live,
      };

    case 'PLAY':
      return { ...state, wantsToPlay: true, ended: false };

    case 'PAUSE':
      return { ...state, wantsToPlay: false, live: resetLiveSample(state.live) };

    case 'SEEK_START':
      return {
        ...state,
        isSeeking: true,
        ended: false,
        currentTime: safe(action.time, state.currentTime),
        live: resetLiveSample(state.live),
      };

    case 'SEEK_END':
      return { ...state, isSeeking: false, currentTime: safe(action.time, state.currentTime) };

    case 'ENDED':
      return { ...state, ended: true, wantsToPlay: false, isBuffering: false };

    case 'ERROR':
      return { ...state, error: action.error, isBuffering: false, wantsToPlay: false };

    case 'RETRY':
      return {
        ...createInitialState(true),
        live: state.live.detected ? state.live : createLiveDetection(),
        reloadKey: state.reloadKey + 1,
      };

    case 'SOURCE_CHANGED':
      return { ...createInitialState(action.autoPlay), reloadKey: state.reloadKey + 1 };

    default:
      return state;
  }
}

export function selectStatus(state: PlayerState): VideoPlayerStatus {
  if (state.error) return 'error';
  if (!state.isLoaded) return 'loading';
  if (state.ended) return 'ended';
  if (state.isBuffering || state.isSeeking) return 'buffering';
  return state.wantsToPlay ? 'playing' : 'paused';
}
