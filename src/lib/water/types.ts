export type WorldHandle = {
  setPaused: (value: boolean) => void;
  setRain: (value: boolean) => void;
  setWind: (value: boolean) => void;
  setGravity: (value: boolean) => void;
  reset: () => void;
  splash: () => void;
  dispose: () => void;
};

export type WorldOptions = {
  onReady?: (handle: WorldHandle) => void;
};
