import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatTime } from '../utils/time';

type Props = {
  atLiveEdge: boolean;
  latency: number;
  label: string;
  goLiveLabel: string;
  liveColor: string;
  foreground: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Indicador "EN VIVO". Cuando la reproducción está atrasada respecto del
 * directo muestra el retraso y, al tocarlo, vuelve al borde del directo.
 */
export function LiveBadge({ atLiveEdge, latency, label, goLiveLabel, liveColor, foreground, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={atLiveEdge}
      accessibilityRole="button"
      accessibilityLabel={atLiveEdge ? label : goLiveLabel}
      hitSlop={8}
      style={[styles.container, style]}
    >
      <View style={[styles.dot, { backgroundColor: atLiveEdge ? liveColor : '#9e9e9e' }]} />
      <Text style={[styles.text, { color: foreground }]}>
        {atLiveEdge ? label : `${goLiveLabel} · -${formatTime(latency)}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
