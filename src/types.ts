import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { ReactVideoProps, ReactVideoSource, OnVideoErrorData } from 'react-native-video';

export type VideoPlayerSource = ReactVideoSource & {
  /**
   * Forzar el modo de reproducción. Si se omite (`undefined`), se detecta
   * automáticamente si la fuente es una transmisión en vivo.
   */
  isLive?: boolean;
};

export type VideoPlayerError = {
  message: string;
  code?: string;
  raw?: OnVideoErrorData;
};

export type VideoPlayerStatus =
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export type VideoPlayerSnapshot = {
  status: VideoPlayerStatus;
  isLive: boolean;
  /** Solo en vivo: `true` si la reproducción está cerca del borde del directo. */
  isAtLiveEdge: boolean;
  /** Solo en vivo: segundos de retraso respecto del directo. */
  liveLatency: number;
  currentTime: number;
  /** Duración del VOD, o borde del directo en vivo. */
  duration: number;
  bufferedTime: number;
  muted: boolean;
  isFullscreen: boolean;
  error: VideoPlayerError | null;
};

export type VideoPlayerLabels = {
  live: string;
  goLive: string;
  retry: string;
  errorTitle: string;
};

export type VideoPlayerTheme = {
  /** Color de acento (barra de progreso, botón de reintentar). */
  primary: string;
  /** Color del badge "EN VIVO". */
  live: string;
  /** Color de iconos y textos. */
  foreground: string;
  /** Fondo del reproductor (letterbox). */
  background: string;
  /** Capa semitransparente detrás de los controles. */
  overlay: string;
  /** Pista de la barra de progreso. */
  track: string;
  /** Parte ya cargada (buffer) de la barra de progreso. */
  buffered: string;
};

export type VideoPlayerRef = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  /** Segundos absolutos en la escala del reproductor. */
  seek: (seconds: number) => void;
  /** Avanza (positivo) o retrocede (negativo) relativo a la posición actual. */
  seekBy: (deltaSeconds: number) => void;
  /** Salta al borde del directo (solo tiene efecto en vivo). */
  seekToLive: () => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
  /** Vuelve a cargar la fuente (útil tras un error). */
  retry: () => void;
  getSnapshot: () => VideoPlayerSnapshot;
};

// ---- Personalización ---------------------------------------------------------

/** Nombre de cada control de la UI por defecto. */
export type ControlName =
  | 'title'
  | 'playPause'
  | 'skipBack'
  | 'skipForward'
  | 'seekBar'
  | 'currentTime'
  | 'duration'
  | 'live'
  | 'mute'
  | 'fullscreen'
  | 'retry';

export type IconName =
  | 'play'
  | 'pause'
  | 'replay'
  | 'skipBack'
  | 'skipForward'
  | 'volume'
  | 'muted'
  | 'fullscreen'
  | 'exitFullscreen';

export type IconRenderProps = { color: string; size: number };

/** Un elemento ya creado (`<MyIcon />`) o una función que recibe color y tamaño. */
export type IconRenderer = ReactNode | ((props: IconRenderProps) => ReactNode);

export type VideoPlayerIcons = Partial<Record<IconName, IconRenderer>>;

export type ControlsVisibility = {
  visible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  /** Reinicia el temporizador de auto-ocultado (llamarlo al interactuar). */
  keepAlive: () => void;
};

/**
 * Todo lo que necesita una UI de controles: estado actual, comandos y
 * configuración. Se recibe en los `render*` y con el hook `useVideoPlayer()`.
 */
export type VideoPlayerApi = VideoPlayerSnapshot &
  Omit<VideoPlayerRef, 'getSnapshot'> & {
    title?: string;
    /** Rango en el que se puede mover la barra de progreso. */
    seekableRange: { start: number; end: number };
    /** `true` si hay una barra de progreso que mostrar. */
    canSeek: boolean;
    canSkipForward: boolean;
    skipSeconds: number;
    controls: ControlsVisibility;
    theme: VideoPlayerTheme;
    labels: VideoPlayerLabels;
    icons: VideoPlayerIcons;
    controlsStyles: VideoPlayerControlsStyles;
    isControlHidden: (name: ControlName) => boolean;
    /**
     * Ejecuta el comando de un control pasando por `onControlPress` (si la
     * app lo definió). Úsalo en botones propios para respetar ese hook.
     */
    press: (name: ControlName, defaultAction: () => void) => void;
  };

export type ControlsRenderer = (api: VideoPlayerApi) => ReactNode;

export type VideoPlayerControlsStyles = Partial<{
  overlay: StyleProp<ViewStyle>;
  topBar: StyleProp<ViewStyle>;
  centerControls: StyleProp<ViewStyle>;
  bottomBar: StyleProp<ViewStyle>;
  button: StyleProp<ViewStyle>;
  playButton: StyleProp<ViewStyle>;
  title: StyleProp<TextStyle>;
  time: StyleProp<TextStyle>;
}>;

/** Props de `react-native-video` que se reenvían tal cual. */
export type PassThroughVideoProps = Pick<
  ReactVideoProps,
  | 'resizeMode'
  | 'poster'
  | 'rate'
  | 'volume'
  | 'playInBackground'
  | 'playWhenInactive'
  | 'ignoreSilentSwitch'
  | 'mixWithOthers'
  | 'selectedAudioTrack'
  | 'selectedTextTrack'
  | 'selectedVideoTrack'
  | 'subtitleStyle'
  | 'viewType'
  | 'enterPictureInPictureOnLeave'
  | 'showNotificationControls'
  | 'preventsDisplaySleepDuringVideoPlayback'
  | 'fullscreenOrientation'
  | 'fullscreenAutorotate'
  | 'maxBitRate'
  | 'onBandwidthUpdate'
  | 'onTimedMetadata'
  | 'onAudioTracks'
  | 'onTextTracks'
  | 'onVideoTracks'
>;

export type VideoPlayerProps = PassThroughVideoProps & {
  source: VideoPlayerSource;
  style?: StyleProp<ViewStyle>;
  /** Título que se muestra en la parte superior de los controles. */
  title?: string;
  /** Empezar a reproducir apenas cargue. Default: `true`. */
  autoPlay?: boolean;
  /** Estado inicial de silencio. Default: `false`. */
  muted?: boolean;
  /** Repetir el VOD al terminar. Ignorado en vivo. Default: `false`. */
  loop?: boolean;
  /** Mostrar los controles propios. Default: `true`. */
  controls?: boolean;
  /** Milisegundos sin interacción antes de ocultar los controles. Default: `3000`. */
  controlsTimeout?: number;
  /** Segundos de los botones de adelantar/retroceder. Default: `10`. */
  skipSeconds?: number;
  /**
   * Segundos de distancia al borde del directo dentro de los cuales se considera
   * que se está "en vivo". Default: `10`.
   */
  liveEdgeTolerance?: number;
  /**
   * Tamaño de la ventana DVR (segundos) del stream en vivo. Si se indica, se
   * muestra una barra de progreso para moverse dentro de esa ventana; si no,
   * en vivo solo hay botones de retroceder/adelantar y "ir al directo".
   */
  liveDvrWindow?: number;
  /** Relación de aspecto del contenedor si no se define `height` en `style`. Default: `16/9`. */
  aspectRatio?: number;
  labels?: Partial<VideoPlayerLabels>;
  theme?: Partial<VideoPlayerTheme>;

  // ---- Personalización de controles -----------------------------------------
  /** Controles de la UI por defecto que no se deben mostrar. */
  hideControls?: ControlName[];
  /** Reemplaza iconos de la UI por defecto. */
  icons?: VideoPlayerIcons;
  /** Estilos que se aplican sobre los de la UI por defecto. */
  controlsStyles?: VideoPlayerControlsStyles;
  /**
   * Intercepta la pulsación de cualquier control. Si se define, el comando por
   * defecto NO se ejecuta automáticamente: llama a `defaultAction()` para
   * conservarlo, o haz otra cosa (p. ej. usar tu propio fullscreen).
   */
  onControlPress?: (name: ControlName, defaultAction: () => void, api: VideoPlayerApi) => void;
  /** Reemplaza TODA la UI de controles. */
  renderControls?: ControlsRenderer;
  /** Reemplaza la barra superior (título). */
  renderTopBar?: ControlsRenderer;
  /** Reemplaza la fila central (retroceder / reproducir / adelantar). */
  renderCenterControls?: ControlsRenderer;
  /** Reemplaza la barra inferior (progreso, tiempo, en vivo, volumen, fullscreen). */
  renderBottomBar?: ControlsRenderer;
  /** Contenido extra a la derecha de la barra superior (p. ej. ajustes, compartir, cast). */
  renderTopBarExtra?: ControlsRenderer;
  /** Contenido extra en la barra inferior, antes del botón de volumen. */
  renderBottomBarExtra?: ControlsRenderer;
  /** Reemplaza el indicador de carga/buffering. */
  renderLoading?: ControlsRenderer;
  /** Reemplaza la pantalla de error. */
  renderError?: ControlsRenderer;

  onStatusChange?: (status: VideoPlayerStatus) => void;
  onLiveDetected?: (isLive: boolean) => void;
  onProgress?: (snapshot: VideoPlayerSnapshot) => void;
  onError?: (error: VideoPlayerError) => void;
  onEnd?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
};
