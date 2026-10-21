import { CharacterCustomizationState } from './EventBus';
export type LanguageCode = 'id' | 'en';
export interface GameSettingsData { language: LanguageCode; quality: 'Rendah' | 'Sedang' | 'Tinggi' | 'Ultra'; musicVolume: number; sfxVolume: number; showFps: boolean; }
const STORAGE_KEY_SETTINGS = 'aethermoor_settings_v1';
const STORAGE_KEY_SAVE_SLOT_1 = 'aethermoor_save_slot_1';
export class SettingsManager {
  private settings: GameSettingsData = { language: 'id', quality: 'Tinggi', musicVolume: 0.7, sfxVolume: 0.85, showFps: true };
  constructor() { this.loadSettings(); }
  public getSettings(): GameSettingsData { return { ...this.settings }; }
  public updateSettings(partial: Partial<GameSettingsData>): GameSettingsData {
    this.settings = { ...this.settings, ...partial };
    try { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings)); } catch {}
    return this.getSettings();
  }
  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) };
    } catch {}
  }
  public hasSavedGame(): boolean {
    try { return localStorage.getItem(STORAGE_KEY_SAVE_SLOT_1) !== null; } catch { return false; }
  }
  public saveCharacterProfile(profile: CharacterCustomizationState): void {
    try { localStorage.setItem(STORAGE_KEY_SAVE_SLOT_1, JSON.stringify({ profile, savedAt: new Date().toISOString(), area: 'Desa Embermere', level: 1 })); } catch {}
  }
  public loadCharacterProfile(): { profile: CharacterCustomizationState; savedAt: string; area: string; level: number; } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVE_SLOT_1);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }
}