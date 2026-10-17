import {
  LIVE_SAMPLE_WINDOW_S,
  createLiveDetection,
  getLiveLatency,
  isAtLiveEdge,
  liveDetectionOnLoad,
  liveDetectionOnProgress,
  type LiveDetectionState,
} from '../utils/live';

/** Simula N segundos de eventos onProgress cada 250 ms. */
function simulate(
  initial: LiveDetectionState,
  seconds: number,
  tick: (t: number) => { currentTime: number; seekableDuration: number },
  isAdvancing = true
) {
  let state = initial;
  for (let ms = 0; ms <= seconds * 1000; ms += 250) {
    state = liveDetectionOnProgress(state, { now: ms, isAdvancing, ...tick(ms / 1000) });
  }
  return state;
}

describe('liveDetectionOnLoad', () => {
  it('detecta en vivo cuando la duración es 0, NaN o Infinity', () => {
    expect(liveDetectionOnLoad(0).detected).toBe(true);
    expect(liveDetectionOnLoad(NaN).detected).toBe(true);
    expect(liveDetectionOnLoad(Infinity).detected).toBe(true);
  });

  it('no asume en vivo con una duración válida', () => {
    expect(liveDetectionOnLoad(596).detected).toBe(false);
  });
});

describe('liveDetectionOnProgress', () => {
  it('VOD: el tiempo avanza al ritmo real y el rango buscable es fijo', () => {
    const state = simulate(liveDetectionOnLoad(600), 10, (t) => ({
      currentTime: 30 + t,
      seekableDuration: 600,
    }));
    expect(state.detected).toBe(false);
  });

  it('iOS en vivo: el rango buscable crece con el tiempo', () => {
    const state = simulate(liveDetectionOnLoad(120), LIVE_SAMPLE_WINDOW_S + 1, (t) => ({
      currentTime: 100 + t,
      seekableDuration: 120 + t,
    }));
    expect(state.detected).toBe(true);
  });

  it('Android en vivo: la posición en la ventana live casi no avanza', () => {
    const state = simulate(liveDetectionOnLoad(60), LIVE_SAMPLE_WINDOW_S + 1, () => ({
      currentTime: 50,
      seekableDuration: 60,
    }));
    expect(state.detected).toBe(true);
  });

  it('no toma muestras si está pausado o en buffering', () => {
    const state = simulate(
      liveDetectionOnLoad(600),
      10,
      () => ({ currentTime: 30, seekableDuration: 600 }),
      false
    );
    expect(state.detected).toBe(false);
    expect(state.sample).toBeNull();
  });

  it('una vez detectado no vuelve atrás', () => {
    const detected = { ...createLiveDetection(), detected: true };
    expect(
      liveDetectionOnProgress(detected, { now: 0, currentTime: 0, seekableDuration: 0, isAdvancing: true })
    ).toBe(detected);
  });
});

describe('latencia', () => {
  it('calcula la distancia al borde del directo', () => {
    expect(getLiveLatency(120, 100)).toBe(20);
    expect(getLiveLatency(120, 125)).toBe(0);
    expect(getLiveLatency(NaN, 50)).toBe(0);
  });

  it('isAtLiveEdge respeta la tolerancia', () => {
    expect(isAtLiveEdge(120, 112, 10)).toBe(true);
    expect(isAtLiveEdge(120, 100, 10)).toBe(false);
  });
});
