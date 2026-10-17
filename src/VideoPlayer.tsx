import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Video, {
  type OnBufferData,
  type OnLoadData,
  type OnProgressData,
  type OnSeekData,
  type OnVideoErrorData,
  type VideoRef,
} from 'react-native-video';
import { Controls } from './components/Controls';
import { VideoPlayerContext } from './context';
import { useAutoHide } from './hooks/useAutoHide';
import { createInitialState, playerReducer, selectStatus } from './state/playerReducer';
import type {
  ControlName,
  VideoPlayerApi,
  VideoPlayerLabels,
  VideoPlayerProps,
  VideoPlayerRef,
  VideoPlayerSnapshot,
  VideoPlayerTheme,
} from './types';
import { normalizeError } from './utils/error';
import { getLiveEdge, getLiveLatency } from './utils/live';
import { clamp } from './utils/time';

export const defaultLabels: VideoPlayerLabels = {
  live: 'EN VIVO',
  goLive: 'Ir al directo',
  retry: 'Reintentar',
  errorTitle: 'No se pudo reproducir el video',
};

export const defaultTheme: VideoPlayerTheme = {
  primary: '#3d7cff',
  live: '#e53935',
  foreground: '#ffffff',
  background: '#000000',
  overlay: 'rgba(0,0,0,0.4)',
  track: 'rgba(255,255,255,0.3)',
  buffered: 'rgba(255,255,255,0.55)',
};

/** Si el evento `onSeek` no llega (algunos casos en Android), se libera el estado de seek. */
const SEEK_FALLBACK_MS = 2000;

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer(
  {
    source,
    style,
    title,
    autoPlay = true,
    muted: mutedProp = false,
    loop = false,
    controls = true,
    controlsTimeout = 3000,
    skipSeconds = 10,
    liveEdgeTolerance = 10,
    liveDvrWindow,
    aspectRatio = 16 / 9,
    labels: labelsProp,
    theme: themeProp,
    onStatusChange,
    onLiveDetected,
    onProgress,
    onError,
    onEnd,
    onFullscreenChange,
    hideControls,
    icons,
    controlsStyles,
    onControlPress,
    renderControls,
    renderTopBar,
    renderCenterControls,
    renderBottomBar,
    renderTopBarExtra,
    renderBottomBarExtra,
    renderLoading,
    renderError,
    ...videoProps
  },
  ref
) {
  const videoRef = useRef<VideoRef>(null);
  const [state, dispatch] = useReducer(playerReducer, autoPlay, createInitialState);
  const [muted, setMuted] = useState(mutedProp);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const seekFallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  const labels = useMemo(() => ({ ...defaultLabels, ...labelsProp }), [labelsProp]);
  const theme = useMemo(() => ({ ...defaultTheme, ...themeProp }), [themeProp]);

  // `isLive` es nuestro; el resto se pasa a react-native-video. Se memoiza por
  // contenido para no recargar la fuente si el padre crea un objeto nuevo en cada render.
  const { isLive: isLiveProp, ...nativeSource } = source;
  const sourceKey = JSON.stringify(nativeSource);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSource = useMemo(() => nativeSource, [sourceKey]);

  const firstSource = useRef(true);
  useEffect(() => {
    if (firstSource.current) {
      firstSource.current = false;
      return;
    }
    dispatch({ type: 'SOURCE_CHANGED', autoPlay });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  useEffect(() => setMuted(mutedProp), [mutedProp]);

  // ---- Estado derivado -------------------------------------------------------
  const status = selectStatus(state);
  const isLive = isLiveProp ?? state.live.detected;
  const liveEdge = getLiveEdge(state.seekableDuration, state.currentTime);
  const liveLatency = isLive ? getLiveLatency(state.seekableDuration, state.currentTime) : 0;
  const atLiveEdge = isLive && liveLatency <= liveEdgeTolerance;

  const vodDuration = state.duration > 0 ? state.duration : state.seekableDuration;
  const seekMin = isLive && liveDvrWindow ? Math.max(0, liveEdge - liveDvrWindow) : 0;
  const seekMax = isLive ? liveEdge : vodDuration;
  const showSeekBar = isLive ? !!liveDvrWindow && liveDvrWindow > 0 : vodDuration > 0;

  const snapshot: VideoPlayerSnapshot = {
    status,
    isLive,
    isAtLiveEdge: atLiveEdge,
    liveLatency,
    currentTime: state.currentTime,
    duration: isLive ? liveEdge : vodDuration,
    bufferedTime: state.playableDuration,
    muted,
    isFullscreen,
    error: state.error,
  };
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  // ---- Callbacks hacia la app -----------------------------------------------
  useEffect(() => {
    onStatusChange?.(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (state.isLoaded) onLiveDetected?.(isLive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, state.isLoaded]);

  useEffect(
    () => () => {
      if (seekFallback.current) clearTimeout(seekFallback.current);
    },
    []
  );

  // ---- Acciones ----------------------------------------------------------------
  const finishSeek = useCallback((time: number) => {
    if (seekFallback.current) {
      clearTimeout(seekFallback.current);
      seekFallback.current = null;
    }
    dispatch({ type: 'SEEK_END', time });
  }, []);

  const seek = useCallback(
    (seconds: number) => {
      const s = snapshotRef.current;
      const max = s.isLive ? s.duration : s.duration || Number.MAX_SAFE_INTEGER;
      const target = clamp(seconds, s.isLive ? seekMin : 0, max);
      dispatch({ type: 'SEEK_START', time: target });
      videoRef.current?.seek(target);
      if (seekFallback.current) clearTimeout(seekFallback.current);
      seekFallback.current = setTimeout(() => finishSeek(target), SEEK_FALLBACK_MS);
    },
    [finishSeek, seekMin]
  );

  const play = useCallback(() => {
    if (snapshotRef.current.status === 'ended') seek(0);
    dispatch({ type: 'PLAY' });
  }, [seek]);

  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);

  const togglePlay = useCallback(() => {
    const s = snapshotRef.current.status;
    if (s === 'playing' || s === 'buffering') pause();
    else play();
  }, [pause, play]);

  const seekBy = useCallback(
    (delta: number) => seek(snapshotRef.current.currentTime + delta),
    [seek]
  );

  const seekToLive = useCallback(() => {
    const s = snapshotRef.current;
    if (!s.isLive) return;
    seek(s.duration);
    dispatch({ type: 'PLAY' });
  }, [seek]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const enterFullscreen = useCallback(() => videoRef.current?.presentFullscreenPlayer(), []);
  const exitFullscreen = useCallback(() => videoRef.current?.dismissFullscreenPlayer(), []);
  const toggleFullscreen = useCallback(() => {
    if (snapshotRef.current.isFullscreen) exitFullscreen();
    else enterFullscreen();
  }, [enterFullscreen, exitFullscreen]);
  const retry = useCallback(() => dispatch({ type: 'RETRY' }), []);

  useImperativeHandle(
    ref,
    () => ({
      play,
      pause,
      togglePlay,
      seek,
      seekBy,
      seekToLive,
      setMuted,
      toggleMute,
      enterFullscreen,
      exitFullscreen,
      toggleFullscreen,
      retry,
      getSnapshot: () => snapshotRef.current,
    }),
    [play, pause, togglePlay, seek, seekBy, seekToLive, toggleMute, enterFullscreen, exitFullscreen, toggleFullscreen, retry]
  );

  // ---- Eventos nativos -------------------------------------------------------
  const handleLoad = useCallback(
    (e: OnLoadData) => dispatch({ type: 'LOADED', duration: e.duration, currentTime: e.currentTime }),
    []
  );

  const handleProgress = useCallback(
    (e: OnProgressData) => {
      dispatch({
        type: 'PROGRESS',
        now: Date.now(),
        currentTime: e.currentTime,
        playableDuration: e.playableDuration,
        seekableDuration: e.seekableDuration,
      });
      onProgress?.(snapshotRef.current);
    },
    [onProgress]
  );

  const handleBuffer = useCallback((e: OnBufferData) => dispatch({ type: 'BUFFER', isBuffering: e.isBuffering }), []);

  const handleSeek = useCallback((e: OnSeekData) => finishSeek(e.currentTime), [finishSeek]);

  const handleEnd = useCallback(() => {
    if (snapshotRef.current.isLive || loop) return;
    dispatch({ type: 'ENDED' });
    onEnd?.();
  }, [loop, onEnd]);

  const handleError = useCallback(
    (e: OnVideoErrorData) => {
      const error = normalizeError(e);
      dispatch({ type: 'ERROR', error });
      onError?.(error);
    },
    [onError]
  );

  const handleFullscreen = useCallback(
    (value: boolean) => () => {
      setIsFullscreen(value);
      onFullscreenChange?.(value);
    },
    [onFullscreenChange]
  );

  // ---- Controles ---------------------------------------------------------------
  const canHide = status === 'playing';
  const controlsVisibility = useAutoHide(controlsTimeout, canHide);

  const canSkipForward = isLive ? !atLiveEdge : state.currentTime < vodDuration - 0.5;
  const paused = !state.wantsToPlay || state.ended || !!state.error;

  const hiddenKey = hideControls?.join(',') ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hiddenSet = useMemo(() => new Set<ControlName>(hideControls), [hiddenKey]);

  const apiRef = useRef<VideoPlayerApi | null>(null);
  const onControlPressRef = useRef(onControlPress);
  onControlPressRef.current = onControlPress;
  const press = useCallback((name: ControlName, defaultAction: () => void) => {
    const handler = onControlPressRef.current;
    if (handler && apiRef.current) handler(name, defaultAction, apiRef.current);
    else defaultAction();
  }, []);

  const api: VideoPlayerApi = {
    ...snapshot,
    title,
    seekableRange: { start: seekMin, end: seekMax },
    canSeek: showSeekBar,
    canSkipForward,
    skipSeconds,
    controls: controlsVisibility,
    theme,
    labels,
    icons: icons ?? {},
    controlsStyles: controlsStyles ?? {},
    isControlHidden: (name) => hiddenSet.has(name),
    press,
    play,
    pause,
    togglePlay,
    seek,
    seekBy,
    seekToLive,
    setMuted,
    toggleMute,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    retry,
  };
  apiRef.current = api;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, aspectRatio }, style]}>
      <Video
        key={state.reloadKey}
        ref={videoRef}
        {...videoProps}
        source={stableSource}
        style={StyleSheet.absoluteFill}
        resizeMode={videoProps.resizeMode ?? 'contain'}
        paused={paused}
        muted={muted}
        repeat={loop && !isLive}
        controls={false}
        progressUpdateInterval={250}
        onLoadStart={() => dispatch({ type: 'LOAD_START' })}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onBuffer={handleBuffer}
        onSeek={handleSeek}
        onEnd={handleEnd}
        onError={handleError}
        onFullscreenPlayerDidPresent={handleFullscreen(true)}
        onFullscreenPlayerDidDismiss={handleFullscreen(false)}
      />
      {controls && (
        <VideoPlayerContext.Provider value={api}>
          <Controls
            renderControls={renderControls}
            renderTopBar={renderTopBar}
            renderCenterControls={renderCenterControls}
            renderBottomBar={renderBottomBar}
            renderTopBarExtra={renderTopBarExtra}
            renderBottomBarExtra={renderBottomBarExtra}
            renderLoading={renderLoading}
            renderError={renderError}
          />
        </VideoPlayerContext.Provider>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden' },
});
