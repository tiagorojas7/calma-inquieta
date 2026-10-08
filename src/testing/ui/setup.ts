import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Setup for the `ui` Vitest project (jsdom). It loads the jest-dom matchers,
 * unmounts rendered trees after every test, and fills the two browser APIs
 * jsdom 30 does not implement: modal dialogs and `matchMedia`.
 */
afterEach(() => {
  cleanup();
});

// jsdom 30 ships HTMLDialogElement without show/showModal/close. The polyfill
// is installed only when a method is missing, so a later jsdom that implements
// them is used as is. It models just what the components rely on: the `open`
// attribute and an asynchronous `close` event. The event is a deliberate
// microtask approximation: browsers queue a task, which jsdom has no loop for.
const dialog = HTMLDialogElement.prototype;

if (typeof dialog.showModal !== "function") {
  dialog.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
}

if (typeof dialog.show !== "function") {
  dialog.show = function show(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
}

if (typeof dialog.close !== "function") {
  dialog.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.hasAttribute("open")) {
      return;
    }
    this.removeAttribute("open");
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    // Deliberate approximation: a microtask, where browsers queue a task. It is
    // still asynchronous, so a test sees the event only after the caller returns.
    queueMicrotask(() => {
      this.dispatchEvent(new Event("close"));
    });
  };
}

// jsdom has no layout and no media queries: every query reports no match.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}
