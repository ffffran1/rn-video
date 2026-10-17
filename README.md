# @ffffran1/rn-video

Reproductor de video para **React Native (iOS y Android)** con soporte para **VOD** (MP4, HLS, DASH) y **transmisiones en vivo** (HLS/DASH, con o sin DVR), y controles **100 % personalizables**.

- ✅ Funciona en proyectos React Native CLI ("bare"). **No requiere Expo** (aunque también funciona en Expo con development build).
- ✅ Detección automática de streams en vivo, badge **EN VIVO**, latencia e **"Ir al directo"**.
- ✅ Controles por defecto listos para usar: play/pausa, ±10 s, barra de progreso, tiempo, volumen, pantalla completa, reintentar.
- ✅ Cada botón se puede ocultar, cambiar de icono, cambiar de comportamiento o reemplazar por completo.
- ✅ API imperativa (`ref`) y hook `useVideoPlayer()` para construir tu propia UI.
- ✅ TypeScript.

Por debajo usa [`react-native-video`](https://github.com/TheWidlarzGroup/react-native-video) (AVPlayer en iOS, ExoPlayer/Media3 en Android).

---

## Instalación

```sh
npm install @ffffran1/rn-video react-native-video
# o
yarn add @ffffran1/rn-video react-native-video
```

En iOS instala los pods:

```sh
cd ios && pod install
```

No hace falta ninguna otra configuración nativa: `react-native-video` se enlaza con autolinking. Requisitos: `react-native-video >= 6`.

## Uso básico

```tsx
import { VideoPlayer } from '@ffffran1/rn-video';

// VOD
<VideoPlayer
  source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }}
  title="Big Buck Bunny"
/>

// En vivo (HLS)
<VideoPlayer
  source={{ uri: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8', isLive: true }}
  title="Canal en vivo"
/>
```

Por defecto el reproductor ocupa el 100 % del ancho con relación 16:9. Puedes cambiarlo con `style` o `aspectRatio`.

## En vivo vs. VOD

| | VOD | En vivo |
| --- | --- | --- |
| Barra de progreso | Sí | Solo si indicas `liveDvrWindow` |
| Tiempo actual / duración | Sí | No (se muestra el badge) |
| ±10 s | Sí | Sí (adelantar se limita al directo) |
| Badge `EN VIVO` / `Ir al directo · -0:42` | No | Sí |
| `loop` | Sí | Ignorado |

**Detección automática:** si no pasas `source.isLive`, el reproductor lo detecta (duración 0/indefinida, rango buscable que crece, o posición que no avanza dentro de la ventana live). Para evitar cualquier ambigüedad durante los primeros segundos, pasa `isLive: true` si ya lo sabes.

**DVR:** si el stream permite volver atrás, indica el tamaño de la ventana en segundos para mostrar la barra de progreso:

```tsx
<VideoPlayer source={{ uri, isLive: true }} liveDvrWindow={2 * 60 * 60} />
```

## Props

### Principales

| Prop | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `source` | `{ uri, isLive?, headers?, type?, drm?, bufferConfig?, ... }` | — | Fuente. Acepta todo lo de `source` de `react-native-video` + `isLive`. |
| `title` | `string` | — | Título en la barra superior. |
| `autoPlay` | `boolean` | `true` | Reproducir al cargar. |
| `muted` | `boolean` | `false` | Silencio inicial. |
| `loop` | `boolean` | `false` | Repetir el VOD. |
| `controls` | `boolean` | `true` | `false` para no mostrar ningún control. |
| `controlsTimeout` | `number` (ms) | `3000` | Tiempo hasta ocultar los controles mientras se reproduce. |
| `skipSeconds` | `number` | `10` | Segundos de los botones de adelantar/retroceder. |
| `liveEdgeTolerance` | `number` | `10` | Segundos de margen para considerar que estás "en el directo". |
| `liveDvrWindow` | `number` | — | Ventana DVR en segundos (muestra barra de progreso en vivo). |
| `aspectRatio` | `number` | `16/9` | Relación de aspecto del contenedor. |
| `style` | `ViewStyle` | — | Estilo del contenedor. |
| `theme` | `Partial<VideoPlayerTheme>` | — | Colores: `primary`, `live`, `foreground`, `background`, `overlay`, `track`, `buffered`. |
| `labels` | `Partial<VideoPlayerLabels>` | — | Textos: `live`, `goLive`, `retry`, `errorTitle` (para traducir). |

También se reenvían a `react-native-video`: `resizeMode`, `poster`, `rate`, `volume`, `playInBackground`, `playWhenInactive`, `ignoreSilentSwitch`, `mixWithOthers`, `selectedAudioTrack`, `selectedTextTrack`, `selectedVideoTrack`, `subtitleStyle`, `viewType`, `enterPictureInPictureOnLeave`, `showNotificationControls`, `preventsDisplaySleepDuringVideoPlayback`, `fullscreenOrientation`, `fullscreenAutorotate`, `maxBitRate`, `onBandwidthUpdate`, `onTimedMetadata`, `onAudioTracks`, `onTextTracks`, `onVideoTracks`.

### Eventos

| Prop | Firma |
| --- | --- |
| `onStatusChange` | `(status: 'loading' \| 'playing' \| 'paused' \| 'buffering' \| 'ended' \| 'error') => void` |
| `onLiveDetected` | `(isLive: boolean) => void` |
| `onProgress` | `(snapshot: VideoPlayerSnapshot) => void` |
| `onError` | `(error: { message, code?, raw? }) => void` |
| `onEnd` | `() => void` |
| `onFullscreenChange` | `(isFullscreen: boolean) => void` |

## Personalizar los controles

Hay varios niveles; usa el más simple que te sirva.

### 1. Ocultar botones

```tsx
<VideoPlayer source={source} hideControls={['skipBack', 'skipForward', 'fullscreen']} />
```

Nombres disponibles (`ControlName`): `title`, `playPause`, `skipBack`, `skipForward`, `seekBar`, `currentTime`, `duration`, `live`, `mute`, `fullscreen`, `retry`.

### 2. Cambiar iconos

Pasa un elemento o una función que recibe `{ color, size }`. Sirve cualquier librería de iconos (`react-native-vector-icons`, SVG, imágenes...).

```tsx
import Icon from 'react-native-vector-icons/MaterialIcons';

<VideoPlayer
  source={source}
  icons={{
    play: ({ color, size }) => <Icon name="play-arrow" color={color} size={size} />,
    pause: ({ color, size }) => <Icon name="pause" color={color} size={size} />,
    replay: ({ color, size }) => <Icon name="replay" color={color} size={size} />,
    skipBack: ({ color, size }) => <Icon name="replay-10" color={color} size={size} />,
    skipForward: ({ color, size }) => <Icon name="forward-10" color={color} size={size} />,
    volume: ({ color, size }) => <Icon name="volume-up" color={color} size={size} />,
    muted: ({ color, size }) => <Icon name="volume-off" color={color} size={size} />,
    fullscreen: ({ color, size }) => <Icon name="fullscreen" color={color} size={size} />,
    exitFullscreen: ({ color, size }) => <Icon name="fullscreen-exit" color={color} size={size} />,
  }}
/>
```

### 3. Estilos y colores

```tsx
<VideoPlayer
  source={source}
  theme={{ primary: '#ff0050', live: '#ff0050', overlay: 'rgba(0,0,0,0.6)' }}
  controlsStyles={{
    playButton: { backgroundColor: '#ff0050' },
    bottomBar: { paddingBottom: 12 },
    title: { fontSize: 18 },
  }}
/>
```

Claves de `controlsStyles`: `overlay`, `topBar`, `centerControls`, `bottomBar`, `button`, `playButton`, `title`, `time`.

### 4. Cambiar lo que hace un botón (`onControlPress`)

Si defines `onControlPress`, **tú decides** qué pasa al pulsar cualquier control. Llama a `defaultAction()` para mantener el comportamiento por defecto.

```tsx
<VideoPlayer
  source={source}
  onControlPress={(name, defaultAction, player) => {
    analytics.track('player_control', { name });

    if (name === 'fullscreen') {
      navigation.navigate('FullscreenPlayer', { uri: source.uri, time: player.currentTime });
      return; // no ejecuta el fullscreen nativo
    }
    defaultAction();
  }}
/>
```

### 5. Agregar botones propios

`renderTopBarExtra` (a la derecha del título) y `renderBottomBarExtra` (antes del botón de volumen). Usa `ControlButton` para que los controles no se oculten mientras interactúas.

```tsx
import { VideoPlayer, ControlButton } from '@ffffran1/rn-video';

<VideoPlayer
  source={source}
  renderTopBarExtra={() => (
    <ControlButton onPress={share} accessibilityLabel="Compartir">
      <Icon name="share" color="#fff" size={22} />
    </ControlButton>
  )}
  renderBottomBarExtra={(player) => (
    <ControlButton onPress={() => setRate(player)} accessibilityLabel="Velocidad">
      <Text style={{ color: '#fff' }}>1x</Text>
    </ControlButton>
  )}
/>
```

### 6. Reemplazar secciones

`renderTopBar`, `renderCenterControls`, `renderBottomBar`, `renderLoading` y `renderError` reciben el `player` (estado + comandos) y reemplazan esa parte de la UI.

```tsx
<VideoPlayer
  source={source}
  renderError={(player) => (
    <View style={StyleSheet.absoluteFill}>
      <Text>Ups: {player.error?.message}</Text>
      <Button title="Reintentar" onPress={player.retry} />
    </View>
  )}
/>
```

### 7. UI totalmente propia (`renderControls` + `useVideoPlayer`)

Reemplaza toda la capa de controles. Puedes combinar tus componentes con los que exporta la librería, que ya están conectados al reproductor:

`PlayPauseButton`, `SkipBackButton`, `SkipForwardButton`, `MuteButton`, `FullscreenButton`, `RetryButton`, `SeekBar`, `TimeDisplay`, `LiveIndicator`, `PlayerTitle`, `PlayerIcon`, `ControlButton`.

```tsx
import {
  VideoPlayer,
  useVideoPlayer,
  PlayPauseButton,
  SeekBar,
  TimeDisplay,
  LiveIndicator,
  ControlButton,
} from '@ffffran1/rn-video';

function MyControls() {
  const player = useVideoPlayer();
  if (!player.controls.visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <PlayPauseButton size={40} />
      <View style={styles.row}>
        <TimeDisplay type="current" />
        <SeekBar color="#ff0050" />
        <TimeDisplay type="remaining" />
        <LiveIndicator />
        <ControlButton onPress={() => player.setMuted(!player.muted)}>
          <Text style={{ color: '#fff' }}>{player.muted ? 'Activar sonido' : 'Silenciar'}</Text>
        </ControlButton>
      </View>
    </View>
  );
}

<VideoPlayer source={source} renderControls={() => <MyControls />} />
```

`useVideoPlayer()` devuelve (`VideoPlayerApi`):

- **Estado:** `status`, `isLive`, `isAtLiveEdge`, `liveLatency`, `currentTime`, `duration`, `bufferedTime`, `muted`, `isFullscreen`, `error`, `seekableRange`, `canSeek`, `canSkipForward`, `title`.
- **Comandos:** `play`, `pause`, `togglePlay`, `seek`, `seekBy`, `seekToLive`, `setMuted`, `toggleMute`, `enterFullscreen`, `exitFullscreen`, `toggleFullscreen`, `retry`.
- **Controles:** `controls.visible`, `controls.show()`, `controls.hide()`, `controls.toggle()`, `controls.keepAlive()`.
- **Config:** `theme`, `labels`, `icons`, `controlsStyles`, `skipSeconds`, `isControlHidden(name)`, `press(name, action)` (ejecuta un comando pasando por `onControlPress`).

Si prefieres no mostrar ningún control y manejar todo desde fuera, usa `controls={false}` y la `ref`.

## Control desde fuera (`ref`)

```tsx
import { useRef } from 'react';
import { VideoPlayer, type VideoPlayerRef } from '@ffffran1/rn-video';

const player = useRef<VideoPlayerRef>(null);

<VideoPlayer ref={player} source={source} controls={false} />

player.current?.play();
player.current?.pause();
player.current?.seek(120);       // a los 2:00
player.current?.seekBy(-30);     // 30 s atrás
player.current?.seekToLive();    // al directo
player.current?.toggleMute();
player.current?.enterFullscreen();
player.current?.retry();
player.current?.getSnapshot();   // { status, currentTime, isLive, ... }
```

## Ejemplos de fuentes

```tsx
// HLS con headers (token)
<VideoPlayer source={{ uri: 'https://cdn.example.com/stream.m3u8', headers: { Authorization: `Bearer ${token}` } }} />

// DASH
<VideoPlayer source={{ uri: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd', type: 'mpd' }} />

// Archivo local
<VideoPlayer source={{ uri: require('./intro.mp4') }} />

// Buffer para baja latencia en vivo (Android)
<VideoPlayer source={{ uri, isLive: true, bufferConfig: { live: { targetOffsetMs: 3000 } } }} />
```

## Notas de plataforma

- **Pantalla completa:** usa el fullscreen nativo de `react-native-video`. Si quieres tu propia pantalla completa (p. ej. otra pantalla con orientación horizontal), intercéptalo con `onControlPress`.
- **iOS / HTTP:** las URLs `http://` requieren una excepción de App Transport Security en `Info.plist`.
- **Android / HTTP:** las URLs `http://` requieren `android:usesCleartextTraffic="true"` en el `AndroidManifest.xml`.
- **Reproducción en segundo plano / PiP:** consulta la documentación de `react-native-video` (requiere configuración nativa adicional) y usa las props `playInBackground` / `enterPictureInPictureOnLeave`.

## Desarrollo

```sh
npm install
npm test          # tests (jest + Testing Library)
npm run typecheck
npm run build     # genera lib/commonjs, lib/module y lib/typescript
```

### Publicar en npm

```sh
npm login
npm version patch   # o minor / major
npm publish         # ejecuta typecheck, tests y build automáticamente
```

El paquete se publica con scope (`@ffffran1/rn-video`) y acceso público. Si tu usuario de npm es otro, cambia el campo `name` en `package.json`.

## Licencia

MIT
