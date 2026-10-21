import { AudioManager } from '../../audio/AudioManager';
import { getSvgIcon, IconName } from './Icons';
export interface PanelOptions { title?: string; className?: string; }
export function createPanel(options: PanelOptions = {}): { element: HTMLElement; body: HTMLElement; } {
  const panel = document.createElement('section'); panel.className = `aether-panel ui-interactive ${options.className ?? ''}`.trim();
  ['tl', 'tr', 'bl', 'br'].forEach((pos) => {
    const corner = document.createElement('div'); corner.className = `aether-panel__corner aether-panel__corner--${pos}`; corner.innerHTML = getSvgIcon('cornerCrystal'); panel.appendChild(corner);
  });
  if (options.title) {
    const header = document.createElement('div'); header.className = 'aether-panel__header';
    const titleEl = document.createElement('h3'); titleEl.className = 'aether-panel__title'; titleEl.textContent = options.title;
    header.appendChild(titleEl); panel.appendChild(header);
  }
  const body = document.createElement('div'); body.className = 'aether-panel__body'; panel.appendChild(body);
  return { element: panel, body };
}
export interface ButtonOptions { label: string; variant?: 'default' | 'primary' | 'danger'; icon?: IconName; disabled?: boolean; onClick?: () => void; audio?: AudioManager; }
export function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button'); btn.type = 'button';
  btn.className = `aether-btn ui-interactive ${options.variant === 'primary' ? 'aether-btn--primary' : options.variant === 'danger' ? 'aether-btn--danger' : ''}`.trim();
  if (options.disabled) btn.disabled = true;
  if (options.icon) {
    const iconSpan = document.createElement('span'); iconSpan.className = 'aether-icon'; iconSpan.style.width = '24px'; iconSpan.style.height = '24px'; iconSpan.innerHTML = getSvgIcon(options.icon); btn.appendChild(iconSpan);
  }
  const textSpan = document.createElement('span'); textSpan.textContent = options.label; btn.appendChild(textSpan);
  btn.addEventListener('mouseenter', () => { if (!btn.disabled) options.audio?.playHover(); });
  btn.addEventListener('click', () => { if (!btn.disabled) { options.audio?.playClick(); options.onClick?.(); } });
  return btn;
}
export type BarType = 'hp' | 'mana' | 'stamina' | 'xp';
export interface StatusBarController { element: HTMLElement; setValue: (current: number, max: number) => void; }
export function createStatusBar(label: string, type: BarType, initialCurrent: number, initialMax: number): StatusBarController {
  const wrapper = document.createElement('div'); wrapper.className = 'aether-bar';
  const labelRow = document.createElement('div'); labelRow.className = 'aether-bar__label-row';
  const nameSpan = document.createElement('span'); nameSpan.textContent = label; labelRow.appendChild(nameSpan);
  const track = document.createElement('div'); track.className = 'aether-bar__track';
  const ghost = document.createElement('div'); ghost.className = 'aether-bar__ghost';
  const fill = document.createElement('div'); fill.className = `aether-bar__fill aether-bar__fill--${type}`;
  const valueText = document.createElement('div'); valueText.className = 'aether-bar__value';
  track.append(ghost, fill, valueText); wrapper.append(labelRow, track);
  let ghostTimeout: number | null = null;
  const setValue = (current: number, max: number) => {
    const clampedCurrent = Math.max(0, Math.min(max, current));
    const percent = max > 0 ? (clampedCurrent / max) * 100 : 0;
    fill.style.width = `${percent}%`; valueText.textContent = `${Math.round(clampedCurrent)} / ${Math.round(max)}`;
    if (ghostTimeout !== null) window.clearTimeout(ghostTimeout);
    ghostTimeout = window.setTimeout(() => { ghost.style.width = `${percent}%`; }, 180);
  };
  setValue(initialCurrent, initialMax);
  return { element: wrapper, setValue };
}
export interface TooltipPayload { title: string; rarity?: 'Biasa' | 'Langka' | 'Epik'; description: string; stats?: Array<{ label: string; value: string; diff?: 'up' | 'down' | 'neutral' }>; }
export class TooltipManager {
  private el: HTMLElement;
  constructor(root: HTMLElement) {
    this.el = document.createElement('div'); this.el.className = 'aether-tooltip aether-tooltip--hidden'; root.appendChild(this.el);
    window.addEventListener('mousemove', (e) => {
      if (this.el.classList.contains('aether-tooltip--hidden')) return;
      const x = Math.min(e.clientX + 16, window.innerWidth - this.el.offsetWidth - 16);
      const y = Math.min(e.clientY + 16, window.innerHeight - this.el.offsetHeight - 16);
      this.el.style.left = `${Math.max(12, x)}px`; this.el.style.top = `${Math.max(12, y)}px`;
    });
  }
  public bind(target: HTMLElement, payloadFn: () => TooltipPayload): void {
    target.addEventListener('mouseenter', () => this.show(payloadFn()));
    target.addEventListener('mouseleave', () => this.hide());
    target.addEventListener('focus', () => {
      const rect = target.getBoundingClientRect(); this.show(payloadFn());
      this.el.style.left = `${Math.min(window.innerWidth - 320, rect.right + 12)}px`; this.el.style.top = `${Math.max(12, rect.top)}px`;
    });
    target.addEventListener('blur', () => this.hide());
  }
  public show(data: TooltipPayload): void {
    const rarityClass = data.rarity === 'Epik' ? 'rarity--epic' : data.rarity === 'Langka' ? 'rarity--rare' : 'rarity--common';
    const statsHtml = data.stats ? `<div class="aether-tooltip__stats">${data.stats.map(s => `<div><strong>${s.label}:</strong> ${s.value} ${s.diff === 'up' ? '<span class="stat-diff--up">▲</span>' : s.diff === 'down' ? '<span class="stat-diff--down">▼</span>' : ''}</div>`).join('')}</div>` : '';
    this.el.innerHTML = `<div class="aether-tooltip__title ${rarityClass}">${data.title}</div>${data.rarity ? `<div class="aether-tooltip__rarity ${rarityClass}">Kelangkaan: ${data.rarity}</div>` : ''}<div class="aether-tooltip__desc">${data.description}</div>${statsHtml}`;
    this.el.classList.remove('aether-tooltip--hidden');
  }
  public hide(): void { this.el.classList.add('aether-tooltip--hidden'); }
}