export interface CaptureApi {
  takeScreenshot: () => void;
}

const noop = () => {};

let api: CaptureApi = {
  takeScreenshot: noop,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const captureStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): CaptureApi {
    return api;
  },
  setCapture(next: CaptureApi) {
    if (api === next) return;
    api = next;
    emit();
  },
};
