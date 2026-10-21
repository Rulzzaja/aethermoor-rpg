import classesData from '../data/classes.json';
import { AudioManager } from '../audio/AudioManager';
import { BodyTypeId, CharacterCustomizationState, ClassId, EventBus, FaceMarkingId } from '../core/EventBus';
import { getSvgIcon, IconName } from './components/Icons';
import { createButton, createPanel, createStatusBar, TooltipManager } from './components/UIComponents';
export class CharacterSelectUI {
  private container: HTMLElement;
  private state: CharacterCustomizationState = { playerName: 'Aelion', classId: 'knight', bodyType: 'tegap', faceIndex: 0, hairStyleIndex: 0, hairColorIndex: 0, accentColorIndex: 0, faceMarking: 'none' };
  constructor(private bus: EventBus, private audio: AudioManager, private tooltip: TooltipManager) {
    this.container = document.createElement('div'); this.container.className = 'char-screen'; this.render();
  }
  public getElement(): HTMLElement { return this.container; }
  public handleKeyDown(e: KeyboardEvent): void {
    const order: ClassId[] = ['knight', 'mage', 'archer'];
    if (e.key === 'ArrowLeft') this.selectClass(order[(order.indexOf(this.state.classId) - 1 + order.length) % order.length]);
    else if (e.key === 'ArrowRight') this.selectClass(order[(order.indexOf(this.state.classId) + 1) % order.length]);
  }
  private selectClass(classId: ClassId): void {
    const found = classesData.classes.find(c => c.id === classId);
    this.state.classId = classId; if (found) this.state.accentColorIndex = found.defaultAccentIndex;
    this.audio.playHeroChime(); this.bus.emit('character:select-class', { classId }); this.bus.emit('character:update-customization', { ...this.state }); this.render();
  }
  private emitCustomization(): void { this.bus.emit('character:update-customization', { ...this.state }); }
  private render(): void {
    this.container.innerHTML = '';
    const currentClass = classesData.classes.find(c => c.id === this.state.classId) ?? classesData.classes[0];

    const leftCol = document.createElement('div'); leftCol.className = 'char-screen__left';
    const classPanel = createPanel({ title: '1. Pilih Kelas Penjaga' });
    const classList = document.createElement('div'); classList.className = 'class-selector-list';
    classesData.classes.forEach((cls) => {
      const card = document.createElement('button'); card.type = 'button'; card.className = `class-card ${cls.id === this.state.classId ? 'class-card--selected' : ''}`;
      const iconWrap = document.createElement('div'); iconWrap.className = 'aether-icon'; iconWrap.innerHTML = getSvgIcon(cls.id as IconName);
      const info = document.createElement('div'); info.innerHTML = `<div class="class-card__title">${cls.name}</div><div class="class-card__epithet">${cls.epithet}</div>`;
      card.append(iconWrap, info); card.addEventListener('click', () => this.selectClass(cls.id as ClassId)); classList.appendChild(card);
    });
    classPanel.body.appendChild(classList); leftCol.appendChild(classPanel.element);

    const customPanel = createPanel({ title: '2. Kustomisasi Penjaga' });
    const nameGroup = document.createElement('div'); nameGroup.className = 'custom-group'; nameGroup.innerHTML = `<label class="custom-group__label">Nama Penjaga</label>`;
    const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.maxLength = 20; nameInput.className = 'custom-Input'; nameInput.value = this.state.playerName;
    nameInput.addEventListener('input', () => { this.state.playerName = nameInput.value.trim() || 'Aelion'; this.emitCustomization(); });
    nameGroup.appendChild(nameInput); customPanel.body.appendChild(nameGroup);

    const bodyGroup = document.createElement('div'); bodyGroup.className = 'custom-group'; bodyGroup.innerHTML = `<span class="custom-group__label">Tipe Tubuh</span>`;
    const bodyPills = document.createElement('div'); bodyPills.className = 'option-pills';
    classesData.customization.bodyTypes.forEach(bt => {
      const pill = document.createElement('button'); pill.type = 'button'; pill.className = `pill-btn ${this.state.bodyType === bt.id ? 'pill-btn--active' : ''}`; pill.textContent = bt.label;
      pill.addEventListener('click', () => { this.audio.playClick(); this.state.bodyType = bt.id as BodyTypeId; this.emitCustomization(); this.render(); });
      bodyPills.appendChild(pill);
    });
    bodyGroup.appendChild(bodyPills); customPanel.body.appendChild(bodyGroup);

    const faceGroup = document.createElement('div'); faceGroup.className = 'custom-group'; faceGroup.innerHTML = `<span class="custom-group__label">Model Wajah</span>`;
    const facePills = document.createElement('div'); facePills.className = 'option-pills';
    classesData.customization.faces.forEach(fc => {
      const pill = document.createElement('button'); pill.type = 'button'; pill.className = `pill-btn ${this.state.faceIndex === fc.id ? 'pill-btn--active' : ''}`; pill.textContent = fc.label;
      pill.addEventListener('click', () => { this.audio.playClick(); this.state.faceIndex = fc.id; this.emitCustomization(); this.render(); });
      facePills.appendChild(pill);
    });
    faceGroup.appendChild(facePills); customPanel.body.appendChild(faceGroup);

    const hairGroup = document.createElement('div'); hairGroup.className = 'custom-group'; hairGroup.innerHTML = `<span class="custom-group__label">Gaya Rambut</span>`;
    const hairPills = document.createElement('div'); hairPills.className = 'option-pills';
    classesData.customization.hairStyles.forEach(hs => {
      const pill = document.createElement('button'); pill.type = 'button'; pill.className = `pill-btn ${this.state.hairStyleIndex === hs.id ? 'pill-btn--active' : ''}`; pill.textContent = hs.label;
      pill.addEventListener('click', () => { this.audio.playClick(); this.state.hairStyleIndex = hs.id; this.emitCustomization(); this.render(); });
      hairPills.appendChild(pill);
    });
    hairGroup.appendChild(hairPills); customPanel.body.appendChild(hairGroup);

    const hairColorGroup = document.createElement('div'); hairColorGroup.className = 'custom-group'; hairColorGroup.innerHTML = `<span class="custom-group__label">Warna Rambut</span>`;
    const hairSwatches = document.createElement('div'); hairSwatches.className = 'swatch-row';
    classesData.customization.hairColors.forEach((hc, idx) => {
      const swatch = document.createElement('button'); swatch.type = 'button'; swatch.title = hc.name; swatch.className = `color-swatch ${this.state.hairColorIndex === idx ? 'color-swatch--active' : ''}`; swatch.style.backgroundColor = hc.hex;
      swatch.addEventListener('click', () => { this.audio.playClick(); this.state.hairColorIndex = idx; this.emitCustomization(); this.render(); });
      hairSwatches.appendChild(swatch);
    });
    hairColorGroup.appendChild(hairSwatches); customPanel.body.appendChild(hairColorGroup);

    const accentGroup = document.createElement('div'); accentGroup.className = 'custom-group'; accentGroup.innerHTML = `<span class="custom-group__label">Warna Aksen Pakaian</span>`;
    const accentSwatches = document.createElement('div'); accentSwatches.className = 'swatch-row';
    classesData.customization.accentColors.forEach((ac, idx) => {
      const swatch = document.createElement('button'); swatch.type = 'button'; swatch.title = ac.name; swatch.className = `color-swatch ${this.state.accentColorIndex === idx ? 'color-swatch--active' : ''}`; swatch.style.backgroundColor = ac.hex;
      swatch.addEventListener('click', () => { this.audio.playClick(); this.state.accentColorIndex = idx; this.emitCustomization(); this.render(); });
      accentSwatches.appendChild(swatch);
    });
    accentGroup.appendChild(accentSwatches); customPanel.body.appendChild(accentGroup);

    const markGroup = document.createElement('div'); markGroup.className = 'custom-group'; markGroup.innerHTML = `<span class="custom-group__label">Hiasan Wajah</span>`;
    const markPills = document.createElement('div'); markPills.className = 'option-pills';
    classesData.customization.faceMarkings.forEach(fm => {
      const pill = document.createElement('button'); pill.type = 'button'; pill.className = `pill-btn ${this.state.faceMarking === fm.id ? 'pill-btn--active' : ''}`; pill.textContent = fm.label;
      pill.addEventListener('click', () => { this.audio.playClick(); this.state.faceMarking = fm.id as FaceMarkingId; this.emitCustomization(); this.render(); });
      markPills.appendChild(pill);
    });
    markGroup.appendChild(markPills); customPanel.body.appendChild(markGroup);
    leftCol.appendChild(customPanel.element);

    const centerCol = document.createElement('div'); centerCol.className = 'char-screen__center';
    const rotateZone = document.createElement('div'); rotateZone.className = 'stage-rotate-zone';
    let isDragging = false; let lastX = 0;
    rotateZone.addEventListener('pointerdown', (e) => { isDragging = true; lastX = e.clientX; rotateZone.setPointerCapture(e.pointerId); });
    rotateZone.addEventListener('pointermove', (e) => { if (!isDragging) return; const deltaX = e.clientX - lastX; lastX = e.clientX; this.bus.emit('character:rotate-stage', { deltaX }); });
    rotateZone.addEventListener('pointerup', () => { isDragging = false; });
    const stageHint = document.createElement('div'); stageHint.className = 'stage-hint'; stageHint.textContent = 'Geser (Drag) karakter 3D untuk memutar';
    rotateZone.appendChild(stageHint); centerCol.appendChild(rotateZone);

    const rightCol = document.createElement('div'); rightCol.className = 'char-screen__right';
    const statPanel = createPanel({ title: `${currentClass.name} — "${currentClass.epithet}"` });
    const descP = document.createElement('p'); descP.style.fontSize = 'var(--font-size-sm)'; descP.style.marginBottom = '12px'; descP.textContent = currentClass.description;
    statPanel.body.appendChild(descP);

    const barsWrap = document.createElement('div'); barsWrap.style.display = 'flex'; barsWrap.style.flexDirection = 'column'; barsWrap.style.gap = '8px'; barsWrap.style.marginBottom = '12px';
    const hpBar = createStatusBar('HP (Level 1)', 'hp', currentClass.stats.hp, currentClass.stats.hp);
    const manaBar = createStatusBar('Mana', 'mana', currentClass.stats.mana, currentClass.stats.mana);
    const staminaBar = createStatusBar('Stamina', 'stamina', currentClass.stats.stamina, currentClass.stats.stamina);
    barsWrap.append(hpBar.element, manaBar.element, staminaBar.element); statPanel.body.appendChild(barsWrap);

    const metaGrid = document.createElement('div');
    metaGrid.style.display = 'grid'; metaGrid.style.gridTemplateColumns = 'repeat(3, 1fr)'; metaGrid.style.gap = '8px'; metaGrid.style.marginBottom = '12px';
    metaGrid.innerHTML = `<div style="padding:8px;border:1px solid var(--panel-border-subtle);border-radius:6px;text-align:center;"><div style="font-size:12px;color:var(--text-muted)">ATK Dasar</div><div class="title-font" style="color:var(--color-gold-light)">${currentClass.stats.atk}</div></div><div style="padding:8px;border:1px solid var(--panel-border-subtle);border-radius:6px;text-align:center;"><div style="font-size:12px;color:var(--text-muted)">DEF Dasar</div><div class="title-font" style="color:var(--color-crystal-blue)">${currentClass.stats.def}</div></div><div style="padding:8px;border:1px solid var(--panel-border-subtle);border-radius:6px;text-align:center;"><div style="font-size:12px;color:var(--text-muted)">Lari</div><div class="title-font" style="color:var(--color-bar-stamina)">${currentClass.stats.speed} m/s</div></div>`;
    statPanel.body.appendChild(metaGrid);

    const testGhostBtn = createButton({
      label: 'Simulasi Efek Ghost Bar', audio: this.audio,
      onClick: () => {
        hpBar.setValue(Math.round(currentClass.stats.hp * 0.45), currentClass.stats.hp);
        manaBar.setValue(Math.round(currentClass.stats.mana * 0.35), currentClass.stats.mana);
        staminaBar.setValue(Math.round(currentClass.stats.stamina * 0.5), currentClass.stats.stamina);
        window.setTimeout(() => {
          hpBar.setValue(currentClass.stats.hp, currentClass.stats.hp);
          manaBar.setValue(currentClass.stats.mana, currentClass.stats.mana);
          staminaBar.setValue(currentClass.stats.stamina, currentClass.stats.stamina);
        }, 1500);
      }
    });
    testGhostBtn.style.width = '100%'; testGhostBtn.style.fontSize = 'var(--font-size-sm)'; statPanel.body.appendChild(testGhostBtn);
    rightCol.appendChild(statPanel.element);

    const skillPanel = createPanel({ title: 'Serangan Dasar & 3 Skill Kelas' });
    const basicBox = document.createElement('div');
    basicBox.style.padding = '8px 10px'; basicBox.style.marginBottom = '10px'; basicBox.style.borderLeft = '3px solid var(--color-gold-light)'; basicBox.style.background = 'color-mix(in srgb, var(--color-night-black) 65%, transparent)';
    basicBox.innerHTML = `<div class="title-font" style="font-size:var(--font-size-sm);color:var(--color-gold-light)">${currentClass.basicAttack.name}</div><div style="font-size:13px;color:var(--text-primary)">Damage: ${currentClass.basicAttack.damageMultiplier} • Jangkauan: ${currentClass.basicAttack.range}</div>`;
    skillPanel.body.appendChild(basicBox);

    const skillList = document.createElement('div'); skillList.className = 'skill-list';
    currentClass.skills.forEach((sk, idx) => {
      const item = document.createElement('div'); item.className = 'skill-item'; item.tabIndex = 0;
      const iconEl = document.createElement('div'); iconEl.className = 'aether-icon'; iconEl.innerHTML = getSvgIcon(sk.icon as IconName);
      const textWrap = document.createElement('div');
      textWrap.innerHTML = `<div class="skill-item__name">[${idx + 1}] ${sk.name}</div><div class="skill-item__meta">${sk.damage} • CD: ${sk.cooldown} dtk ${sk.manaCost > 0 ? `• Mana: ${sk.manaCost}` : ''}</div>`;
      item.append(iconEl, textWrap);
      this.tooltip.bind(item, () => ({
        title: `${sk.name} (Rank 1/3)`, rarity: idx === 2 ? 'Epik' : idx === 1 ? 'Langka' : 'Biasa', description: sk.description,
        stats: [{ label: 'Damage', value: sk.damage, diff: 'up' }, { label: 'Cooldown', value: `${sk.cooldown} dtk`, diff: 'up' }]
      }));
      skillList.appendChild(item);
    });
    skillPanel.body.appendChild(skillList); rightCol.appendChild(skillPanel.element);

    const actionRow = document.createElement('div'); actionRow.style.display = 'flex'; actionRow.style.gap = '12px';
    const backBtn = createButton({ label: 'Kembali', audio: this.audio, onClick: () => this.bus.emit('ui:navigate', { screen: 'main-menu' }) }); backBtn.style.flex = '1';
    const confirmBtn = createButton({
      label: 'Pilih & Mulai', variant: 'primary', icon: 'sparkle', audio: this.audio,
      onClick: () => { this.audio.playHeroChime(); this.bus.emit('game:start-new', { ...this.state }); }
    });
    confirmBtn.style.flex = '1.6';
    actionRow.append(backBtn, confirmBtn); rightCol.appendChild(actionRow);

    this.container.append(leftCol, centerCol, rightCol);
  }
}