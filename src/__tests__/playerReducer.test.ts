import { createInitialState, playerReducer, selectStatus, type PlayerAction } from '../state/playerReducer';

const run = (actions: PlayerAction[], autoPlay = true) =>
  actions.reduce(playerReducer, createInitialState(autoPlay));

describe('playerReducer', () => {
  it('pasa de loading a playing al cargar con autoPlay', () => {
    expect(selectStatus(createInitialState(true))).toBe('loading');
    expect(selectStatus(run([{ type: 'LOADED', duration: 60, currentTime: 0 }]))).toBe('playing');
  });

  it('queda en pausa sin autoPlay', () => {
    expect(selectStatus(run([{ type: 'LOADED', duration: 60, currentTime: 0 }], false))).toBe('paused');
  });

  it('refleja buffering y fin del video', () => {
    const loaded: PlayerAction = { type: 'LOADED', duration: 60, currentTime: 0 };
    expect(selectStatus(run([loaded, { type: 'BUFFER', isBuffering: true }]))).toBe('buffering');
    const ended = run([loaded, { type: 'ENDED' }]);
    expect(selectStatus(ended)).toBe('ended');
    expect(ended.wantsToPlay).toBe(false);
  });

  it('error y reintento remontan el reproductor', () => {
    const errored = run([
      { type: 'LOADED', duration: 60, currentTime: 0 },
      { type: 'ERROR', error: { message: 'boom' } },
    ]);
    expect(selectStatus(errored)).toBe('error');
    const retried = playerReducer(errored, { type: 'RETRY' });
    expect(selectStatus(retried)).toBe('loading');
    expect(retried.error).toBeNull();
    expect(retried.wantsToPlay).toBe(true);
    expect(retried.reloadKey).toBe(errored.reloadKey + 1);
  });

  it('mientras se hace seek ignora el currentTime de onProgress', () => {
    const state = run([
      { type: 'LOADED', duration: 60, currentTime: 0 },
      { type: 'SEEK_START', time: 40 },
      { type: 'PROGRESS', now: 0, currentTime: 5, playableDuration: 10, seekableDuration: 60 },
    ]);
    expect(state.currentTime).toBe(40);
    expect(playerReducer(state, { type: 'SEEK_END', time: 40 }).isSeeking).toBe(false);
  });

  it('detecta en vivo a través de onLoad', () => {
    expect(run([{ type: 'LOADED', duration: 0, currentTime: 0 }]).live.detected).toBe(true);
  });

  it('ignora valores inválidos del reproductor nativo', () => {
    const state = run([
      { type: 'LOADED', duration: 60, currentTime: 0 },
      { type: 'PROGRESS', now: 0, currentTime: 12, playableDuration: 20, seekableDuration: 60 },
      { type: 'PROGRESS', now: 250, currentTime: NaN, playableDuration: -1, seekableDuration: Infinity },
    ]);
    expect(state.currentTime).toBe(12);
    expect(state.playableDuration).toBe(20);
    expect(state.seekableDuration).toBe(60);
  });
});
