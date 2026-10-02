import { CFG } from './GameConfig';

export interface Settings {
  sound: number; // master 0..1
  sfx: number; // 0..1
  graphics: 0 | 1 | 2; // low / medium / high
  shake: boolean;
  steering: 0 | 1 | 2; // controls sensitivity
}

export interface SaveData {
  highScore: number;
  maxDistance: number;
  totalMoney: number;
  totalAvoids: number;
  runs: number;
  settings: Settings;
}

const DEFAULTS: SaveData = {
  highScore: 0,
  maxDistance: 0,
  totalMoney: 0,
  totalAvoids: 0,
  runs: 0,
  settings: { sound: 0.8, sfx: 0.9, graphics: 2, shake: true, steering: 1 },
};

/** localStorage persistence; every access is guarded because storage can be blocked. */
class StorageManager {
  data: SaveData = this.load();

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(CFG.storageKey);
      if (!raw) return structuredClone(DEFAULTS);
      const p = JSON.parse(raw) as Partial<SaveData>;
      return { ...structuredClone(DEFAULTS), ...p, settings: { ...DEFAULTS.settings, ...(p.settings ?? {}) } };
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  save(): void {
    try {
      localStorage.setItem(CFG.storageKey, JSON.stringify(this.data));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }

  reset(): void {
    const settings = this.data.settings;
    this.data = { ...structuredClone(DEFAULTS), settings };
    this.save();
  }
}

export const storage = new StorageManager();
