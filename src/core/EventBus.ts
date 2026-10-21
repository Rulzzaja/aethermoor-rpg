export type ClassId = 'knight' | 'mage' | 'archer';
export type BodyTypeId = 'tegap' | 'ramping';
export type FaceMarkingId = 'none' | 'scar' | 'tattoo';
export interface CharacterCustomizationState { playerName: string; classId: ClassId; bodyType: BodyTypeId; faceIndex: number; hairStyleIndex: number; hairColorIndex: number; accentColorIndex: number; faceMarking: FaceMarkingId; }
export interface GameEvents {
  'ui:navigate': { screen: 'main-menu' | 'character-select' };
  'character:select-class': { classId: ClassId };
  'character:update-customization': CharacterCustomizationState;
  'character:rotate-stage': { deltaX: number };
  'game:start-new': CharacterCustomizationState;
  'settings:changed': { quality: 'Rendah' | 'Sedang' | 'Tinggi' | 'Ultra'; musicVolume: number; sfxVolume: number; showFps: boolean; };
}
type Handler<T> = (payload: T) => void;
export class EventBus {
  private listeners: { [K in keyof GameEvents]?: Set<Handler<GameEvents[K]>> } = {};
  public on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event]!.add(handler);
    return () => this.off(event, handler);
  }
  public off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void { this.listeners[event]?.delete(handler); }
  public emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void { this.listeners[event]?.forEach((handler) => handler(payload)); }
}