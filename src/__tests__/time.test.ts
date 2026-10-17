import { clamp, formatTime } from '../utils/time';
import { normalizeError } from '../utils/error';

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [5.9, '0:05'],
    [65, '1:05'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
    [NaN, '0:00'],
    [-3, '0:00'],
    [Infinity, '0:00'],
  ])('%p -> %p', (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });
});

describe('clamp', () => {
  it('limita al rango', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(3, 5, 1)).toBe(5);
  });
});

describe('normalizeError', () => {
  it('usa el mensaje más descriptivo disponible', () => {
    expect(normalizeError({ error: { errorString: 'Source error', errorCode: '22001' } })).toMatchObject({
      message: 'Source error',
      code: '22001',
    });
    expect(normalizeError({ error: { localizedDescription: 'Network lost', code: -1009 } })).toMatchObject({
      message: 'Network lost',
      code: '-1009',
    });
    expect(normalizeError(undefined).message).toBeTruthy();
  });
});
