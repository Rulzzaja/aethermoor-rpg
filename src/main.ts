import * as THREE from 'three';
import './styles/base.css';
import './styles/components.css';

import classesData from './data/classes.json';
import { AudioManager } from './audio/AudioManager';
import { CharacterCustomizationState, EventBus } from './core/EventBus';
import { MenuScene3D } from './core/MenuScene3D';
import { SettingsManager } from './core/Settings';
import { BuiltCharacterRig, CharacterBuilder } from './entities/CharacterBuilder';
import { getSvgIcon, IconName } from './ui/components/Icons';
import {
  createButton,
  createPanel,
  createStatusBar,
  StatusBarController
} from './ui/components/UIComponents';
import { MenuManager } from './ui/MenuManager';

type EnemyKind = 'dummy' | 'slime' | 'wolf' | 'goblin' | 'crystal' | 'skeleton' | 'boss';
type EnemyAttackState = 'none' | 'windup' | 'strike' | 'recover';
type RarityTier = 'Biasa' | 'Langka' | 'Epik' | 'Legendaris';

interface WeaponItem {
  id: string;
  name: string;
  rarity: RarityTier;
  baseAtk: number;
  upgradeLevel: number;
  colorHex: number;
  description: string;
}

interface VillageNPC {
  id: string;
  name: string;
  role: string;
  greeting: string;
  position: THREE.Vector3;
  rig: BuiltCharacterRig;
  marker: THREE.Mesh;
}

interface WolfParts {
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  jaw: THREE.Mesh;
  tail: THREE.Mesh;
  legs: THREE.Mesh[];
}

interface SlimeParts {
  body: THREE.Mesh;
  core: THREE.Mesh;
}

interface CombatTarget {
  id: string;
  name: string;
  kind: EnemyKind;
  zone: 'overworld' | 'dungeon';
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  xpReward: number;
  goldReward: number;
  position: THREE.Vector3;
  spawnOrigin: THREE.Vector3;
  arenaRadius: number;
  mesh: THREE.Group;
  rig?: BuiltCharacterRig;
  wolfParts?: WolfParts;
  slimeParts?: SlimeParts;
  telegraphRing: THREE.Mesh;
  hpBarWrap: HTMLElement;
  hpBarFill: HTMLElement;
  isDead: boolean;
  deathAnimTimer: number;
  hitFlashTimer: number;
  attackCooldown: number;
  attackState: EnemyAttackState;
  attackAnimTimer: number;
  hasDealtStrikeDamage: boolean;
  strikeDir: THREE.Vector3;
  isMoving: boolean;
  patrolAngle: number;
}

interface ActiveProjectile {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  multiplier: number;
  life: number;
}

interface AnimatedVFX {
  group: THREE.Group;
  age: number;
  duration: number;
  onUpdate: (age: number, dt: number, progress: number) => void;
}

const GACHA_WEAPON_POOL: Omit<WeaponItem, 'upgradeLevel'>[] = [
  {
    id: 'iron_blade',
    name: 'Pedang Besi Embermere',
    rarity: 'Biasa',
    baseAtk: 10,
    colorHex: 0xd9d9d9,
    description: 'Senjata standar para penjaga muda Desa Embermere.'
  },
  {
    id: 'hunter_fang',
    name: 'Belati Taring Serigala',
    rarity: 'Biasa',
    baseAtk: 12,
    colorHex: 0xa8b5c2,
    description: 'Ditempa dari taring serigala hutan yang tajam dan ringan.'
  },
  {
    id: 'emerald_edge',
    name: 'Bilah Zamrud Hutan',
    rarity: 'Langka',
    baseAtk: 18,
    colorHex: 0x4fa66a,
    description: 'Memancarkan energi kehidupan dari Hutan Berkabut.'
  },
  {
    id: 'azure_crystal',
    name: 'Pedang Kristal Aether',
    rarity: 'Langka',
    baseAtk: 21,
    colorHex: 0x5fb7e5,
    description: 'Senjata kristal biru murni dengan ketajaman es abadi.'
  },
  {
    id: 'crimson_reaver',
    name: 'Pembelah Bara Merah',
    rarity: 'Langka',
    baseAtk: 24,
    colorHex: 0xd64545,
    description: 'Menyimpan panas api bengkel Brann di setiap tebasannya.'
  },
  {
    id: 'void_render',
    name: 'Sabit Bayangan Ungu',
    rarity: 'Epik',
    baseAtk: 34,
    colorHex: 0xb66bff,
    description: 'Senjata pusaka yang mampu membelah perisai bayangan.'
  },
  {
    id: 'thunder_archon',
    name: 'Tombak Petir Langit',
    rarity: 'Epik',
    baseAtk: 38,
    colorHex: 0x4da3ff,
    description: 'Bergetar dengan kilatan petir biru setiap kali diayunkan.'
  },
  {
    id: 'solaris_excalibur',
    name: 'Excalibur Cahaya Surya',
    rarity: 'Legendaris',
    baseAtk: 58,
    colorHex: 0xf2c14e,
    description: 'Pusaka tertinggi Raja Aethermoor yang memancarkan cahaya emas suci.'
  },
  {
    id: 'astralis_monarch',
    name: 'Mahkota Bintang Abadi',
    rarity: 'Legendaris',
    baseAtk: 66,
    colorHex: 0xffdf73,
    description: 'Senjata kosmik legendaris dengan kekuatan penghancur tingkat dewa.'
  }
];

function lerpAngle(current: number, target: number, t: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, t);
}

function getRarityColor(rarity: RarityTier): string {
  if (rarity === 'Legendaris') return '#F2C14E';
  if (rarity === 'Epik') return '#B66BFF';
  if (rarity === 'Langka') return '#4DA3FF';
  return '#D9D9D9';
}

class ProceduralTextures {
  public static createGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#264a3a';
    ctx.fillRect(0, 0, 512, 512);

    const colors = ['#2f5d48', '#1e3c2f', '#3b6e52', '#477a58', '#254736'];
    for (let i = 0; i < 4800; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = 2 + Math.random() * 6;
      const h = 4 + Math.random() * 10;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y, w, h);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(65, 65);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public static createCobblestoneTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2a2d36';
    ctx.fillRect(0, 0, 512, 512);

    const rows = 8;
    const cols = 8;
    const cellW = 512 / cols;
    const cellH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offsetX = r % 2 === 0 ? 0 : cellW * 0.5;
        const x = ((c * cellW + offsetX) % 512) + 3;
        const y = r * cellH + 3;
        const w = cellW - 6;
        const h = cellH - 6;

        const shade = 82 + Math.floor(Math.random() * 28);
        ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 12})`;
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public static createRoofTileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2c223d';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 256; x += 32) {
        ctx.fillStyle = (x + y) % 64 === 0 ? '#392b4f' : '#312545';
        ctx.fillRect(x + 2, y + 2, 28, 28);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y + 28, 32, 4);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public static createWoodPlankTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#543824';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? '#5e402a' : '#4a311f';
      ctx.fillRect(0, y, 256, 30);
      ctx.fillStyle = '#2b1b10';
      ctx.fillRect(0, y + 30, 256, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}

class EmbermereGameSession {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private colliders: THREE.Box3[] = [];
  private npcs: VillageNPC[] = [];
  private enemies: CombatTarget[] = [];
  private projectiles: ActiveProjectile[] = [];
  private vfxList: AnimatedVFX[] = [];

  private fountainCrystal!: THREE.Mesh;
  private fountainRing!: THREE.Mesh;
  private windmillBlades: THREE.Group[] = [];
  private riverMesh!: THREE.Mesh;
  private fireflies!: THREE.Points;
  private grassInstanced!: THREE.InstancedMesh;
  private lockReticle: THREE.Mesh;
  private questBeacon!: THREE.Mesh;

  // Perisai Orbit Aktif saat Buff Skill 3 Ksatria
  private guardianOrbitGroup: THREE.Group;

  // Koordinat Penting di Peta Luas
  private campfirePos = new THREE.Vector3(9.5, 0, 8.5);
  private overworldPortalPos = new THREE.Vector3(0, 0, 204);
  private dungeonExitPortalPos = new THREE.Vector3(300, 0, 258);
  private overworldPortalRing!: THREE.Mesh;
  private dungeonExitRing!: THREE.Mesh;
  private inDungeon = false;

  // Karakter Pemain & Locomotion
  private playerGroup: THREE.Group;
  private playerRig: BuiltCharacterRig;
  private playerWeaponVisualMesh: THREE.Mesh | null = null;
  private playerPos = new THREE.Vector3(0, 0, 15);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerRotY = Math.PI;
  private velocityY = 0;
  private isGrounded = true;
  private baseSpeed = 6.2;
  private walkCycleTime = 0;
  private moveBlend = 0;
  private turnLean = 0;

  // Status Gerakan & Animasi Serang Pemain
  private isRolling = false;
  private rollTimer = 0;
  private invulnerableTimer = 0;
  private attackAnimTimer = 0;
  private attackAnimDuration = 0.38;
  private activeAttackCombo = 0;
  private isBlocking = false;
  private chargeTime = 0;

  // Kamera Orbit Third-Person
  private camYaw = 0;
  private camPitch = 0.26;
  private camShake = 0;
  private camSmoothPivot = new THREE.Vector3(0, 1.5, 15);
  private camCurrentDist = 5.4;

  // Statistik RPG, Inventaris Senjata & Gacha
  private level = 1;
  private xp = 0;
  private xpToNext = 100;
  private gold = 180;
  private potions = 3;

  private baseCharAtk = 14;
  private atk = 24;
  private def = 10;
  private hp = 140;
  private maxHp = 140;
  private mana = 30;
  private maxMana = 30;
  private stamina = 100;
  private maxStamina = 100;
  private defBuffTimer = 0;

  private ownedWeapons: WeaponItem[] = [];
  private equippedWeapon!: WeaponItem;

  // Progres Quest Utama
  private questStage = 0;
  private riverKills = 0;
  private riverKillsGoal = 3;
  private forestKills = 0;
  private forestKillsGoal = 5;
  private templeBossDefeated = false;
  private dungeonBossDefeated = false;

  // Timer Combat
  private comboStep = 0;
  private comboResetTimer = 0;
  private attackCooldown = 0;
  private staminaRegenDelay = 0;
  private skillCooldowns = [0, 0, 0];
  private potionCooldown = 0;
  private lockedTarget: CombatTarget | null = null;

  // Input & Status Modal
  private keys = new Map<string, boolean>();
  private rightMouseDown = false;
  private isPaused = false;
  private isModalOpen = false;

  // Elemen HUD & UI
  private hudRoot: HTMLElement;
  private worldLabelsRoot: HTMLElement;
  private hpBar!: StatusBarController;
  private manaBar!: StatusBarController;
  private staminaBar!: StatusBarController;
  private xpBar!: StatusBarController;
  private levelBadgeEl!: HTMLElement;
  private goldTextEl!: HTMLElement;
  private weaponTextEl!: HTMLElement;
  private potionCountEl!: HTMLElement;
  private zoneNameEl!: HTMLElement;
  private questTitleEl!: HTMLElement;
  private questBodyEl!: HTMLElement;
  private skillCdOverlay: HTMLElement[] = [];
  private potionCdOverlay!: HTMLElement;
  private promptEl!: HTMLElement;
  private targetBannerEl!: HTMLElement;
  private compassNeedleEl!: HTMLElement;
  private activeModalEl: HTMLElement | null = null;
  private pauseModalEl: HTMLElement | null = null;

  constructor(
    private container: HTMLElement,
    private profile: CharacterCustomizationState,
    private bus: EventBus,
    private audio: AudioManager,
    private menuManager: MenuManager
  ) {
    const cls = classesData.classes.find((c) => c.id === profile.classId) ?? classesData.classes[0];
    this.maxHp = cls.stats.hp;
    this.hp = this.maxHp;
    this.maxMana = cls.stats.mana;
    this.mana = this.maxMana;
    this.maxStamina = cls.stats.stamina;
    this.stamina = this.maxStamina;
    this.baseCharAtk = cls.stats.atk;
    this.def = cls.stats.def;
    this.baseSpeed = cls.stats.speed + 0.6;

    const starterWeapon: WeaponItem = {
      ...GACHA_WEAPON_POOL[0],
      upgradeLevel: 0
    };
    this.ownedWeapons.push(starterWeapon);
    this.equippedWeapon = starterWeapon;
    this.recalculateStats();

    // 1. Inisialisasi Scene, Camera, dan Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e293b);
    this.scene.fog = new THREE.FogExp2(0x28384d, 0.0028);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      550
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.worldLabelsRoot = document.createElement('div');
    this.worldLabelsRoot.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:25;overflow:hidden;';
    document.body.appendChild(this.worldLabelsRoot);

    // 2. Bangun Langit, Dunia Overworld Ekstra Luas (5 Wilayah), & Dungeon
    this.buildSkyAndLighting();
    this.buildMassiveOpenWorld();
    this.buildUndergroundDungeonZone();

    // 3. Rakit Karakter Pemain + Orbit Perisai Pelindung
    this.playerGroup = new THREE.Group();
    this.playerRig = CharacterBuilder.buildCharacter(profile.classId, profile);
    this.attachDynamicWeaponMesh();
    this.playerGroup.add(this.playerRig.root);

    this.guardianOrbitGroup = new THREE.Group();
    this.guardianOrbitGroup.position.y = 1.15;
    this.guardianOrbitGroup.visible = false;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const shieldShard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({
          color: 0xf2c14e,
          emissive: 0xf2c14e,
          emissiveIntensity: 2.2,
          transparent: true,
          opacity: 0.85
        })
      );
      shieldShard.scale.set(1.2, 1.6, 0.35);
      shieldShard.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35);
      shieldShard.rotation.y = -a + Math.PI / 2;
      this.guardianOrbitGroup.add(shieldShard);
    }
    this.playerGroup.add(this.guardianOrbitGroup);
    this.scene.add(this.playerGroup);

    // Indikator Lock-on
    this.lockReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.85, 28),
      new THREE.MeshBasicMaterial({ color: 0xf2c14e, side: THREE.DoubleSide })
    );
    this.lockReticle.rotation.x = -Math.PI / 2;
    this.lockReticle.visible = false;
    this.scene.add(this.lockReticle);

    // Beacon Cahaya Penunjuk Quest
    this.questBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.65, 18, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xf2c14e,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.questBeacon.position.set(0, 9, 7);
    this.scene.add(this.questBeacon);

    // 4. Bangun HUD RPG
    this.hudRoot = document.createElement('div');
    this.buildHUD();
    this.refreshQuestUI();

    // 5. Pasang Input
    this.bindInputs();
  }

  private getWeaponTotalAtk(w: WeaponItem): number {
    return w.baseAtk + w.upgradeLevel * 5;
  }

  private recalculateStats(): void {
    this.atk = this.baseCharAtk + (this.level - 1) * 3 + this.getWeaponTotalAtk(this.equippedWeapon);
    if (this.playerWeaponVisualMesh) {
      const mat = this.playerWeaponVisualMesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(this.equippedWeapon.colorHex);
      mat.emissive.setHex(this.equippedWeapon.colorHex);
      mat.emissiveIntensity =
        this.equippedWeapon.rarity === 'Legendaris'
          ? 2.6
          : this.equippedWeapon.rarity === 'Epik'
          ? 2.0
          : 1.2;
      const scaleBoost = 1 + Math.min(0.45, this.equippedWeapon.upgradeLevel * 0.05);
      this.playerWeaponVisualMesh.scale.set(scaleBoost, scaleBoost, scaleBoost);
    }
  }

  private attachDynamicWeaponMesh(): void {
    const rightHand = this.playerRig.bones['RightHand'];
    if (!rightHand) return;
    const auraGeo = new THREE.BoxGeometry(0.09, 0.95, 0.04);
    const auraMat = new THREE.MeshStandardMaterial({
      color: this.equippedWeapon.colorHex,
      emissive: this.equippedWeapon.colorHex,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.85
    });
    this.playerWeaponVisualMesh = new THREE.Mesh(auraGeo, auraMat);
    this.playerWeaponVisualMesh.position.set(0, 0.55, 0);
    this.playerWeaponVisualMesh.rotation.x = Math.PI / 2.2;
    rightHand.add(this.playerWeaponVisualMesh);
  }

  private buildSkyAndLighting(): void {
    const skyGeo = new THREE.SphereGeometry(480, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x162238) },
        midColor: { value: new THREE.Color(0x3b5878) },
        bottomColor: { value: new THREE.Color(0xd99b66) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 col = mix(bottomColor, midColor, smoothstep(-0.05, 0.25, h));
          col = mix(col, topColor, smoothstep(0.25, 0.75, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    const hemi = new THREE.HemisphereLight(0xffdfa8, 0x1e332a, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffdf9e, 2.2);
    sun.position.set(80, 110, -40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 140;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x5fb7e5, 0.55);
    fillLight.position.set(-60, 40, 60);
    this.scene.add(fillLight);
  }

  /**
   * Membangun Dunia Terbuka Ekstra Luas (440m x 420m) dengan 5 Wilayah & 3 Jembatan Sungai
   */
  private buildMassiveOpenWorld(): void {
    const grassTex = ProceduralTextures.createGrassTexture();
    const cobblePlazaTex = ProceduralTextures.createCobblestoneTexture(12, 12);
    const cobbleRoadTex = ProceduralTextures.createCobblestoneTexture(3, 36);
    const roofTex = ProceduralTextures.createRoofTileTexture();
    const woodTex = ProceduralTextures.createWoodPlankTexture();

    // 1. Daratan Utama Super Luas (460m x 440m)
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.92,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 440), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 80);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Sungai Panjang Melintasi Peta Barat ke Timur (Z = 41) + 3 Jembatan Penyeberangan
    const riverValley = new THREE.Mesh(
      new THREE.BoxGeometry(460, 0.4, 10.2),
      new THREE.MeshStandardMaterial({ color: 0x3b424f, roughness: 0.9 })
    );
    riverValley.position.set(0, -0.15, 41);
    this.scene.add(riverValley);

    this.riverMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 9.2, 64, 8),
      new THREE.MeshStandardMaterial({
        color: 0x3898d4,
        emissive: 0x124266,
        emissiveIntensity: 0.4,
        roughness: 0.12,
        metalness: 0.45
      })
    );
    this.riverMesh.rotation.x = -Math.PI / 2;
    this.riverMesh.position.set(0, 0.08, 41);
    this.scene.add(this.riverMesh);

    // 3 Jembatan Penyeberangan Sungai: Tengah (X=0), Barat (X=-95), Timur (X=+95)
    this.buildArchedBridge(0, 41, woodTex, cobblePlazaTex);
    this.buildArchedBridge(-95, 41, woodTex, cobblePlazaTex);
    this.buildArchedBridge(95, 41, woodTex, cobblePlazaTex);

    // Kolisi Sungai (Menyisakan celah terbuka di ke-3 jembatan: X=0, X=-95, X=+95)
    this.addCollider(-155, 1.5, 41, 108, 3, 7.8);
    this.addCollider(-47.5, 1.5, 41, 82, 3, 7.8);
    this.addCollider(47.5, 1.5, 41, 82, 3, 7.8);
    this.addCollider(155, 1.5, 41, 108, 3, 7.8);

    // 3. Alun-alun Batu & Jaringan Jalan Raya (Poros Utara-Selatan & Poros Barat-Timur)
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(21, 21.5, 0.14, 48),
      new THREE.MeshStandardMaterial({ map: cobblePlazaTex, roughness: 0.8 })
    );
    plaza.position.set(0, 0.07, 0);
    plaza.receiveShadow = true;

    const mainRoadNS = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 0.1, 245),
      new THREE.MeshStandardMaterial({ map: cobbleRoadTex, roughness: 0.85 })
    );
    mainRoadNS.position.set(0, 0.05, 85);
    mainRoadNS.receiveShadow = true;

    const crossRoadWE = new THREE.Mesh(
      new THREE.BoxGeometry(260, 0.09, 6.4),
      new THREE.MeshStandardMaterial({ map: cobbleRoadTex, roughness: 0.85 })
    );
    crossRoadWE.position.set(0, 0.04, 92);
    crossRoadWE.receiveShadow = true;

    const villageRoadWE = new THREE.Mesh(
      new THREE.BoxGeometry(210, 0.09, 6.0),
      new THREE.MeshStandardMaterial({ map: cobbleRoadTex, roughness: 0.85 })
    );
    villageRoadWE.position.set(0, 0.04, 0);
    villageRoadWE.receiveShadow = true;

    this.scene.add(plaza, mainRoadNS, crossRoadWE, villageRoadWE);

    // 4. Air Mancur Agung di Pusat Desa Embermere
    this.buildGrandFountain();

    // 5. 12 Rumah Medieval & Kincir Angin di Desa Embermere yang Lebih Luas
    const houseConfigs: Array<[number, number, number]> = [
      [-26, -16, 0.35],
      [26, -16, -0.35],
      [-32, 6, Math.PI / 2],
      [32, 6, -Math.PI / 2],
      [-25, 24, Math.PI - 0.35],
      [25, 24, -Math.PI + 0.35],
      [-12, -34, 0],
      [12, -34, 0],
      [-52, -12, 0.15],
      [52, -12, -0.15],
      [-52, 14, Math.PI - 0.15],
      [52, 14, -Math.PI + 0.15]
    ];
    houseConfigs.forEach(([x, z, rot]) =>
      this.buildMedievalGableHouse(x, z, rot, roofTex, woodTex)
    );

    // 2 Kincir Angin Raksasa (Windmill) di Bukit Utara Desa
    this.buildWindmill(-38, -42, woodTex, roofTex);
    this.buildWindmill(38, -42, woodTex, roofTex);

    // 6. Bengkel Brann, Toko Lysa, Altar Gacha Celeste, & Api Unggun
    this.buildBlacksmithWorkshop(-16, -7, woodTex);
    this.buildAlchemistShop(16, -7, woodTex);
    this.buildGachaStarShrine(15, 9);
    this.buildBonfireShrine(this.campfirePos.x, this.campfirePos.z);

    // 7. Gerbang Benteng Batu Desa Embermere
    this.buildCastleGatehouse(0, 34.5, cobblePlazaTex);

    // 8. WILAYAH BARAT (X: -65 s/d -165, Z: 55 s/d 150) — LEMBAH RAWA KRISTAL AETHER
    this.buildWesternCrystalBiome(cobblePlazaTex);

    // 9. WILAYAH TIMUR (X: +65 s/d +165, Z: 55 s/d 150) — BENTENG PADANG TANDUS GOBLIN
    this.buildEasternStrongholdBiome(woodTex);

    // 10. Pohon Rindang Organik Menyebar di Seluruh Dunia
    const treeCoords: Array<[number, number, number]> = [
      [-16, 52, 1.15],
      [16, 52, 1.2],
      [-28, 62, 1.4],
      [28, 62, 1.35],
      [-15, 74, 1.1],
      [15, 74, 1.15],
      [-34, 82, 1.5],
      [34, 82, 1.4],
      [-20, 104, 1.25],
      [20, 104, 1.2],
      [-38, 118, 1.45],
      [38, 118, 1.45],
      [-18, 138, 1.2],
      [18, 138, 1.2],
      [-36, 155, 1.35],
      [36, 155, 1.35],
      [-72, 22, 1.3],
      [72, 22, 1.3],
      [-75, -18, 1.25],
      [75, -18, 1.25],
      [-65, 62, 1.3],
      [-115, 58, 1.4],
      [-135, 125, 1.45],
      [65, 62, 1.3],
      [115, 58, 1.4],
      [135, 125, 1.45]
    ];
    treeCoords.forEach(([tx, tz, sc]) => this.buildOrganicCanopyTree(tx, tz, sc));

    // Pegunungan Pembatas Tepi Luar Peta Raksasa
    const borderCliffs: Array<[number, number, number]> = [
      [-195, -20, 22],
      [-195, 50, 24],
      [-195, 120, 24],
      [-195, 190, 22],
      [195, -20, 22],
      [195, 50, 24],
      [195, 120, 24],
      [195, 190, 22],
      [-90, -78, 22],
      [0, -82, 26],
      [90, -78, 22],
      [-95, 245, 24],
      [0, 252, 28],
      [95, 245, 24]
    ];
    borderCliffs.forEach(([cx, cz, rad]) => this.buildRockOutcrop(cx, cz, rad));

    // 11. WILAYAH UJUNG SELATAN (Z = 188) — KOMPLEKS KUIL AGUNG & PORTAL DUNGEON (Z = 204)
    this.buildAncientTempleArena(0, 188, cobblePlazaTex);
    this.overworldPortalRing = this.buildDungeonPortalGate(
      this.overworldPortalPos.x,
      this.overworldPortalPos.z,
      0xb66bff
    );

    // Lentera Penunjuk Sepanjang Jalan Utama & Persimpangan
    const lanterns: Array<[number, number]> = [
      [-5.2, 12],
      [5.2, 12],
      [-5.2, 24],
      [5.2, 24],
      [-5.2, 50],
      [5.2, 50],
      [-5.2, 85],
      [5.2, 85],
      [-5.2, 125],
      [5.2, 125],
      [-5.2, 162],
      [5.2, 162],
      [-45, 92],
      [45, 92],
      [-85, 92],
      [85, 92]
    ];
    lanterns.forEach(([lx, lz]) => this.buildHangingLanternPost(lx, lz));

    this.buildInstancedGrassField();
    this.buildFireflyParticles();
    this.spawnVillageNPCs();
  }

  private buildWindmill(
    x: number,
    z: number,
    woodTex: THREE.CanvasTexture,
    roofTex: THREE.CanvasTexture
  ): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 3.6, 10.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.8 })
    );
    tower.position.y = 5.25;
    tower.castShadow = true;

    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(2.9, 3.2, 16),
      new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.65 })
    );
    cap.position.y = 11.8;

    const rotorHub = new THREE.Group();
    rotorHub.position.set(0, 8.8, 2.75);
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xf5ecd7,
      roughness: 0.7,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 4; i++) {
      const armGroup = new THREE.Group();
      armGroup.rotation.z = (i / 4) * Math.PI * 2;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.2, 0.18), woodMat);
      beam.position.y = 3.1;
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 5.0), sailMat);
      sail.position.set(0.45, 3.3, 0.05);
      armGroup.add(beam, sail);
      rotorHub.add(armGroup);
    }

    this.windmillBlades.push(rotorHub);
    g.add(tower, cap, rotorHub);
    this.scene.add(g);
    this.addCollider(x, 5, z, 6.8, 10, 6.8);
  }

  /**
   * Wilayah Barat: Lembah Rawa Kristal Aether (X = -110, Z = 95)
   */
  private buildWesternCrystalBiome(stoneTex: THREE.CanvasTexture): void {
    const g = new THREE.Group();
    g.position.set(-110, 0, 95);

    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 25, 0.12, 36),
      new THREE.MeshStandardMaterial({
        color: 0x26688a,
        emissive: 0x154563,
        emissiveIntensity: 0.5,
        roughness: 0.15
      })
    );
    pool.position.y = 0.04;
    g.add(pool);

    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x5fb7e5,
      emissive: 0x4da3ff,
      emissiveIntensity: 2.0,
      roughness: 0.15
    });
    const purpleMat = new THREE.MeshStandardMaterial({
      color: 0xb66bff,
      emissive: 0xb66bff,
      emissiveIntensity: 2.0,
      roughness: 0.15
    });

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 14 + (i % 3) * 5;
      const spire = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.4, 0),
        i % 2 === 0 ? crystalMat : purpleMat
      );
      spire.scale.set(0.8, 2.8 + (i % 3) * 0.6, 0.8);
      spire.position.set(Math.cos(a) * r, 2.2, Math.sin(a) * r);
      spire.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.22;
      spire.castShadow = true;
      g.add(spire);
      this.addCollider(-110 + Math.cos(a) * r, 2.5, 95 + Math.sin(a) * r, 2.2, 5, 2.2);
    }

    const ruinArch = new THREE.Mesh(
      new THREE.TorusGeometry(6.5, 0.65, 10, 24, Math.PI),
      new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.8 })
    );
    ruinArch.position.y = 0.2;
    g.add(ruinArch);

    const biomeLight = new THREE.PointLight(0x5fb7e5, 6, 35);
    biomeLight.position.set(0, 6, 0);
    g.add(biomeLight);

    this.scene.add(g);
  }

  /**
   * Wilayah Timur: Benteng Padang Tandus Goblin (X = +110, Z = 95)
   */
  private buildEasternStrongholdBiome(woodTex: THREE.CanvasTexture): void {
    const g = new THREE.Group();
    g.position.set(110, 0, 95);

    const dirtCircle = new THREE.Mesh(
      new THREE.CylinderGeometry(25, 26, 0.1, 36),
      new THREE.MeshStandardMaterial({ color: 0x4f3b2b, roughness: 0.95 })
    );
    dirtCircle.position.y = 0.04;
    g.add(dirtCircle);

    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });

    // 4 Menara Pantau Kayu & Pagar Benteng Goblin
    [
      [-14, -14],
      [14, -14],
      [-14, 14],
      [14, 14]
    ].forEach(([tx, tz]) => {
      const watchtower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6.8, 3.2), woodMat);
      watchtower.position.set(tx, 3.4, tz);
      watchtower.castShadow = true;
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.8, 2.4, 4),
        new THREE.MeshStandardMaterial({ color: 0x7a2828, roughness: 0.8 })
      );
      roof.position.set(tx, 7.8, tz);
      roof.rotation.y = Math.PI / 4;
      g.add(watchtower, roof);
      this.addCollider(110 + tx, 3.5, 95 + tz, 3.4, 7, 3.4);
    });

    const warFire = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.2, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf2c14e,
        emissive: 0xd64545,
        emissiveIntensity: 2.6
      })
    );
    warFire.position.y = 1.1;
    const fireLight = new THREE.PointLight(0xff5522, 6, 32);
    fireLight.position.set(0, 3.5, 0);
    g.add(warFire, fireLight);

    this.scene.add(g);
  }

  private buildUndergroundDungeonZone(): void {
    const cobbleTex = ProceduralTextures.createCobblestoneTexture(16, 24);
    const dungeonGroup = new THREE.Group();
    dungeonGroup.position.set(300, 0, 300);

    const floorMat = new THREE.MeshStandardMaterial({
      map: cobbleTex,
      color: 0x3b384a,
      roughness: 0.75
    });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1926, roughness: 0.9 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xb66bff,
      emissive: 0xb66bff,
      emissiveIntensity: 2.2
    });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(48, 0.5, 120), floorMat);
    floor.position.set(0, -0.25, 0);
    floor.receiveShadow = true;
    dungeonGroup.add(floor);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(50, 1.5, 120), wallMat);
    ceiling.position.set(0, 14.5, 0);
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(2, 15, 120), wallMat);
    wallL.position.set(-24, 7.2, 0);
    const wallR = wallL.clone();
    wallR.position.x = 24;
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(50, 15, 2), wallMat);
    wallBack.position.set(0, 7.2, -58);
    const wallFront = wallBack.clone();
    wallFront.position.z = 58;
    dungeonGroup.add(ceiling, wallL, wallR, wallBack, wallFront);

    for (let z = -42; z <= 42; z += 14) {
      [-15, 15].forEach((px) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 14, 12), wallMat);
        pillar.position.set(px, 7, z);
        pillar.castShadow = true;

        const torchShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystalMat);
        torchShard.position.set(px > 0 ? px - 1.4 : px + 1.4, 3.8, z);
        dungeonGroup.add(pillar, torchShard);
        this.addCollider(300 + px, 4, 300 + z, 2.5, 8, 2.5);
      });
    }

    const bossAltar = new THREE.Mesh(
      new THREE.CylinderGeometry(13.5, 14.5, 0.35, 36),
      new THREE.MeshStandardMaterial({ color: 0x2a1f3d, roughness: 0.6 })
    );
    bossAltar.position.set(0, 0.18, 32);
    const bossRune = new THREE.Mesh(
      new THREE.RingGeometry(11.8, 12.4, 36),
      new THREE.MeshBasicMaterial({ color: 0xd64545, side: THREE.DoubleSide })
    );
    bossRune.rotation.x = -Math.PI / 2;
    bossRune.position.set(0, 0.38, 32);

    const dungeonLight1 = new THREE.PointLight(0xb66bff, 6, 45);
    dungeonLight1.position.set(0, 8, -15);
    const dungeonLight2 = new THREE.PointLight(0xd64545, 8, 50);
    dungeonLight2.position.set(0, 9, 32);

    dungeonGroup.add(bossAltar, bossRune, dungeonLight1, dungeonLight2);
    this.scene.add(dungeonGroup);

    this.dungeonExitRing = this.buildDungeonPortalGate(
      this.dungeonExitPortalPos.x,
      this.dungeonExitPortalPos.z,
      0x5fb7e5
    );

    this.spawnAllWorldTargets();
  }

  private buildGachaStarShrine(x: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.4, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.4 })
    );
    base.position.y = 0.28;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.14, 12, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.7, roughness: 0.25 })
    );
    arch.position.y = 0.5;
    const starCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf2c14e,
        emissive: 0xf2c14e,
        emissiveIntensity: 2.4
      })
    );
    starCore.position.y = 1.9;
    g.add(base, arch, starCore);
    this.scene.add(g);
    this.addCollider(x, 1.5, z, 3.2, 3, 3.2);
  }

  private buildDungeonPortalGate(x: number, z: number, glowColor: number): THREE.Mesh {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2d2a38, roughness: 0.8 });
    const postL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.8, 1.1), stoneMat);
    postL.position.set(-2.3, 2.4, 0);
    postL.castShadow = true;
    const postR = postL.clone();
    postR.position.x = 2.3;
    const topArch = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.0, 1.3), stoneMat);
    topArch.position.set(0, 5.0, 0);

    const vortexRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.16, 12, 32),
      new THREE.MeshStandardMaterial({
        color: glowColor,
        emissive: glowColor,
        emissiveIntensity: 2.5
      })
    );
    vortexRing.position.set(0, 2.4, 0);

    const portalCore = new THREE.Mesh(
      new THREE.CircleGeometry(1.68, 28),
      new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide
      })
    );
    portalCore.position.set(0, 2.4, 0);

    const portalLight = new THREE.PointLight(glowColor, 5, 16);
    portalLight.position.set(0, 2.5, 0);

    g.add(postL, postR, topArch, vortexRing, portalCore, portalLight);
    this.scene.add(g);
    return vortexRing;
  }

  private buildGrandFountain(): void {
    const fountain = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c5, roughness: 0.45 });

    const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 0.95, 32), stoneMat);
    outerWall.position.y = 0.48;
    outerWall.castShadow = true;
    outerWall.receiveShadow = true;

    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 3.8, 0.82, 32),
      new THREE.MeshStandardMaterial({
        color: 0x4db8ff,
        emissive: 0x1b6ca8,
        emissiveIntensity: 0.5,
        roughness: 0.1
      })
    );
    waterPool.position.y = 0.5;

    const midBowl = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.4, 0.55, 24), stoneMat);
    midBowl.position.y = 1.65;
    midBowl.castShadow = true;

    const centerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.95, 2.7, 16), stoneMat);
    centerPillar.position.y = 1.35;
    centerPillar.castShadow = true;

    this.fountainCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.8, 0),
      new THREE.MeshStandardMaterial({
        color: 0x5fb7e5,
        emissive: 0x5fb7e5,
        emissiveIntensity: 2.2,
        roughness: 0.1
      })
    );
    this.fountainCrystal.position.y = 3.5;

    this.fountainRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.055, 12, 36),
      new THREE.MeshStandardMaterial({
        color: 0xf2c14e,
        emissive: 0xf2c14e,
        emissiveIntensity: 1.4
      })
    );
    this.fountainRing.position.y = 3.5;

    const crystalLight = new THREE.PointLight(0x5fb7e5, 3.5, 14);
    crystalLight.position.y = 3.5;

    fountain.add(
      outerWall,
      waterPool,
      midBowl,
      centerPillar,
      this.fountainCrystal,
      this.fountainRing,
      crystalLight
    );
    this.scene.add(fountain);
    this.addCollider(0, 1.5, 0, 8.2, 3, 8.2);
  }

  private buildMedievalGableHouse(
    x: number,
    z: number,
    rotY: number,
    roofTex: THREE.CanvasTexture,
    woodTex: THREE.CanvasTexture
  ): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x686e7a, roughness: 0.88 });
    const plasterMat = new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.78 });
    const timberMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.65 });

    const floor1 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.4, 6.2), stoneMat);
    floor1.position.y = 1.2;
    floor1.castShadow = true;
    floor1.receiveShadow = true;
    g.add(floor1);

    const floor2 = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.4, 6.6), plasterMat);
    floor2.position.y = 3.6;
    floor2.castShadow = true;
    floor2.receiveShadow = true;
    g.add(floor2);

    [-3.75, 0, 3.75].forEach((bx) => {
      [-3.25, 3.25].forEach((bz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.5, 0.26), timberMat);
        post.position.set(bx, 3.6, bz);
        g.add(post);
      });
    });

    const midBelt = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.28, 6.8), timberMat);
    midBelt.position.y = 2.4;
    const topBelt = midBelt.clone();
    topBelt.position.y = 4.8;
    g.add(midBelt, topBelt);

    const roofSlopeLeft = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 7.4), roofMat);
    roofSlopeLeft.position.set(-1.85, 5.95, 0);
    roofSlopeLeft.rotation.z = Math.PI / 5.2;
    roofSlopeLeft.castShadow = true;

    const roofSlopeRight = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 7.4), roofMat);
    roofSlopeRight.position.set(1.85, 5.95, 0);
    roofSlopeRight.rotation.z = -Math.PI / 5.2;
    roofSlopeRight.castShadow = true;

    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 7.6), timberMat);
    ridgeBeam.position.set(0, 7.15, 0);

    const gableWall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.6, 6.4), plasterMat);
    gableWall.position.set(0, 5.5, 0);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.4, 0.95), stoneMat);
    chimney.position.set(2.4, 6.2, -1.6);
    chimney.castShadow = true;

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.3, 0.35), timberMat);
    doorFrame.position.set(0, 1.15, 3.12);
    const doorLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 2.1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x3d2616, roughness: 0.75 })
    );
    doorLeaf.position.set(0, 1.1, 3.12);

    const porchAwning = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 1.4), roofMat);
    porchAwning.position.set(0, 2.35, 3.6);
    porchAwning.rotation.x = 0.25;

    const winMat = new THREE.MeshStandardMaterial({
      color: 0xffd27d,
      emissive: 0xf2a93b,
      emissiveIntensity: 1.6,
      roughness: 0.2
    });
    [-2.1, 2.1].forEach((wx) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 0.25), winMat);
      win.position.set(wx, 3.65, 3.28);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.38), timberMat);
      frame.position.set(wx, 3.05, 3.32);
      g.add(win, frame);
    });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.95, 12), timberMat);
    barrel.position.set(-2.6, 0.48, 3.5);
    barrel.castShadow = true;

    g.add(
      roofSlopeLeft,
      roofSlopeRight,
      ridgeBeam,
      gableWall,
      chimney,
      doorFrame,
      doorLeaf,
      porchAwning,
      barrel
    );
    this.scene.add(g);
    this.addCollider(x, 2.6, z, 7.8, 5.2, 7.0);
  }

  private buildArchedBridge(
    x: number,
    z: number,
    woodTex: THREE.CanvasTexture,
    stoneTex: THREE.CanvasTexture
  ): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.82 });
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.42, 11.4), woodMat);
    deck.position.y = 0.25;
    deck.receiveShadow = true;
    g.add(deck);

    [-3.9, 3.9].forEach((bx) => {
      const lowWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 11.4), stoneMat);
      lowWall.position.set(bx, 0.75, 0);
      lowWall.castShadow = true;
      g.add(lowWall);

      [-5.2, 0, 5.2].forEach((bz) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.65, 0.75), stoneMat);
        pillar.position.set(bx, 0.95, bz);
        pillar.castShadow = true;
        g.add(pillar);
      });
    });

    this.scene.add(g);
  }

  private buildCastleGatehouse(x: number, z: number, stoneTex: THREE.CanvasTexture): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf2c14e,
      metalness: 0.6,
      roughness: 0.35
    });

    [-5.6, 5.6].forEach((tx) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 8.2, 16), stoneMat);
      tower.position.set(tx, 4.1, 0);
      tower.castShadow = true;
      tower.receiveShadow = true;

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 2.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x2c3e5a, roughness: 0.65 })
      );
      roof.position.set(tx, 9.6, 0);
      roof.castShadow = true;

      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.6, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x3c7bd9, roughness: 0.7 })
      );
      banner.position.set(tx, 5.2, -2.15);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.12), accentMat);
      trim.position.set(tx, 6.5, -2.15);

      g.add(tower, roof, banner, trim);
    });

    const topBridge = new THREE.Mesh(new THREE.BoxGeometry(12.4, 2.2, 2.6), stoneMat);
    topBridge.position.set(0, 7.1, 0);
    topBridge.castShadow = true;
    g.add(topBridge);

    this.scene.add(g);
    this.addCollider(x - 5.6, 4, z, 4.2, 8, 4.2);
    this.addCollider(x + 5.6, 4, z, 4.2, 8, 4.2);
  }

  private buildBlacksmithWorkshop(x: number, z: number, woodTex: THREE.CanvasTexture): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x454954, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });

    const forgeBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 3.2), stoneMat);
    forgeBase.position.y = 1.8;
    forgeBase.castShadow = true;

    const coalGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf2c14e,
        emissive: 0xd64545,
        emissiveIntensity: 2.6
      })
    );
    coalGlow.position.set(1.2, 1.1, 0);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 4.2), woodMat);
    roof.position.set(1.0, 3.4, 0);
    roof.rotation.z = -0.18;

    const anvil = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.75, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.85, roughness: 0.25 })
    );
    anvil.position.set(2.5, 0.38, 1.1);
    anvil.castShadow = true;

    const forgeLight = new THREE.PointLight(0xff6b35, 3.5, 10);
    forgeLight.position.set(1.8, 1.8, 0);

    g.add(forgeBase, coalGlow, roof, anvil, forgeLight);
    this.scene.add(g);
    this.addCollider(x, 1.8, z, 3.8, 3.6, 3.6);
  }

  private buildAlchemistShop(x: number, z: number, woodTex: THREE.CanvasTexture): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });

    const table = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.05, 1.8), woodMat);
    table.position.y = 0.52;
    table.castShadow = true;

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.25, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x2f6e59, roughness: 0.65 })
    );
    canopy.position.y = 2.65;
    canopy.rotation.z = 0.12;
    canopy.castShadow = true;

    [-0.9, 0, 0.9].forEach((bx, idx) => {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.42, 10),
        new THREE.MeshStandardMaterial({
          color: idx === 1 ? 0x5fb7e5 : 0xc9373f,
          emissive: idx === 1 ? 0x5fb7e5 : 0xc9373f,
          emissiveIntensity: 1.5
        })
      );
      bottle.position.set(bx, 1.25, 0);
      g.add(bottle);
    });

    g.add(table, canopy);
    this.scene.add(g);
    this.addCollider(x, 1.4, z, 3.8, 2.8, 2.4);
  }

  private buildBonfireShrine(x: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const ringBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.7, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0x585e6e, roughness: 0.85 })
    );
    ringBase.position.y = 0.11;
    g.add(ringBase);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0x454a57, roughness: 0.9 })
      );
      stone.position.set(Math.cos(a) * 1.1, 0.26, Math.sin(a) * 1.1);
      g.add(stone);
    }

    const flame = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.52, 1),
      new THREE.MeshStandardMaterial({
        color: 0xf2c14e,
        emissive: 0xd64545,
        emissiveIntensity: 2.8
      })
    );
    flame.scale.set(0.85, 1.45, 0.85);
    flame.position.y = 0.65;

    const coiledSword = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.55, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0x5fb7e5,
        emissive: 0x5fb7e5,
        emissiveIntensity: 1.4
      })
    );
    coiledSword.position.y = 0.9;
    coiledSword.rotation.z = 0.2;

    const light = new THREE.PointLight(0xffae42, 5.5, 16);
    light.position.set(0, 1.8, 0);

    g.add(flame, coiledSword, light);
    this.scene.add(g);
  }

  private buildHangingLanternPost(x: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const darkIron = new THREE.MeshStandardMaterial({
      color: 0x262a34,
      metalness: 0.7,
      roughness: 0.4
    });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 3.8, 10), darkIron);
    pole.position.y = 1.9;
    pole.castShadow = true;

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.1), darkIron);
    arm.position.set(x < 0 ? 0.35 : -0.35, 3.65, 0);

    const lantern = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffe28a,
        emissive: 0xf2a93b,
        emissiveIntensity: 2.2
      })
    );
    lantern.position.set(x < 0 ? 0.68 : -0.68, 3.35, 0);

    g.add(pole, arm, lantern);
    this.scene.add(g);
  }

  private buildOrganicCanopyTree(x: number, z: number, scale: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);

    const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.92 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 3.6, 10), barkMat);
    trunk.position.y = 1.8;
    trunk.castShadow = true;
    g.add(trunk);

    const foliageColors = [0x265442, 0x2f664f, 0x1e4536, 0x367358];
    const blobs: Array<[number, number, number, number]> = [
      [0, 4.4, 0, 1.95],
      [-1.1, 3.8, 0.6, 1.45],
      [1.1, 3.9, -0.5, 1.5],
      [0.4, 4.1, 1.1, 1.35],
      [-0.5, 4.9, -0.8, 1.4]
    ];

    blobs.forEach(([bx, by, bz, rad], idx) => {
      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rad, 1),
        new THREE.MeshStandardMaterial({
          color: foliageColors[idx % foliageColors.length],
          roughness: 0.85
        })
      );
      crown.position.set(bx, by, bz);
      crown.scale.y = 0.82;
      crown.castShadow = true;
      crown.receiveShadow = true;
      g.add(crown);
    });

    this.scene.add(g);
    this.addCollider(x, 2, z, 1.3 * scale, 4, 1.3 * scale);
  }

  private buildRockOutcrop(x: number, z: number, radius: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x434a59,
      roughness: 0.9,
      flatShading: true
    });

    for (let i = 0; i < 3; i++) {
      const r = radius * (1 - i * 0.22);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), rockMat);
      rock.position.set((i - 1) * 3.5, r * 0.55, (i % 2) * 2.5);
      rock.scale.set(1.2, 0.85, 1.0);
      rock.castShadow = true;
      rock.receiveShadow = true;
      g.add(rock);
    }

    this.scene.add(g);
    this.addCollider(x, radius * 0.5, z, radius * 1.4, radius, radius * 1.4);
  }

  private buildAncientTempleArena(x: number, z: number, stoneTex: THREE.CanvasTexture): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.78 });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(16.5, 18.0, 0.5, 36), stoneMat);
    platform.position.y = 0.25;
    platform.receiveShadow = true;
    g.add(platform);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      if (Math.abs(Math.sin(angle)) < 0.35) continue;
      const px = Math.sin(angle) * 14.5;
      const pz = Math.cos(angle) * 14.5;
      const h = i % 2 === 0 ? 7.0 : 4.6;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, h, 14), stoneMat);
      col.position.set(px, h / 2 + 0.5, pz);
      col.castShadow = true;
      g.add(col);
      this.addCollider(x + px, h / 2, z + pz, 1.8, h, 1.8);
    }

    const runeCircle = new THREE.Mesh(
      new THREE.RingGeometry(12.2, 12.8, 36),
      new THREE.MeshBasicMaterial({ color: 0xb66bff, side: THREE.DoubleSide })
    );
    runeCircle.rotation.x = -Math.PI / 2;
    runeCircle.position.y = 0.52;
    g.add(runeCircle);

    this.scene.add(g);
  }

  private buildInstancedGrassField(): void {
    const count = 4200;
    const bladeGeo = new THREE.ConeGeometry(0.09, 0.55, 4);
    bladeGeo.translate(0, 0.27, 0);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x3b7556,
      roughness: 0.8
    });

    this.grassInstanced = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
    const dummy = new THREE.Object3D();
    let placed = 0;

    while (placed < count) {
      const rx = (Math.random() - 0.5) * 320;
      const rz = -55 + Math.random() * 275;
      if (Math.hypot(rx, rz) < 21.5) continue;
      if (Math.abs(rx) < 4.5) continue;
      if (Math.abs(rz - 92) < 4.0) continue;
      if (rz > 36 && rz < 46) continue;

      dummy.position.set(rx, 0, rz);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.rotation.z = (Math.random() - 0.5) * 0.25;
      const s = 0.65 + Math.random() * 0.85;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      this.grassInstanced.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    this.grassInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.grassInstanced);
  }

  private buildFireflyParticles(): void {
    const count = 220;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 260;
      positions[i * 3 + 1] = 0.6 + Math.random() * 4.5;
      positions[i * 3 + 2] = -40 + Math.random() * 240;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xf2c14e,
      size: 0.14,
      transparent: true,
      opacity: 0.85
    });
    this.fireflies = new THREE.Points(geo, mat);
    this.scene.add(this.fireflies);
  }

  private spawnVillageNPCs(): void {
    const npcConfigs: Array<{
      id: string;
      name: string;
      role: string;
      greeting: string;
      pos: THREE.Vector3;
      rotY: number;
      custom: CharacterCustomizationState;
    }> = [
      {
        id: 'maren',
        name: 'Tetua Maren',
        role: 'Pemimpin Desa Embermere',
        greeting:
          'Selamat datang di dunia Aethermoor yang luas, Penjaga! Di selatan jembatan ada Hutan Berkabut, di sebelah Barat ada Lembah Rawa Kristal (Lv.4-5), di sebelah Timur ada Benteng Goblin (Lv.5-6), dan di ujung Selatan ada Kuil Agung menuju Dungeon Katakombe!',
        pos: new THREE.Vector3(0, 0, 7.2),
        rotY: 0,
        custom: {
          playerName: 'Tetua Maren',
          classId: 'mage',
          bodyType: 'ramping',
          faceIndex: 3,
          hairStyleIndex: 2,
          hairColorIndex: 1,
          accentColorIndex: 3,
          faceMarking: 'tattoo'
        }
      },
      {
        id: 'brann',
        name: 'Pandai Besi Brann',
        role: 'Ahli Tempa & Gudang Senjata',
        greeting:
          'Selamat datang di bengkelku! Di sini kamu bisa memilih senjata mana yang ingin kamu gunakan bertarung, sekaligus menempa level senjatamu agar menghasilkan serangan yang jauh lebih mematikan.',
        pos: new THREE.Vector3(-12.5, 0, -6.5),
        rotY: Math.PI / 3,
        custom: {
          playerName: 'Brann',
          classId: 'knight',
          bodyType: 'tegap',
          faceIndex: 0,
          hairStyleIndex: 0,
          hairColorIndex: 3,
          accentColorIndex: 4,
          faceMarking: 'scar'
        }
      },
      {
        id: 'celeste',
        name: 'Pendeta Bintang Celeste',
        role: 'Penjaga Altar Gacha Pusaka',
        greeting:
          'Cahaya bintang menyimpan senjata-senjata legendaris masa lalu. Apakah kamu ingin memanjatkan doa Gacha Pusaka Cahaya hari ini? Jika mendapat senjata kembar, senjatamu akan otomatis naik level!',
        pos: new THREE.Vector3(12.5, 0, 8.5),
        rotY: -Math.PI / 4,
        custom: {
          playerName: 'Celeste',
          classId: 'mage',
          bodyType: 'ramping',
          faceIndex: 2,
          hairStyleIndex: 2,
          hairColorIndex: 2,
          accentColorIndex: 3,
          faceMarking: 'tattoo'
        }
      },
      {
        id: 'lysa',
        name: 'Apoteker Lysa',
        role: 'Toko Ramuan & Pemulih',
        greeting:
          'Jangan pernah menjelajah ke Lembah Barat, Benteng Timur, atau Dungeon Katakombe tanpa persediaan Ramuan HP yang cukup! Silakan pilih ramuan yang kamu butuhkan.',
        pos: new THREE.Vector3(12.5, 0, -6.5),
        rotY: -Math.PI / 3,
        custom: {
          playerName: 'Lysa',
          classId: 'archer',
          bodyType: 'ramping',
          faceIndex: 1,
          hairStyleIndex: 1,
          hairColorIndex: 2,
          accentColorIndex: 1,
          faceMarking: 'none'
        }
      },
      {
        id: 'guard',
        name: 'Kapten Roderick',
        role: 'Komandan Gerbang Selatan',
        greeting:
          'Gunakan 3 Jembatan Sungai untuk menjelajah: Jembatan Tengah ke Hutan Berkabut (Lv.1-4), Jembatan Barat ke Rawa Kristal (Lv.4-5), atau Jembatan Timur ke Benteng Goblin (Lv.5-6)!',
        pos: new THREE.Vector3(-3.2, 0, 32.5),
        rotY: Math.PI,
        custom: {
          playerName: 'Kapten Roderick',
          classId: 'knight',
          bodyType: 'tegap',
          faceIndex: 2,
          hairStyleIndex: 0,
          hairColorIndex: 0,
          accentColorIndex: 0,
          faceMarking: 'scar'
        }
      }
    ];

    npcConfigs.forEach((cfg) => {
      const rig = CharacterBuilder.buildCharacter(cfg.custom.classId, cfg.custom);
      rig.root.position.copy(cfg.pos);
      rig.root.rotation.y = cfg.rotY;

      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({
          color: 0xf2c14e,
          emissive: 0xf2c14e,
          emissiveIntensity: 2.0
        })
      );
      marker.position.set(0, 2.35, 0);
      rig.root.add(marker);

      this.scene.add(rig.root);
      this.npcs.push({
        id: cfg.id,
        name: cfg.name,
        role: cfg.role,
        greeting: cfg.greeting,
        position: cfg.pos,
        rig,
        marker
      });
    });
  }

  /**
   * Spawn Musuh di 5 Wilayah Overworld + Dungeon Katakombe
   */
  private spawnAllWorldTargets(): void {
    this.enemies.forEach((e) => {
      this.scene.remove(e.mesh);
      e.hpBarWrap.remove();
    });
    this.enemies = [];

    // 0. Boneka Latihan di Desa
    this.createEnemy('dummy_1', 'Boneka Latihan Desa', 'dummy', 'overworld', 1, 200, 0, 4, 0, 0, -5.2, 27, 5);

    // 1. ZONA TEPI SUNGAI SELATAN (Lv.1 - Lv.2, Paling Lemah)
    this.createEnemy('slime_1', 'Slime Lembah Hijau', 'slime', 'overworld', 1, 55, 5, 2, 35, 25, -6, 52, 12);
    this.createEnemy('slime_2', 'Slime Air Sungai', 'slime', 'overworld', 1, 55, 5, 2, 35, 25, 6, 54, 12);
    this.createEnemy('wolf_cub', 'Serigala Muda Liar', 'wolf', 'overworld', 2, 75, 7, 3, 45, 30, 0, 65, 14);

    // 2. ZONA TENGAH: HUTAN BERKABUT (Lv.3 - Lv.4)
    this.createEnemy('wolf_alpha', 'Serigala Gelap Alfa', 'wolf', 'overworld', 3, 125, 11, 5, 65, 45, -10, 88, 16);
    this.createEnemy('goblin_1', 'Goblin Penjarah Hutan', 'goblin', 'overworld', 3, 120, 11, 5, 65, 45, 10, 88, 16);
    this.createEnemy('goblin_2', 'Goblin Pengintai Tombak', 'goblin', 'overworld', 4, 150, 14, 7, 85, 60, -9, 122, 16);
    this.createEnemy('crystal_mid', 'Pilar Kristal Hutan', 'crystal', 'overworld', 4, 190, 0, 8, 95, 75, 9, 125, 5);

    // 3. ZONA BARAT: LEMBAH RAWA KRISTAL AETHER (Lv.4 - Lv.5)
    this.createEnemy('west_wolf_1', 'Serigala Kristal Es', 'wolf', 'overworld', 4, 165, 15, 7, 95, 70, -82, 85, 16);
    this.createEnemy('west_wolf_2', 'Serigala Mistis Barat', 'wolf', 'overworld', 5, 195, 17, 8, 115, 85, -110, 78, 16);
    this.createEnemy('west_crystal', 'Inti Kristal Rawa Barat', 'crystal', 'overworld', 5, 260, 0, 10, 150, 120, -110, 95, 5);

    // 4. ZONA TIMUR: BENTENG PADANG TANDUS GOBLIN (Lv.5 - Lv.6)
    this.createEnemy('east_goblin_1', 'Goblin Berserker Timur', 'goblin', 'overworld', 5, 210, 18, 9, 120, 90, 82, 88, 16);
    this.createEnemy('east_goblin_2', 'Kapten Benteng Goblin', 'goblin', 'overworld', 6, 260, 20, 10, 145, 115, 105, 92, 16);
    this.createEnemy('east_warlord', 'Panglima Perang Kraag', 'skeleton', 'overworld', 6, 320, 22, 11, 180, 140, 115, 100, 14);

    // 5. ZONA UJUNG SELATAN: RERUNTUHAN KUIL AGUNG (Mini-Boss Lv.6, Dikunci di Arena 12.5m)
    this.createEnemy(
      'temple_guardian',
      'Malakor, Penjaga Gerbang Kuil',
      'boss',
      'overworld',
      6,
      380,
      19,
      11,
      240,
      180,
      0,
      188,
      12.5
    );

    // 6. ZONA BAWAH TANAH: DUNGEON KATAKOMBE BAYANGAN (Lv.7 - Lv.10)
    this.createEnemy(
      'skel_1',
      'Ksatria Tengkorak Katakombe',
      'skeleton',
      'dungeon',
      7,
      250,
      21,
      12,
      165,
      115,
      294,
      280,
      14
    );
    this.createEnemy(
      'skel_2',
      'Algojo Bayangan Katakombe',
      'skeleton',
      'dungeon',
      8,
      300,
      24,
      14,
      195,
      140,
      306,
      298,
      14
    );
    this.createEnemy(
      'dungeon_boss_vaelgor',
      'Vaelgor, Raja Bayangan Abadi',
      'boss',
      'dungeon',
      10,
      720,
      32,
      18,
      550,
      450,
      300,
      332,
      12.0
    );
  }

  private createEnemy(
    id: string,
    name: string,
    kind: EnemyKind,
    zone: 'overworld' | 'dungeon',
    level: number,
    hp: number,
    atk: number,
    def: number,
    xpReward: number,
    goldReward: number,
    x: number,
    z: number,
    arenaRadius: number
  ): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    let rig: BuiltCharacterRig | undefined;
    let wolfParts: WolfParts | undefined;
    let slimeParts: SlimeParts | undefined;

    const darkFurMat = new THREE.MeshStandardMaterial({ color: 0x1c1f2b, roughness: 0.65 });
    const glowPurpleMat = new THREE.MeshStandardMaterial({
      color: 0xb66bff,
      emissive: 0xb66bff,
      emissiveIntensity: 2.2
    });
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xd64545,
      emissive: 0xd64545,
      emissiveIntensity: 1.8
    });

    if (kind === 'slime') {
      const slimeMat = new THREE.MeshStandardMaterial({
        color: 0x4fa66a,
        emissive: 0x1f5c36,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.86
      });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 12), slimeMat);
      body.scale.set(1.15, 0.78, 1.15);
      body.position.y = 0.42;
      body.castShadow = true;

      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({
          color: 0xf2c14e,
          emissive: 0xf2c14e,
          emissiveIntensity: 1.8
        })
      );
      core.position.y = 0.45;
      g.add(body, core);
      slimeParts = { body, core };
    } else if (kind === 'wolf') {
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.58, 1.45), darkFurMat);
      torso.position.y = 0.65;
      torso.castShadow = true;
      const mane = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), darkFurMat);
      mane.position.set(0, 0.14, 0.45);
      torso.add(mane);

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.92, 0.85);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.55), darkFurMat);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.38), darkFurMat);
      snout.position.set(0, -0.04, 0.35);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.34), crimsonMat);
      jaw.position.set(0, -0.15, 0.32);
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 4), darkFurMat);
      earL.position.set(-0.16, 0.28, -0.05);
      const earR = earL.clone();
      earR.position.x = 0.16;
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.06), crimsonMat);
      eyeL.position.set(-0.14, 0.05, 0.26);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.14;
      headGroup.add(head, snout, jaw, earL, earR, eyeL, eyeR);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.75, 6), darkFurMat);
      tail.position.set(0, 0.7, -0.88);
      tail.rotation.x = -Math.PI / 3;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glowPurpleMat);
      shard.position.set(0, 0.42, 0);
      torso.add(shard);

      const legs: THREE.Mesh[] = [];
      [
        [-0.24, -0.48],
        [0.24, -0.48],
        [-0.24, 0.48],
        [0.24, 0.48]
      ].forEach(([lx, lz]) => {
        const legGeo = new THREE.BoxGeometry(0.16, 0.6, 0.16);
        legGeo.translate(0, -0.25, 0);
        const leg = new THREE.Mesh(legGeo, darkFurMat);
        leg.position.set(lx, 0.58, lz);
        leg.castShadow = true;
        legs.push(leg);
        g.add(leg);
      });

      g.add(torso, headGroup, tail);
      if (level <= 2) g.scale.setScalar(0.82);
      wolfParts = { torso, headGroup, jaw, tail, legs };
    } else if (kind === 'goblin' || kind === 'skeleton') {
      rig = CharacterBuilder.buildCharacter('knight', {
        playerName: name,
        classId: 'knight',
        bodyType: kind === 'skeleton' ? 'tegap' : 'ramping',
        faceIndex: kind === 'skeleton' ? 1 : 0,
        hairStyleIndex: 0,
        hairColorIndex: kind === 'skeleton' ? 1 : 6,
        accentColorIndex: kind === 'skeleton' ? 5 : 2,
        faceMarking: 'scar'
      });
      rig.root.scale.setScalar(kind === 'skeleton' ? 1.08 : 0.82);
      g.add(rig.root);
    } else if (kind === 'boss') {
      rig = CharacterBuilder.buildCharacter('knight', {
        playerName: name,
        classId: 'knight',
        bodyType: 'tegap',
        faceIndex: 3,
        hairStyleIndex: 2,
        hairColorIndex: 5,
        accentColorIndex: zone === 'dungeon' ? 4 : 7,
        faceMarking: 'tattoo'
      });
      rig.root.scale.setScalar(zone === 'dungeon' ? 1.65 : 1.38);
      const bossAura = new THREE.PointLight(zone === 'dungeon' ? 0xd64545 : 0xb66bff, 4, 10);
      bossAura.position.y = 2.2;
      g.add(rig.root, bossAura);
    } else if (kind === 'crystal') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.55, 8), darkFurMat);
      base.position.y = 0.28;
      const spire = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), glowPurpleMat);
      spire.scale.set(0.75, 2.0, 0.75);
      spire.position.y = 2.0;
      spire.castShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 8, 24), crimsonMat);
      ring.position.y = 1.9;
      g.add(base, spire, ring);
    } else {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.9, 8), darkFurMat);
      pole.position.y = 0.95;
      const torsoPad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.38, 0.95, 12),
        new THREE.MeshStandardMaterial({ color: 0x8c6239, roughness: 0.85 })
      );
      torsoPad.position.y = 1.25;
      torsoPad.castShadow = true;
      const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.16), darkFurMat);
      crossArm.position.y = 1.45;
      const headTarget = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.8 })
      );
      headTarget.position.y = 1.95;
      g.add(pole, torsoPad, crossArm, headTarget);
    }

    const telegraphRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, kind === 'boss' ? 1.65 : 1.05, 24),
      new THREE.MeshBasicMaterial({
        color: 0xd64545,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      })
    );
    telegraphRing.rotation.x = -Math.PI / 2;
    telegraphRing.position.y = 0.09;
    telegraphRing.visible = false;
    g.add(telegraphRing);

    this.scene.add(g);

    const hpWrap = document.createElement('div');
    hpWrap.style.cssText =
      'position:absolute;width:136px;transform:translate(-50%,-50%);display:none;flex-direction:column;align-items:center;gap:2px;';
    const nameTag = document.createElement('div');
    nameTag.style.cssText = `font-family:var(--font-title);font-size:11px;font-weight:700;color:${
      kind === 'boss' ? '#F2C14E' : '#EFE6D2'
    };text-shadow:0 1px 4px #000;white-space:nowrap;`;
    nameTag.textContent = `Lv.${level} ${name}`;

    const track = document.createElement('div');
    track.style.cssText =
      'width:100%;height:7px;background:#12141C;border:1px solid #F2C14E;border-radius:4px;overflow:hidden;';
    const fill = document.createElement('div');
    fill.style.cssText = `width:100%;height:100%;background:${
      kind === 'boss' ? '#B66BFF' : '#C9373F'
    };transition:width 120ms ease-out;`;
    track.appendChild(fill);
    hpWrap.append(nameTag, track);
    this.worldLabelsRoot.appendChild(hpWrap);

    this.enemies.push({
      id,
      name,
      kind,
      zone,
      level,
      hp,
      maxHp: hp,
      atk,
      def,
      xpReward,
      goldReward,
      position: new THREE.Vector3(x, 0, z),
      spawnOrigin: new THREE.Vector3(x, 0, z),
      arenaRadius,
      mesh: g,
      rig,
      wolfParts,
      slimeParts,
      telegraphRing,
      hpBarWrap: hpWrap,
      hpBarFill: fill,
      isDead: false,
      deathAnimTimer: 0,
      hitFlashTimer: 0,
      attackCooldown: 0.9,
      attackState: 'none',
      attackAnimTimer: 0,
      hasDealtStrikeDamage: false,
      strikeDir: new THREE.Vector3(0, 0, 1),
      isMoving: false,
      patrolAngle: Math.random() * Math.PI * 2
    });
  }

  private addCollider(x: number, y: number, z: number, w: number, h: number, d: number): void {
    this.colliders.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y, z), new THREE.Vector3(w, h, d))
    );
  }

  private buildHUD(): void {
    this.hudRoot.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:30;padding:var(--safe-area-y) var(--safe-area-x);display:flex;flex-direction:column;justify-content:space-between;';

    const cls =
      classesData.classes.find((c) => c.id === this.profile.classId) ?? classesData.classes[0];

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;width:100%;';

    const statusCard = createPanel();
    statusCard.element.style.width = '400px';
    statusCard.element.style.padding = '14px 16px';
    statusCard.body.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    const topProfileRow = document.createElement('div');
    topProfileRow.style.cssText = 'display:flex;align-items:center;gap:14px;';

    const portrait = document.createElement('div');
    portrait.style.cssText =
      'position:relative;width:62px;height:62px;border-radius:50%;border:2px solid var(--color-gold-light);background:radial-gradient(circle,var(--color-crystal-blue),var(--color-shadow-purple));display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    portrait.innerHTML = `<div style="width:36px;height:36px;">${getSvgIcon(
      this.profile.classId as IconName
    )}</div>`;

    this.levelBadgeEl = document.createElement('span');
    this.levelBadgeEl.style.cssText =
      'position:absolute;bottom:-5px;right:-5px;background:var(--color-night-black);border:1.5px solid var(--color-gold-light);color:var(--color-gold-light);font-family:var(--font-title);font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;';
    this.levelBadgeEl.textContent = `Lv ${this.level}`;
    portrait.appendChild(this.levelBadgeEl);

    const barsWrap = document.createElement('div');
    barsWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:5px;';
    this.hpBar = createStatusBar(`${this.profile.playerName} • HP`, 'hp', this.hp, this.maxHp);
    this.manaBar = createStatusBar('Mana', 'mana', this.mana, this.maxMana);
    this.staminaBar = createStatusBar('Stamina', 'stamina', this.stamina, this.maxStamina);
    this.xpBar = createStatusBar('XP Level', 'xp', this.xp, this.xpToNext);
    barsWrap.append(
      this.hpBar.element,
      this.manaBar.element,
      this.staminaBar.element,
      this.xpBar.element
    );
    topProfileRow.append(portrait, barsWrap);

    const statsFooter = document.createElement('div');
    statsFooter.style.cssText =
      'display:flex;justify-content:space-between;font-size:12px;border-top:1px solid var(--panel-border-subtle);padding-top:6px;';
    this.goldTextEl = document.createElement('span');
    this.goldTextEl.style.color = 'var(--color-gold-light)';
    this.goldTextEl.style.fontWeight = '700';
    this.weaponTextEl = document.createElement('span');
    this.weaponTextEl.style.color = 'var(--color-crystal-blue)';
    this.weaponTextEl.style.fontWeight = '600';
    statsFooter.append(this.goldTextEl, this.weaponTextEl);

    statusCard.body.append(topProfileRow, statsFooter);

    const rightTopCol = document.createElement('div');
    rightTopCol.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;';
    const minimapWrap = document.createElement('div');
    minimapWrap.style.cssText =
      'width:144px;height:144px;border-radius:50%;border:2px solid var(--color-gold-light);background:radial-gradient(circle,color-mix(in srgb,var(--color-forest-green) 80%,var(--color-night-black) 20%),var(--color-night-black));box-shadow:var(--panel-inner-shadow);position:relative;overflow:hidden;';
    this.compassNeedleEl = document.createElement('div');
    this.compassNeedleEl.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:4px;font-family:var(--font-title);font-size:12px;font-weight:700;color:var(--color-gold-light);';
    this.compassNeedleEl.textContent = 'U';
    const mapCenterDot = document.createElement('div');
    mapCenterDot.style.cssText =
      'position:absolute;top:50%;left:50%;width:10px;height:10px;background:var(--color-crystal-blue);border:2px solid var(--color-bone-white);border-radius:50%;transform:translate(-50%,-50%);';
    this.zoneNameEl = document.createElement('div');
    this.zoneNameEl.style.cssText =
      'position:absolute;bottom:10px;width:100%;text-align:center;font-size:11px;color:var(--color-gold-light);font-weight:700;';
    this.zoneNameEl.textContent = 'Desa Embermere';
    minimapWrap.append(this.compassNeedleEl, mapCenterDot, this.zoneNameEl);
    rightTopCol.appendChild(minimapWrap);

    topRow.append(statusCard.element, rightTopCol);

    this.targetBannerEl = document.createElement('div');
    this.targetBannerEl.style.cssText =
      'align-self:center;padding:8px 24px;background:var(--panel-bg-elevated);border:1.5px solid var(--color-danger-red);border-radius:99px;font-family:var(--font-title);color:var(--color-bone-white);display:none;';

    this.promptEl = document.createElement('div');
    this.promptEl.style.cssText =
      'align-self:center;padding:9px 22px;background:var(--panel-bg-elevated);border:1.5px solid var(--color-gold-light);border-radius:99px;font-family:var(--font-title);color:var(--color-gold-light);display:none;box-shadow:0 6px 20px rgba(0,0,0,0.75);';

    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-end;width:100%;';

    const questTracker = createPanel({ title: 'Tujuan Petualangan (Quest)' });
    questTracker.element.style.width = '380px';
    this.questTitleEl = document.createElement('div');
    this.questTitleEl.style.cssText =
      'font-family:var(--font-title);color:var(--color-gold-light);font-weight:700;font-size:15px;margin-bottom:4px;';
    this.questBodyEl = document.createElement('div');
    this.questBodyEl.style.cssText = 'font-size:13px;color:var(--text-primary);line-height:1.45;';
    questTracker.body.append(this.questTitleEl, this.questBodyEl);

    const skillBar = createPanel();
    skillBar.element.style.padding = '10px 14px';
    skillBar.body.style.cssText = 'display:flex;gap:12px;align-items:center;';

    cls.skills.forEach((sk, idx) => {
      const slot = document.createElement('div');
      slot.style.cssText =
        'position:relative;width:58px;height:58px;border:1.5px solid var(--color-gold-light);border-radius:8px;background:color-mix(in srgb,var(--color-night-black) 90%,transparent);display:flex;align-items:center;justify-content:center;overflow:hidden;';
      slot.innerHTML = `
        <span style="position:absolute;top:2px;left:6px;font-family:var(--font-title);font-size:12px;font-weight:700;color:var(--color-gold-light);">[${
          idx + 1
        }]</span>
        <div style="width:36px;height:36px;">${getSvgIcon(sk.icon as IconName)}</div>
      `;
      const cdEl = document.createElement('div');
      cdEl.style.cssText =
        'position:absolute;inset:0;background:color-mix(in srgb,var(--color-night-black) 84%,transparent);display:none;align-items:center;justify-content:center;font-family:var(--font-title);font-weight:700;color:var(--color-bone-white);';
      slot.appendChild(cdEl);
      this.skillCdOverlay.push(cdEl);
      skillBar.body.appendChild(slot);
    });

    const potSlot = document.createElement('div');
    potSlot.style.cssText =
      'position:relative;width:58px;height:58px;border:1.5px solid var(--color-gold-light);border-radius:8px;background:color-mix(in srgb,var(--color-night-black) 90%,transparent);display:flex;align-items:center;justify-content:center;overflow:hidden;';
    potSlot.innerHTML = `
      <span style="position:absolute;top:2px;left:6px;font-family:var(--font-title);font-size:12px;font-weight:700;color:var(--color-gold-light);">[R]</span>
      <div style="width:34px;height:34px;">${getSvgIcon('potionHp')}</div>
    `;
    this.potionCountEl = document.createElement('span');
    this.potionCountEl.style.cssText =
      'position:absolute;bottom:2px;right:6px;font-size:12px;font-weight:700;color:var(--color-bone-white);';
    this.potionCountEl.textContent = `x${this.potions}`;
    this.potionCdOverlay = document.createElement('div');
    this.potionCdOverlay.style.cssText =
      'position:absolute;inset:0;background:color-mix(in srgb,var(--color-night-black) 84%,transparent);display:none;align-items:center;justify-content:center;font-family:var(--font-title);font-weight:700;color:var(--color-bone-white);';
    potSlot.append(this.potionCountEl, this.potionCdOverlay);
    skillBar.body.appendChild(potSlot);

    const controlsCard = createPanel();
    controlsCard.element.style.width = '310px';
    controlsCard.body.style.fontSize = '13px';
    controlsCard.body.innerHTML = `
      <div><strong style="color:var(--color-gold-light)">WASD</strong> Gerak • <strong style="color:var(--color-gold-light)">Shift</strong> Lari • <strong style="color:var(--color-gold-light)">Spasi</strong> Lompat</div>
      <div><strong style="color:var(--color-gold-light)">Ctrl</strong> Guling • <strong style="color:var(--color-gold-light)">Klik Kiri</strong> Serang • <strong style="color:var(--color-gold-light)">1-3</strong> Skill</div>
      <div><strong style="color:var(--color-gold-light)">Q</strong> Lock-On • <strong style="color:var(--color-gold-light)">F</strong> Bicara/Portal • <strong style="color:var(--color-gold-light)">Esc</strong> Jeda</div>
    `;

    bottomRow.append(questTracker.element, skillBar.element, controlsCard.element);
    this.hudRoot.append(topRow, this.targetBannerEl, this.promptEl, bottomRow);
    document.body.appendChild(this.hudRoot);
  }

  private refreshQuestUI(): void {
    const targetPos = this.getQuestTargetPosition();
    const dist = targetPos ? Math.round(targetPos.distanceTo(this.playerPos)) : 0;

    if (targetPos) {
      this.questBeacon.visible = true;
      this.questBeacon.position.set(targetPos.x, 9, targetPos.z);
    } else {
      this.questBeacon.visible = false;
    }

    if (this.questStage === 0) {
      this.questTitleEl.textContent = 'Babak 1: Panggilan Tetua Maren';
      this.questBodyEl.innerHTML = `• Bicara dengan <b>Tetua Maren [F]</b> di Alun-alun. Coba juga <b>Gacha Pusaka</b> di Celeste atau <b>Tempa Senjata</b> di Brann.<br><span style="color:var(--color-crystal-blue)">Jarak Tujuan: ${dist} m</span>`;
    } else if (this.questStage === 1) {
      this.questTitleEl.textContent = 'Babak 2: Pemanasan Tepi Sungai (Lv.1-2)';
      this.questBodyEl.innerHTML = `• Seberangi jembatan & kalahkan Slime / Serigala Muda di Pinggiran Sungai: <b>${this.riverKills} / ${this.riverKillsGoal}</b><br><span style="color:var(--color-crystal-blue)">Jarak Target: ${dist} m</span>`;
    } else if (this.questStage === 2) {
      this.questTitleEl.textContent = 'Babak 3: Hutan, Rawa Barat & Benteng Timur (Lv.3-6)';
      this.questBodyEl.innerHTML = `• Jelajahi Hutan Berkabut, Rawa Kristal Barat, atau Benteng Goblin Timur & kalahkan musuh menengah: <b>${this.forestKills} / ${this.forestKillsGoal}</b><br><span style="color:var(--color-crystal-blue)">Jarak Target Terdekat: ${dist} m</span>`;
    } else if (this.questStage === 3) {
      this.questTitleEl.textContent = 'Babak 4: Penjaga Gerbang Kuil Agung (Lv.6)';
      this.questBodyEl.innerHTML = `• Kalahkan <b>Malakor, Penjaga Gerbang Kuil</b> di Reruntuhan Ujung Selatan: <b>${
        this.templeBossDefeated ? 1 : 0
      } / 1</b><br><span style="color:var(--color-danger-red)">Jarak Kuil Selatan: ${dist} m</span>`;
    } else if (this.questStage === 4) {
      this.questTitleEl.textContent = 'Babak 5: Dungeon Katakombe Bayangan (Lv.7-10)';
      this.questBodyEl.innerHTML = `• Masuk ke <b>Portal Dungeon [F]</b> di belakang kuil dan kalahkan <b>Bos Vaelgor, Raja Bayangan (Lv.10)</b>: <b>${
        this.dungeonBossDefeated ? 1 : 0
      } / 1</b><br><span style="color:var(--color-rarity-epic)">Jarak Target: ${dist} m</span>`;
    } else {
      this.questTitleEl.textContent = '✦ Semua Misi Selesai — Legenda Aethermoor';
      this.questBodyEl.innerHTML = `• Kamu telah menaklukkan seluruh Overworld & Dungeon! Gunakan Gold untuk <b>Gacha Senjata Legendaris</b> di Celeste dan tempa hingga +10 di Brann!`;
    }
  }

  private getQuestTargetPosition(): THREE.Vector3 | null {
    if (this.questStage === 0) return new THREE.Vector3(0, 0, 7.2);
    if (this.questStage === 1) {
      const e = this.enemies.find((en) => !en.isDead && en.zone === 'overworld' && en.level <= 2);
      return e ? e.position : new THREE.Vector3(0, 0, 54);
    }
    if (this.questStage === 2) {
      const e = this.enemies.find(
        (en) => !en.isDead && en.zone === 'overworld' && en.level >= 3 && en.level <= 6 && en.kind !== 'boss'
      );
      return e ? e.position : new THREE.Vector3(0, 0, 92);
    }
    if (this.questStage === 3) {
      const b = this.enemies.find((en) => !en.isDead && en.id === 'temple_guardian');
      return b ? b.position : new THREE.Vector3(0, 0, 188);
    }
    if (this.questStage === 4) {
      if (!this.inDungeon) return this.overworldPortalPos;
      const db = this.enemies.find((en) => !en.isDead && en.id === 'dungeon_boss_vaelgor');
      return db ? db.position : new THREE.Vector3(300, 0, 332);
    }
    return null;
  }

  private bindInputs(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      if (e.code === 'Escape') {
        if (this.activeModalEl) {
          this.closeInteractiveModal();
          return;
        }
        this.togglePauseMenu();
        return;
      }
      if (this.isPaused || this.isModalOpen) return;

      if (e.code === 'KeyQ') this.toggleLockOn();
      if (e.code === 'KeyR') this.useHealthPotion();
      if (e.code === 'KeyF') this.handleContextInteraction();
      if (e.code === 'Digit1') this.triggerSkill(0);
      if (e.code === 'Digit2') this.triggerSkill(1);
      if (e.code === 'Digit3') this.triggerSkill(2);

      if (
        (e.code === 'ControlLeft' || e.code === 'AltLeft') &&
        this.isGrounded &&
        !this.isRolling
      ) {
        if (this.consumeStamina(25)) {
          this.isRolling = true;
          this.rollTimer = 0.42;
          this.invulnerableTimer = 0.3;
        }
      }
      if (e.code === 'Space' && this.isGrounded && !this.isRolling) {
        this.velocityY = 7.6;
        this.isGrounded = false;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (this.isPaused || this.isModalOpen) return;
      if (document.pointerLockElement !== this.renderer.domElement) {
        this.renderer.domElement.requestPointerLock();
      }
      if (e.button === 0) this.performBasicAttack();
      if (e.button === 2) {
        this.rightMouseDown = true;
        this.chargeTime = 0;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2 && this.rightMouseDown) {
        this.rightMouseDown = false;
        if (this.profile.classId !== 'knight' && this.chargeTime >= 0.4) {
          this.performChargedAttack(Math.min(1.55, 1.0 + this.chargeTime * 0.5));
        }
        this.isBlocking = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPaused || this.isModalOpen) return;
      if (document.pointerLockElement === this.renderer.domElement) {
        this.camYaw -= e.movementX * 0.003;
        this.camPitch = Math.max(0.08, Math.min(1.15, this.camPitch + e.movementY * 0.0025));
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private consumeStamina(amount: number): boolean {
    if (this.stamina < amount) return false;
    this.stamina -= amount;
    this.staminaRegenDelay = 0.9;
    return true;
  }

  private addAnimatedVFX(
    duration: number,
    setup: (group: THREE.Group) => (age: number, dt: number, progress: number) => void
  ): void {
    const group = new THREE.Group();
    this.scene.add(group);
    const onUpdate = setup(group);
    this.vfxList.push({ group, age: 0, duration, onUpdate });
  }

  private spawnSlashArc(
    origin: THREE.Vector3,
    yaw: number,
    colorHex: number,
    scale = 1.0,
    tilt = 0.2
  ): void {
    this.addAnimatedVFX(0.28, (g) => {
      g.position.copy(origin).add(new THREE.Vector3(0, 1.15, 0));
      const outerMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92
      });
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });

      const outerArc = new THREE.Mesh(
        new THREE.RingGeometry(1.0 * scale, 1.95 * scale, 24, 1, -Math.PI * 0.52, Math.PI * 1.04),
        outerMat
      );
      const innerArc = new THREE.Mesh(
        new THREE.RingGeometry(1.35 * scale, 1.78 * scale, 24, 1, -Math.PI * 0.45, Math.PI * 0.9),
        innerMat
      );
      outerArc.rotation.x = Math.PI / 2 + tilt;
      outerArc.rotation.z = -yaw;
      innerArc.rotation.x = Math.PI / 2 + tilt;
      innerArc.rotation.z = -yaw;
      g.add(outerArc, innerArc);

      return (_age, _dt, progress) => {
        const s = 1 + progress * 0.85;
        g.scale.set(s, s, s);
        outerMat.opacity = (1 - progress) * 0.9;
        innerMat.opacity = (1 - progress) * 0.95;
      };
    });
  }

  /**
   * MESIN VFX SKILL 3D SINEMATIK SPESIFIK TIAP KELAS & SKILL [1], [2], [3]
   */
  private spawnSpectacularSkillVFX(
    classId: string,
    skillIndex: number,
    targetCenter: THREE.Vector3
  ): void {
    const forward = new THREE.Vector3(
      Math.sin(this.playerRotY),
      0,
      Math.cos(this.playerRotY)
    ).normalize();

    // =========================================================================
    // A. EFEK SKILL KSATRIA (KNIGHT)
    // =========================================================================
    if (classId === 'knight') {
      if (skillIndex === 0) {
        // SKILL 1 KSATRIA: Hantaman Perisai — Gelombang Kejut Emas + 7 Duri Batu Mencuat
        this.addAnimatedVFX(0.85, (g) => {
          g.position.copy(this.playerPos);
          const flashLight = new THREE.PointLight(0xf2c14e, 8, 14);
          flashLight.position.set(forward.x * 2, 1.5, forward.z * 2);
          g.add(flashLight);

          const spikes: THREE.Mesh[] = [];
          const spikeMat = new THREE.MeshStandardMaterial({
            color: 0xf2c14e,
            emissive: 0xd68910,
            emissiveIntensity: 1.8,
            roughness: 0.25
          });

          for (let i = 0; i < 7; i++) {
            const dist = 1.4 + i * 0.85;
            const spread = (i % 2 === 0 ? 1 : -1) * (i * 0.14);
            const right = new THREE.Vector3(forward.z, 0, -forward.x);
            const pos = forward
              .clone()
              .multiplyScalar(dist)
              .addScaledVector(right, spread);

            const spike = new THREE.Mesh(
              new THREE.ConeGeometry(0.32 + i * 0.04, 1.6 + i * 0.22, 6),
              spikeMat
            );
            spike.position.set(pos.x, -1.2, pos.z);
            spike.rotation.x = 0.22 * forward.z;
            spike.rotation.z = -0.22 * forward.x;
            g.add(spike);
            spikes.push(spike);
          }

          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xf2c14e,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
          });
          const shockRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.1, 32), ringMat);
          shockRing.rotation.x = -Math.PI / 2;
          shockRing.position.set(forward.x * 2.5, 0.12, forward.z * 2.5);
          g.add(shockRing);

          return (age, _dt, progress) => {
            flashLight.intensity = (1 - progress) * 8;
            shockRing.scale.setScalar(1 + progress * 4.2);
            ringMat.opacity = (1 - progress) * 0.9;

            spikes.forEach((sp, idx) => {
              const delay = idx * 0.045;
              const localP = Math.max(0, Math.min(1, (age - delay) / 0.28));
              const rise = Math.sin(localP * Math.PI);
              sp.position.y = -0.8 + rise * 1.65;
            });
          };
        });
      } else if (skillIndex === 1) {
        // SKILL 2 KSATRIA: Putaran Pedang — Tornado 3 Pita Bilah Cahaya Berputar + Vortex Partikel
        this.addAnimatedVFX(0.95, (g) => {
          const blades: THREE.Mesh[] = [];
          const colors = [0x5fb7e5, 0xf2c14e, 0xffffff];
          for (let i = 0; i < 3; i++) {
            const mat = new THREE.MeshBasicMaterial({
              color: colors[i],
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.9
            });
            const torus = new THREE.Mesh(
              new THREE.TorusGeometry(2.1 + i * 0.55, 0.12, 10, 36, Math.PI * 1.35),
              mat
            );
            torus.rotation.x = Math.PI / 2 + (i - 1) * 0.16;
            torus.rotation.z = (i * Math.PI * 2) / 3;
            torus.position.y = 0.6 + i * 0.45;
            g.add(torus);
            blades.push(torus);
          }

          const vortexLight = new THREE.PointLight(0x5fb7e5, 9, 16);
          vortexLight.position.y = 1.5;
          g.add(vortexLight);

          return (_age, dt, progress) => {
            g.position.copy(this.playerPos);
            g.rotation.y += dt * 18;
            vortexLight.intensity = (1 - progress) * 9;
            blades.forEach((b, idx) => {
              b.scale.setScalar(0.85 + Math.sin(progress * Math.PI) * 0.55);
              b.position.y = 0.5 + idx * 0.45 + progress * 0.8;
              (b.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.9;
            });
          };
        });
      } else {
        // SKILL 3 KSATRIA: Teriakan Penjaga — Pilar Cahaya Langit + Rune Emas
        this.addAnimatedVFX(1.2, (g) => {
          g.position.copy(this.playerPos);
          const pillarMat = new THREE.MeshBasicMaterial({
            color: 0xf2c14e,
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide
          });
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 2.2, 18, 28, 1, true),
            pillarMat
          );
          beam.position.y = 9;

          const runeMat = new THREE.MeshBasicMaterial({
            color: 0xffe28a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
          });
          const runeRing = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.4, 32), runeRingMat(runeMat));
          runeRing.rotation.x = -Math.PI / 2;
          runeRing.position.y = 0.12;

          const light = new THREE.PointLight(0xf2c14e, 10, 18);
          light.position.y = 2.5;
          g.add(beam, runeRing, light);

          return (_age, dt, progress) => {
            g.position.copy(this.playerPos);
            beam.rotation.y += dt * 4;
            beam.scale.set(1 - progress * 0.35, 1, 1 - progress * 0.35);
            pillarMat.opacity = (1 - progress) * 0.65;
            runeRing.scale.setScalar(0.8 + progress * 1.4);
            runeMat.opacity = (1 - progress) * 0.95;
            light.intensity = (1 - progress) * 10;
          };
        });
      }
      return;
    }

    // =========================================================================
    // B. EFEK SKILL PENYIHIR (MAGE)
    // =========================================================================
    if (classId === 'mage') {
      if (skillIndex === 0) {
        // SKILL 1 PENYIHIR: Ledakan Supernova Bola Api + 36 Partikel Bara
        this.addAnimatedVFX(0.95, (g) => {
          g.position.copy(targetCenter);
          const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffdd66,
            transparent: true,
            opacity: 0.95
          });
          const outerMat = new THREE.MeshBasicMaterial({
            color: 0xd64545,
            transparent: true,
            opacity: 0.78,
            wireframe: false
          });
          const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 20), coreMat);
          coreSphere.position.y = 1.0;
          const outerSphere = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 20), outerMat);
          outerSphere.position.y = 1.0;

          const shockMat = new THREE.MeshBasicMaterial({
            color: 0xf2c14e,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
          });
          const shockRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.3, 32), shockMat);
          shockRing.rotation.x = -Math.PI / 2;
          shockRing.position.y = 0.15;

          const sparks: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3 }> = [];
          const sparkMat = new THREE.MeshBasicMaterial({ color: 0xf2c14e });
          for (let i = 0; i < 32; i++) {
            const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), sparkMat);
            sp.position.set(0, 1.0, 0);
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            const vy = 3 + Math.random() * 5;
            sparks.push({
              mesh: sp,
              vel: new THREE.Vector3(Math.cos(angle) * speed, vy, Math.sin(angle) * speed)
            });
            g.add(sp);
          }

          const fireLight = new THREE.PointLight(0xff5522, 12, 20);
          fireLight.position.y = 1.8;
          g.add(coreSphere, outerSphere, shockRing, fireLight);

          return (_age, dt, progress) => {
            coreSphere.scale.setScalar(1 + progress * 2.8);
            outerSphere.scale.setScalar(1 + progress * 3.4);
            shockRing.scale.setScalar(1 + progress * 4.0);
            coreMat.opacity = (1 - progress) * 0.95;
            outerMat.opacity = (1 - progress) * 0.75;
            shockMat.opacity = (1 - progress) * 0.9;
            fireLight.intensity = (1 - progress) * 12;

            sparks.forEach((s) => {
              s.vel.y -= 12 * dt;
              s.mesh.position.addScaledVector(s.vel, dt);
              s.mesh.scale.setScalar(Math.max(0.01, 1 - progress));
            });
          };
        });
      } else if (skillIndex === 1) {
        // SKILL 2 PENYIHIR: Dinding Es / Glacial Spires (10 Gunung Es Kristal Mencuat)
        this.addAnimatedVFX(2.4, (g) => {
          g.position.copy(targetCenter);
          const iceMat = new THREE.MeshStandardMaterial({
            color: 0x5fb7e5,
            emissive: 0x2b7cb3,
            emissiveIntensity: 1.6,
            roughness: 0.1,
            metalness: 0.25,
            transparent: true,
            opacity: 0.88
          });

          const spires: THREE.Mesh[] = [];
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const r = i % 2 === 0 ? 1.8 : 3.1;
            const h = 2.4 + (i % 3) * 0.8;
            const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.55, h, 5), iceMat);
            crystal.position.set(Math.cos(a) * r, -1.5, Math.sin(a) * r);
            crystal.rotation.z = (Math.random() - 0.5) * 0.35;
            crystal.rotation.x = (Math.random() - 0.5) * 0.35;
            g.add(crystal);
            spires.push(crystal);
          }

          const frostCircleMat = new THREE.MeshBasicMaterial({
            color: 0x8ce0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
          });
          const frostCircle = new THREE.Mesh(new THREE.RingGeometry(0.5, 3.8, 32), frostCircleMat);
          frostCircle.rotation.x = -Math.PI / 2;
          frostCircle.position.y = 0.12;

          const iceLight = new THREE.PointLight(0x5fb7e5, 8, 16);
          iceLight.position.y = 2.0;
          g.add(frostCircle, iceLight);

          return (_age, _dt, progress) => {
            const emerge = Math.min(1, progress * 6);
            const sink = progress > 0.8 ? (progress - 0.8) / 0.2 : 0;
            spires.forEach((sp, idx) => {
              const targetH = 1.0 + (idx % 3) * 0.35;
              sp.position.y = THREE.MathUtils.lerp(-1.5, targetH, emerge) - sink * 2.2;
            });
            frostCircle.rotation.z += 0.02;
            frostCircleMat.opacity = (1 - sink) * 0.75;
            iceMat.opacity = (1 - sink) * 0.88;
            iceLight.intensity = (1 - sink) * 8;
          };
        });
      } else {
        // SKILL 3 PENYIHIR: Petir Langit — 6 Sambaran Petir Berkelok dari Langit + Kubah Plasma
        this.addAnimatedVFX(1.05, (g) => {
          g.position.copy(targetCenter);
          const boltMat = new THREE.MeshBasicMaterial({
            color: 0x99eeff,
            transparent: true,
            opacity: 0.95
          });

          const bolts: THREE.Group[] = [];
          for (let b = 0; b < 6; b++) {
            const boltGroup = new THREE.Group();
            const offsetAngle = (b / 6) * Math.PI * 2;
            const rad = b === 0 ? 0 : 2.1;
            boltGroup.position.set(Math.cos(offsetAngle) * rad, 0, Math.sin(offsetAngle) * rad);

            let prevX = 0;
            let prevZ = 0;
            for (let seg = 0; seg < 8; seg++) {
              const segH = 2.2;
              const nextX = (Math.random() - 0.5) * 0.85;
              const nextZ = (Math.random() - 0.5) * 0.85;
              const cyl = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.14, segH + 0.2, 6),
                boltMat
              );
              cyl.position.set((prevX + nextX) * 0.5, seg * segH + segH * 0.5, (prevZ + nextZ) * 0.5);
              cyl.rotation.z = (nextX - prevX) * 0.4;
              cyl.rotation.x = (nextZ - prevZ) * 0.4;
              boltGroup.add(cyl);
              prevX = nextX;
              prevZ = nextZ;
            }
            g.add(boltGroup);
            bolts.push(boltGroup);
          }

          const domeMat = new THREE.MeshBasicMaterial({
            color: 0x4da3ff,
            transparent: true,
            opacity: 0.65,
            wireframe: true
          });
          const plasmaDome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 14), domeMat);
          plasmaDome.position.y = 0.8;

          const skyRing = new THREE.Mesh(
            new THREE.RingGeometry(2.2, 3.4, 32),
            boltMat
          );
          skyRing.rotation.x = -Math.PI / 2;
          skyRing.position.y = 14.5;

          const thunderLight = new THREE.PointLight(0x66ddff, 15, 25);
          thunderLight.position.y = 3.0;
          g.add(plasmaDome, skyRing, thunderLight);

          return (age, _dt, progress) => {
            // Efek berkedip kilat petir
            const flicker = Math.sin(age * 55) > -0.2 ? 1.0 : 0.25;
            boltMat.opacity = (1 - progress) * flicker;
            domeMat.opacity = (1 - progress) * 0.65;
            plasmaDome.scale.setScalar(0.8 + progress * 1.5);
            thunderLight.intensity = (1 - progress) * 15 * flicker;
            bolts.forEach((b) => {
              b.rotation.y = Math.random() * Math.PI;
            });
          };
        });
      }
      return;
    }

    // =========================================================================
    // C. EFEK SKILL PEMANAH (ARCHER)
    // =========================================================================
    if (skillIndex === 0) {
      // SKILL 1 PEMANAH: Tembakan Ganda Naga Angin (2 Proyektil Besar + Cincin Sonic Boom)
      [-0.38, 0.38].forEach((sideOffset, idx) => {
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        const startPos = this.playerPos
          .clone()
          .add(new THREE.Vector3(0, 1.25, 0))
          .addScaledVector(right, sideOffset);
        this.fireWindDragonArrow(startPos, forward.clone(), idx === 0 ? 0x4fa66a : 0xf2c14e);
      });
    } else if (skillIndex === 1) {
      // SKILL 2 PEMANAH: Hujan Panah Cahaya (28 Anak Panah Emas Menghujam dari Langit)
      this.addAnimatedVFX(1.45, (g) => {
        g.position.copy(targetCenter);
        const groundZoneMat = new THREE.MeshBasicMaterial({
          color: 0xf2c14e,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const groundZone = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.8, 36), groundZoneMat);
        groundZone.rotation.x = -Math.PI / 2;
        groundZone.position.y = 0.12;

        const skyPortal = groundZone.clone();
        skyPortal.position.y = 13.5;
        g.add(groundZone, skyPortal);

        const arrowMat = new THREE.MeshBasicMaterial({
          color: 0xffe270,
          transparent: true,
          opacity: 0.95
        });

        const arrows: Array<{ mesh: THREE.Mesh; delay: number; tx: number; tz: number }> = [];
        for (let i = 0; i < 28; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * 3.4;
          const tx = Math.cos(a) * r;
          const tz = Math.sin(a) * r;
          const arrowMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.1, 1.65, 6),
            arrowMat
          );
          arrowMesh.position.set(tx, 14, tz);
          g.add(arrowMesh);
          arrows.push({ mesh: arrowMesh, delay: (i / 28) * 0.75, tx, tz });
        }

        const rainLight = new THREE.PointLight(0xf2c14e, 8, 16);
        rainLight.position.y = 2.0;
        g.add(rainLight);

        return (age, _dt, progress) => {
          groundZone.rotation.z += 0.03;
          groundZoneMat.opacity = (1 - progress) * 0.85;
          rainLight.intensity = (1 - progress) * 8;

          arrows.forEach((ar) => {
            const localT = (age - ar.delay) / 0.35;
            if (localT < 0) {
              ar.mesh.visible = false;
            } else if (localT <= 1) {
              ar.mesh.visible = true;
              ar.mesh.position.y = THREE.MathUtils.lerp(13.5, 0.6, localT);
            } else {
              ar.mesh.visible = true;
              ar.mesh.position.y = 0.6;
            }
          });
          if (progress > 0.8) {
            arrowMat.opacity = (1 - (progress - 0.8) / 0.2) * 0.95;
          }
        };
      });
    } else {
      // SKILL 3 PEMANAH: Jebakan Duri Zamrud (Sulur Duri Berputar + Kristal Alam)
      this.addAnimatedVFX(2.0, (g) => {
        g.position.copy(targetCenter);
        const vineMat = new THREE.MeshStandardMaterial({
          color: 0x2f5d50,
          emissive: 0x4fa66a,
          emissiveIntensity: 1.2,
          roughness: 0.4,
          transparent: true,
          opacity: 0.92
        });

        const vines: THREE.Mesh[] = [];
        for (let i = 0; i < 6; i++) {
          const torus = new THREE.Mesh(
            new THREE.TorusGeometry(1.6 + (i % 2) * 0.7, 0.12, 8, 24, Math.PI * 1.2),
            vineMat
          );
          torus.rotation.x = Math.PI / 3;
          torus.rotation.y = (i / 6) * Math.PI * 2;
          torus.position.y = 0.8;
          g.add(torus);
          vines.push(torus);
        }

        const bloomMat = new THREE.MeshBasicMaterial({
          color: 0xf2c14e,
          transparent: true,
          opacity: 0.9
        });
        const centerBloom = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), bloomMat);
        centerBloom.position.y = 1.1;

        const trapLight = new THREE.PointLight(0x4fa66a, 8, 14);
        trapLight.position.y = 1.5;
        g.add(centerBloom, trapLight);

        return (_age, dt, progress) => {
          const pop = Math.min(1, progress * 5);
          const fade = progress > 0.75 ? (progress - 0.75) / 0.25 : 0;
          g.scale.setScalar(pop);
          centerBloom.rotation.y += dt * 4;
          vines.forEach((v, idx) => {
            v.rotation.z += dt * (idx % 2 === 0 ? 2 : -2);
          });
          vineMat.opacity = (1 - fade) * 0.92;
          bloomMat.opacity = (1 - fade) * 0.9;
          trapLight.intensity = (1 - fade) * 8;
        };
      });
    }
  }

  private fireWindDragonArrow(startPos: THREE.Vector3, dir: THREE.Vector3, color: number): void {
    const projGroup = new THREE.Group();
    projGroup.position.copy(startPos);

    const spear = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 1.4, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    spear.rotation.x = Math.PI / 2;

    const windRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.05, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    );
    projGroup.add(spear, windRing);
    projGroup.lookAt(startPos.clone().add(dir));

    this.scene.add(projGroup);
    this.projectiles.push({
      mesh: projGroup,
      velocity: dir.multiplyScalar(32),
      multiplier: 1.45,
      life: 1.4
    });
  }

  private performBasicAttack(): void {
    if (this.attackCooldown > 0 || this.isRolling) return;
    if (!this.consumeStamina(11)) return;

    this.audio.playClick();
    this.attackCooldown = 0.36;
    this.attackAnimDuration = 0.36;
    this.attackAnimTimer = this.attackAnimDuration;
    this.activeAttackCombo = this.comboStep;

    const stepDir = new THREE.Vector3(Math.sin(this.playerRotY), 0, Math.cos(this.playerRotY));
    this.playerVel.addScaledVector(stepDir, 3.2);

    if (this.profile.classId === 'knight') {
      const mults = [1.0, 1.15, 1.5];
      const mult = mults[this.comboStep];
      const tilts = [0.22, -0.22, 0.0];
      this.spawnSlashArc(
        this.playerPos,
        this.playerRotY,
        this.comboStep === 2 ? 0xf2c14e : this.equippedWeapon.colorHex,
        this.comboStep === 2 ? 1.35 : 1.05,
        tilts[this.comboStep]
      );
      this.comboStep = (this.comboStep + 1) % 3;
      this.comboResetTimer = 1.4;
      this.hitEnemiesInRadius(this.playerPos, 3.2, mult);
    } else {
      const mult = this.profile.classId === 'mage' ? 0.95 : 1.05;
      const speed = this.profile.classId === 'mage' ? 24 : 30;
      this.fireProjectile(speed, mult, this.equippedWeapon.colorHex);
    }
  }

  private performChargedAttack(multiplier: number): void {
    this.audio.playHeroChime();
    this.attackAnimDuration = 0.42;
    this.attackAnimTimer = 0.42;
    const speed = this.profile.classId === 'mage' ? 26 : 34;
    this.fireProjectile(speed, multiplier, 0xb66bff);
  }

  private fireProjectile(speed: number, multiplier: number, color: number): void {
    const dir =
      this.lockedTarget && !this.lockedTarget.isDead
        ? this.lockedTarget.position.clone().sub(this.playerPos).normalize()
        : new THREE.Vector3(Math.sin(this.playerRotY), 0, Math.cos(this.playerRotY)).normalize();

    const g = new THREE.Group();
    g.position.copy(this.playerPos).add(new THREE.Vector3(0, 1.25, 0));

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.4 })
    );
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.42, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      })
    );
    g.add(core, halo);
    this.scene.add(g);
    this.projectiles.push({ mesh: g, velocity: dir.multiplyScalar(speed), multiplier, life: 1.5 });
  }

  private triggerSkill(index: number): void {
    if (this.skillCooldowns[index] > 0) return;
    const cls =
      classesData.classes.find((c) => c.id === this.profile.classId) ?? classesData.classes[0];
    const sk = cls.skills[index];
    if (!sk || this.mana < sk.manaCost) return;

    this.mana -= sk.manaCost;
    this.skillCooldowns[index] = sk.cooldown;
    this.attackAnimDuration = 0.5;
    this.attackAnimTimer = 0.5;
    this.activeAttackCombo = 2;
    this.camShake = 0.3;
    this.audio.playHeroChime();

    const forward = new THREE.Vector3(
      Math.sin(this.playerRotY),
      0,
      Math.cos(this.playerRotY)
    ).normalize();
    const targetCenter =
      this.lockedTarget && !this.lockedTarget.isDead
        ? this.lockedTarget.position.clone()
        : this.playerPos
            .clone()
            .addScaledVector(forward, this.profile.classId === 'knight' ? 2.5 : 5.5);

    // Panggil Mesin Efek Visual Skill 3D Sinematik!
    this.spawnSpectacularSkillVFX(this.profile.classId, index, targetCenter);

    if (this.profile.classId === 'knight' && index === 2) {
      this.defBuffTimer = 8.0;
      this.spawnFloatingText(
        this.playerPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
        'PERISAI CAHAYA: DEF +40%!',
        'crit'
      );
      return;
    }

    const mults = [1.45, 1.85, 2.5];
    const hitCenter =
      this.profile.classId === 'knight' && index === 1 ? this.playerPos : targetCenter;
    this.hitEnemiesInRadius(hitCenter, 5.2, mults[index]);
  }

  private hitEnemiesInRadius(origin: THREE.Vector3, radius: number, multiplier: number): void {
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      if (enemy.position.distanceTo(origin) <= radius) {
        this.applyDamageToEnemy(enemy, multiplier);
      }
    }
  }

  private clampToEnemyArena(enemy: CombatTarget): void {
    const offset = enemy.position.clone().sub(enemy.spawnOrigin);
    offset.y = 0;
    if (offset.length() > enemy.arenaRadius) {
      offset.normalize().multiplyScalar(enemy.arenaRadius);
      enemy.position.x = enemy.spawnOrigin.x + offset.x;
      enemy.position.z = enemy.spawnOrigin.z + offset.z;
      enemy.mesh.position.copy(enemy.position);
    }
  }

  private applyDamageToEnemy(enemy: CombatTarget, multiplier: number): void {
    if (enemy.isDead) return;
    const res = this.calculateFormulaDamage(enemy.def, multiplier);
    enemy.hp = Math.max(0, enemy.hp - res.value);
    enemy.hitFlashTimer = 0.22;

    if (enemy.kind !== 'crystal' && enemy.kind !== 'dummy') {
      const knockDir = enemy.position.clone().sub(this.playerPos).normalize();
      enemy.position.addScaledVector(knockDir, enemy.kind === 'boss' ? 0.12 : 0.3);
      this.clampToEnemyArena(enemy);
      enemy.mesh.position.copy(enemy.position);
    }

    this.spawnFloatingText(
      enemy.position.clone().add(new THREE.Vector3(0, 2.1, 0)),
      res.isCrit ? `${res.value}!` : `${res.value}`,
      res.isCrit ? 'crit' : 'normal'
    );

    if (enemy.kind === 'dummy') {
      if (enemy.hp <= 0) enemy.hp = enemy.maxHp;
      return;
    }

    if (enemy.hp <= 0) {
      enemy.isDead = true;
      enemy.deathAnimTimer = 1.2;
      enemy.telegraphRing.visible = false;
      enemy.hpBarWrap.style.display = 'none';
      if (this.lockedTarget === enemy) this.lockedTarget = null;

      this.gainRewards(enemy.xpReward, enemy.goldReward, enemy.position);
      this.onEnemyKilledQuestCheck(enemy);
    }
  }

  private gainRewards(xpAmount: number, goldAmount: number, worldPos: THREE.Vector3): void {
    this.xp += xpAmount;
    this.gold += goldAmount;

    this.spawnFloatingText(
      worldPos.clone().add(new THREE.Vector3(0, 2.5, 0)),
      `+${xpAmount} XP  +${goldAmount} Gold`,
      'heal'
    );

    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.round(this.xpToNext * 1.35);
      this.maxHp += 24;
      this.hp = this.maxHp;
      this.maxMana += 12;
      this.mana = this.maxMana;
      this.def += 2;
      this.recalculateStats();
      this.audio.playHeroChime();
      this.spawnFloatingText(
        this.playerPos.clone().add(new THREE.Vector3(0, 2.6, 0)),
        `LEVEL UP! (Lv.${this.level})`,
        'crit'
      );
    }
  }

  private onEnemyKilledQuestCheck(enemy: CombatTarget): void {
    if (enemy.zone === 'overworld' && enemy.level <= 2) {
      this.riverKills = Math.min(this.riverKillsGoal, this.riverKills + 1);
      if (this.questStage <= 1 && this.riverKills >= this.riverKillsGoal) {
        this.questStage = 2;
        this.showNotificationBanner(
          'Tepi Sungai Aman! Sekarang jelajahi Hutan Berkabut, Rawa Kristal Barat, atau Benteng Timur!'
        );
      }
    } else if (
      enemy.zone === 'overworld' &&
      enemy.level >= 3 &&
      enemy.level <= 6 &&
      enemy.kind !== 'boss'
    ) {
      this.forestKills = Math.min(this.forestKillsGoal, this.forestKills + 1);
      if (this.questStage <= 2 && this.forestKills >= this.forestKillsGoal) {
        this.questStage = 3;
        this.showNotificationBanner(
          'Pasukan Luar Tumbang! Tantang Penjaga Gerbang Kuil (Lv.6) di Reruntuhan Ujung Selatan!'
        );
      }
    } else if (enemy.id === 'temple_guardian') {
      this.templeBossDefeated = true;
      if (this.questStage <= 3) {
        this.questStage = 4;
        this.showNotificationBanner(
          'Penjaga Kuil Tumbang! Portal Dungeon Katakombe Bayangan di belakang kuil telah aktif!'
        );
      }
    } else if (enemy.id === 'dungeon_boss_vaelgor') {
      this.dungeonBossDefeated = true;
      this.questStage = 5;
      this.showNotificationBanner(
        'KEMENANGAN MUTLAK! Raja Bayangan Vaelgor telah dikalahkan di Dungeon Katakombe!'
      );
    }
    this.refreshQuestUI();
  }

  private showNotificationBanner(msg: string): void {
    const toast = createPanel({ title: 'Pembaruan Petualangan' });
    toast.element.className += ' toast-banner';
    toast.element.style.width = '420px';
    toast.body.innerHTML = `<div style="font-size:14px;color:var(--color-bone-white);">${msg}</div>`;
    document.body.appendChild(toast.element);
    window.setTimeout(() => toast.element.remove(), 4200);
  }

  private calculateFormulaDamage(
    targetDef: number,
    skillMultiplier: number
  ): { value: number; isCrit: boolean } {
    const rand = 0.9 + Math.random() * 0.2;
    let raw = this.atk * skillMultiplier * (100 / (100 + targetDef)) * rand;
    const isCrit = Math.random() < 0.16;
    if (isCrit) raw *= 1.75;
    return { value: Math.max(1, Math.round(raw)), isCrit };
  }

  private useHealthPotion(): void {
    if (this.potionCooldown > 0 || this.potions <= 0 || this.hp >= this.maxHp) return;
    this.potions -= 1;
    this.hp = Math.min(this.maxHp, this.hp + 70);
    this.potionCooldown = 4.0;
    this.audio.playHeroChime();
    this.spawnFloatingText(
      this.playerPos.clone().add(new THREE.Vector3(0, 2.0, 0)),
      '+70 HP',
      'heal'
    );
  }

  private toggleLockOn(): void {
    if (this.lockedTarget) {
      this.lockedTarget = null;
      return;
    }
    let nearest: CombatTarget | null = null;
    let bestDist = 28;
    for (const e of this.enemies) {
      if (e.isDead) continue;
      const d = e.position.distanceTo(this.playerPos);
      if (d < bestDist) {
        bestDist = d;
        nearest = e;
      }
    }
    this.lockedTarget = nearest;
  }

  private handleContextInteraction(): void {
    if (this.activeModalEl) {
      this.closeInteractiveModal();
      return;
    }

    if (!this.inDungeon && this.playerPos.distanceTo(this.overworldPortalPos) < 4.2) {
      this.enterDungeon();
      return;
    }

    if (this.inDungeon && this.playerPos.distanceTo(this.dungeonExitPortalPos) < 4.2) {
      this.exitDungeon();
      return;
    }

    if (!this.inDungeon && this.playerPos.distanceTo(this.campfirePos) < 3.8) {
      this.hp = this.maxHp;
      this.mana = this.maxMana;
      this.stamina = this.maxStamina;
      this.enemies.forEach((e) => {
        e.isDead = false;
        e.hp = e.maxHp;
        e.attackState = 'none';
        e.telegraphRing.visible = false;
        e.position.copy(e.spawnOrigin);
        e.mesh.position.copy(e.spawnOrigin);
        e.mesh.rotation.set(0, 0, 0);
        e.mesh.visible = true;
      });
      this.audio.playHeroChime();
      this.showNotificationBanner(
        'Beristirahat di Api Unggun: HP & Mana pulih 100%, seluruh monster Overworld & Dungeon bangkit kembali!'
      );
      return;
    }

    const npc = this.findNearestNPC();
    if (!npc) return;

    this.openNPCDialogStep1(npc);
  }

  private enterDungeon(): void {
    this.inDungeon = true;
    this.lockedTarget = null;
    this.playerPos.set(300, 0, 263);
    this.playerVel.set(0, 0, 0);
    this.playerRotY = 0;
    this.camYaw = Math.PI;
    this.camSmoothPivot.set(300, 1.5, 263);
    this.scene.background = new THREE.Color(0x0d0a14);
    this.scene.fog = new THREE.FogExp2(0x140e21, 0.012);
    this.audio.playHeroChime();
    this.showNotificationBanner(
      'Memasuki Dungeon Katakombe Bayangan (Lv.7 - Lv.10)! Hati-hati terhadap serangan musuh elit.'
    );
  }

  private exitDungeon(): void {
    this.inDungeon = false;
    this.lockedTarget = null;
    this.playerPos.set(0, 0, 196);
    this.playerVel.set(0, 0, 0);
    this.playerRotY = Math.PI;
    this.camYaw = 0;
    this.camSmoothPivot.set(0, 1.5, 196);
    this.scene.background = new THREE.Color(0x1e293b);
    this.scene.fog = new THREE.FogExp2(0x28384d, 0.0028);
    this.audio.playHeroChime();
    this.showNotificationBanner('Kembali ke Overworld Reruntuhan Kuil Agung.');
  }

  private closeInteractiveModal(): void {
    if (this.activeModalEl) {
      this.activeModalEl.remove();
      this.activeModalEl = null;
    }
    this.isModalOpen = false;
  }

  private openNPCDialogStep1(npc: VillageNPC): void {
    this.closeInteractiveModal();
    this.isModalOpen = true;
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    this.audio.playClick();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ui-interactive';

    const dialogPanel = createPanel({
      title: `${npc.name} — ${npc.role}`,
      className: 'modal-box'
    });
    dialogPanel.element.style.width = 'min(660px, 94vw)';

    const greetingP = document.createElement('p');
    greetingP.style.cssText =
      'font-size:16px;line-height:1.55;margin-bottom:20px;color:var(--color-bone-white);padding:12px 14px;background:rgba(18,20,28,0.65);border-left:3px solid var(--color-gold-light);border-radius:4px;';
    greetingP.textContent = `"${npc.greeting}"`;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;';

    if (npc.id === 'brann') {
      const openForgeBtn = createButton({
        label: '⚒️ Buka Menu Pilih & Upgrade Senjata',
        variant: 'primary',
        icon: 'sparkle',
        audio: this.audio,
        onClick: () => this.openBlacksmithWeaponUI()
      });
      openForgeBtn.style.flex = '1.6';
      btnRow.appendChild(openForgeBtn);
    } else if (npc.id === 'celeste') {
      const openGachaBtn = createButton({
        label: '✨ Buka Menu Gacha Pusaka Cahaya',
        variant: 'primary',
        icon: 'sparkle',
        audio: this.audio,
        onClick: () => this.openGachaShrineUI()
      });
      openGachaBtn.style.flex = '1.6';
      btnRow.appendChild(openGachaBtn);
    } else if (npc.id === 'lysa') {
      const openShopBtn = createButton({
        label: '🧪 Buka Toko Ramuan & Elixir',
        variant: 'primary',
        icon: 'potionHp',
        audio: this.audio,
        onClick: () => this.openAlchemistShopUI()
      });
      openShopBtn.style.flex = '1.6';
      btnRow.appendChild(openShopBtn);
    } else if (npc.id === 'maren') {
      const questBtn = createButton({
        label:
          this.questStage === 0
            ? '📜 Terima Misi Petualangan & Hadiah Awal (+50 Gold)'
            : '📜 Lapor Progres Misi',
        variant: 'primary',
        icon: 'sparkle',
        audio: this.audio,
        onClick: () => {
          if (this.questStage === 0) {
            this.questStage = 1;
            this.gold += 50;
            this.audio.playHeroChime();
            this.showNotificationBanner(
              'Misi Diterima! Kamu menerima bekal +50 Gold dari Tetua Maren.'
            );
          } else {
            this.showNotificationBanner(
              'Tetua Maren: Jelajahi Barat, Timur, dan Selatan hingga ke Dungeon Katakombe!'
            );
          }
          this.refreshQuestUI();
          this.closeInteractiveModal();
        }
      });
      questBtn.style.flex = '1.6';
      btnRow.appendChild(questBtn);
    }

    const closeBtn = createButton({
      label: 'Tutup Percakapan (Esc)',
      audio: this.audio,
      onClick: () => this.closeInteractiveModal()
    });
    closeBtn.style.flex = '1';
    btnRow.appendChild(closeBtn);

    dialogPanel.body.append(greetingP, btnRow);
    backdrop.appendChild(dialogPanel.element);
    document.body.appendChild(backdrop);
    this.activeModalEl = backdrop;
  }

  private openBlacksmithWeaponUI(statusMessage?: string): void {
    this.closeInteractiveModal();
    this.isModalOpen = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ui-interactive';

    const modal = createPanel({
      title: '⚒️ Bengkel Brann — Pilih & Tempa Senjata',
      className: 'modal-box'
    });
    modal.element.style.width = 'min(760px, 95vw)';

    const headerInfo = document.createElement('div');
    headerInfo.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(18,20,28,0.8);border:1px solid var(--panel-border-subtle);border-radius:6px;margin-bottom:14px;font-size:14px;';
    headerInfo.innerHTML = `
      <span>🪙 Gold Kamu: <strong style="color:var(--color-gold-light)">${this.gold} Gold</strong></span>
      <span>⚔️ Dipakai: <strong style="color:${getRarityColor(this.equippedWeapon.rarity)}">${
        this.equippedWeapon.name
      } +${this.equippedWeapon.upgradeLevel}</strong> (Total ATK Karakter: <b>${this.atk}</b>)</span>
    `;

    const listWrap = document.createElement('div');
    listWrap.style.cssText =
      'display:flex;flex-direction:column;gap:10px;max-height:52vh;overflow-y:auto;padding-right:4px;margin-bottom:14px;';

    this.ownedWeapons.forEach((w) => {
      const isEquipped = w.id === this.equippedWeapon.id;
      const upgradeCost = 40 + w.upgradeLevel * 30;
      const currentWeaponAtk = this.getWeaponTotalAtk(w);
      const nextWeaponAtk = currentWeaponAtk + 5;

      const card = document.createElement('div');
      card.style.cssText = `
        display:flex;justify-content:space-between;align-items:center;gap:14px;
        padding:12px 16px;border-radius:8px;
        background:${isEquipped ? 'rgba(242,193,78,0.14)' : 'rgba(18,20,28,0.82)'};
        border:1.5px solid ${isEquipped ? 'var(--color-gold-light)' : getRarityColor(w.rarity)};
      `;

      const leftInfo = document.createElement('div');
      leftInfo.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:14px;height:14px;border-radius:50%;background:#${w.colorHex
            .toString(16)
            .padStart(6, '0')};display:inline-block;box-shadow:0 0 8px #${w.colorHex
        .toString(16)
        .padStart(6, '0')};"></span>
          <strong style="font-family:var(--font-title);font-size:16px;color:${getRarityColor(
            w.rarity
          )}">${w.name} +${w.upgradeLevel}</strong>
          <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#12141c;color:${getRarityColor(
            w.rarity
          )};border:1px solid ${getRarityColor(w.rarity)}">${w.rarity}</span>
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:3px;">${w.description}</div>
        <div style="font-size:13px;color:var(--color-bone-white);margin-top:4px;">
          ATK Senjata: <b style="color:var(--color-gold-light)">+${currentWeaponAtk}</b> 
          <span style="color:var(--color-bar-stamina)">(Tempa ke +${
            w.upgradeLevel + 1
          } -> +${nextWeaponAtk} ATK)</span>
        </div>
      `;

      const actionCol = document.createElement('div');
      actionCol.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

      const equipBtn = createButton({
        label: isEquipped ? '✓ Dipakai' : 'Pakai Senjata',
        disabled: isEquipped,
        audio: this.audio,
        onClick: () => {
          this.equippedWeapon = w;
          this.recalculateStats();
          this.audio.playHeroChime();
          this.openBlacksmithWeaponUI(`Senjata "${w.name}" berhasil digunakan!`);
        }
      });
      equipBtn.style.minHeight = '40px';
      equipBtn.style.padding = '8px 14px';
      equipBtn.style.fontSize = '13px';

      const upgBtn = createButton({
        label: `Tempa +${w.upgradeLevel + 1} (${upgradeCost}G)`,
        variant: 'primary',
        disabled: this.gold < upgradeCost,
        audio: this.audio,
        onClick: () => {
          if (this.gold < upgradeCost) return;
          this.gold -= upgradeCost;
          w.upgradeLevel += 1;
          this.recalculateStats();
          this.audio.playHeroChime();
          this.openBlacksmithWeaponUI(
            `BERHASIL TEMPA! ${w.name} naik ke +${w.upgradeLevel} (ATK Senjata menjadi +${this.getWeaponTotalAtk(
              w
            )})!`
          );
        }
      });
      upgBtn.style.minHeight = '40px';
      upgBtn.style.padding = '8px 14px';
      upgBtn.style.fontSize = '13px';

      actionCol.append(equipBtn, upgBtn);
      card.append(leftInfo, actionCol);
      listWrap.appendChild(card);
    });

    modal.body.append(headerInfo);

    if (statusMessage) {
      const msgBanner = document.createElement('div');
      msgBanner.style.cssText =
        'padding:9px 14px;margin-bottom:12px;border-radius:6px;background:rgba(79,166,106,0.2);border:1px solid var(--color-bar-stamina);color:var(--color-bone-white);font-size:14px;font-weight:600;';
      msgBanner.textContent = statusMessage;
      modal.body.appendChild(msgBanner);
    }

    const closeBtn = createButton({
      label: 'Selesai & Kembali ke Desa (Esc)',
      audio: this.audio,
      onClick: () => this.closeInteractiveModal()
    });
    closeBtn.style.width = '100%';

    modal.body.append(listWrap, closeBtn);
    backdrop.appendChild(modal.element);
    document.body.appendChild(backdrop);
    this.activeModalEl = backdrop;
  }

  private openGachaShrineUI(pulledResults?: Array<{ weapon: WeaponItem; isNew: boolean }>): void {
    this.closeInteractiveModal();
    this.isModalOpen = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ui-interactive';

    const modal = createPanel({
      title: '✨ Altar Gacha Pusaka Bintang — Pendeta Celeste',
      className: 'modal-box'
    });
    modal.element.style.width = 'min(760px, 95vw)';

    const topInfo = document.createElement('div');
    topInfo.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(18,20,28,0.85);border:1px solid var(--panel-border-subtle);border-radius:6px;margin-bottom:14px;font-size:13px;';
    topInfo.innerHTML = `
      <span>🪙 Gold Kamu: <strong style="color:var(--color-gold-light);font-size:15px;">${this.gold} Gold</strong></span>
      <span>Peluang: <b style="color:#D9D9D9">Biasa 45%</b> • <b style="color:#4DA3FF">Langka 32%</b> • <b style="color:#B66BFF">Epik 16%</b> • <b style="color:#F2C14E">Legendaris 7%</b></span>
    `;
    modal.body.appendChild(topInfo);

    const resultArea = document.createElement('div');
    resultArea.style.cssText =
      'min-height:170px;padding:14px;border:1px solid var(--panel-border-subtle);border-radius:8px;background:rgba(12,14,20,0.85);margin-bottom:16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;';

    if (!pulledResults || pulledResults.length === 0) {
      resultArea.innerHTML = `
        <div style="text-align:center;color:var(--text-muted);font-size:14px;">
          <div style="font-family:var(--font-title);color:var(--color-gold-light);font-size:17px;margin-bottom:4px;">Panggil Senjata Pusaka dari Bintang Aethermoor!</div>
          Senjata baru akan langsung masuk ke Gudang Senjata Brann.<br>Jika kamu mendapatkan senjata yang sudah dimiliki, senjata tersebut otomatis naik <b>+1 Level Tempa</b>!
        </div>
      `;
    } else {
      pulledResults.forEach((res) => {
        const col = getRarityColor(res.weapon.rarity);
        const card = document.createElement('div');
        card.style.cssText = `
          width:132px;padding:10px;border-radius:8px;text-align:center;
          background:radial-gradient(circle at top, rgba(255,255,255,0.08), #12141c);
          border:2px solid ${col};box-shadow:0 0 16px ${col}44;
          animation:panelFadeSlideIn 220ms ease-out;
        `;
        card.innerHTML = `
          <div style="font-size:11px;font-weight:700;color:${col};text-transform:uppercase;">★ ${
          res.weapon.rarity
        }</div>
          <div style="width:26px;height:26px;border-radius:50%;background:#${res.weapon.colorHex
            .toString(16)
            .padStart(6, '0')};margin:8px auto;box-shadow:0 0 12px #${res.weapon.colorHex
          .toString(16)
          .padStart(6, '0')};"></div>
          <div style="font-family:var(--font-title);font-size:13px;font-weight:700;color:var(--color-bone-white);line-height:1.25;">${
            res.weapon.name
          }</div>
          <div style="font-size:12px;color:var(--color-gold-light);margin-top:4px;">ATK Dasar +${
            res.weapon.baseAtk
          }</div>
          <div style="font-size:11px;margin-top:4px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.5);color:${
            res.isNew ? '#4FA66A' : '#5FB7E5'
          };font-weight:700;">
            ${res.isNew ? 'SENJATA BARU!' : `DUPLIKAT -> +${res.weapon.upgradeLevel}!`}
          </div>
        `;
        resultArea.appendChild(card);
      });
    }
    modal.body.appendChild(resultArea);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;';

    const pull1Btn = createButton({
      label: '✨ Gacha 1x Pusaka (50 Gold)',
      variant: 'primary',
      disabled: this.gold < 50,
      audio: this.audio,
      onClick: () => this.performGachaPulls(1, 50)
    });
    pull1Btn.style.flex = '1';

    const pull5Btn = createButton({
      label: '🌟 Gacha 5x Pusaka (200 Gold - Hemat!)',
      variant: 'primary',
      disabled: this.gold < 200,
      audio: this.audio,
      onClick: () => this.performGachaPulls(5, 200)
    });
    pull5Btn.style.flex = '1.2';

    const goEquipBtn = createButton({
      label: '⚒️ Lihat & Pakai Senjata',
      audio: this.audio,
      onClick: () => this.openBlacksmithWeaponUI()
    });

    const closeBtn = createButton({
      label: 'Tutup (Esc)',
      audio: this.audio,
      onClick: () => this.closeInteractiveModal()
    });

    btnRow.append(pull1Btn, pull5Btn, goEquipBtn, closeBtn);
    modal.body.appendChild(btnRow);

    backdrop.appendChild(modal.element);
    document.body.appendChild(backdrop);
    this.activeModalEl = backdrop;
  }

  private performGachaPulls(count: number, totalCost: number): void {
    if (this.gold < totalCost) return;
    this.gold -= totalCost;
    this.audio.playHeroChime();

    const results: Array<{ weapon: WeaponItem; isNew: boolean }> = [];

    for (let i = 0; i < count; i++) {
      const roll = Math.random() * 100;
      let targetRarity: RarityTier = 'Biasa';
      if (roll < 7) targetRarity = 'Legendaris';
      else if (roll < 23) targetRarity = 'Epik';
      else if (roll < 55) targetRarity = 'Langka';

      const candidates = GACHA_WEAPON_POOL.filter((w) => w.rarity === targetRarity);
      const pickedTemplate =
        candidates[Math.floor(Math.random() * candidates.length)] ?? GACHA_WEAPON_POOL[0];

      const existing = this.ownedWeapons.find((w) => w.id === pickedTemplate.id);
      if (existing) {
        existing.upgradeLevel += 1;
        results.push({ weapon: existing, isNew: false });
      } else {
        const newWeapon: WeaponItem = { ...pickedTemplate, upgradeLevel: 0 };
        this.ownedWeapons.push(newWeapon);
        results.push({ weapon: newWeapon, isNew: true });
      }
    }

    this.recalculateStats();
    this.openGachaShrineUI(results);
  }

  private openAlchemistShopUI(statusMsg?: string): void {
    this.closeInteractiveModal();
    this.isModalOpen = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ui-interactive';

    const modal = createPanel({
      title: '🧪 Toko Apoteker Lysa — Ramuan & Tonik',
      className: 'modal-box'
    });

    const infoBar = document.createElement('div');
    infoBar.style.cssText =
      'display:flex;justify-content:space-between;padding:10px 14px;background:rgba(18,20,28,0.8);border-radius:6px;margin-bottom:12px;font-size:14px;';
    infoBar.innerHTML = `
      <span>🪙 Gold Kamu: <b style="color:var(--color-gold-light)">${this.gold} Gold</b></span>
      <span>🧪 Tas Ramuan: <b>${this.potions} Botol</b> • HP: <b>${this.hp}/${this.maxHp}</b></span>
    `;
    modal.body.appendChild(infoBar);

    if (statusMsg) {
      const banner = document.createElement('div');
      banner.style.cssText =
        'padding:8px 12px;margin-bottom:12px;border-radius:6px;background:rgba(79,166,106,0.2);border:1px solid var(--color-bar-stamina);font-size:13px;';
      banner.textContent = statusMsg;
      modal.body.appendChild(banner);
    }

    const itemsWrap = document.createElement('div');
    itemsWrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-bottom:14px;';

    const buyPotBtn = createButton({
      label: '🧪 Beli 1 Botol Ramuan HP (+70 HP saat menekan [R]) — 25 Gold',
      variant: 'primary',
      disabled: this.gold < 25,
      audio: this.audio,
      onClick: () => {
        this.gold -= 25;
        this.potions += 1;
        this.audio.playHeroChime();
        this.openAlchemistShopUI('Berhasil membeli 1 Botol Ramuan HP!');
      }
    });

    const buyVitalityBtn = createButton({
      label: '❤️ Tonik Vitalitas Permanen (+35 Max HP & Pulih Penuh) — 60 Gold',
      disabled: this.gold < 60,
      audio: this.audio,
      onClick: () => {
        this.gold -= 60;
        this.maxHp += 35;
        this.hp = this.maxHp;
        this.audio.playHeroChime();
        this.openAlchemistShopUI(`Max HP meningkat permanen menjadi ${this.maxHp}!`);
      }
    });

    const closeBtn = createButton({
      label: 'Selesai & Tutup Toko (Esc)',
      audio: this.audio,
      onClick: () => this.closeInteractiveModal()
    });

    itemsWrap.append(buyPotBtn, buyVitalityBtn, closeBtn);
    modal.body.appendChild(itemsWrap);
    backdrop.appendChild(modal.element);
    document.body.appendChild(backdrop);
    this.activeModalEl = backdrop;
  }

  private findNearestNPC(): VillageNPC | null {
    if (this.inDungeon) return null;
    for (const npc of this.npcs) {
      if (npc.position.distanceTo(this.playerPos) < 3.6) return npc;
    }
    return null;
  }

  private togglePauseMenu(): void {
    if (this.pauseModalEl) {
      this.pauseModalEl.remove();
      this.pauseModalEl = null;
      this.isPaused = false;
      return;
    }

    this.isPaused = true;
    if (document.pointerLockElement) document.exitPointerLock();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop ui-interactive';

    const modal = createPanel({ title: 'Menu Jeda — Aethermoor', className: 'modal-box' });
    modal.body.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

    const btnResume = createButton({
      label: 'Lanjutkan Permainan (Esc)',
      variant: 'primary',
      audio: this.audio,
      onClick: () => this.togglePauseMenu()
    });

    const btnSettings = createButton({
      label: 'Pengaturan Grafis & Audio',
      audio: this.audio,
      onClick: () => this.menuManager.openSettingsModal()
    });

    const btnMainMenu = createButton({
      label: 'Kembali ke Menu Utama',
      variant: 'danger',
      audio: this.audio,
      onClick: () => {
        this.togglePauseMenu();
        this.destroy();
        this.bus.emit('ui:navigate', { screen: 'main-menu' });
      }
    });

    modal.body.append(btnResume, btnSettings, btnMainMenu);
    backdrop.appendChild(modal.element);
    document.body.appendChild(backdrop);
    this.pauseModalEl = backdrop;
  }

  private spawnFloatingText(
    worldPos: THREE.Vector3,
    text: string,
    type: 'normal' | 'crit' | 'heal'
  ): void {
    const projected = worldPos.clone().project(this.camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:150;
      font-family:var(--font-title);font-weight:800;
      font-size:${type === 'crit' ? '26px' : '19px'};
      color:${
        type === 'crit'
          ? 'var(--color-gold-light)'
          : type === 'heal'
          ? 'var(--color-bar-stamina)'
          : 'var(--color-bone-white)'
      };
      text-shadow:0 2px 8px var(--color-night-black),0 0 4px var(--color-night-black);
      transform:translate(-50%,-50%);transition:opacity 180ms ease-out;white-space:nowrap;
    `;
    document.body.appendChild(el);

    let dy = 0;
    const timer = window.setInterval(() => {
      dy -= 2;
      el.style.transform = `translate(-50%, calc(-50% + ${dy}px))`;
    }, 16);

    window.setTimeout(() => {
      el.style.opacity = '0';
      window.setTimeout(() => {
        window.clearInterval(timer);
        el.remove();
      }, 180);
    }, 680);
  }

  public update(elapsedTime: number, deltaTime: number): void {
    if (this.isPaused) return;

    this.fountainCrystal.rotation.y = elapsedTime * 1.4;
    this.fountainRing.rotation.x = Math.sin(elapsedTime) * 0.6;
    this.fountainRing.rotation.y = elapsedTime * 0.9;
    this.overworldPortalRing.rotation.z = elapsedTime * 2.0;
    this.dungeonExitRing.rotation.z = -elapsedTime * 2.0;
    this.riverMesh.position.y = 0.08 + Math.sin(elapsedTime * 2.5) * 0.025;
    this.windmillBlades.forEach((wb) => {
      wb.rotation.z = elapsedTime * 0.85;
    });

    // Update Perisai Orbit Ksatria saat Skill 3 Aktif
    if (this.defBuffTimer > 0) {
      this.guardianOrbitGroup.visible = true;
      this.guardianOrbitGroup.rotation.y = elapsedTime * 3.8;
    } else {
      this.guardianOrbitGroup.visible = false;
    }

    this.npcs.forEach((n) => {
      n.rig.updateAnimation(elapsedTime, deltaTime, false);
      n.marker.rotation.y = elapsedTime * 2.2;
      n.marker.position.y = 2.35 + Math.sin(elapsedTime * 3) * 0.07;
    });

    // Update Seluruh Animasi VFX Skill 3D
    for (const vfx of this.vfxList) {
      vfx.age += deltaTime;
      const progress = Math.min(1, vfx.age / vfx.duration);
      vfx.onUpdate(vfx.age, deltaTime, progress);
      if (vfx.age >= vfx.duration) {
        this.scene.remove(vfx.group);
      }
    }
    this.vfxList = this.vfxList.filter((v) => v.age < v.duration);

    if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
    if (this.attackAnimTimer > 0) this.attackAnimTimer -= deltaTime;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= deltaTime;
    if (this.defBuffTimer > 0) this.defBuffTimer -= deltaTime;
    if (this.camShake > 0) this.camShake = Math.max(0, this.camShake - deltaTime * 2.5);
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= deltaTime;
      if (this.comboResetTimer <= 0) this.comboStep = 0;
    }
    if (this.potionCooldown > 0) this.potionCooldown = Math.max(0, this.potionCooldown - deltaTime);
    for (let i = 0; i < 3; i++) {
      if (this.skillCooldowns[i] > 0) {
        this.skillCooldowns[i] = Math.max(0, this.skillCooldowns[i] - deltaTime);
      }
    }

    if (this.rightMouseDown) {
      this.chargeTime += deltaTime;
      this.isBlocking = this.profile.classId === 'knight';
    }

    if (this.staminaRegenDelay > 0) {
      this.staminaRegenDelay -= deltaTime;
    } else if (this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 24 * deltaTime);
    }
    if (this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + 4.5 * deltaTime);
    }

    if (this.isModalOpen) {
      this.playerVel.set(0, 0, 0);
      this.animatePlayerRig(elapsedTime, deltaTime, false);
      this.updateCamera(deltaTime, false);
      this.updateHUD();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const moveX =
      (this.keys.get('KeyD') || this.keys.get('ArrowRight') ? 1 : 0) -
      (this.keys.get('KeyA') || this.keys.get('ArrowLeft') ? 1 : 0);
    const moveZ =
      (this.keys.get('KeyS') || this.keys.get('ArrowDown') ? 1 : 0) -
      (this.keys.get('KeyW') || this.keys.get('ArrowUp') ? 1 : 0);
    const inputVec = new THREE.Vector3(moveX, 0, moveZ);
    const hasMoveInput = inputVec.lengthSq() > 0.01;

    const sprinting = !!this.keys.get('ShiftLeft') && hasMoveInput && this.stamina > 2;
    if (sprinting) this.consumeStamina(8 * deltaTime);
    const targetSpeed = sprinting ? this.baseSpeed * 1.48 : this.baseSpeed;

    if (this.isRolling) {
      this.rollTimer -= deltaTime;
      const rollDir = new THREE.Vector3(Math.sin(this.playerRotY), 0, Math.cos(this.playerRotY));
      this.playerPos.addScaledVector(rollDir, this.baseSpeed * 1.95 * deltaTime);
      this.playerRig.root.rotation.x = ((0.42 - this.rollTimer) / 0.42) * Math.PI * 2;
      if (this.rollTimer <= 0) {
        this.isRolling = false;
        this.playerRig.root.rotation.x = 0;
      }
    } else {
      if (hasMoveInput) {
        inputVec.normalize();
        const desiredYaw = Math.atan2(inputVec.x, inputVec.z) + this.camYaw;

        let angleDiff = ((desiredYaw - this.playerRotY + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.turnLean = THREE.MathUtils.lerp(
          this.turnLean,
          THREE.MathUtils.clamp(-angleDiff * 0.32, -0.22, 0.22),
          deltaTime * 10
        );

        this.playerRotY = lerpAngle(this.playerRotY, desiredYaw, deltaTime * 13);

        const desiredVel = new THREE.Vector3(
          Math.sin(desiredYaw) * targetSpeed,
          0,
          Math.cos(desiredYaw) * targetSpeed
        );
        this.playerVel.lerp(desiredVel, 1 - Math.exp(-12 * deltaTime));
      } else {
        this.turnLean = THREE.MathUtils.lerp(this.turnLean, 0, deltaTime * 10);
        this.playerVel.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(-10 * deltaTime));

        if (this.lockedTarget && !this.lockedTarget.isDead) {
          const lockYaw = Math.atan2(
            this.lockedTarget.position.x - this.playerPos.x,
            this.lockedTarget.position.z - this.playerPos.z
          );
          this.playerRotY = lerpAngle(this.playerRotY, lockYaw, deltaTime * 12);
        }
      }

      this.playerPos.addScaledVector(this.playerVel, deltaTime);
    }

    this.velocityY -= 19.6 * deltaTime;
    this.playerPos.y += this.velocityY * deltaTime;
    if (this.playerPos.y <= 0) {
      this.playerPos.y = 0;
      this.velocityY = 0;
      this.isGrounded = true;
    }

    this.resolveCollisions();
    this.animatePlayerRig(elapsedTime, deltaTime, sprinting);

    for (const p of this.projectiles) {
      p.life -= deltaTime;
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      p.mesh.rotation.z += deltaTime * 15;
      for (const e of this.enemies) {
        if (e.isDead) continue;
        if (p.mesh.position.distanceTo(e.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.35) {
          this.applyDamageToEnemy(e, p.multiplier);
          p.life = 0;
          break;
        }
      }
      if (p.life <= 0) this.scene.remove(p.mesh);
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);

    this.updateEnemies(elapsedTime, deltaTime);
    this.updateCamera(deltaTime, sprinting);
    this.updateHUD();

    this.renderer.render(this.scene, this.camera);
  }

  private animatePlayerRig(elapsedTime: number, deltaTime: number, isSprinting: boolean): void {
    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.playerRotY;

    this.playerRig.updateAnimation(elapsedTime, deltaTime, false);
    const bones = this.playerRig.bones;

    const speedRatio = Math.min(1.4, this.playerVel.length() / this.baseSpeed);
    const targetBlend = speedRatio > 0.08 ? Math.min(1, speedRatio) : 0;
    this.moveBlend = THREE.MathUtils.lerp(this.moveBlend, targetBlend, deltaTime * 11);

    const cycleFreq = isSprinting ? 13.5 : 9.8;
    if (this.moveBlend > 0.02) {
      this.walkCycleTime += deltaTime * cycleFreq * Math.max(0.45, speedRatio);
    }

    const phase = this.walkCycleTime;
    const stride = (isSprinting ? 0.82 : 0.62) * this.moveBlend;

    if (bones['Hips']) {
      bones['Hips'].position.y =
        0.95 +
        Math.abs(Math.sin(phase)) * 0.065 * this.moveBlend +
        Math.sin(elapsedTime * 2.2) * 0.012 * (1 - this.moveBlend);
      bones['Hips'].rotation.y = Math.sin(phase) * 0.1 * this.moveBlend;
    }

    if (bones['Chest']) {
      bones['Chest'].rotation.x =
        (isSprinting ? 0.22 : 0.12) * this.moveBlend +
        Math.sin(elapsedTime * 2.2) * 0.02 * (1 - this.moveBlend);
      bones['Chest'].rotation.y = -Math.sin(phase) * 0.12 * this.moveBlend;
      bones['Chest'].rotation.z = this.turnLean;
    }

    if (bones['LeftUpLeg'] && bones['RightUpLeg']) {
      bones['LeftUpLeg'].rotation.x = Math.sin(phase) * stride;
      bones['RightUpLeg'].rotation.x = Math.sin(phase + Math.PI) * stride;
    }
    if (bones['LeftLeg'] && bones['RightLeg']) {
      bones['LeftLeg'].rotation.x = Math.max(0, Math.sin(phase - 1.1)) * stride * 1.15;
      bones['RightLeg'].rotation.x = Math.max(0, Math.sin(phase + Math.PI - 1.1)) * stride * 1.15;
    }
    if (bones['LeftFoot'] && bones['RightFoot']) {
      bones['LeftFoot'].rotation.x = Math.cos(phase) * 0.22 * this.moveBlend;
      bones['RightFoot'].rotation.x = Math.cos(phase + Math.PI) * 0.22 * this.moveBlend;
    }

    if (bones['LeftArm'] && bones['RightArm'] && bones['LeftForeArm'] && bones['RightForeArm']) {
      if (this.isBlocking) {
        bones['LeftArm'].rotation.set(-0.95, 0.55, 0);
        bones['LeftForeArm'].rotation.set(0, 0, 0.45);
      } else {
        bones['LeftArm'].rotation.x = Math.sin(phase + Math.PI) * stride * 0.7 - 0.18;
        bones['LeftArm'].rotation.y = 0;
        bones['LeftForeArm'].rotation.x = -0.35 - Math.max(0, Math.sin(phase + Math.PI)) * 0.3;
      }

      if (this.attackAnimTimer > 0) {
        const p = 1 - this.attackAnimTimer / this.attackAnimDuration;
        const swingArc = Math.sin(p * Math.PI);
        if (this.activeAttackCombo === 0) {
          bones['RightArm'].rotation.x = THREE.MathUtils.lerp(-1.85, 0.45, p);
          bones['RightArm'].rotation.z = THREE.MathUtils.lerp(-0.45, 0.35, p);
          bones['RightForeArm'].rotation.x = -0.45 * swingArc;
          if (bones['Chest']) bones['Chest'].rotation.y = THREE.MathUtils.lerp(-0.35, 0.4, p);
        } else if (this.activeAttackCombo === 1) {
          bones['RightArm'].rotation.x = THREE.MathUtils.lerp(-1.2, 0.3, p);
          bones['RightArm'].rotation.z = THREE.MathUtils.lerp(0.55, -0.55, p);
          if (bones['Chest']) bones['Chest'].rotation.y = THREE.MathUtils.lerp(0.4, -0.4, p);
        } else {
          bones['RightArm'].rotation.x = THREE.MathUtils.lerp(-2.35, 0.65, p);
          bones['RightArm'].rotation.z = 0;
          if (bones['Chest']) bones['Chest'].rotation.x += 0.35 * swingArc;
        }
      } else {
        bones['RightArm'].rotation.x = Math.sin(phase) * stride * 0.7 - 0.2;
        bones['RightArm'].rotation.z = 0;
        bones['RightForeArm'].rotation.x = -0.25 - Math.max(0, Math.sin(phase)) * 0.25;
      }
    }
  }

  private updateEnemies(elapsedTime: number, deltaTime: number): void {
    for (const e of this.enemies) {
      if (e.isDead) {
        if (e.deathAnimTimer > 0) {
          e.deathAnimTimer -= deltaTime;
          e.mesh.rotation.z = Math.min(Math.PI / 2, (1.2 - e.deathAnimTimer) * 1.8);
          e.mesh.position.y = Math.max(-0.8, (e.deathAnimTimer - 1.2) * 0.5);
          if (e.deathAnimTimer <= 0) {
            e.mesh.visible = false;
          }
        }
        continue;
      }

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= deltaTime;
        e.mesh.position.y = Math.sin(e.hitFlashTimer * 35) * 0.08;
      } else {
        e.mesh.position.y = 0;
      }

      const distToPlayer = e.position.distanceTo(this.playerPos);

      if (distToPlayer < 28 && e.kind !== 'dummy') {
        const headPos = e.position
          .clone()
          .add(new THREE.Vector3(0, e.kind === 'boss' ? 3.2 : 2.1, 0));
        const proj = headPos.project(this.camera);
        if (proj.z < 1) {
          const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
          const sy = (-proj.y * 0.5 + 0.5) * window.innerHeight;
          e.hpBarWrap.style.display = 'flex';
          e.hpBarWrap.style.left = `${sx}px`;
          e.hpBarWrap.style.top = `${sy}px`;
          e.hpBarFill.style.width = `${(e.hp / e.maxHp) * 100}%`;
        } else {
          e.hpBarWrap.style.display = 'none';
        }
      } else {
        e.hpBarWrap.style.display = 'none';
      }

      if (e.atk <= 0) continue;

      const playerDistFromEnemySpawn = this.playerPos.distanceTo(e.spawnOrigin);
      const attackReach = e.kind === 'boss' ? 2.5 : 2.0;

      if (e.attackCooldown > 0) e.attackCooldown -= deltaTime;

      if (e.kind === 'boss' && playerDistFromEnemySpawn > e.arenaRadius + 1.2) {
        e.attackState = 'none';
        e.telegraphRing.visible = false;
        const distFromSpawn = e.position.distanceTo(e.spawnOrigin);
        if (distFromSpawn > 0.8) {
          e.isMoving = true;
          const backDir = e.spawnOrigin.clone().sub(e.position).normalize();
          e.position.addScaledVector(backDir, 4.5 * deltaTime);
          this.clampToEnemyArena(e);
          e.mesh.position.copy(e.position);
          e.mesh.rotation.y = lerpAngle(
            e.mesh.rotation.y,
            Math.atan2(backDir.x, backDir.z),
            deltaTime * 10
          );
        } else {
          e.isMoving = false;
        }
        this.animateEnemyLimbs(e, elapsedTime, deltaTime);
        continue;
      }

      if (e.attackState !== 'none') {
        e.isMoving = false;
        e.attackAnimTimer -= deltaTime;

        if (e.attackState === 'windup') {
          const toPlayer = this.playerPos.clone().sub(e.position);
          if (toPlayer.lengthSq() > 0.01) {
            const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
            e.mesh.rotation.y = lerpAngle(e.mesh.rotation.y, targetYaw, deltaTime * 10);
            e.strikeDir.set(Math.sin(e.mesh.rotation.y), 0, Math.cos(e.mesh.rotation.y));
          }
          e.telegraphRing.visible = true;
          const pulse = 0.85 + Math.sin(elapsedTime * 22) * 0.15;
          e.telegraphRing.scale.set(pulse, pulse, 1);

          if (e.attackAnimTimer <= 0) {
            e.attackState = 'strike';
            e.attackAnimTimer = 0.25;
            e.hasDealtStrikeDamage = false;
            e.telegraphRing.visible = false;
            this.spawnSlashArc(
              e.position,
              e.mesh.rotation.y,
              0xd64545,
              e.kind === 'boss' ? 1.55 : 0.95,
              0.15
            );
          }
        } else if (e.attackState === 'strike') {
          const lungeSpeed = e.kind === 'wolf' ? 5.6 : e.kind === 'boss' ? 4.2 : 3.5;
          e.position.addScaledVector(e.strikeDir, lungeSpeed * deltaTime);
          this.clampToEnemyArena(e);
          e.mesh.position.copy(e.position);

          if (!e.hasDealtStrikeDamage && e.attackAnimTimer <= 0.15) {
            e.hasDealtStrikeDamage = true;
            const strikePoint = e.position
              .clone()
              .addScaledVector(e.strikeDir, e.kind === 'boss' ? 1.5 : 1.0);
            const hitRadius = e.kind === 'boss' ? 2.4 : 1.75;

            if (strikePoint.distanceTo(this.playerPos) <= hitRadius) {
              this.dealEnemyDamageToPlayer(e);
            }
          }

          if (e.attackAnimTimer <= 0) {
            e.attackState = 'recover';
            e.attackAnimTimer = 0.38;
          }
        } else if (e.attackState === 'recover') {
          if (e.attackAnimTimer <= 0) {
            e.attackState = 'none';
            e.attackCooldown = e.kind === 'boss' ? 1.15 : 1.35;
          }
        }

        this.animateEnemyLimbs(e, elapsedTime, deltaTime);
        continue;
      }

      const aggroRange = e.kind === 'boss' ? e.arenaRadius : 14;
      const distFromSpawn = e.position.distanceTo(e.spawnOrigin);

      if (
        distToPlayer < aggroRange &&
        playerDistFromEnemySpawn <= e.arenaRadius + 1.5 &&
        (this.inDungeon || this.playerPos.z > 43)
      ) {
        const dir = this.playerPos.clone().sub(e.position);
        dir.y = 0;
        const targetYaw = Math.atan2(dir.x, dir.z);
        e.mesh.rotation.y = lerpAngle(e.mesh.rotation.y, targetYaw, deltaTime * 10);

        if (distToPlayer > attackReach) {
          e.isMoving = true;
          dir.normalize();
          const moveSpeed =
            e.kind === 'boss' ? 4.2 : e.kind === 'wolf' ? 4.4 : e.kind === 'slime' ? 3.2 : 3.9;
          e.position.addScaledVector(dir, moveSpeed * deltaTime);
          this.clampToEnemyArena(e);
          e.mesh.position.copy(e.position);
        } else {
          e.isMoving = false;
          if (e.attackCooldown <= 0) {
            e.attackState = 'windup';
            e.attackAnimTimer = e.kind === 'boss' ? 0.48 : 0.4;
            e.strikeDir.copy(dir.normalize());
          }
        }
      } else if (distFromSpawn > 1.2) {
        e.isMoving = true;
        const backDir = e.spawnOrigin.clone().sub(e.position).normalize();
        e.position.addScaledVector(backDir, 3.5 * deltaTime);
        this.clampToEnemyArena(e);
        e.mesh.position.copy(e.position);
        e.mesh.rotation.y = lerpAngle(
          e.mesh.rotation.y,
          Math.atan2(backDir.x, backDir.z),
          deltaTime * 8
        );
      } else if (e.kind !== 'boss') {
        e.isMoving = true;
        e.patrolAngle += deltaTime * 0.85;
        const px = e.spawnOrigin.x + Math.cos(e.patrolAngle) * 1.5;
        const pz = e.spawnOrigin.z + Math.sin(e.patrolAngle) * 1.5;
        const dx = px - e.position.x;
        const dz = pz - e.position.z;
        e.position.set(px, 0, pz);
        e.mesh.position.copy(e.position);
        e.mesh.rotation.y = lerpAngle(e.mesh.rotation.y, Math.atan2(dx, dz), deltaTime * 8);
      } else {
        e.isMoving = false;
      }

      this.animateEnemyLimbs(e, elapsedTime, deltaTime);
    }
  }

  private animateEnemyLimbs(e: CombatTarget, elapsedTime: number, deltaTime: number): void {
    if (e.slimeParts) {
      const sp = e.slimeParts;
      const t = elapsedTime * 7 + e.patrolAngle;
      if (e.attackState === 'windup') {
        sp.body.scale.set(1.4, 0.48, 1.4);
        sp.body.position.y = 0.28;
      } else if (e.attackState === 'strike') {
        sp.body.scale.set(0.85, 1.35, 0.85);
        sp.body.position.y = 0.75;
      } else {
        const bounce = Math.abs(Math.sin(t));
        sp.body.scale.set(1.15 - bounce * 0.18, 0.72 + bounce * 0.32, 1.15 - bounce * 0.18);
        sp.body.position.y = 0.38 + bounce * 0.25;
      }
      sp.core.position.y = sp.body.position.y;
      sp.core.rotation.y = elapsedTime * 3;
      return;
    }

    if (e.wolfParts) {
      const wp = e.wolfParts;
      if (e.attackState === 'windup') {
        wp.torso.position.y = 0.54;
        wp.torso.rotation.x = -0.26;
        wp.headGroup.position.set(0, 0.82, 0.78);
        wp.jaw.rotation.x = 0.45;
        wp.legs[0].rotation.x = -0.35;
        wp.legs[1].rotation.x = -0.35;
        wp.legs[2].rotation.x = 0.4;
        wp.legs[3].rotation.x = 0.4;
      } else if (e.attackState === 'strike') {
        wp.torso.position.y = 0.82;
        wp.torso.rotation.x = 0.28;
        wp.headGroup.position.set(0, 0.96, 0.95);
        wp.jaw.rotation.x = 0.05;
        wp.legs[0].rotation.x = 0.65;
        wp.legs[1].rotation.x = 0.65;
        wp.legs[2].rotation.x = -0.65;
        wp.legs[3].rotation.x = -0.65;
      } else if (e.isMoving) {
        const t = elapsedTime * 13 + e.patrolAngle;
        wp.torso.position.y = 0.65 + Math.abs(Math.sin(t)) * 0.06;
        wp.torso.rotation.x = Math.cos(t) * 0.08;
        wp.headGroup.position.set(0, 0.92 + Math.sin(t) * 0.04, 0.85);
        wp.jaw.rotation.x = 0.1;
        wp.legs[0].rotation.x = Math.sin(t) * 0.65;
        wp.legs[1].rotation.x = Math.sin(t + 0.6) * 0.65;
        wp.legs[2].rotation.x = Math.sin(t + Math.PI) * 0.65;
        wp.legs[3].rotation.x = Math.sin(t + Math.PI + 0.6) * 0.65;
        wp.tail.rotation.z = Math.sin(t * 1.2) * 0.25;
      } else {
        wp.torso.position.y = 0.65 + Math.sin(elapsedTime * 3) * 0.02;
        wp.torso.rotation.x = 0;
        wp.jaw.rotation.x = 0.08;
        wp.legs.forEach((l) => (l.rotation.x = 0));
      }
      return;
    }

    if (e.rig) {
      e.rig.updateAnimation(elapsedTime, deltaTime, false);
      const bones = e.rig.bones;
      const t = elapsedTime * 11 + e.patrolAngle;

      if (e.isMoving) {
        const swing = Math.sin(t) * 0.62;
        if (bones['LeftUpLeg']) bones['LeftUpLeg'].rotation.x = swing;
        if (bones['RightUpLeg']) bones['RightUpLeg'].rotation.x = -swing;
        if (bones['LeftLeg']) bones['LeftLeg'].rotation.x = Math.max(0, -swing) * 0.9;
        if (bones['RightLeg']) bones['RightLeg'].rotation.x = Math.max(0, swing) * 0.9;
      } else {
        if (bones['LeftUpLeg']) bones['LeftUpLeg'].rotation.x = 0;
        if (bones['RightUpLeg']) bones['RightUpLeg'].rotation.x = 0;
        if (bones['LeftLeg']) bones['LeftLeg'].rotation.x = 0;
        if (bones['RightLeg']) bones['RightLeg'].rotation.x = 0;
      }

      if (e.attackState === 'windup') {
        if (bones['RightArm']) {
          bones['RightArm'].rotation.x = -2.25;
          bones['RightArm'].rotation.z = -0.35;
        }
        if (bones['RightForeArm']) bones['RightForeArm'].rotation.x = -0.45;
        if (bones['Chest']) {
          bones['Chest'].rotation.x = -0.22;
          bones['Chest'].rotation.y = -0.45;
        }
      } else if (e.attackState === 'strike') {
        if (bones['RightArm']) {
          bones['RightArm'].rotation.x = 0.65;
          bones['RightArm'].rotation.z = 0.25;
        }
        if (bones['RightForeArm']) bones['RightForeArm'].rotation.x = 0;
        if (bones['Chest']) {
          bones['Chest'].rotation.x = 0.35;
          bones['Chest'].rotation.y = 0.45;
        }
      } else if (e.attackState === 'recover') {
        if (bones['RightArm']) {
          bones['RightArm'].rotation.x = -0.15;
          bones['RightArm'].rotation.z = 0;
        }
        if (bones['Chest']) {
          bones['Chest'].rotation.x = 0.1;
          bones['Chest'].rotation.y = 0;
        }
      } else if (e.isMoving) {
        if (bones['RightArm']) bones['RightArm'].rotation.x = -Math.sin(t) * 0.45 - 0.3;
        if (bones['LeftArm']) bones['LeftArm'].rotation.x = Math.sin(t) * 0.45 - 0.3;
      }
    }
  }

  private dealEnemyDamageToPlayer(e: CombatTarget): void {
    if (this.invulnerableTimer > 0) {
      this.spawnFloatingText(
        this.playerPos.clone().add(new THREE.Vector3(0, 2.0, 0)),
        'HINDAR!',
        'heal'
      );
      return;
    }

    const effectiveDef = this.def * (this.defBuffTimer > 0 ? 1.4 : 1.0);
    const rawDmg = e.atk * (100 / (100 + effectiveDef));
    const finalDmg = Math.max(1, Math.round(this.isBlocking ? rawDmg * 0.35 : rawDmg));

    this.hp = Math.max(0, this.hp - finalDmg);
    this.camShake = 0.24;
    this.audio.playClick();

    this.spawnFloatingText(
      this.playerPos.clone().add(new THREE.Vector3(0, 1.9, 0)),
      this.isBlocking ? `BLOK -${finalDmg}` : `-${finalDmg}`,
      'normal'
    );

    if (this.hp <= 0) {
      this.hp = this.maxHp;
      this.mana = this.maxMana;
      if (this.inDungeon) {
        this.exitDungeon();
      }
      this.playerPos.set(0, 0, 15);
      this.playerVel.set(0, 0, 0);
      this.lockedTarget = null;
      this.showNotificationBanner(
        'Kamu pingsan dalam pertempuran dan diselamatkan kembali ke Desa Embermere.'
      );
    }
  }

  private resolveCollisions(): void {
    if (this.inDungeon) {
      this.playerPos.x = Math.max(278, Math.min(322, this.playerPos.x));
      this.playerPos.z = Math.max(248, Math.min(352, this.playerPos.z));
    } else {
      // Batas Peta Overworld Super Luas (360m x 310m)
      this.playerPos.x = Math.max(-175, Math.min(175, this.playerPos.x));
      this.playerPos.z = Math.max(-68, Math.min(232, this.playerPos.z));
    }

    const radius = 0.48;
    for (const box of this.colliders) {
      const cx = Math.max(box.min.x, Math.min(this.playerPos.x, box.max.x));
      const cz = Math.max(box.min.z, Math.min(this.playerPos.z, box.max.z));
      const dx = this.playerPos.x - cx;
      const dz = this.playerPos.z - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius && distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        this.playerPos.x += (dx / dist) * push;
        this.playerPos.z += (dz / dist) * push;
      }
    }
  }

  private updateCamera(deltaTime: number, isSprinting: boolean): void {
    if (this.lockedTarget && !this.lockedTarget.isDead) {
      this.lockReticle.visible = true;
      this.lockReticle.position.set(
        this.lockedTarget.position.x,
        0.1,
        this.lockedTarget.position.z
      );
      const toTarget = this.lockedTarget.position.clone().sub(this.playerPos);
      const targetCamYaw = Math.atan2(-toTarget.x, -toTarget.z);
      this.camYaw = lerpAngle(this.camYaw, targetCamYaw, deltaTime * 8);
    } else {
      this.lockReticle.visible = false;
    }

    const desiredDist = isSprinting ? 5.85 : 5.25;
    this.camCurrentDist = THREE.MathUtils.lerp(this.camCurrentDist, desiredDist, deltaTime * 6);

    const targetPivot = new THREE.Vector3(
      this.playerPos.x,
      this.playerPos.y + 1.5,
      this.playerPos.z
    );
    this.camSmoothPivot.lerp(targetPivot, 1 - Math.exp(-15 * deltaTime));

    const offset = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camCurrentDist,
      Math.sin(this.camPitch) * this.camCurrentDist,
      Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camCurrentDist
    );

    const shake =
      this.camShake > 0
        ? new THREE.Vector3((Math.random() - 0.5) * 0.14, (Math.random() - 0.5) * 0.14, 0)
        : new THREE.Vector3();

    this.camera.position.copy(this.camSmoothPivot).add(offset).add(shake);
    if (this.lockedTarget && !this.lockedTarget.isDead) {
      const lookTarget = this.lockedTarget.position
        .clone()
        .add(new THREE.Vector3(0, 1.1, 0))
        .lerp(this.camSmoothPivot, 0.35);
      this.camera.lookAt(lookTarget);
    } else {
      this.camera.lookAt(this.camSmoothPivot);
    }
  }

  private updateHUD(): void {
    this.hpBar.setValue(this.hp, this.maxHp);
    this.manaBar.setValue(this.mana, this.maxMana);
    this.staminaBar.setValue(this.stamina, this.maxStamina);
    this.xpBar.setValue(this.xp, this.xpToNext);

    this.levelBadgeEl.textContent = `Lv ${this.level}`;
    this.goldTextEl.textContent = `🪙 Gold: ${this.gold}`;
    this.weaponTextEl.textContent = `⚔️ ${this.equippedWeapon.name} +${this.equippedWeapon.upgradeLevel} (ATK ${this.atk})`;
    this.potionCountEl.textContent = `x${this.potions}`;

    if (this.inDungeon) {
      this.zoneNameEl.textContent = 'Dungeon Katakombe';
    } else if (this.playerPos.z < 36) {
      this.zoneNameEl.textContent = 'Desa Embermere';
    } else if (this.playerPos.x < -55) {
      this.zoneNameEl.textContent = 'Rawa Kristal Barat (Lv.4-5)';
    } else if (this.playerPos.x > 55) {
      this.zoneNameEl.textContent = 'Benteng Goblin Timur (Lv.5-6)';
    } else if (this.playerPos.z < 70) {
      this.zoneNameEl.textContent = 'Tepi Sungai (Lv.1-2)';
    } else if (this.playerPos.z < 155) {
      this.zoneNameEl.textContent = 'Hutan Berkabut (Lv.3-4)';
    } else {
      this.zoneNameEl.textContent = 'Kuil Agung Selatan (Lv.6)';
    }

    this.compassNeedleEl.style.transform = `rotate(${this.camYaw}rad)`;
    this.refreshQuestUI();

    this.skillCooldowns.forEach((cd, idx) => {
      const el = this.skillCdOverlay[idx];
      if (cd > 0) {
        el.style.display = 'flex';
        el.textContent = cd.toFixed(1);
      } else {
        el.style.display = 'none';
      }
    });

    if (this.potionCooldown > 0) {
      this.potionCdOverlay.style.display = 'flex';
      this.potionCdOverlay.textContent = this.potionCooldown.toFixed(1);
    } else {
      this.potionCdOverlay.style.display = 'none';
    }

    if (this.lockedTarget && !this.lockedTarget.isDead) {
      this.targetBannerEl.style.display = 'block';
      this.targetBannerEl.textContent = `Target: ${this.lockedTarget.name} (Lv.${this.lockedTarget.level}) • HP ${this.lockedTarget.hp}/${this.lockedTarget.maxHp}`;
    } else {
      this.targetBannerEl.style.display = 'none';
    }

    if (!this.inDungeon && this.playerPos.distanceTo(this.overworldPortalPos) < 4.2) {
      this.promptEl.style.display = 'block';
      this.promptEl.textContent =
        '[F] Masuk ke Portal Dungeon Katakombe Bayangan (Musuh Elit Lv.7 - Bos Lv.10)';
    } else if (this.inDungeon && this.playerPos.distanceTo(this.dungeonExitPortalPos) < 4.2) {
      this.promptEl.style.display = 'block';
      this.promptEl.textContent = '[F] Keluar dari Dungeon & Kembali ke Overworld';
    } else if (!this.inDungeon && this.playerPos.distanceTo(this.campfirePos) < 3.8) {
      this.promptEl.style.display = 'block';
      this.promptEl.textContent =
        '[F] Beristirahat di Api Unggun (Pulihkan HP/Mana & Bangkitkan Monster)';
    } else {
      const nearNPC = this.findNearestNPC();
      if (nearNPC) {
        this.promptEl.style.display = 'block';
        this.promptEl.textContent = `[F] Bicara dengan ${nearNPC.name} (${nearNPC.role})`;
      } else {
        this.promptEl.style.display = 'none';
      }
    }
  }

  public destroy(): void {
    this.hudRoot.remove();
    this.worldLabelsRoot.remove();
    this.activeModalEl?.remove();
    this.pauseModalEl?.remove();
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}

function runeRingMat(m: THREE.MeshBasicMaterial): THREE.MeshBasicMaterial {
  return m;
}

function bootstrap(): void {
  const webglContainer = document.getElementById('webgl-container');
  const uiRoot = document.getElementById('ui-root');
  if (!webglContainer || !uiRoot) {
    throw new Error('Elemen #webgl-container atau #ui-root tidak ditemukan');
  }

  const bus = new EventBus();
  const settings = new SettingsManager();
  const audio = new AudioManager();

  const currentSettings = settings.getSettings();
  audio.setVolumes(currentSettings.musicVolume, currentSettings.sfxVolume);

  const menuScene = new MenuScene3D(webglContainer, bus);
  const menuManager = new MenuManager(uiRoot, bus, settings, audio);

  let activeSession: EmbermereGameSession | null = null;
  let isPlayingGame = false;

  bus.on('game:start-new', (profile) => {
    isPlayingGame = true;
    const menuCanvas = webglContainer.querySelector('canvas');
    if (menuCanvas) menuCanvas.style.display = 'none';

    activeSession?.destroy();
    activeSession = new EmbermereGameSession(webglContainer, profile, bus, audio, menuManager);
  });

  bus.on('ui:navigate', () => {
    if (isPlayingGame) {
      isPlayingGame = false;
      activeSession?.destroy();
      activeSession = null;
      const menuCanvas = webglContainer.querySelector('canvas');
      if (menuCanvas) menuCanvas.style.display = 'block';
    }
  });

  let lastTime = performance.now();
  const loop = (now: number) => {
    const deltaTime = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const elapsedTime = now / 1000;

    if (!isPlayingGame) {
      menuScene.update(elapsedTime, deltaTime);
    } else {
      activeSession?.update(elapsedTime, deltaTime);
    }

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

bootstrap();