import { act } from "@testing-library/react";
import { vi, type MockInstance } from "vitest";

/**
 * Controllable browser APIs for `ui` tests. jsdom has no layout, no
 * `IntersectionObserver`, no Network Information API and no media playback, so
 * a component that reacts to them is driven through these stubs. Call
 * `restoreBrowserStubs()` in `afterEach`.
 */

export interface MatchMediaStub {
  /** Flips `(prefers-reduced-motion: reduce)` and notifies every listener. */
  setReduce(reduce: boolean): void;
}

const REDUCE_QUERY = /prefers-reduced-motion:\s*reduce/;

/** Replaces `window.matchMedia`; only the reduced-motion query can match. */
export function stubMatchMedia({
  reduce = false,
}: { readonly reduce?: boolean } = {}): MatchMediaStub {
  let current = reduce;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  vi.stubGlobal("matchMedia", (query: string): MediaQueryList => {
    const list = {
      get matches() {
        return REDUCE_QUERY.test(query) && current;
      },
      media: query,
      onchange: null,
      addEventListener: (
        type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        if (type === "change") {
          listeners.add(listener);
        }
      },
      removeEventListener: (
        type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        if (type === "change") {
          listeners.delete(listener);
        }
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    };
    return list as unknown as MediaQueryList;
  });

  return {
    setReduce(next) {
      current = next;
      act(() => {
        for (const listener of [...listeners]) {
          listener({ matches: next } as MediaQueryListEvent);
        }
      });
    },
  };
}

export interface IntersectionObserverStub {
  /** Reports every observed element as intersecting or not, to every live observer. */
  trigger(isIntersecting: boolean): void;
  /** The observers created and not yet disconnected. */
  readonly active: () => number;
}

/** Installs a fake `IntersectionObserver` that only reports what `trigger` says. */
export function stubIntersectionObserver(): IntersectionObserverStub {
  const live = new Set<FakeObserver>();

  class FakeObserver {
    readonly elements = new Set<Element>();
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      live.add(this);
    }

    observe(element: Element) {
      this.elements.add(element);
    }

    unobserve(element: Element) {
      this.elements.delete(element);
    }

    disconnect() {
      this.elements.clear();
      live.delete(this);
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }

    report(isIntersecting: boolean) {
      const entries = [...this.elements].map(
        (target) => ({ target, isIntersecting }) as IntersectionObserverEntry,
      );
      if (entries.length > 0) {
        this.callback(entries, this as unknown as IntersectionObserver);
      }
    }
  }

  vi.stubGlobal("IntersectionObserver", FakeObserver);

  return {
    trigger(isIntersecting) {
      act(() => {
        for (const observer of [...live]) {
          observer.report(isIntersecting);
        }
      });
    },
    active: () => live.size,
  };
}

/** Makes `IntersectionObserver` unavailable, as in an old browser. */
export function removeIntersectionObserver(): void {
  vi.stubGlobal("IntersectionObserver", undefined);
}

/**
 * Sets `navigator.connection.saveData`. `undefined` removes the connection
 * object, as in Safari and Firefox.
 */
export function stubConnection(saveData: boolean | undefined): void {
  Object.defineProperty(navigator, "connection", {
    configurable: true,
    value: saveData === undefined ? undefined : { saveData },
  });
}

export interface PlaybackSpies {
  readonly play: MockInstance<() => Promise<void>>;
  readonly pause: MockInstance<() => void>;
}

/** Spies on `HTMLMediaElement.play` (resolving) and `pause`; jsdom plays nothing. */
export function spyOnPlayback(): PlaybackSpies {
  return {
    play: vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve()),
    pause: vi
      .spyOn(HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => undefined),
  };
}

/** Undoes every stub and spy this module installed. */
export function restoreBrowserStubs(): void {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "connection");
}
