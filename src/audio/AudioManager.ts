export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxVolume = 0.85;
  private musicVolume = 0.7;
  private ambientInterval: number | null = null;
  private ensureContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume().catch(() => {}); }
    return this.ctx;
  }
  public setVolumes(music: number, sfx: number): void { this.musicVolume = Math.max(0, Math.min(1, music)); this.sfxVolume = Math.max(0, Math.min(1, sfx)); }
  public playHover(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(580, now); osc.frequency.exponentialRampToValueAtTime(760, now + 0.045);
    gain.gain.setValueAtTime(0.05 * this.sfxVolume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.055);
  }
  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(420, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
    gain.gain.setValueAtTime(0.14 * this.sfxVolume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.12);
  }
  public playHeroChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01) return;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.06; const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.1 * this.sfxVolume, now); gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.45);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.46);
    });
  }
  public startCampfireAmbience(): void {
    if (this.ambientInterval !== null) return;
    this.ambientInterval = window.setInterval(() => {
      if (this.musicVolume <= 0.02) return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;
      if (Math.random() < 0.45) {
        const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120 + Math.random() * 180, now);
        gain.gain.setValueAtTime(0.015 * this.musicVolume, now); gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.04);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.045);
      }
    }, 350);
  }
}