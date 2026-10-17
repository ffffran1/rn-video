import { createRef } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ControlButton,
  PlayPauseButton,
  useVideoPlayer,
  VideoPlayer,
  type VideoPlayerRef,
} from '../index';

// Sustituye el componente nativo por uno que expone sus props y métodos.
const mockNative = {
  seek: jest.fn(),
  presentFullscreenPlayer: jest.fn(),
  dismissFullscreenPlayer: jest.fn(),
};
let mockVideoProps: any = null;

jest.mock('react-native-video', () => {
  const { forwardRef, useImperativeHandle, createElement } = require('react');
  const { View } = require('react-native');
  const Video = forwardRef((props: any, ref: any) => {
    mockVideoProps = props;
    useImperativeHandle(ref, () => mockNative);
    return createElement(View, { testID: 'native-video' });
  });
  return { __esModule: true, default: Video };
});

const source = { uri: 'https://example.com/video.m3u8' };

async function load(duration = 120) {
  await act(() => mockVideoProps.onLoad({ duration, currentTime: 0 }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVideoProps = null;
});

describe('VideoPlayer', () => {
  it('muestra los controles por defecto y alterna play/pausa', async () => {
    await render(<VideoPlayer source={source} title="Mi video" />);
    await load();
    expect(screen.getByText('Mi video')).toBeTruthy();
    expect(mockVideoProps.paused).toBe(false);

    await fireEvent.press(screen.getByLabelText('Pause'));
    expect(mockVideoProps.paused).toBe(true);
    await fireEvent.press(screen.getByLabelText('Play'));
    expect(mockVideoProps.paused).toBe(false);
  });

  it('hideControls oculta botones individuales', async () => {
    await render(<VideoPlayer source={source} title="Mi video" hideControls={['skipBack', 'fullscreen', 'title']} />);
    await load();
    expect(screen.queryByLabelText('-10s')).toBeNull();
    expect(screen.queryByLabelText('Fullscreen')).toBeNull();
    expect(screen.queryByText('Mi video')).toBeNull();
    expect(screen.getByLabelText('+10s')).toBeTruthy();
  });

  it('icons reemplaza iconos (elemento o función)', async () => {
    await render(
      <VideoPlayer
        source={source}
        autoPlay={false}
        icons={{
          play: ({ color }) => <Text>mi-play-{color}</Text>,
          fullscreen: <Text>mi-fullscreen</Text>,
        }}
        theme={{ foreground: 'red' }}
      />
    );
    await load();
    expect(screen.getByText('mi-play-red')).toBeTruthy();
    expect(screen.getByText('mi-fullscreen')).toBeTruthy();
  });

  it('onControlPress intercepta comandos y puede delegar en el comportamiento por defecto', async () => {
    const onControlPress = jest.fn((name: string, defaultAction: () => void) => {
      if (name !== 'fullscreen') defaultAction();
    });
    await render(<VideoPlayer source={source} onControlPress={onControlPress} />);
    await load();

    await fireEvent.press(screen.getByLabelText('Fullscreen'));
    expect(onControlPress).toHaveBeenCalledWith('fullscreen', expect.any(Function), expect.any(Object));
    expect(mockNative.presentFullscreenPlayer).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Mute'));
    expect(mockVideoProps.muted).toBe(true);
  });

  it('renderBottomBarExtra y renderTopBarExtra agregan botones propios', async () => {
    const onSettings = jest.fn();
    await render(
      <VideoPlayer
        source={source}
        renderTopBarExtra={() => <Text>compartir</Text>}
        renderBottomBarExtra={() => (
          <ControlButton onPress={onSettings} accessibilityLabel="Ajustes">
            <Text>⚙</Text>
          </ControlButton>
        )}
      />
    );
    await load();
    expect(screen.getByText('compartir')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Ajustes'));
    expect(onSettings).toHaveBeenCalled();
  });

  it('renderControls permite una UI completamente propia con useVideoPlayer()', async () => {
    function MyControls() {
      const player = useVideoPlayer();
      return (
        <>
          <Text>estado:{player.status}</Text>
          <ControlButton onPress={() => player.seekBy(30)} accessibilityLabel="+30">
            <Text>+30</Text>
          </ControlButton>
          <PlayPauseButton>
            <Text>{player.status === 'playing' ? 'PAUSAR' : 'REPRODUCIR'}</Text>
          </PlayPauseButton>
        </>
      );
    }
    await render(<VideoPlayer source={source} renderControls={() => <MyControls />} />);
    await load();

    expect(screen.queryByLabelText('-10s')).toBeNull();
    expect(screen.getByText('estado:playing')).toBeTruthy();
    await fireEvent.press(screen.getByText('PAUSAR'));
    expect(screen.getByText('estado:paused')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('+30'));
    expect(mockNative.seek).toHaveBeenCalledWith(30);
  });

  it('en vivo muestra el badge y permite volver al directo', async () => {
    const onLiveDetected = jest.fn();
    await render(<VideoPlayer source={{ ...source, isLive: true }} onLiveDetected={onLiveDetected} />);
    await load(60);
    expect(onLiveDetected).toHaveBeenCalledWith(true);

    await act(() => mockVideoProps.onProgress({ currentTime: 20, playableDuration: 30, seekableDuration: 60 }));
    const badge = screen.getByLabelText('Ir al directo');
    await fireEvent.press(badge);
    expect(mockNative.seek).toHaveBeenLastCalledWith(60);

    await act(() => mockVideoProps.onSeek({ currentTime: 60, seekTime: 60 }));
    await act(() => mockVideoProps.onProgress({ currentTime: 59, playableDuration: 62, seekableDuration: 62 }));
    expect(screen.getByText('EN VIVO')).toBeTruthy();
  });

  it('muestra error y reintenta remontando el reproductor', async () => {
    const onError = jest.fn();
    await render(<VideoPlayer source={source} onError={onError} labels={{ retry: 'Otra vez' }} />);
    await act(() => mockVideoProps.onError({ error: { errorString: 'Sin conexión' } }));

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Sin conexión' }));
    expect(screen.getByText('Sin conexión')).toBeTruthy();
    await fireEvent.press(screen.getByText('Otra vez'));
    expect(screen.queryByText('Sin conexión')).toBeNull();
    expect(mockVideoProps.paused).toBe(false);
  });

  it('expone comandos imperativos mediante ref', async () => {
    const ref = createRef<VideoPlayerRef>();
    await render(<VideoPlayer ref={ref} source={source} />);
    await load(100);

    await act(() => ref.current!.pause());
    expect(mockVideoProps.paused).toBe(true);
    await act(() => ref.current!.seek(500));
    expect(mockNative.seek).toHaveBeenLastCalledWith(100);
    await act(() => ref.current!.toggleMute());
    expect(ref.current!.getSnapshot().muted).toBe(true);
  });
});
