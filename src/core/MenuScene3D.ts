import * as THREE from 'three';
import { BuiltCharacterRig, CharacterBuilder } from '../entities/CharacterBuilder';
import { ClassId, EventBus } from './EventBus';
export class MenuScene3D {
  private scene: THREE.Scene; private camera: THREE.PerspectiveCamera; private renderer: THREE.WebGLRenderer;
  private mode: 'main-menu' | 'character-select' = 'main-menu';
  private selectedClass: ClassId = 'knight';
  private rigs: Record<ClassId, BuiltCharacterRig>;
  private stageGroup: THREE.Group; private campfireLight: THREE.PointLight; private emberParticles: THREE.Points; private emberPositions: Float32Array;
  private targetStageRotationY = 0; private currentStageRotationY = 0;
  constructor(container: HTMLElement, private bus: EventBus) {
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x12141c); this.scene.fog = new THREE.FogExp2(0x12141c, 0.045);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight); this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0x5fb7e5, 0x12141c, 0.55));
    const rimDirLight = new THREE.DirectionalLight(0x5fb7e5, 1.3); rimDirLight.position.set(-4, 5, -4); this.scene.add(rimDirLight);

    this.campfireLight = new THREE.PointLight(0xf2c14e, 5.5, 12, 1.6); this.campfireLight.position.set(0, 0.75, 1.25);
    this.campfireLight.castShadow = true; this.campfireLight.shadow.mapSize.set(1024, 1024); this.scene.add(this.campfireLight);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(22, 48), new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.16, 36), new THREE.MeshStandardMaterial({ color: 0x12141c, roughness: 0.5 }));
    pedestal.position.y = 0.08; pedestal.receiveShadow = true; this.scene.add(pedestal);

    this.buildCampfire();

    const particleCount = 90; this.emberPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) this.resetParticle(i);
    const particleGeo = new THREE.BufferGeometry(); particleGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    this.emberParticles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0xf2c14e, size: 0.065, transparent: true, opacity: 0.85 }));
    this.scene.add(this.emberParticles);

    this.stageGroup = new THREE.Group(); this.stageGroup.position.y = 0.16; this.scene.add(this.stageGroup);
    this.rigs = { knight: CharacterBuilder.buildCharacter('knight'), mage: CharacterBuilder.buildCharacter('mage'), archer: CharacterBuilder.buildCharacter('archer') };
    this.stageGroup.add(this.rigs.knight.root, this.rigs.mage.root, this.rigs.archer.root);
    this.layoutCharactersForMode();
    this.bindEvents();
    window.addEventListener('resize', () => this.onResize());
  }
  private buildCampfire(): void {
    const fireGroup = new THREE.Group(); fireGroup.position.set(0, 0.16, 1.25);
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8), new THREE.MeshStandardMaterial({ color: 0x4b2e6f }));
      log.rotation.z = Math.PI / 2.4; log.rotation.y = (i / 4) * Math.PI; log.position.y = 0.06; log.castShadow = true; fireGroup.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 7), new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xd64545, emissiveIntensity: 2.2 }));
    flame.position.y = 0.24; fireGroup.add(flame); this.scene.add(fireGroup);
  }
  private resetParticle(index: number): void {
    const i3 = index * 3; const radius = Math.random() * 2.5; const angle = Math.random() * Math.PI * 2;
    this.emberPositions[i3] = Math.cos(angle) * radius; this.emberPositions[i3 + 1] = Math.random() * 3.2; this.emberPositions[i3 + 2] = Math.sin(angle) * radius;
  }
  private layoutCharactersForMode(): void {
    this.targetStageRotationY = 0; this.currentStageRotationY = 0;
    if (this.mode === 'main-menu') {
      this.rigs.knight.root.position.set(0, 0, -0.2); this.rigs.knight.root.rotation.y = 0;
      this.rigs.mage.root.position.set(-1.15, 0, 0.35); this.rigs.mage.root.rotation.y = 0.55;
      this.rigs.archer.root.position.set(1.15, 0, 0.35); this.rigs.archer.root.rotation.y = -0.55;
    } else {
      (['knight', 'mage', 'archer'] as ClassId[]).forEach((id) => {
        const rig = this.rigs[id];
        if (id === this.selectedClass) { rig.root.position.set(0, 0, 0.35); rig.root.rotation.y = 0; rig.root.scale.setScalar(1.05); }
        else {
          const isLeft = id === 'knight' || (this.selectedClass === 'knight' && id === 'mage');
          rig.root.position.set(isLeft ? -1.45 : 1.45, 0, -0.75); rig.root.rotation.y = isLeft ? 0.35 : -0.35; rig.root.scale.setScalar(0.88);
        }
      });
    }
  }
  private bindEvents(): void {
    this.bus.on('ui:navigate', ({ screen }) => { this.mode = screen; this.layoutCharactersForMode(); });
    this.bus.on('character:select-class', ({ classId }) => { this.selectedClass = classId; this.layoutCharactersForMode(); });
    this.bus.on('character:update-customization', (state) => { this.selectedClass = state.classId; this.rigs[state.classId].applyCustomization(state); });
    this.bus.on('character:rotate-stage', ({ deltaX }) => { this.targetStageRotationY += deltaX * 0.012; });
  }
  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  public update(elapsedTime: number, deltaTime: number): void {
    this.campfireLight.intensity = 5.2 + Math.sin(elapsedTime * 7.5) * 0.45;
    const posAttr = this.emberParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      this.emberPositions[i * 3 + 1] += deltaTime * 0.35;
      if (this.emberPositions[i * 3 + 1] > 3.6) this.emberPositions[i * 3 + 1] = 0.15;
    }
    posAttr.needsUpdate = true;
    (['knight', 'mage', 'archer'] as ClassId[]).forEach((id) => this.rigs[id].updateAnimation(elapsedTime, deltaTime, id === this.selectedClass));

    if (this.mode === 'main-menu') {
      const orbitAngle = elapsedTime * 0.18; const radius = 4.2;
      this.camera.position.set(Math.sin(orbitAngle) * radius, 1.75, Math.cos(orbitAngle) * radius + 0.4);
      this.camera.lookAt(0, 1.15, 0.2);
    } else {
      this.camera.position.lerp(new THREE.Vector3(0, 1.48, 3.25), Math.min(1, deltaTime * 5));
      this.camera.lookAt(0, 1.18, 0);
      this.currentStageRotationY += (this.targetStageRotationY - this.currentStageRotationY) * Math.min(1, deltaTime * 10);
      this.rigs[this.selectedClass].root.rotation.y = this.currentStageRotationY;
    }
    this.renderer.render(this.scene, this.camera);
  }
}