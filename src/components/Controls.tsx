import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer } from '../context';
import type { ControlsRenderer } from '../types';
import {
  FullscreenButton,
  LiveIndicator,
  MuteButton,
  PlayPauseButton,
  PlayerTitle,
  RetryButton,
  SeekBar,
  SkipBackButton,
  SkipForwardButton,
  TimeDisplay,
} from './buttons';

export type ControlsSlots = {
  renderControls?: ControlsRenderer;
  renderTopBar?: ControlsRenderer;
  renderCenterControls?: ControlsRenderer;
  renderBottomBar?: ControlsRenderer;
  renderTopBarExtra?: ControlsRenderer;
  renderBottomBarExtra?: ControlsRenderer;
  renderLoading?: ControlsRenderer;
  renderError?: ControlsRenderer;
};

/** Capa de controles por defecto, con cada sección reemplazable. */
export function Controls(slots: ControlsSlots) {
  const api = useVideoPlayer();
  const { theme, controls, status, controlsStyles } = api;

  if (status === 'error') {
    if (slots.renderError) return <>{slots.renderError(api)}</>;
    return (
      <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: theme.overlay }]}>
        <Text style={[styles.errorTitle, { color: theme.foreground }]}>{api.labels.errorTitle}</Text>
        {!!api.error?.message && (
          <Text style={[styles.errorMessage, { color: theme.foreground }]} numberOfLines={3}>
            {api.error.message}
          </Text>
        )}
        {!api.isControlHidden('retry') && <RetryButton />}
      </View>
    );
  }

  const showSpinner = status === 'loading' || status === 'buffering';

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={controls.toggle} accessible={false}>
      {slots.renderControls
        ? slots.renderControls(api)
        : controls.visible && (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }, controlsStyles.overlay]}
              pointerEvents="box-none"
            >
              {slots.renderTopBar ? slots.renderTopBar(api) : <DefaultTopBar extra={slots.renderTopBarExtra} />}
              {slots.renderCenterControls ? (
                slots.renderCenterControls(api)
              ) : (
                <DefaultCenterControls hidePlay={showSpinner} />
              )}
              {slots.renderBottomBar ? (
                slots.renderBottomBar(api)
              ) : (
                <DefaultBottomBar extra={slots.renderBottomBarExtra} />
              )}
            </View>
          )}

      {showSpinner && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          {slots.renderLoading ? slots.renderLoading(api) : <ActivityIndicator size="large" color={theme.foreground} />}
        </View>
      )}
    </Pressable>
  );
}

function DefaultTopBar({ extra }: { extra?: ControlsRenderer }) {
  const api = useVideoPlayer();
  return (
    <View style={[styles.topBar, api.controlsStyles.topBar]} pointerEvents="box-none">
      {!api.isControlHidden('title') ? <PlayerTitle /> : <View style={styles.flex} />}
      {extra?.(api)}
    </View>
  );
}

function DefaultCenterControls({ hidePlay }: { hidePlay: boolean }) {
  const api = useVideoPlayer();
  const hidden = api.isControlHidden;
  return (
    <View style={[styles.centerRow, api.controlsStyles.centerControls]} pointerEvents="box-none">
      {!hidden('skipBack') && <SkipBackButton />}
      {!hidden('playPause') && <PlayPauseButton style={hidePlay && styles.invisible} />}
      {!hidden('skipForward') && <SkipForwardButton />}
    </View>
  );
}

function DefaultBottomBar({ extra }: { extra?: ControlsRenderer }) {
  const api = useVideoPlayer();
  const hidden = api.isControlHidden;
  const showSeekBar = api.canSeek && !hidden('seekBar');
  return (
    <View style={[styles.bottomBar, api.controlsStyles.bottomBar]} pointerEvents="box-none">
      {!api.isLive && !hidden('currentTime') && api.canSeek && <TimeDisplay type="current" />}
      {showSeekBar ? <SeekBar /> : <View style={styles.flex} />}
      {!api.isLive && !hidden('duration') && api.canSeek && <TimeDisplay type="duration" />}
      {!hidden('live') && <LiveIndicator style={styles.live} />}
      {extra?.(api)}
      {!hidden('mute') && <MuteButton />}
      {!hidden('fullscreen') && <FullscreenButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  invisible: { opacity: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    minHeight: 36,
  },
  centerRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6 },
  live: { marginLeft: 10 },
  errorTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  errorMessage: { fontSize: 13, opacity: 0.8, textAlign: 'center', marginBottom: 14 },
});
