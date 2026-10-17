import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { clamp } from '../utils/time';

type Props = {
  /** Posición actual (en la escala del reproductor). */
  value: number;
  min: number;
  max: number;
  buffered?: number;
  color: string;
  trackColor: string;
  bufferedColor: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onSeekStart?: () => void;
  /** Se llama mientras se arrastra, con la posición propuesta. */
  onSeekPreview?: (time: number) => void;
  onSeekEnd: (time: number) => void;
};

const THUMB = 14;
const HIT_SLOP = { top: 14, bottom: 14 };

export function SeekBar({
  value,
  min,
  max,
  buffered = 0,
  color,
  trackColor,
  bufferedColor,
  disabled,
  style,
  onSeekStart,
  onSeekPreview,
  onSeekEnd,
}: Props) {
  const [width, setWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);

  // Refs para que el PanResponder (creado una sola vez) lea valores actuales.
  const latest = useRef({ width, min, max, onSeekStart, onSeekPreview, onSeekEnd });
  latest.current = { width, min, max, onSeekStart, onSeekPreview, onSeekEnd };
  const startX = useRef(0);
  const lastValue = useRef(0);

  const toTime = (x: number) => {
    const { width: w, min: lo, max: hi } = latest.current;
    if (w <= 0 || hi <= lo) return lo;
    return lo + (clamp(x, 0, w) / w) * (hi - lo);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          startX.current = evt.nativeEvent.locationX;
          lastValue.current = toTime(startX.current);
          setDragValue(lastValue.current);
          latest.current.onSeekStart?.();
          latest.current.onSeekPreview?.(lastValue.current);
        },
        onPanResponderMove: (_evt, gesture) => {
          lastValue.current = toTime(startX.current + gesture.dx);
          setDragValue(lastValue.current);
          latest.current.onSeekPreview?.(lastValue.current);
        },
        onPanResponderRelease: () => {
          latest.current.onSeekEnd(lastValue.current);
          setDragValue(null);
        },
        onPanResponderTerminate: () => {
          latest.current.onSeekEnd(lastValue.current);
          setDragValue(null);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const range = max - min;
  const ratio = (v: number) => (range > 0 ? clamp((v - min) / range, 0, 1) : 0);
  const shown = dragValue ?? value;
  const progressPx = ratio(shown) * width;
  const bufferedPx = ratio(Math.max(buffered, shown)) * width;

  return (
    <View
      style={[styles.container, style]}
      hitSlop={HIT_SLOP}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      pointerEvents={disabled ? 'none' : 'auto'}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: Math.round(min), max: Math.round(max), now: Math.round(shown) }}
      {...responder.panHandlers}
    >
      <View style={[styles.track, { backgroundColor: trackColor }]} pointerEvents="none">
        <View style={[styles.fill, { width: bufferedPx, backgroundColor: bufferedColor }]} />
        <View style={[styles.fill, { width: progressPx, backgroundColor: color }]} />
      </View>
      {!disabled && (
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              backgroundColor: color,
              left: progressPx - THUMB / 2,
              transform: [{ scale: dragValue !== null ? 1.3 : 1 }],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, height: 24, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
});
