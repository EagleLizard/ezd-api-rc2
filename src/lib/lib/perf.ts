
import assert from 'node:assert';
import { performance as _performance } from 'node:perf_hooks';

/*
performance, profiling, timers.
_*/

export type PerfClock = {
  start(): PerfClock;
  stop(): number;
  currMs(): number;
} & {};

export const perf = {
  getClock: initClock,
} as const;

function initClock(): PerfClock {
  let startMs: number | undefined;
  let ms: number | undefined;
  let clock = {
    start,
    stop,
    currMs,
  };
  return clock;
  function start(): PerfClock {
    startMs = _performance.now();
    ms = undefined;
    return clock;
  }
  function stop(): number {
    if(startMs === undefined) {
      throw new Error('clock not started!');
    }
    if(ms !== undefined) {
      throw new Error('clock already stopped!');
    }
    ms = performance.now() - startMs;
    return ms;
  }
  function currMs(): number {
    assert(startMs !== undefined, new Error('clock not started!'));
    if(ms === undefined) {
      return _performance.now() - startMs;
    }
    return ms;
  }
}
