import { StyleSheet, Text, View } from 'react-native';

type IconProps = { size?: number; color: string };

export function PlayIcon({ size = 24, color }: IconProps) {
  const h = size;
  const w = size * 0.86;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          marginLeft: size * 0.12,
          borderTopWidth: h / 2,
          borderBottomWidth: h / 2,
          borderLeftWidth: w,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: color,
        }}
      />
    </View>
  );
}

export function PauseIcon({ size = 24, color }: IconProps) {
  const bar = { width: size * 0.3, height: size, backgroundColor: color, borderRadius: 2 };
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={bar} />
      <View style={bar} />
    </View>
  );
}

export function ReplayIcon({ size = 24, color }: IconProps) {
  return <Glyph size={size} color={color} glyph="↻" />;
}

export function SkipIcon({
  size = 24,
  color,
  seconds,
  direction,
}: IconProps & { seconds: number; direction: 'back' | 'forward' }) {
  return (
    <View style={{ width: size * 1.6, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[styles.glyph, { color, fontSize: size * 0.95, lineHeight: size * 1.1 }]}>
        {direction === 'back' ? '↺' : '↻'}
      </Text>
      <Text style={[styles.skipLabel, { color, fontSize: size * 0.34 }]}>{seconds}</Text>
    </View>
  );
}

export function VolumeIcon({ size = 22, color, muted }: IconProps & { muted: boolean }) {
  const body = size * 0.28;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: body, height: body, backgroundColor: color }} />
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: size * 0.32,
          borderBottomWidth: size * 0.32,
          borderRightWidth: size * 0.3,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: color,
        }}
      />
      {muted ? (
        <Text style={[styles.glyph, { color, fontSize: size * 0.55, marginLeft: size * 0.06 }]}>✕</Text>
      ) : (
        <View
          style={{
            width: size * 0.3,
            height: size * 0.5,
            marginLeft: size * 0.04,
            borderWidth: 2,
            borderColor: color,
            borderLeftColor: 'transparent',
            borderTopRightRadius: size,
            borderBottomRightRadius: size,
          }}
        />
      )}
    </View>
  );
}

export function FullscreenIcon({ size = 22, color }: IconProps) {
  const corner = size * 0.36;
  const base = { position: 'absolute' as const, width: corner, height: corner, borderColor: color };
  const t = 2.5;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[base, { top: 0, left: 0, borderTopWidth: t, borderLeftWidth: t }]} />
      <View style={[base, { top: 0, right: 0, borderTopWidth: t, borderRightWidth: t }]} />
      <View style={[base, { bottom: 0, left: 0, borderBottomWidth: t, borderLeftWidth: t }]} />
      <View style={[base, { bottom: 0, right: 0, borderBottomWidth: t, borderRightWidth: t }]} />
    </View>
  );
}

function Glyph({ size, color, glyph }: { size: number; color: string; glyph: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[styles.glyph, { color, fontSize: size, lineHeight: size * 1.15 }]}>{glyph}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: { fontWeight: '600', includeFontPadding: false, textAlign: 'center' },
  skipLabel: { position: 'absolute', fontWeight: '700', includeFontPadding: false },
});
