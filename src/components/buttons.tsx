import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useVideoPlayer } from '../context';
import type { ControlName, IconName, IconRenderProps } from '../types';
import { formatTime } from '../utils/time';
import {
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
  ReplayIcon,
  SkipIcon,
  VolumeIcon,
} from './Icons';
import { LiveBadge as LiveBadgeView } from './LiveBadge';
import { SeekBar as SeekBarView } from './SeekBar';

// ---- Iconos ------------------------------------------------------------------

/** Renderiza el icono `name`, usando el de `icons` si la app lo reemplazó. */
export function PlayerIcon({ name, size = 24, color }: { name: IconName; size?: number; color?: string }) {
  const api = useVideoPlayer();
  const props: IconRenderProps = { size, color: color ?? api.theme.foreground };
  const custom = api.icons[name];
  if (custom !== undefined) {
    return <>{typeof custom === 'function' ? custom(props) : custom}</>;
  }
  switch (name) {
    case 'play':
      return <PlayIcon {...props} />;
    case 'pause':
      return <PauseIcon {...props} />;
    case 'replay':
      return <ReplayIcon {...props} />;
    case 'skipBack':
      return <SkipIcon {...props} seconds={api.skipSeconds} direction="back" />;
    case 'skipForward':
      return <SkipIcon {...props} seconds={api.skipSeconds} direction="forward" />;
    case 'volume':
      return <VolumeIcon {...props} muted={false} />;
    case 'muted':
      return <VolumeIcon {...props} muted />;
    case 'fullscreen':
    case 'exitFullscreen':
      return <FullscreenIcon {...props} />;
  }
}

// ---- Botón base ----------------------------------------------------------------

export type ControlButtonProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botón base para controles propios: mantiene visibles los controles
 * mientras se interactúa y aplica `controlsStyles.button`.
 */
export function ControlButton({ onPress, children, style, disabled, ...rest }: ControlButtonProps) {
  const api = useVideoPlayer();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={10}
      {...rest}
      disabled={disabled}
      onPress={() => {
        api.controls.keepAlive();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        api.controlsStyles.button,
        style,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

type PresetButtonProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** Contenido propio en lugar del icono. */
  children?: ReactNode;
};

function usePress(name: ControlName, action: () => void) {
  const api = useVideoPlayer();
  return () => api.press(name, action);
}

// ---- Botones listos para usar ----------------------------------------------------

export function PlayPauseButton({ size = 30, color, style, children }: PresetButtonProps) {
  const api = useVideoPlayer();
  const onPress = usePress('playPause', api.togglePlay);
  const playing = api.status === 'playing' || api.status === 'buffering';
  const icon: IconName = api.status === 'ended' ? 'replay' : playing ? 'pause' : 'play';
  return (
    <ControlButton
      onPress={onPress}
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      style={[styles.playButton, api.controlsStyles.playButton, style]}
    >
      {children ?? <PlayerIcon name={icon} size={size} color={color} />}
    </ControlButton>
  );
}

export function SkipBackButton({ size = 26, color, style, children }: PresetButtonProps) {
  const api = useVideoPlayer();
  const onPress = usePress('skipBack', () => api.seekBy(-api.skipSeconds));
  return (
    <ControlButton onPress={onPress} accessibilityLabel={`-${api.skipSeconds}s`} style={style}>
      {children ?? <PlayerIcon name="skipBack" size={size} color={color} />}
    </ControlButton>
  );
}

export function SkipForwardButton({ size = 26, color, style, children }: PresetButtonProps) {
  const api = useVideoPlayer();
  const onPress = usePress('skipForward', () => api.seekBy(api.skipSeconds));
  return (
    <ControlButton
      onPress={onPress}
      disabled={!api.canSkipForward}
      accessibilityLabel={`+${api.skipSeconds}s`}
      style={style}
    >
      {children ?? <PlayerIcon name="skipForward" size={size} color={color} />}
    </ControlButton>
  );
}

export function MuteButton({ size = 20, color, style, children }: PresetButtonProps) {
  const api = useVideoPlayer();
  const onPress = usePress('mute', api.toggleMute);
  return (
    <ControlButton
      onPress={onPress}
      accessibilityLabel={api.muted ? 'Unmute' : 'Mute'}
      style={[styles.smallButton, style]}
    >
      {children ?? <PlayerIcon name={api.muted ? 'muted' : 'volume'} size={size} color={color} />}
    </ControlButton>
  );
}

export function FullscreenButton({ size = 18, color, style, children }: PresetButtonProps) {
  const api = useVideoPlayer();
  const onPress = usePress('fullscreen', api.toggleFullscreen);
  return (
    <ControlButton
      onPress={onPress}
      accessibilityLabel={api.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      style={[styles.smallButton, style]}
    >
      {children ?? (
        <PlayerIcon name={api.isFullscreen ? 'exitFullscreen' : 'fullscreen'} size={size} color={color} />
      )}
    </ControlButton>
  );
}

export function RetryButton({ style, children }: Omit<PresetButtonProps, 'size' | 'color'>) {
  const api = useVideoPlayer();
  const onPress = usePress('retry', api.retry);
  return (
    <ControlButton onPress={onPress} style={[styles.retryButton, { backgroundColor: api.theme.primary }, style]}>
      {children ?? <Text style={[styles.retryText, { color: api.theme.foreground }]}>{api.labels.retry}</Text>}
    </ControlButton>
  );
}

// ---- Indicadores ---------------------------------------------------------------

/** Badge "EN VIVO"; al tocarlo cuando hay retraso, vuelve al directo. Solo se muestra en vivo. */
export function LiveIndicator({ style }: { style?: StyleProp<ViewStyle> }) {
  const api = useVideoPlayer();
  const onPress = usePress('live', api.seekToLive);
  if (!api.isLive) return null;
  return (
    <LiveBadgeView
      style={style}
      atLiveEdge={api.isAtLiveEdge}
      latency={api.liveLatency}
      label={api.labels.live}
      goLiveLabel={api.labels.goLive}
      liveColor={api.theme.live}
      foreground={api.theme.foreground}
      onPress={() => {
        api.controls.keepAlive();
        onPress();
      }}
    />
  );
}

/**
 * Tiempo formateado. `current`: posición; `duration`: duración total;
 * `remaining`: tiempo restante (con signo menos).
 */
export function TimeDisplay({
  type = 'current',
  style,
}: {
  type?: 'current' | 'duration' | 'remaining';
  style?: StyleProp<TextStyle>;
}) {
  const api = useVideoPlayer();
  const { start, end } = api.seekableRange;
  const text =
    type === 'current'
      ? formatTime(api.currentTime - start)
      : type === 'duration'
        ? formatTime(end - start)
        : `-${formatTime(end - api.currentTime)}`;
  return (
    <Text style={[styles.time, { color: api.theme.foreground }, api.controlsStyles.time, style]}>{text}</Text>
  );
}

/** Barra de progreso conectada al reproductor. No se muestra si no hay rango buscable. */
export function SeekBar({
  color,
  trackColor,
  bufferedColor,
  style,
}: {
  color?: string;
  trackColor?: string;
  bufferedColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const api = useVideoPlayer();
  if (!api.canSeek) return null;
  return (
    <SeekBarView
      style={style}
      value={api.currentTime}
      min={api.seekableRange.start}
      max={api.seekableRange.end}
      buffered={api.bufferedTime}
      color={color ?? (api.isLive ? api.theme.live : api.theme.primary)}
      trackColor={trackColor ?? api.theme.track}
      bufferedColor={bufferedColor ?? api.theme.buffered}
      onSeekStart={api.controls.keepAlive}
      onSeekPreview={api.controls.keepAlive}
      onSeekEnd={(time) => api.press('seekBar', () => api.seek(time))}
    />
  );
}

export function PlayerTitle({ style }: { style?: StyleProp<TextStyle> }) {
  const api = useVideoPlayer();
  if (!api.title) return null;
  return (
    <Text
      numberOfLines={1}
      style={[styles.title, { color: api.theme.foreground }, api.controlsStyles.title, style]}
    >
      {api.title}
    </Text>
  );
}

const styles = StyleSheet.create({
  button: { padding: 12, marginHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.35)' },
  smallButton: { padding: 8, marginHorizontal: 0, marginLeft: 4 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
  time: { fontSize: 12, fontVariant: ['tabular-nums'], marginHorizontal: 8, minWidth: 36, textAlign: 'center' },
  retryButton: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 18, marginHorizontal: 0 },
  retryText: { fontWeight: '700' },
});
