import { AudioManager } from '../audio/AudioManager';
import { EventBus } from '../core/EventBus';
import { SettingsManager } from '../core/Settings';
import { CharacterSelectUI } from './CharacterSelectUI';
import { createButton, createPanel, TooltipManager } from './components/UIComponents';

export class MenuManager {
  private currentScreen: 'main-menu' | 'character-select' | 'in-game' = 'main-menu';
  private charSelectUI: CharacterSelectUI;
  private tooltip: TooltipManager;
  private activeModal: HTMLElement | null = null;
  private activeSettingsTab: 'grafis' | 'audio' | 'kontrol' | 'gameplay' = 'grafis';

  constructor(
    private uiRoot: HTMLElement,
    private bus: EventBus,
    private settings: SettingsManager,
    private audio: AudioManager
  ) {
    this.tooltip = new TooltipManager(document.body);
    this.charSelectUI = new CharacterSelectUI(this.bus, this.audio, this.tooltip);

    this.bus.on('ui:navigate', ({ screen }) => {
      this.currentScreen = screen;
      this.uiRoot.style.display = 'flex';
      this.render();
    });

    this.bus.on('game:start-new', (profile) => {
      this.settings.saveCharacterProfile(profile);
      this.closeModal();
      this.tooltip.hide();
      this.currentScreen = 'in-game';
      this.uiRoot.innerHTML = '';
      this.uiRoot.style.display = 'none';
    });

    window.addEventListener('keydown', (e) => this.handleGlobalKeys(e));
    this.render();
  }

  private handleGlobalKeys(e: KeyboardEvent): void {
    if (this.currentScreen === 'in-game') return;

    if (e.key === 'Escape') {
      if (this.activeModal) {
        this.closeModal();
        return;
      }
      if (this.currentScreen === 'character-select') {
        this.bus.emit('ui:navigate', { screen: 'main-menu' });
        return;
      }
    }

    if (this.currentScreen === 'character-select' && !this.activeModal) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.charSelectUI.handleKeyDown(e);
      }
    }
  }

  private render(): void {
    this.uiRoot.innerHTML = '';
    this.tooltip.hide();

    if (this.currentScreen === 'main-menu') {
      this.renderMainMenu();
    } else if (this.currentScreen === 'character-select') {
      this.uiRoot.appendChild(this.charSelectUI.getElement());
    }
  }

  private renderMainMenu(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'main-menu';

    const topBar = document.createElement('div');
    topBar.className = 'main-menu__top';

    const logoBlock = document.createElement('div');
    logoBlock.className = 'main-menu__logo';
    logoBlock.innerHTML = `
      <span class="main-menu__badge">Action RPG 3D • Dunia Semi-Terbuka HD</span>
      <h1 class="main-menu__title">AETHERMOOR</h1>
      <div class="main-menu__subtitle">PENJAGA CAHAYA</div>
    `;
    topBar.appendChild(logoBlock);

    const middleRow = document.createElement('div');
    middleRow.className = 'main-menu__middle';

    const navPanel = createPanel({ className: 'main-menu__nav' });
    const hasSave = this.settings.hasSavedGame();

    const btnNewGame = createButton({
      label: 'Main Baru',
      variant: 'primary',
      icon: 'sparkle',
      audio: this.audio,
      onClick: () => {
        this.audio.startCampfireAmbience();
        this.bus.emit('ui:navigate', { screen: 'character-select' });
      }
    });

    const btnContinue = createButton({
      label: 'Lanjutkan',
      disabled: !hasSave,
      audio: this.audio,
      onClick: () => {
        const saved = this.settings.loadCharacterProfile();
        if (saved) {
          this.audio.playHeroChime();
          this.bus.emit('game:start-new', saved.profile);
        }
      }
    });

    const btnSettings = createButton({
      label: 'Pengaturan',
      audio: this.audio,
      onClick: () => this.openSettingsModal()
    });

    const btnExit = createButton({
      label: 'Keluar',
      variant: 'danger',
      audio: this.audio,
      onClick: () =>
        this.showStartSummaryModal(
          'Terima kasih telah memainkan Aethermoor: Penjaga Cahaya.'
        )
    });

    navPanel.body.style.display = 'flex';
    navPanel.body.style.flexDirection = 'column';
    navPanel.body.style.gap = '12px';
    navPanel.body.append(btnNewGame, btnContinue, btnSettings, btnExit);

    middleRow.appendChild(navPanel.element);

    const footer = document.createElement('div');
    footer.className = 'main-menu__footer';
    footer.innerHTML = `
      <span>Navigasi: Mouse atau Keyboard (Panah Atas/Bawah, Enter, Esc)</span>
      <span>v0.2.0 — Desa Embermere & Combat Aktif</span>
    `;

    wrapper.append(topBar, middleRow, footer);
    this.uiRoot.appendChild(wrapper);
  }

  public openSettingsModal(): void {
    this.closeModal();
    const current = this.settings.getSettings();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ui-interactive';

    const modal = createPanel({
      title: 'Pengaturan Sistem',
      className: 'modal-box'
    });

    const tabRow = document.createElement('div');
    tabRow.className = 'option-pills';
    tabRow.style.marginBottom = '16px';
    tabRow.style.borderBottom = '1px solid var(--panel-border-subtle)';
    tabRow.style.paddingBottom = '10px';

    const tabs: Array<{ id: 'grafis' | 'audio' | 'kontrol' | 'gameplay'; label: string }> = [
      { id: 'grafis', label: 'Grafis' },
      { id: 'audio', label: 'Audio' },
      { id: 'kontrol', label: 'Kontrol' },
      { id: 'gameplay', label: 'Gameplay' }
    ];

    tabs.forEach((t) => {
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.className = `pill-btn ${this.activeSettingsTab === t.id ? 'pill-btn--active' : ''}`;
      tabBtn.textContent = t.label;
      tabBtn.addEventListener('click', () => {
        this.audio.playClick();
        this.activeSettingsTab = t.id;
        this.openSettingsModal();
      });
      tabRow.appendChild(tabBtn);
    });

    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '14px';

    if (this.activeSettingsTab === 'grafis') {
      const qualityWrap = document.createElement('div');
      qualityWrap.className = 'custom-group';
      qualityWrap.innerHTML = `<span class="custom-group__label">Preset Kualitas Grafis</span>`;
      const qualityPills = document.createElement('div');
      qualityPills.className = 'option-pills';

      const presets: Array<'Rendah' | 'Sedang' | 'Tinggi' | 'Ultra'> = [
        'Rendah',
        'Sedang',
        'Tinggi',
        'Ultra'
      ];
      presets.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pill-btn ${current.quality === p ? 'pill-btn--active' : ''}`;
        btn.textContent = p;
        btn.addEventListener('click', () => {
          this.audio.playClick();
          const updated = this.settings.updateSettings({ quality: p });
          this.bus.emit('settings:changed', updated);
          this.openSettingsModal();
        });
        qualityPills.appendChild(btn);
      });
      qualityWrap.appendChild(qualityPills);
      content.appendChild(qualityWrap);
    } else if (this.activeSettingsTab === 'audio') {
      const musicWrap = document.createElement('div');
      musicWrap.className = 'custom-group';
      const musicLabel = document.createElement('span');
      musicLabel.className = 'custom-group__label';
      musicLabel.textContent = `Volume Musik (${Math.round(current.musicVolume * 100)}%)`;
      const musicInput = document.createElement('input');
      musicInput.type = 'range';
      musicInput.min = '0';
      musicInput.max = '1';
      musicInput.step = '0.05';
      musicInput.value = String(current.musicVolume);
      musicInput.addEventListener('input', () => {
        const val = parseFloat(musicInput.value);
        musicLabel.textContent = `Volume Musik (${Math.round(val * 100)}%)`;
        const updated = this.settings.updateSettings({ musicVolume: val });
        this.audio.setVolumes(updated.musicVolume, updated.sfxVolume);
      });
      musicWrap.append(musicLabel, musicInput);

      const sfxWrap = document.createElement('div');
      sfxWrap.className = 'custom-group';
      const sfxLabel = document.createElement('span');
      sfxLabel.className = 'custom-group__label';
      sfxLabel.textContent = `Volume Efek Suara (${Math.round(current.sfxVolume * 100)}%)`;
      const sfxInput = document.createElement('input');
      sfxInput.type = 'range';
      sfxInput.min = '0';
      sfxInput.max = '1';
      sfxInput.step = '0.05';
      sfxInput.value = String(current.sfxVolume);
      sfxInput.addEventListener('input', () => {
        const val = parseFloat(sfxInput.value);
        sfxLabel.textContent = `Volume Efek Suara (${Math.round(val * 100)}%)`;
        const updated = this.settings.updateSettings({ sfxVolume: val });
        this.audio.setVolumes(updated.musicVolume, updated.sfxVolume);
      });
      sfxWrap.append(sfxLabel, sfxInput);
      content.append(musicWrap, sfxWrap);
    } else if (this.activeSettingsTab === 'kontrol') {
      const ctrlBox = document.createElement('div');
      ctrlBox.style.fontSize = '14px';
      ctrlBox.innerHTML = `
        <div>• <strong>WASD</strong>: Gerak • <strong>Shift</strong>: Lari • <strong>Spasi</strong>: Lompat</div>
        <div>• <strong>Ctrl</strong>: Guling • <strong>Klik Kiri</strong>: Serang • <strong>1, 2, 3</strong>: Skill</div>
        <div>• <strong>Q</strong>: Lock-On Target • <strong>R</strong>: Ramuan HP • <strong>F</strong>: Bicara NPC</div>
      `;
      content.appendChild(ctrlBox);
    } else {
      const gpBox = document.createElement('div');
      gpBox.style.fontSize = '14px';
      gpBox.textContent = 'Bahasa Indonesia (Default) • Simpan Otomatis Aktif.';
      content.appendChild(gpBox);
    }

    const closeBtn = createButton({
      label: 'Simpan & Tutup',
      variant: 'primary',
      audio: this.audio,
      onClick: () => this.closeModal()
    });

    modal.body.append(tabRow, content, closeBtn);
    backdrop.appendChild(modal.element);
    document.body.appendChild(backdrop);
    this.activeModal = backdrop;
  }

  private showStartSummaryModal(message: string): void {
    this.closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ui-interactive';

    const modal = createPanel({ title: 'Informasi', className: 'modal-box' });
    const p = document.createElement('p');
    p.style.marginBottom = '18px';
    p.textContent = message;

    const okBtn = createButton({
      label: 'Mengerti',
      variant: 'primary',
      audio: this.audio,
      onClick: () => this.closeModal()
    });

    modal.body.append(p, okBtn);
    backdrop.appendChild(modal.element);
    document.body.appendChild(backdrop);
    this.activeModal = backdrop;
  }

  private closeModal(): void {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  }
}