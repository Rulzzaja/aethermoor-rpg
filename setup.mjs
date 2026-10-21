import fs from 'fs';
import path from 'path';

const files = {
  'tsconfig.json': JSON.stringify({
    "compilerOptions": {
      "target": "ES2022",
      "useDefineForClassFields": true,
      "module": "ESNext",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "strict": true,
      "noUnusedLocals": false,
      "noUnusedParameters": false,
      "noFallthroughCasesInSwitch": true
    },
    "include": ["src"]
  }, null, 2),

  'src/entities/CharacterBuilder.ts': `import * as THREE from 'three';
import classesData from '../data/classes.json';
import { CharacterCustomizationState, ClassId } from '../core/EventBus';

export interface CharacterAnimationState {
  isMoving?: boolean;
  isSprinting?: boolean;
  isGrounded?: boolean;
  isRolling?: boolean;
  rollProgress?: number;
  attackComboStep?: number;
  attackProgress?: number;
  skillIndex?: number;
  skillProgress?: number;
  isBlocking?: boolean;
}

export interface BuiltCharacterRig {
  root: THREE.Group;
  bones: Record<string, THREE.Object3D>;
  updateAnimation: (
    elapsedTime: number,
    deltaTime: number,
    isSelected: boolean,
    animState?: CharacterAnimationState
  ) => void;
  applyCustomization: (state: CharacterCustomizationState) => void;
}

export class CharacterBuilder {
  public static buildCharacter(
    classId: ClassId,
    initialCustom?: CharacterCustomizationState
  ): BuiltCharacterRig {
    const root = new THREE.Group();
    root.name = \`Character_\${classId}\`;
    const bones: Record<string, THREE.Object3D> = {};

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xebbe9e, roughness: 0.48, metalness: 0.04 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x181a24, roughness: 0.58, metalness: 0.14 });
    const primaryArmorMat = new THREE.MeshStandardMaterial({
      color: classId === 'knight' ? 0x3b82bd : classId === 'mage' ? 0x4b2e6f : 0x2b6352,
      roughness: classId === 'knight' ? 0.22 : 0.5,
      metalness: classId === 'knight' ? 0.84 : 0.25
    });
    const secondaryArmorMat = new THREE.MeshStandardMaterial({
      color: classId === 'knight' ? 0x222c3c : classId === 'mage' ? 0x241638 : 0x1c382f,
      roughness: 0.45,
      metalness: classId === 'knight' ? 0.65 : 0.18
    });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.24, metalness: 0.84 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x5fb7e5,
      emissive: 0x5fb7e5,
      emissiveIntensity: 2.0,
      roughness: 0.1
    });
    const darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x1e1c24, roughness: 0.7 });

    // 1. HIPS & PELVIS
    const hips = new THREE.Group();
    hips.name = 'Hips';
    hips.position.set(0, 0.96, 0);
    root.add(hips);
    bones['Hips'] = hips;

    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.2, 16), secondaryArmorMat);
    pelvis.scale.set(1.15, 1, 0.85);
    pelvis.castShadow = true;
    hips.add(pelvis);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.075, 18), darkLeatherMat);
    belt.position.y = 0.07;
    belt.scale.set(1.16, 1, 0.88);
    hips.add(belt);

    const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), accentMat);
    buckle.position.set(0, 0.07, 0.165);
    buckle.scale.set(1.2, 1, 0.5);
    hips.add(buckle);

    for (let side = -1; side <= 1; side += 2) {
      const tasset = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.23, 10, 1, false, 0, Math.PI),
        primaryArmorMat
      );
      tasset.position.set(side * 0.135, -0.06, 0);
      tasset.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      tasset.rotation.z = side * -0.15;
      tasset.castShadow = true;
      hips.add(tasset);
    }

    // 2. SPINE & SCULPTED CHEST
    const spine = new THREE.Group();
    spine.name = 'Spine';
    spine.position.set(0, 0.1, 0);
    hips.add(spine);
    bones['Spine'] = spine;

    const chest = new THREE.Group();
    chest.name = 'Chest';
    chest.position.set(0, 0.18, 0);
    spine.add(chest);
    bones['Chest'] = chest;

    const chestTopR = classId === 'knight' ? 0.23 : classId === 'mage' ? 0.185 : 0.205;
    const chestBotR = classId === 'knight' ? 0.175 : 0.15;
    const upperTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(chestTopR, chestBotR, 0.44, 18),
      primaryArmorMat
    );
    upperTorso.scale.set(1.18, 1, 0.78);
    upperTorso.castShadow = true;
    upperTorso.receiveShadow = true;
    chest.add(upperTorso);

    const breastplate = new THREE.Mesh(new THREE.SphereGeometry(chestTopR * 0.96, 16, 12), primaryArmorMat);
    breastplate.position.set(0, 0.06, 0.03);
    breastplate.scale.set(1.15, 0.78, 0.72);
    breastplate.castShadow = true;
    chest.add(breastplate);

    const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 10, 20), accentMat);
    collarRing.position.set(0, 0.21, 0);
    collarRing.rotation.x = Math.PI / 2;
    collarRing.scale.set(1.2, 0.9, 1);
    chest.add(collarRing);

    const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), crystalMat);
    chestCore.position.set(0, 0.07, chestTopR * 0.78 + 0.025);
    chest.add(chestCore);

    // 3. NECK & HEAD
    const neck = new THREE.Group();
    neck.name = 'Neck';
    neck.position.set(0, 0.24, 0);
    chest.add(neck);
    bones['Neck'] = neck;

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.11, 14), skinMat);
    neck.add(neckMesh);

    const head = new THREE.Group();
    head.name = 'Head';
    head.position.set(0, 0.14, 0);
    neck.add(head);
    bones['Head'] = head;

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.145, 22, 20), skinMat);
    cranium.scale.set(0.95, 1.08, 0.98);
    cranium.castShadow = true;
    head.add(cranium);

    const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.078, 0.12, 16), skinMat);
    jaw.position.set(0, -0.06, 0.015);
    jaw.scale.set(0.95, 1, 0.92);
    head.add(jaw);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.055, 8), skinMat);
    nose.position.set(0, -0.005, 0.142);
    nose.rotation.x = Math.PI / 2.3;
    head.add(nose);

    for (let s = -1; s <= 1; s += 2) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 8), skinMat);
      ear.position.set(s * 0.138, 0.0, -0.01);
      ear.rotation.z = s * -1.1;
      ear.rotation.x = -0.2;
      head.add(ear);
    }

    const scleraMat = new THREE.MeshBasicMaterial({ color: 0xfefefe });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: classId === 'mage' ? 0x5fb7e5 : 0x182432,
      emissive: classId === 'mage' ? 0x5fb7e5 : 0x224466,
      emissiveIntensity: classId === 'mage' ? 1.4 : 0.3
    });

    const createEye = (isLeft: boolean) => {
      const sign = isLeft ? -1 : 1;
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(sign * 0.052, 0.018, 0.126);
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), scleraMat);
      sclera.scale.set(1.25, 0.82, 0.5);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), pupilMat);
      iris.position.z = 0.01;
      iris.scale.set(1, 1, 0.5);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.012, 0.016), hairMat);
      brow.position.set(0, 0.024, 0.006);
      brow.rotation.z = sign * -0.12;
      eyeGroup.add(sclera, iris, brow);
      head.add(eyeGroup);
      return eyeGroup;
    };
    bones['LeftEye'] = createEye(true);
    bones['RightEye'] = createEye(false);

    const scarMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.085, 0.012),
      new THREE.MeshBasicMaterial({ color: 0xc9373f })
    );
    scarMesh.position.set(0.055, 0.005, 0.132);
    scarMesh.rotation.z = 0.22;
    scarMesh.visible = false;
    head.add(scarMesh);

    const tattooMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.007, 6, 16, Math.PI),
      crystalMat
    );
    tattooMesh.position.set(0, -0.02, 0.133);
    tattooMesh.rotation.x = Math.PI;
    tattooMesh.visible = false;
    head.add(tattooMesh);

    const hairContainer = new THREE.Group();
    head.add(hairContainer);

    const buildHairCap = () => {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.154, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
        hairMat
      );
      cap.position.y = 0.015;
      cap.rotation.x = -0.18;
      cap.castShadow = true;
      return cap;
    };

    const hairStyle0 = new THREE.Group();
    hairStyle0.add(buildHairCap());
    for (let i = -2; i <= 2; i++) {
      const bang = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 8), hairMat);
      bang.position.set(i * 0.028, 0.075, 0.125 - Math.abs(i) * 0.012);
      bang.rotation.x = 2.75;
      bang.rotation.z = i * -0.15;
      hairStyle0.add(bang);
    }

    const hairStyle1 = new THREE.Group();
    hairStyle1.add(buildHairCap());
    const braidGroup = new THREE.Group();
    braidGroup.position.set(0, 0.02, -0.14);
    for (let b = 0; b < 5; b++) {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.038 - b * 0.004, 10, 10), hairMat);
      knot.position.set(0, -b * 0.055, -b * 0.012);
      braidGroup.add(knot);
    }
    const braidRing = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 12), accentMat);
    braidRing.position.set(0, -0.22, -0.05);
    braidRing.rotation.x = Math.PI / 2;
    braidGroup.add(braidRing);
    hairStyle1.add(braidGroup);
    bones['Hair_Back'] = braidGroup;

    const hairStyle2 = new THREE.Group();
    hairStyle2.add(buildHairCap());
    const mane = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.36, 14, 1, true, -Math.PI * 0.45, Math.PI * 0.9),
      hairMat
    );
    mane.position.set(0, -0.1, -0.03);
    mane.rotation.y = Math.PI;
    hairStyle2.add(mane);

    const circlet = new THREE.Mesh(
      new THREE.TorusGeometry(0.146, 0.012, 8, 24, Math.PI * 1.1),
      accentMat
    );
    circlet.position.set(0, 0.07, 0.01);
    circlet.rotation.x = Math.PI / 2 - 0.15;
    circlet.rotation.z = -Math.PI * 0.05;
    const circletGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 0), crystalMat);
    circletGem.position.set(0, 0.085, 0.152);
    head.add(circlet, circletGem);

    hairContainer.add(hairStyle0, hairStyle1, hairStyle2);

    // 4. ARMS
    const buildArm = (isLeft: boolean) => {
      const sign = isLeft ? -1 : 1;
      const prefix = isLeft ? 'Left' : 'Right';

      const shoulder = new THREE.Group();
      shoulder.name = \`\${prefix}Shoulder\`;
      shoulder.position.set(sign * (chestTopR * 1.15 + 0.045), 0.17, 0);
      chest.add(shoulder);
      bones[\`\${prefix}Shoulder\`] = shoulder;

      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(
          classId === 'knight' ? 0.115 : 0.088,
          16,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.65
        ),
        primaryArmorMat
      );
      pauldron.rotation.z = sign * -0.45;
      pauldron.scale.set(1.15, 0.9, 1.1);
      pauldron.castShadow = true;
      shoulder.add(pauldron);

      const pauldronTrim = new THREE.Mesh(
        new THREE.TorusGeometry(classId === 'knight' ? 0.105 : 0.08, 0.014, 8, 18),
        accentMat
      );
      pauldronTrim.rotation.x = Math.PI / 2;
      pauldronTrim.rotation.y = sign * 0.45;
      shoulder.add(pauldronTrim);

      const arm = new THREE.Group();
      arm.name = \`\${prefix}Arm\`;
      arm.position.set(0, -0.04, 0);
      shoulder.add(arm);
      bones[\`\${prefix}Arm\`] = arm;

      const upperArmMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.052, 0.25, 14),
        secondaryArmorMat
      );
      upperArmMesh.position.y = -0.125;
      upperArmMesh.castShadow = true;
      arm.add(upperArmMesh);

      const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.054, 12, 12), accentMat);
      elbowJoint.position.y = -0.25;
      arm.add(elbowJoint);

      const foreArm = new THREE.Group();
      foreArm.name = \`\${prefix}ForeArm\`;
      foreArm.position.set(0, -0.25, 0);
      arm.add(foreArm);
      bones[\`\${prefix}ForeArm\`] = foreArm;

      const vambrace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.054, 0.044, 0.23, 14),
        primaryArmorMat
      );
      vambrace.position.y = -0.115;
      vambrace.castShadow = true;
      foreArm.add(vambrace);

      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.01, 8, 14), accentMat);
      cuff.position.y = -0.21;
      cuff.rotation.x = Math.PI / 2;
      foreArm.add(cuff);

      const hand = new THREE.Group();
      hand.name = \`\${prefix}Hand\`;
      hand.position.set(0, -0.24, 0);
      foreArm.add(hand);
      bones[\`\${prefix}Hand\`] = hand;

      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skinMat);
      palm.scale.set(0.9, 1.1, 0.8);
      hand.add(palm);
    };
    buildArm(true);
    buildArm(false);

    // 5. LEGS
    const buildLeg = (isLeft: boolean) => {
      const sign = isLeft ? -1 : 1;
      const prefix = isLeft ? 'Left' : 'Right';

      const upLeg = new THREE.Group();
      upLeg.name = \`\${prefix}UpLeg\`;
      upLeg.position.set(sign * 0.105, -0.06, 0);
      hips.add(upLeg);
      bones[\`\${prefix}UpLeg\`] = upLeg;

      const thighMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.066, 0.38, 14),
        darkLeatherMat
      );
      thighMesh.position.y = -0.19;
      thighMesh.castShadow = true;
      upLeg.add(thighMesh);

      const kneeGuard = new THREE.Mesh(new THREE.OctahedronGeometry(0.062, 1), accentMat);
      kneeGuard.position.set(0, -0.38, 0.035);
      kneeGuard.scale.set(0.95, 1.1, 0.65);
      upLeg.add(kneeGuard);

      const leg = new THREE.Group();
      leg.name = \`\${prefix}Leg\`;
      leg.position.set(0, -0.38, 0);
      upLeg.add(leg);
      bones[\`\${prefix}Leg\`] = leg;

      const greave = new THREE.Mesh(
        new THREE.CylinderGeometry(0.066, 0.05, 0.38, 14),
        primaryArmorMat
      );
      greave.position.y = -0.19;
      greave.castShadow = true;
      leg.add(greave);

      const foot = new THREE.Group();
      foot.name = \`\${prefix}Foot\`;
      foot.position.set(0, -0.39, 0.035);
      leg.add(foot);
      bones[\`\${prefix}Foot\`] = foot;

      const bootSole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.065, 0.21, 14),
        secondaryArmorMat
      );
      bootSole.rotation.x = Math.PI / 2;
      bootSole.scale.set(1.0, 1.0, 0.65);
      bootSole.castShadow = true;
      foot.add(bootSole);

      const bootTrim = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.01, 8, 14), accentMat);
      bootTrim.position.set(0, 0.04, -0.03);
      bootTrim.rotation.x = Math.PI / 2;
      foot.add(bootTrim);
    };
    buildLeg(true);
    buildLeg(false);

    // 6. CAPE
    const capeBone = new THREE.Group();
    capeBone.name = 'Cape_01';
    capeBone.position.set(0, 0.19, -0.14);
    chest.add(capeBone);
    bones['Cape_01'] = capeBone;

    const capeHeight = classId === 'mage' ? 1.12 : 0.88;
    const capeMain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.34, capeHeight, 16, 4, true, -Math.PI * 0.35, Math.PI * 0.7),
      accentMat
    );
    capeMain.position.set(0, -capeHeight / 2, -0.02);
    capeMain.rotation.y = Math.PI;
    capeMain.castShadow = true;
    capeBone.add(capeMain);

    // Node pelacak jejak senjata 3D (WeaponTip & WeaponBase)
    const weaponBase = new THREE.Object3D();
    const weaponTip = new THREE.Object3D();
    bones['WeaponBase'] = weaponBase;
    bones['WeaponTip'] = weaponTip;

    // 7. WEAPONS
    if (classId === 'knight') {
      const swordGroup = new THREE.Group();
      const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), accentMat);
      pommel.position.y = -0.12;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.2, 10), darkLeatherMat);
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), accentMat);
      guard.rotation.z = Math.PI / 2;
      guard.position.y = 0.11;
      const guardGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), crystalMat);
      guardGem.position.y = 0.11;

      const bladeOuter = new THREE.Mesh(
        new THREE.ConeGeometry(0.058, 1.05, 4),
        new THREE.MeshStandardMaterial({ color: 0xf4faff, metalness: 0.92, roughness: 0.12 })
      );
      bladeOuter.position.y = 0.62;
      bladeOuter.scale.set(1, 1, 0.28);
      bladeOuter.rotation.y = Math.PI / 4;
      bladeOuter.castShadow = true;

      const bladeCore = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.95, 4), crystalMat);
      bladeCore.position.y = 0.58;
      bladeCore.scale.set(1, 1, 0.38);
      bladeCore.rotation.y = Math.PI / 4;

      weaponBase.position.set(0, 0.16, 0);
      weaponTip.position.set(0, 1.15, 0);
      swordGroup.add(pommel, grip, guard, guardGem, bladeOuter, bladeCore, weaponBase, weaponTip);
      swordGroup.rotation.x = Math.PI / 2.1;
      bones['RightHand'].add(swordGroup);
      bones['Weapon'] = swordGroup;

      const shieldGroup = new THREE.Group();
      const shieldBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.24, 0.045, 6),
        primaryArmorMat
      );
      shieldBody.rotation.z = Math.PI / 2;
      shieldBody.scale.set(1, 1.25, 0.85);
      shieldBody.castShadow = true;

      const shieldBorder = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.024, 8, 6), accentMat);
      shieldBorder.rotation.y = Math.PI / 2;
      shieldBorder.scale.set(0.85, 1.22, 1);

      const shieldCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), crystalMat);
      shieldCrest.position.x = -0.035;

      shieldGroup.add(shieldBody, shieldBorder, shieldCrest);
      shieldGroup.position.set(-0.07, -0.02, 0.08);
      bones['LeftForeArm'].add(shieldGroup);
    } else if (classId === 'mage') {
      const robeSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.34, 0.78, 18, 1, true),
        primaryArmorMat
      );
      robeSkirt.position.set(0, -0.4, 0);
      hips.add(robeSkirt);

      const staffGroup = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 1.75, 12), accentMat);
      shaft.position.y = 0.32;
      shaft.castShadow = true;

      const haloOuter = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 10, 24), accentMat);
      haloOuter.position.y = 1.28;
      const staffCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), crystalMat);
      staffCrystal.position.y = 1.28;

      weaponBase.position.set(0, 0.95, 0);
      weaponTip.position.set(0, 1.42, 0);
      staffGroup.add(shaft, haloOuter, staffCrystal, weaponBase, weaponTip);
      bones['RightHand'].add(staffGroup);
      bones['StaffCrystal'] = staffCrystal;

      const orbitGroup = new THREE.Group();
      orbitGroup.name = 'Crystal_Orbit';
      chest.add(orbitGroup);
      bones['Crystal_Orbit'] = orbitGroup;
      for (let i = 0; i < 3; i++) {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), crystalMat);
        const angle = (i / 3) * Math.PI * 2;
        shard.position.set(Math.cos(angle) * 0.44, 0.1 + i * 0.07, Math.sin(angle) * 0.44);
        orbitGroup.add(shard);
      }
    } else if (classId === 'archer') {
      const quiver = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.048, 0.52, 12), darkLeatherMat);
      quiver.add(tube);
      for (let a = 0; a < 3; a++) {
        const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 6), accentMat);
        arrowShaft.position.set((a - 1) * 0.02, 0.28, 0);
        const feather = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 4), crystalMat);
        feather.position.set((a - 1) * 0.02, 0.38, 0);
        quiver.add(arrowShaft, feather);
      }
      quiver.position.set(0.1, 0.08, -0.17);
      quiver.rotation.z = -0.38;
      chest.add(quiver);

      const bowGroup = new THREE.Group();
      const bowArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.022, 10, 28, Math.PI * 0.88),
        accentMat
      );
      bowArc.rotation.z = -Math.PI * 0.44;
      const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.88, 6), crystalMat);
      bowString.position.x = -0.09;
      weaponBase.position.set(0, -0.35, 0);
      weaponTip.position.set(0, 0.35, 0);
      bowGroup.add(bowArc, bowString, weaponBase, weaponTip);
      bowGroup.rotation.y = Math.PI / 2;
      bones['LeftHand'].add(bowGroup);
    }

    const applyCustomization = (state: CharacterCustomizationState) => {
      const bodyScaleX = state.bodyType === 'tegap' ? 1.08 : 0.92;
      const bodyScaleZ = state.bodyType === 'tegap' ? 1.06 : 0.92;
      chest.scale.set(bodyScaleX, 1, bodyScaleZ);

      const skinTones = [0xebbe9e, 0xd8ad8c, 0xf2d5be, 0xc49270];
      skinMat.color.setHex(skinTones[state.faceIndex % skinTones.length]);
      head.scale.set(
        state.faceIndex % 2 === 0 ? 1.0 : 0.95,
        1.0,
        state.faceIndex >= 2 ? 1.04 : 0.98
      );

      hairStyle0.visible = state.hairStyleIndex === 0;
      hairStyle1.visible = state.hairStyleIndex === 1;
      hairStyle2.visible = state.hairStyleIndex === 2;

      const hairHex = classesData.customization.hairColors[state.hairColorIndex]?.hex ?? '#12141C';
      hairMat.color.set(hairHex);

      const accentHex =
        classesData.customization.accentColors[state.accentColorIndex]?.hex ?? '#F2C14E';
      accentMat.color.set(accentHex);

      scarMesh.visible = state.faceMarking === 'scar';
      tattooMesh.visible = state.faceMarking === 'tattoo';
    };

    if (initialCustom) applyCustomization(initialCustom);

    const damp = (cur: number, target: number, rate: number, dt: number) =>
      cur + (target - cur) * Math.min(1, dt * rate);

    const updateAnimation = (
      elapsedTime: number,
      deltaTime: number,
      isSelected: boolean,
      animState?: CharacterAnimationState
    ) => {
      const dt = Math.max(0.001, Math.min(0.1, deltaTime || 0.016));
      const isMoving = animState?.isMoving ?? false;
      const isSprinting = animState?.isSprinting ?? false;
      const isGrounded = animState?.isGrounded ?? true;
      const isRolling = animState?.isRolling ?? false;
      const rollProgress = animState?.rollProgress ?? 0;
      const attackStep = animState?.attackComboStep ?? 0;
      const attackProg = animState?.attackProgress ?? 0;
      const skillIdx = animState?.skillIndex ?? -1;
      const skillProg = animState?.skillProgress ?? 0;
      const isBlocking = animState?.isBlocking ?? false;

      const blinkCycle = elapsedTime % 3.8;
      const eyeScaleY = blinkCycle > 3.68 ? 0.1 : 1.0;
      bones['LeftEye'].scale.y = eyeScaleY;
      bones['RightEye'].scale.y = eyeScaleY;

      if (bones['Crystal_Orbit']) bones['Crystal_Orbit'].rotation.y = elapsedTime * 1.6;
      if (bones['StaffCrystal']) bones['StaffCrystal'].rotation.y = elapsedTime * 2.4;

      if (isRolling) {
        root.rotation.x = rollProgress * Math.PI * 2;
        hips.position.y = 0.62;
        bones['LeftUpLeg'].rotation.x = -1.2;
        bones['RightUpLeg'].rotation.x = -1.2;
        bones['LeftLeg'].rotation.x = 1.5;
        bones['RightLeg'].rotation.x = 1.5;
        return;
      } else {
        root.rotation.x = damp(root.rotation.x, 0, 18, dt);
      }

      let targetHipsY = 0.96;
      let targetHipsRotY = 0;
      let targetSpineY = 0;
      let targetChestX = 0;
      let targetChestY = 0;
      let targetChestZ = 0;
      let targetLUpLegX = -0.06;
      let targetRUpLegX = 0.06;
      let targetLLegX = 0.1;
      let targetRLegX = 0.1;
      let targetLArmX = -0.25;
      let targetLArmY = 0;
      let targetLArmZ = -0.14;
      let targetLForeArmX = -0.28;
      let targetLForeArmZ = 0;
      let targetRArmX = -0.25;
      let targetRArmY = 0;
      let targetRArmZ = 0.14;
      let targetRForeArmX = -0.28;
      let targetCapeX = 0.1;

      if (!isGrounded) {
        targetHipsY = 1.02;
        targetChestX = 0.16;
        targetLUpLegX = -0.7;
        targetLLegX = 1.05;
        targetRUpLegX = 0.28;
        targetRLegX = 0.5;
        targetLArmX = -0.8;
        targetRArmX = -0.6;
        targetCapeX = 0.65;
      } else if (isMoving) {
        const freq = isSprinting ? 14.2 : 10.0;
        const amp = isSprinting ? 0.92 : 0.65;
        const phase = elapsedTime * freq;
        const sinP = Math.sin(phase);
        const cosP = Math.cos(phase);

        targetHipsY = 0.93 + Math.abs(sinP) * 0.075;
        targetHipsRotY = sinP * 0.1;
        targetChestX = isSprinting ? 0.26 : 0.14;
        targetChestY = -sinP * 0.16;

        targetLUpLegX = sinP * amp;
        targetLLegX = Math.max(0.08, -cosP * amp * 1.2);

        targetRUpLegX = -sinP * amp;
        targetRLegX = Math.max(0.08, cosP * amp * 1.2);

        targetLArmX = -sinP * amp * 0.88;
        targetLArmZ = -0.12;
        targetLForeArmX = -0.55 - Math.max(0, sinP) * 0.4;

        targetRArmX = sinP * amp * 0.88;
        targetRArmZ = 0.12;
        targetRForeArmX = -0.55 - Math.max(0, -sinP) * 0.4;

        targetCapeX = (isSprinting ? 0.62 : 0.38) + Math.sin(phase * 2) * 0.12;
      } else {
        const idleSpeed = isSelected ? 2.2 : 1.5;
        const breath = Math.sin(elapsedTime * idleSpeed);
        targetHipsY = 0.96 + breath * 0.018;
        targetChestX = breath * 0.028;
        targetChestY = Math.sin(elapsedTime * 0.8) * 0.04;
        targetCapeX = 0.08 + Math.sin(elapsedTime * 1.8 - 0.6) * 0.05;

        if (classId === 'knight') {
          targetRArmX = -0.22 + breath * 0.04;
          targetRArmZ = 0.14;
          targetRForeArmX = -0.28;
          targetLArmX = -0.34;
          targetLArmZ = -0.14;
          targetLForeArmX = -0.32;
          targetLForeArmZ = 0.24;
        } else if (classId === 'mage') {
          targetRArmX = -0.48 + breath * 0.06;
          targetRArmZ = 0.1;
          targetRForeArmX = -0.38;
          targetLArmX = -0.2;
          targetLArmZ = -0.2 - breath * 0.04;
          targetLForeArmX = -0.28;
        } else {
          targetLArmX = -0.38 + breath * 0.04;
          targetLArmZ = -0.12;
          targetLForeArmX = -0.22;
          targetRArmX = -0.22 + breath * 0.04;
          targetRArmZ = 0.14;
          targetRForeArmX = -0.32;
        }
      }

      if (isBlocking) {
        targetLArmX = -0.82;
        targetLArmY = 0.52;
        targetLArmZ = -0.22;
        targetLForeArmX = -0.6;
        targetLForeArmZ = 0.45;
        targetChestY = -0.3;
      }

      // KOREOGRAFI KOMBO 4-LANGKAH FLUID & RESPONSIF (Eased Swing Curve)
      if (attackProg > 0) {
        // Kurva ayunan cepat bertenaga (Snap Swing)
        const fastSnap = Math.sin(Math.pow(attackProg, 0.65) * Math.PI);
        const sweep = (attackProg - 0.35) * 2.2;

        if (attackStep === 0) {
          // Kombo 1: Tebasan Horizontal Lebar (Kanan ke Kiri + Putaran Pinggang)
          targetHipsRotY = -sweep * 0.35;
          targetSpineY = -sweep * 0.45;
          targetChestY = -sweep * 0.65;
          targetChestX = 0.18 * fastSnap;
          targetRArmX = -1.35 + attackProg * 0.65;
          targetRArmY = -1.25 + attackProg * 2.45;
          targetRArmZ = 0.85 - attackProg * 0.4;
          targetRForeArmX = -0.45 * fastSnap;
          targetLArmX = -0.45;
          targetLArmZ = -0.45;
          targetRUpLegX = -0.35 * fastSnap;
          targetLUpLegX = 0.25 * fastSnap;
        } else if (attackStep === 1) {
          // Kombo 2: Tebasan Silang Naik (Kiri Bawah ke Kanan Atas)
          targetHipsRotY = sweep * 0.38;
          targetSpineY = sweep * 0.5;
          targetChestY = sweep * 0.7;
          targetChestZ = -0.15 * fastSnap;
          targetRArmX = -0.55 - fastSnap * 1.15;
          targetRArmY = 1.15 - attackProg * 2.35;
          targetRArmZ = -0.55 + attackProg * 1.1;
          targetRForeArmX = -0.55 * fastSnap;
          targetLUpLegX = -0.35 * fastSnap;
          targetRUpLegX = 0.25 * fastSnap;
        } else if (attackStep === 2) {
          // Kombo 3: Putaran Tornado 360 Derajat
          const spinAngle = attackProg * Math.PI * 2;
          targetHipsRotY = spinAngle;
          targetChestX = 0.24;
          targetRArmX = -1.45;
          targetRArmZ = 1.25;
          targetLArmX = -1.15;
          targetLArmZ = -0.95;
          targetCapeX = 0.78;
        } else {
          // Kombo 4 (Finisher): Lompatan Hantaman Langit ke Tanah
          targetHipsY += fastSnap * 0.42;
          targetChestX = -0.45 + attackProg * 1.05;
          targetRArmX = -2.65 + Math.pow(attackProg, 1.4) * 3.1;
          targetRArmY = -0.15;
          targetRArmZ = 0.08;
          targetLArmX = -1.8 + attackProg * 1.4;
          targetLUpLegX = -0.55 * fastSnap;
          targetLLegX = 0.75 * fastSnap;
          targetCapeX = 0.85 * fastSnap;
        }
      }

      if (skillProg > 0 && skillIdx >= 0) {
        const pulse = Math.sin(skillProg * Math.PI);
        if (skillIdx === 0) {
          targetChestX = 0.25 * pulse;
          targetChestY = -0.55 * pulse;
          targetLArmX = -1.35 * pulse;
          targetLArmY = 0.75 * pulse;
          targetRArmX = -1.45 * pulse;
        } else if (skillIdx === 1) {
          targetHipsRotY = skillProg * Math.PI * 4;
          targetRArmX = -1.45;
          targetRArmZ = 1.25;
          targetLArmX = -1.25;
          targetLArmZ = -1.1;
        } else {
          targetHipsY += pulse * 0.25;
          targetChestX = -0.38 * pulse;
          targetLArmX = -2.3 * pulse;
          targetLArmZ = -0.5;
          targetRArmX = -2.3 * pulse;
          targetRArmZ = 0.5;
        }
      }

      const rate = attackProg > 0 || skillProg > 0 ? 28 : 18;
      hips.position.y = damp(hips.position.y, targetHipsY, rate, dt);
      hips.rotation.y = damp(hips.rotation.y, targetHipsRotY, rate, dt);
      spine.rotation.y = damp(spine.rotation.y, targetSpineY, rate, dt);
      chest.rotation.x = damp(chest.rotation.x, targetChestX, rate, dt);
      chest.rotation.y = damp(chest.rotation.y, targetChestY, rate, dt);
      chest.rotation.z = damp(chest.rotation.z, targetChestZ, rate, dt);

      bones['LeftUpLeg'].rotation.x = damp(bones['LeftUpLeg'].rotation.x, targetLUpLegX, rate, dt);
      bones['RightUpLeg'].rotation.x = damp(bones['RightUpLeg'].rotation.x, targetRUpLegX, rate, dt);
      bones['LeftLeg'].rotation.x = damp(bones['LeftLeg'].rotation.x, targetLLegX, rate, dt);
      bones['RightLeg'].rotation.x = damp(bones['RightLeg'].rotation.x, targetRLegX, rate, dt);

      bones['LeftArm'].rotation.x = damp(bones['LeftArm'].rotation.x, targetLArmX, rate, dt);
      bones['LeftArm'].rotation.y = damp(bones['LeftArm'].rotation.y, targetLArmY, rate, dt);
      bones['LeftArm'].rotation.z = damp(bones['LeftArm'].rotation.z, targetLArmZ, rate, dt);
      bones['LeftForeArm'].rotation.x = damp(bones['LeftForeArm'].rotation.x, targetLForeArmX, rate, dt);
      bones['LeftForeArm'].rotation.z = damp(bones['LeftForeArm'].rotation.z, targetLForeArmZ, rate, dt);

      bones['RightArm'].rotation.x = damp(bones['RightArm'].rotation.x, targetRArmX, rate, dt);
      bones['RightArm'].rotation.y = damp(bones['RightArm'].rotation.y, targetRArmY, rate, dt);
      bones['RightArm'].rotation.z = damp(bones['RightArm'].rotation.z, targetRArmZ, rate, dt);
      bones['RightForeArm'].rotation.x = damp(bones['RightForeArm'].rotation.x, targetRForeArmX, rate, dt);

      capeBone.rotation.x = damp(capeBone.rotation.x, targetCapeX, 15, dt);
      if (bones['Hair_Back']) {
        bones['Hair_Back'].rotation.x = 0.08 + Math.sin(elapsedTime * 2.4) * 0.05;
      }
    };

    return { root, bones, updateAnimation, applyCustomization };
  }
}`,

  'src/main.ts': `import * as THREE from 'three';
import './styles/base.css';
import './styles/components.css';

import classesData from './data/classes.json';
import { AudioManager } from './audio/AudioManager';
import { CharacterCustomizationState, ClassId, EventBus } from './core/EventBus';
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

interface VillageNPC {
  id: string;
  name: string;
  role: string;
  position: THREE.Vector3;
  dialog: string[];
  rig: BuiltCharacterRig;
  marker: THREE.Mesh;
}

interface CombatTarget {
  id: string;
  kind: 'dummy' | 'wolf' | 'goblin' | 'skeleton' | 'golem' | 'boss';
  name: string;
  title?: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  xpReward: number;
  goldReward: number;
  position: THREE.Vector3;
  spawnOrigin: THREE.Vector3;
  rotationY: number;
  mesh: THREE.Group;
  hpBarFill: THREE.Mesh;
  hpBarGroup: THREE.Group;
  legs: THREE.Object3D[];
  wobbleTimer: number;
  attackCooldown: number;
  stunTimer: number;
  raidSkillTimer: number;
}

interface RaidTelegraph {
  mesh: THREE.Group;
  innerFill: THREE.Mesh;
  center: THREE.Vector3;
  radius: number;
  timer: number;
  maxTime: number;
  damage: number;
  bossName: string;
}

interface RaidCompanion {
  name: string;
  classId: ClassId;
  rig: BuiltCharacterRig;
  position: THREE.Vector3;
  rotationY: number;
  attackTimer: number;
}

interface QuestStep {
  id: string;
  title: string;
  region: string;
  description: string;
  targetKind: string;
  requiredCount: number;
  currentCount: number;
  xpReward: number;
  goldReward: number;
  targetPos: THREE.Vector3;
}

interface ActiveProjectile {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  multiplier: number;
  life: number;
}

interface TransientVFX {
  mesh: THREE.Object3D;
  life: number;
  maxLife: number;
  onUpdate: (dt: number, progress: number) => void;
}

class ProceduralTextures {
  public static createGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#285e46';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 7500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = i % 3 === 0 ? '#387d5e' : i % 2 === 0 ? '#1f4936' : '#4aa078';
      ctx.fillRect(x, y, 2, 7);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(95, 95);
    return tex;
  }

  public static createCobbleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#32374a';
    ctx.fillRect(0, 0, 512, 512);

    const rows = 10;
    const cols = 10;
    const w = 512 / cols;
    const h = 512 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offsetX = (r % 2) * (w / 2);
        const x = (c * w + offsetX) % 512;
        const y = r * h;
        const shade = 86 + Math.floor(Math.random() * 32);
        ctx.fillStyle = \`rgb(\${shade}, \${shade + 6}, \${shade + 18})\`;
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 8);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
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
  private telegraphs: RaidTelegraph[] = [];
  private companions: RaidCompanion[] = [];
  private companionsActive = true;
  private projectiles: ActiveProjectile[] = [];
  private vfxList: TransientVFX[] = [];
  private swayingFoliage: THREE.Object3D[] = [];
  private fountainCrystal!: THREE.Mesh;
  private fountainRings: THREE.Mesh[] = [];
  private fireflyParticles!: THREE.Points;
  private lockReticle: THREE.Mesh;
  private speedAuraMesh: THREE.Mesh;

  // Real-time 3D Sword Ribbon Trail
  private trailHistory: Array<{ tip: THREE.Vector3; base: THREE.Vector3 }> = [];
  private trailMesh: THREE.Mesh;
  private trailGeo: THREE.BufferGeometry;

  // Player State
  private playerGroup: THREE.Group;
  private playerRig: BuiltCharacterRig;
  private playerPos = new THREE.Vector3(0, 0, 14);
  private playerVel = new THREE.Vector3();
  private playerRotY = Math.PI;
  private targetRotY = Math.PI;
  private velocityY = 0;
  private isGrounded = true;
  private baseSpeed = 5.6;
  private lightStrideActive = false;

  private isRolling = false;
  private rollTimer = 0;
  private invulnerableTimer = 0;
  private attackAnimTimer = 0;
  private attackAnimDuration = 0.36;
  private currentAttackStep = 0;
  private skillAnimTimer = 0;
  private skillAnimDuration = 0.55;
  private currentSkillIdx = -1;
  private isBlocking = false;
  private chargeTime = 0;
  private hitStopTimer = 0;

  // Camera
  private camYaw = 0;
  private camPitch = 0.28;
  private camCurrentLook = new THREE.Vector3(0, 1.5, 14);
  private camShake = 0;

  // RPG Progression & Stats
  private level = 1;
  private xp = 0;
  private xpToNext = 100;
  private gold = 120;
  private weaponUpgradeLevel = 0;
  private hp = 140;
  private maxHp = 140;
  private mana = 30;
  private maxMana = 30;
  private stamina = 100;
  private maxStamina = 100;
  private atk = 16;
  private def = 10;
  private defBuffTimer = 0;

  private comboStep = 0;
  private comboResetTimer = 0;
  private attackCooldown = 0;
  private staminaRegenDelay = 0;
  private skillCooldowns = [0, 0, 0];
  private potionCooldown = 0;
  private lockedTarget: CombatTarget | null = null;

  // 8 Progressive Quests & Raid Chain
  private quests: QuestStep[] = [
    {
      id: 'q1',
      title: '1. Panggilan Penjaga Cahaya',
      region: 'Desa Embermere (Pusat)',
      description: 'Bicara dengan Tetua Maren di dekat Air Mancur Alun-alun [F]',
      targetKind: 'talk_maren',
      requiredCount: 1,
      currentCount: 0,
      xpReward: 100,
      goldReward: 80,
      targetPos: new THREE.Vector3(0, 0, 7.2)
    },
    {
      id: 'q2',
      title: '2. Pembersihan Hutan Berkabut',
      region: 'Hutan Berkabut (Selatan)',
      description: 'Kalahkan Serigala Gelap / Goblin di Hutan Selatan (Z: +65)',
      targetKind: 'forest_mob',
      requiredCount: 4,
      currentCount: 0,
      xpReward: 160,
      goldReward: 150,
      targetPos: new THREE.Vector3(0, 0, 75)
    },
    {
      id: 'q3',
      title: '3. [RAID I] Sang Alfa Bayangan',
      region: 'Sarang Alfa (Selatan Jauh)',
      description: 'Taklukkan RAID BOSS: Fenrir, Serigala Alfa Bayangan (Z: +125)',
      targetKind: 'boss_fenrir',
      requiredCount: 1,
      currentCount: 0,
      xpReward: 320,
      goldReward: 300,
      targetPos: new THREE.Vector3(0, 0, 125)
    },
    {
      id: 'q4',
      title: '4. Pasukan Reruntuhan Barat',
      region: 'Reruntuhan Kuno (Barat)',
      description: 'Kalahkan Prajurit Kerangka di Reruntuhan Kuno (X: -85)',
      targetKind: 'ruins_mob',
      requiredCount: 4,
      currentCount: 0,
      xpReward: 240,
      goldReward: 220,
      targetPos: new THREE.Vector3(-85, 0, 0)
    },
    {
      id: 'q5',
      title: '5. [RAID II] Panglima Terkutuk',
      region: 'Kuil Runtuh (Barat Jauh)',
      description: 'Taklukkan RAID BOSS: Panglima Kerangka Malakor (X: -135)',
      targetKind: 'boss_malakor',
      requiredCount: 1,
      currentCount: 0,
      xpReward: 450,
      goldReward: 420,
      targetPos: new THREE.Vector3(-135, 0, 0)
    },
    {
      id: 'q6',
      title: '6. Resonansi Lembah Kristal',
      region: 'Lembah Kristal (Timur)',
      description: 'Hancurkan Golem Kristal Terkorupsi di Lembah Timur (X: +85)',
      targetKind: 'crystal_mob',
      requiredCount: 4,
      currentCount: 0,
      xpReward: 320,
      goldReward: 300,
      targetPos: new THREE.Vector3(85, 0, 0)
    },
    {
      id: 'q7',
      title: '7. [RAID III] Inti Archon',
      region: 'Puncak Kristal (Timur Jauh)',
      description: 'Taklukkan RAID BOSS: Archon Kristal Terkorupsi (X: +135)',
      targetKind: 'boss_archon',
      requiredCount: 1,
      currentCount: 0,
      xpReward: 600,
      goldReward: 550,
      targetPos: new THREE.Vector3(135, 0, 0)
    },
    {
      id: 'q8',
      title: '8. [FINAL RAID] Takhta Valdrek',
      region: 'Benteng Obsidian (Utara)',
      description: 'Serbu Benteng Utara & Kalahkan Valdrek, Penguasa Bayangan (Z: -140)',
      targetKind: 'boss_valdrek',
      requiredCount: 1,
      currentCount: 0,
      xpReward: 1200,
      goldReward: 1000,
      targetPos: new THREE.Vector3(0, 0, -140)
    }
  ];
  private activeQuestIdx = 0;

  private keys = new Map<string, boolean>();
  private rightMouseDown = false;
  private isPaused = false;

  // HUD Elements
  private hudRoot: HTMLElement;
  private hpBar!: StatusBarController;
  private manaBar!: StatusBarController;
  private staminaBar!: StatusBarController;
  private xpBar!: StatusBarController;
  private levelBadgeEl!: HTMLElement;
  private goldTextEl!: HTMLElement;
  private weaponTextEl!: HTMLElement;
  private regionLabelEl!: HTMLElement;
  private questTitleEl!: HTMLElement;
  private questDescEl!: HTMLElement;
  private questProgEl!: HTMLElement;
  private bossRaidHudEl!: HTMLElement;
  private bossNameEl!: HTMLElement;
  private bossBarFillEl!: HTMLElement;
  private bossHpTextEl!: HTMLElement;
  private minimapCanvas!: HTMLCanvasElement;
  private skillCdOverlay: HTMLElement[] = [];
  private potionCdOverlay!: HTMLElement;
  private promptEl!: HTMLElement;
  private dialogBoxEl: HTMLElement | null = null;
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
    this.atk = cls.stats.atk + 2;
    this.def = cls.stats.def;
    this.baseSpeed = cls.stats.speed;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x64b2e6);
    this.scene.fog = new THREE.FogExp2(0x82c0ea, 0.0024);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      520
    );
    this.camera.position.set(0, 3.5, 21);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.buildLighting();
    this.buildSeamlessOverworld();

    this.playerGroup = new THREE.Group();
    this.playerRig = CharacterBuilder.buildCharacter(profile.classId, profile);
    this.playerGroup.add(this.playerRig.root);
    this.scene.add(this.playerGroup);

    // Aura Langkah Cahaya ([V])
    this.speedAuraMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.95, 24),
      new THREE.MeshBasicMaterial({
        color: 0x5fb7e5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      })
    );
    this.speedAuraMesh.rotation.x = -Math.PI / 2;
    this.speedAuraMesh.position.y = 0.08;
    this.speedAuraMesh.visible = false;
    this.playerGroup.add(this.speedAuraMesh);

    // Inisialisasi 3D Sword Ribbon Trail
    const maxSegs = 14;
    this.trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(maxSegs * 2 * 3);
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const indices: number[] = [];
    for (let i = 0; i < maxSegs - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
    this.trailGeo.setIndex(indices);
    this.trailMesh = new THREE.Mesh(
      this.trailGeo,
      new THREE.MeshBasicMaterial({
        color: profile.classId === 'knight' ? 0x5fb7e5 : 0xf2c14e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78
      })
    );
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);

    // Panggil 2 Rekan Raid AI Pendamping
    this.spawnRaidCompanions();

    this.lockReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.95, 28),
      new THREE.MeshBasicMaterial({ color: 0xf2c14e, side: THREE.DoubleSide })
    );
    this.lockReticle.rotation.x = -Math.PI / 2;
    this.lockReticle.visible = false;
    this.scene.add(this.lockReticle);

    this.hudRoot = document.createElement('div');
    this.buildHUD();
    this.bindInputs();
  }

  private buildLighting(): void {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x3b7a57, 1.08);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4d6, 2.35);
    sun.position.set(70, 110, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 145;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    const sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(12, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff8d6 })
    );
    sunOrb.position.set(160, 190, -140);
    this.scene.add(sunOrb);
  }

  private buildSeamlessOverworld(): void {
    const grassTex = ProceduralTextures.createGrassTexture();
    const cobbleTex = ProceduralTextures.createCobbleTexture();

    // 1. Daratan Overworld 600 x 600 Meter
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.88 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. 2.200 Helai Rumput 3D InstancedMesh di Seluruh Overworld
    const bladeGeo = new THREE.ConeGeometry(0.09, 0.5, 4);
    bladeGeo.translate(0, 0.25, 0);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.7 });
    const instancedGrass = new THREE.InstancedMesh(bladeGeo, bladeMat, 2200);
    const dummyObj = new THREE.Object3D();
    let count = 0;
    for (let i = 0; i < 2200; i++) {
      const r = 22 + Math.random() * 175;
      const a = Math.random() * Math.PI * 2;
      const gx = Math.sin(a) * r;
      const gz = Math.cos(a) * r;
      if (Math.abs(gx) < 5.5 || Math.abs(gz) < 5.5) continue;
      dummyObj.position.set(gx, 0, gz);
      dummyObj.rotation.y = Math.random() * Math.PI;
      dummyObj.scale.setScalar(0.75 + Math.random() * 1.1);
      dummyObj.updateMatrix();
      instancedGrass.setMatrixAt(count++, dummyObj.matrix);
    }
    this.scene.add(instancedGrass);

    // 3. Alun-alun Desa & 4 Jalan Raya Kompas Menuju 4 Wilayah Raid
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20.5, 0.14, 48),
      new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.78 })
    );
    plaza.position.y = 0.07;
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    const roadNS = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.09, 320),
      new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.8 })
    );
    roadNS.position.set(0, 0.045, 0);
    roadNS.receiveShadow = true;

    const roadEW = new THREE.Mesh(
      new THREE.BoxGeometry(320, 0.09, 7.2),
      new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.8 })
    );
    roadEW.position.set(0, 0.045, 0);
    roadEW.receiveShadow = true;
    this.scene.add(roadNS, roadEW);

    // 4. Air Mancur Kristal Desa Embermere (0, 0, 0)
    const fountain = new THREE.Group();
    const lowerBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 4.2, 0.85, 28),
      new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.45 })
    );
    lowerBasin.position.y = 0.42;
    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(3.55, 3.55, 0.72, 28),
      new THREE.MeshStandardMaterial({
        color: 0x4db8e8,
        emissive: 0x2574a9,
        emissiveIntensity: 0.5,
        roughness: 0.1
      })
    );
    waterPool.position.y = 0.46;
    const midPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 1.0, 2.4, 18),
      new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.4 })
    );
    midPedestal.position.y = 1.4;
    this.fountainCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.8, 0),
      new THREE.MeshStandardMaterial({
        color: 0x5fb7e5,
        emissive: 0x5fb7e5,
        emissiveIntensity: 2.2
      })
    );
    this.fountainCrystal.position.y = 3.7;
    for (let i = 0; i < 2; i++) {
      const runeRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.2 + i * 0.3, 0.035, 8, 28),
        new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xf2c14e, emissiveIntensity: 0.9 })
      );
      runeRing.position.y = 3.7;
      this.fountainRings.push(runeRing);
      fountain.add(runeRing);
    }
    fountain.add(lowerBasin, waterPool, midPedestal, this.fountainCrystal);
    this.scene.add(fountain);
    this.addCollider(0, 1.5, 0, 7.6, 3.5, 7.6);

    // 5. Rumah Desa Embermere, Pandai Besi, Apoteker & 4 Gerbang Kompas
    const houses: Array<[number, number, number, number]> = [
      [-23, -18, 0.4, 0x4b2e6f],
      [23, -18, -0.4, 0x2f5d50],
      [-23, 18, Math.PI - 0.4, 0x2f5d50],
      [23, 18, -Math.PI + 0.4, 0x6b3048],
      [-14, -32, 0, 0x3b4d6b],
      [14, -32, 0, 0x4b2e6f]
    ];
    houses.forEach(([x, z, rot, roofColor]) => this.buildDetailedHouse(x, z, rot, roofColor));

    this.buildDetailedWell(-10.5, 9.5);
    this.buildBlacksmithForge(-16, -9);
    this.buildApothecaryStall(16, -9);

    this.buildVillageGate(0, 40, 0);
    this.buildVillageGate(0, -40, Math.PI);
    this.buildVillageGate(-40, 0, Math.PI / 2);
    this.buildVillageGate(40, 0, -Math.PI / 2);

    // =========================================================================
    // WILAYAH 2: HUTAN BERKABUT & ARENA RAID FENRIR (SELATAN Z: +55 s/d +155)
    // =========================================================================
    this.buildRaidArenaFloor(0, 125, 22, 0x1e4438, 0x5fb7e5);
    for (let i = 0; i < 48; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const tx = side * (11 + (i % 6) * 8) + (Math.random() - 0.5) * 6;
      const tz = 48 + Math.floor(i / 2) * 4.5;
      this.buildLushOrganicTree(tx, tz, 1.0 + (i % 3) * 0.35);
    }

    // =========================================================================
    // WILAYAH 3: RERUNTUHAN KUNO & ARENA RAID MALAKOR (BARAT X: -55 s/d -155)
    // =========================================================================
    this.buildRaidArenaFloor(-135, 0, 24, 0x4a4e69, 0xb66bff);
    for (let i = 0; i < 18; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const px = -55 - Math.floor(i / 2) * 10;
      const pz = side * (9 + (i % 3) * 5);
      this.buildAncientMarblePillar(px, pz);
    }

    // =========================================================================
    // WILAYAH 4: LEMBAH KRISTAL & ARENA RAID ARCHON (TIMUR X: +55 s/d +155)
    // =========================================================================
    this.buildRaidArenaFloor(135, 0, 24, 0x28385e, 0x5fb7e5);
    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const cx = 55 + Math.floor(i / 2) * 10;
      const cz = side * (9 + (i % 3) * 5.5);
      this.buildGiantCrystalCluster(cx, cz, i % 2 === 0 ? 0x5fb7e5 : 0xb66bff);
    }

    // =========================================================================
    // WILAYAH 5: BENTENG OBSIDIAN & TAKHTA VALDREK (UTARA Z: -55 s/d -165)
    // =========================================================================
    this.buildRaidArenaFloor(0, -140, 28, 0x1a1423, 0xd64545);
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const ox = side * (10 + (i % 2) * 6);
      const oz = -55 - Math.floor(i / 2) * 12;
      this.buildObsidianMonolith(ox, oz);
    }

    // Pegunungan Batas Cakrawala Overworld
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const dist = 235 + (i % 3) * 18;
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(28 + (i % 4) * 8, 55 + (i % 5) * 15, 7),
        new THREE.MeshStandardMaterial({ color: 0x384152, roughness: 0.92 })
      );
      m.position.set(Math.sin(a) * dist, 22, Math.cos(a) * dist);
      this.scene.add(m);
    }

    // Partikel Kunang-kunang Cahaya
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyPos = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      fireflyPos[i * 3] = (Math.random() - 0.5) * 280;
      fireflyPos[i * 3 + 1] = 0.8 + Math.random() * 6.5;
      fireflyPos[i * 3 + 2] = (Math.random() - 0.5) * 280;
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
    this.fireflyParticles = new THREE.Points(
      fireflyGeo,
      new THREE.PointsMaterial({ color: 0xf2c14e, size: 0.18, transparent: true, opacity: 0.85 })
    );
    this.scene.add(this.fireflyParticles);

    // 5 NPC Desa Embermere
    this.spawnNPC(
      'maren',
      'Tetua Maren',
      'Pemimpin Raid Aethermoor',
      new THREE.Vector3(0, 0, 7.2),
      'mage',
      1,
      3,
      [
        'Selamat datang di Overworld Aethermoor! Keempat wilayah kini dikuasai oleh 4 Raid Boss Valdrek.',
        'Ikuti petunjuk Quest di kiri bawah, gunakan [V] untuk Langkah Cahaya Cepat, dan [G] untuk memanggil Rekan Raid!'
      ]
    );
    this.spawnNPC(
      'brann',
      'Brann',
      'Pandai Besi (Tempa Senjata)',
      new THREE.Vector3(-13.5, 0, -7.5),
      'knight',
      3,
      4,
      ['Senjatamu telah kutempa! Setiap tempaan meningkatkan ATK dasarmu secara permanen.']
    );
    this.spawnNPC(
      'lysa',
      'Lysa',
      'Apoteker Desa',
      new THREE.Vector3(13.5, 0, -7.5),
      'mage',
      2,
      0,
      ['HP dan Mana milikmu telah kupulihkan sepenuhnya! Gunakan [R] saat darurat di medan Raid.']
    );

    // =========================================================================
    // SPAWN PASUKAN MUSUH & 4 RAID BOSS DI 4 PENJURU OVERWORLD
    // =========================================================================
    // Boneka Latihan
    this.spawnEnemy('dummy_1', 'dummy', 'Boneka Latihan Ksatria', 1, 180, 0, 5, -5.5, 44);
    this.spawnEnemy('dummy_2', 'dummy', 'Boneka Latihan Sihir', 1, 180, 0, 5, 5.5, 44);

    // Wilayah Selatan (Hutan Berkabut + RAID BOSS 1: FENRIR)
    this.spawnEnemy('wolf_1', 'wolf', 'Serigala Gelap', 2, 110, 9, 4, -7, 65);
    this.spawnEnemy('wolf_2', 'wolf', 'Serigala Gelap', 2, 110, 9, 4, 7, 68);
    this.spawnEnemy('goblin_1', 'goblin', 'Goblin Pengintai', 3, 130, 11, 5, -8, 88);
    this.spawnEnemy('goblin_2', 'goblin', 'Goblin Pemburu', 3, 130, 11, 5, 8, 92);
    this.spawnEnemy(
      'boss_fenrir',
      'boss',
      'FENRIR, ALFA BAYANGAN',
      4,
      680,
      18,
      8,
      0,
      125,
      'Raid Boss Hutan Berkabut'
    );

    // Wilayah Barat (Reruntuhan Kuno + RAID BOSS 2: MALAKOR)
    this.spawnEnemy('skel_1', 'skeleton', 'Prajurit Kerangka', 4, 175, 14, 7, -68, -7);
    this.spawnEnemy('skel_2', 'skeleton', 'Prajurit Kerangka', 4, 175, 14, 7, -72, 7);
    this.spawnEnemy('skel_3', 'skeleton', 'Ksatria Tengkorak', 5, 200, 16, 8, -96, -8);
    this.spawnEnemy('skel_4', 'skeleton', 'Ksatria Tengkorak', 5, 200, 16, 8, -98, 8);
    this.spawnEnemy(
      'boss_malakor',
      'boss',
      'PANGLIMA MALAKOR',
      6,
      1150,
      24,
      12,
      -135,
      0,
      'Raid Boss Reruntuhan Kuno'
    );

    // Wilayah Timur (Lembah Kristal + RAID BOSS 3: ARCHON KRISTAL)
    this.spawnEnemy('golem_1', 'golem', 'Golem Kristal', 6, 240, 18, 11, 68, -8);
    this.spawnEnemy('golem_2', 'golem', 'Golem Kristal', 6, 240, 18, 11, 72, 8);
    this.spawnEnemy('golem_3', 'golem', 'Penjaga Monolit', 7, 270, 20, 12, 96, -8);
    this.spawnEnemy('golem_4', 'golem', 'Penjaga Monolit', 7, 270, 20, 12, 98, 8);
    this.spawnEnemy(
      'boss_archon',
      'boss',
      'ARCHON KRISTAL TERKORUPSI',
      8,
      1650,
      30,
      15,
      135,
      0,
      'Raid Boss Lembah Kristal'
    );

    // Wilayah Utara (Benteng Obsidian + FINAL RAID BOSS: VALDREK)
    this.spawnEnemy('val_guard_1', 'skeleton', 'Pengawal Hitam Valdrek', 8, 310, 24, 14, -9, -75);
    this.spawnEnemy('val_guard_2', 'skeleton', 'Pengawal Hitam Valdrek', 8, 310, 24, 14, 9, -78);
    this.spawnEnemy('val_guard_3', 'golem', 'Inkuisitor Bayangan', 9, 360, 27, 16, -10, -102);
    this.spawnEnemy('val_guard_4', 'golem', 'Inkuisitor Bayangan', 9, 360, 27, 16, 10, -102);
    this.spawnEnemy(
      'boss_valdrek',
      'boss',
      'VALDREK, PENGUASA BAYANGAN',
      10,
      2500,
      38,
      18,
      0,
      -140,
      'Final Raid Boss Aethermoor'
    );
  }

  private buildRaidArenaFloor(x: number, z: number, radius: number, floorHex: number, runeHex: number): void {
    const group = new THREE.Group();
    group.position.set(x, 0.06, z);

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius + 1.2, 0.16, 48),
      new THREE.MeshStandardMaterial({ color: floorHex, roughness: 0.7 })
    );
    disc.receiveShadow = true;

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.8, radius - 0.2, 48),
      new THREE.MeshBasicMaterial({ color: runeHex, side: THREE.DoubleSide })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.1;

    group.add(disc, outerRing);
    this.scene.add(group);
  }

  private buildAncientMarblePillar(x: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd8d2c5, roughness: 0.65 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 1.8), mat);
    base.position.y = 0.3;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 5.5, 14), mat);
    col.position.y = 3.0;
    col.castShadow = true;
    g.add(base, col);
    this.scene.add(g);
    this.addCollider(x, 2.5, z, 1.8, 5, 1.8);
  }

  private buildGiantCrystalCluster(x: number, z: number, colorHex: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 1.3,
      roughness: 0.15
    });
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.75 - i * 0.15, 4.8 - i * 0.9, 6), mat);
      shard.position.set((i - 1) * 0.6, 2.0 - i * 0.3, 0);
      shard.rotation.z = (i - 1) * 0.28;
      shard.castShadow = true;
      g.add(shard);
    }
    this.scene.add(g);
    this.addCollider(x, 2, z, 2.0, 4, 2.0);
  }

  private buildObsidianMonolith(x: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const ob = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 6.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x181520, roughness: 0.35, metalness: 0.7 })
    );
    ob.position.y = 3.25;
    ob.castShadow = true;
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({ color: 0xd64545, emissive: 0xd64545, emissiveIntensity: 2.2 })
    );
    core.position.y = 7.1;
    g.add(ob, core);
    this.scene.add(g);
    this.addCollider(x, 3, z, 1.8, 6, 1.8);
  }

  private buildDetailedHouse(x: number, z: number, rotY: number, roofHex: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5c6170, roughness: 0.85 });
    const plasterMat = new THREE.MeshStandardMaterial({ color: 0xf4ead5, roughness: 0.75 });
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x3d281c, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.6 });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xf2c14e,
      emissive: 0xffaa33,
      emissiveIntensity: 1.8
    });

    const foundation = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.75, 6.6), stoneMat);
    foundation.position.y = 0.375;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.8, 6.2), plasterMat);
    walls.position.y = 2.6;
    walls.castShadow = true;
    walls.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 3.2, 4), roofMat);
    roof.position.y = 6.1;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.3), timberMat);
    door.position.set(0, 1.8, 3.12);

    for (let s = -1; s <= 1; s += 2) {
      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.28), windowMat);
      winGlass.position.set(s * 2.35, 2.75, 3.1);
      g.add(winGlass);
    }

    g.add(foundation, walls, roof, door);
    this.scene.add(g);
    this.addCollider(x, 2.5, z, 7.6, 5.0, 6.8);
  }

  private buildDetailedWell(x: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.65, 1.2, 18),
      new THREE.MeshStandardMaterial({ color: 0x6a7080, roughness: 0.8 })
    );
    base.position.y = 0.6;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 1.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x4b2e6f, roughness: 0.7 })
    );
    roof.position.y = 3.2;
    roof.rotation.y = Math.PI / 4;
    g.add(base, roof);
    this.scene.add(g);
    this.addCollider(x, 1.5, z, 3.2, 3.0, 3.2);
  }

  private buildBlacksmithForge(x: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const furnace = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.8, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x3a3d4a, roughness: 0.85 })
    );
    furnace.position.y = 1.4;
    const coals = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xff5522, emissive: 0xd64545, emissiveIntensity: 2.4 })
    );
    coals.position.set(0, 0.9, 0.9);
    g.add(furnace, coals);
    this.scene.add(g);
    this.addCollider(x, 1.4, z, 3.2, 2.8, 2.8);
  }

  private buildApothecaryStall(x: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.0, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.8 })
    );
    counter.position.y = 0.5;
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.25, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 0.6 })
    );
    canopy.position.set(0, 2.5, 0);
    g.add(counter, canopy);
    this.scene.add(g);
    this.addCollider(x, 1.2, z, 3.6, 2.5, 2.0);
  }

  private buildVillageGate(x: number, z: number, rotY: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x3b271c, roughness: 0.85 });
    for (let s = -1; s <= 1; s += 2) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 6.5, 12), timberMat);
      pillar.position.set(s * 5.2, 3.25, 0);
      pillar.castShadow = true;
      g.add(pillar);
    }
    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(12.8, 1.1, 1.6), timberMat);
    archBeam.position.set(0, 6.4, 0);
    g.add(archBeam);
    this.scene.add(g);
  }

  private buildLushOrganicTree(x: number, z: number, scale: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.52, 3.0, 10),
      new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.9 })
    );
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    g.add(trunk);

    const foliageGroup = new THREE.Group();
    foliageGroup.position.y = 3.0;
    const crownOffsets: Array<[number, number, number, number, number]> = [
      [0, 1.2, 0, 1.85, 0x2d6a4f],
      [-1.0, 0.6, 0.6, 1.35, 0x40916c],
      [1.0, 0.7, -0.5, 1.4, 0x52b788],
      [0.4, 1.9, 0.5, 1.25, 0x40916c]
    ];
    crownOffsets.forEach(([cx, cy, cz, rad, col]) => {
      const puff = new THREE.Mesh(
        new THREE.IcosahedronGeometry(rad, 2),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.78 })
      );
      puff.position.set(cx, cy, cz);
      puff.scale.set(1.1, 0.88, 1.1);
      puff.castShadow = true;
      foliageGroup.add(puff);
    });

    g.add(foliageGroup);
    this.swayingFoliage.push(foliageGroup);
    this.scene.add(g);
    this.addCollider(x, 2, z, 1.2 * scale, 4, 1.2 * scale);
  }

  private spawnRaidCompanions(): void {
    const specs: Array<{ name: string; classId: ClassId; hair: number; accent: number; offsetX: number }> = [
      { name: 'Kaelen (Tank Raid)', classId: 'knight', hair: 2, accent: 0, offsetX: -2.2 },
      { name: 'Lyra (Pemanah Raid)', classId: 'archer', hair: 1, accent: 1, offsetX: 2.2 }
    ];
    specs.forEach((sp) => {
      const rig = CharacterBuilder.buildCharacter(sp.classId, {
        playerName: sp.name,
        classId: sp.classId,
        bodyType: sp.classId === 'knight' ? 'tegap' : 'ramping',
        faceIndex: 0,
        hairStyleIndex: 1,
        hairColorIndex: sp.hair,
        accentColorIndex: sp.accent,
        faceMarking: 'none'
      });
      const pos = this.playerPos.clone().add(new THREE.Vector3(sp.offsetX, 0, 2));
      rig.root.position.copy(pos);
      this.scene.add(rig.root);
      this.companions.push({
        name: sp.name,
        classId: sp.classId,
        rig,
        position: pos,
        rotationY: Math.PI,
        attackTimer: 0
      });
    });
  }

  private spawnNPC(
    id: string,
    name: string,
    role: string,
    pos: THREE.Vector3,
    classId: ClassId,
    hairColorIndex: number,
    accentColorIndex: number,
    dialog: string[]
  ): void {
    const rig = CharacterBuilder.buildCharacter(classId, {
      playerName: name,
      classId,
      bodyType: classId === 'knight' ? 'tegap' : 'ramping',
      faceIndex: 1,
      hairStyleIndex: classId === 'mage' ? 2 : 0,
      hairColorIndex,
      accentColorIndex,
      faceMarking: 'none'
    });
    rig.root.position.copy(pos);

    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xf2c14e, emissiveIntensity: 1.9 })
    );
    marker.position.set(0, 2.38, 0);
    rig.root.add(marker);

    this.scene.add(rig.root);
    this.npcs.push({ id, name, role, position: pos, dialog, rig, marker });
  }

  private spawnEnemy(
    id: string,
    kind: CombatTarget['kind'],
    name: string,
    level: number,
    hp: number,
    atk: number,
    def: number,
    x: number,
    z: number,
    title?: string
  ): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const legs: THREE.Object3D[] = [];

    const isBoss = kind === 'boss';
    const scale = isBoss ? 2.15 : kind === 'golem' ? 1.35 : 1.0;
    g.scale.setScalar(scale);

    const darkMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0x181224 : kind === 'skeleton' ? 0xd8d2c5 : kind === 'golem' ? 0x2c4a6f : 0x1e202b,
      roughness: 0.55,
      metalness: isBoss ? 0.65 : 0.2
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0xd64545 : 0xb66bff,
      emissive: isBoss ? 0xd64545 : 0xb66bff,
      emissiveIntensity: 2.2
    });
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: isBoss ? 0xf2c14e : 0xff3b5c });

    if (kind === 'wolf') {
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.25, 14), darkMat);
      torso.rotation.x = Math.PI / 2;
      torso.position.y = 0.68;
      torso.castShadow = true;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.58, 12), darkMat);
      head.rotation.x = Math.PI / 2.1;
      head.position.set(0, 0.88, 0.82);
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), crystalMat);
      shard.position.set(0, 1.05, 0);
      g.add(torso, head, shard);

      const legCoords: Array<[number, number]> = [
        [-0.2, 0.42], [0.2, 0.42], [-0.2, -0.42], [0.2, -0.42]
      ];
      legCoords.forEach(([lx, lz]) => {
        const legPivot = new THREE.Group();
        legPivot.position.set(lx, 0.55, lz);
        const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.55, 10), darkMat);
        legMesh.position.y = -0.27;
        legPivot.add(legMesh);
        legs.push(legPivot);
        g.add(legPivot);
      });
    } else if (kind === 'dummy') {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 1.75, 10),
        new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.8 })
      );
      post.position.y = 0.88;
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.3, 0.85, 16),
        new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.85 })
      );
      torso.position.y = 1.15;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0xd8b884, roughness: 0.8 })
      );
      head.position.y = 1.78;
      g.add(post, torso, head);
    } else {
      // Humanoid Monster / Skeleton / Golem / Giant Raid Boss
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.72, 14), darkMat);
      torso.position.y = 0.95;
      torso.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), darkMat);
      head.position.y = 1.52;

      for (let s = -1; s <= 1; s += 2) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.38, 8), crystalMat);
        horn.position.set(s * 0.18, 1.72, 0);
        horn.rotation.z = s * -0.45;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), eyeGlowMat);
        eye.position.set(s * 0.08, 1.54, 0.19);
        const legPivot = new THREE.Group();
        legPivot.position.set(s * 0.14, 0.58, 0);
        const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.58, 10), darkMat);
        legMesh.position.y = -0.29;
        legPivot.add(legMesh);
        legs.push(legPivot);
        g.add(horn, eye, legPivot);
      }

      const weapon = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.15, 4), crystalMat);
      weapon.position.set(0.42, 1.05, 0.38);
      weapon.rotation.x = Math.PI / 2.2;
      g.add(torso, head, weapon);

      if (isBoss) {
        const bossCrown = new THREE.Mesh(
          new THREE.TorusGeometry(0.55, 0.04, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0xf2c14e })
        );
        bossCrown.rotation.x = Math.PI / 2;
        bossCrown.position.y = 2.05;
        g.add(bossCrown);
      }
    }

    const hpBarGroup = new THREE.Group();
    hpBarGroup.position.set(0, isBoss ? 2.45 : 2.1, 0);
    const bgBar = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.13),
      new THREE.MeshBasicMaterial({ color: 0x12141c, side: THREE.DoubleSide })
    );
    const hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 0.09),
      new THREE.MeshBasicMaterial({ color: isBoss ? 0xf2c14e : 0xc9373f, side: THREE.DoubleSide })
    );
    hpBarFill.position.z = 0.01;
    hpBarGroup.add(bgBar, hpBarFill);
    g.add(hpBarGroup);

    this.scene.add(g);
    this.enemies.push({
      id,
      kind,
      name,
      title,
      level,
      hp,
      maxHp: hp,
      atk,
      def,
      xpReward: isBoss ? 280 : level * 28,
      goldReward: isBoss ? 220 : level * 20,
      position: new THREE.Vector3(x, 0, z),
      spawnOrigin: new THREE.Vector3(x, 0, z),
      rotationY: Math.PI,
      mesh: g,
      hpBarFill,
      hpBarGroup,
      legs,
      wobbleTimer: 0,
      attackCooldown: 1.5,
      stunTimer: 0,
      raidSkillTimer: 4.5
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

    // KIRI ATAS: Status Pemain + XP + Emas + Tempaan Senjata
    const statusCard = createPanel();
    statusCard.element.style.width = '380px';
    statusCard.element.style.padding = '12px 16px';
    statusCard.body.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    const topProfileRow = document.createElement('div');
    topProfileRow.style.cssText = 'display:flex;align-items:center;gap:14px;';

    const portrait = document.createElement('div');
    portrait.style.cssText =
      'position:relative;width:62px;height:62px;border-radius:50%;border:2px solid var(--color-gold-light);background:radial-gradient(circle,var(--color-crystal-blue),var(--color-shadow-purple));display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    this.levelBadgeEl = document.createElement('span');
    this.levelBadgeEl.style.cssText =
      'position:absolute;bottom:-5px;right:-5px;background:var(--color-night-black);border:1.5px solid var(--color-gold-light);color:var(--color-gold-light);font-family:var(--font-title);font-size:11px;font-weight:700;padding:1px 6px;border-radius:99px;';
    this.levelBadgeEl.textContent = 'Lv 1';
    portrait.innerHTML = \`<div style="width:36px;height:36px;">\${getSvgIcon(this.profile.classId as IconName)}</div>\`;
    portrait.appendChild(this.levelBadgeEl);

    const barsWrap = document.createElement('div');
    barsWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:5px;';
    this.hpBar = createStatusBar(\`\${this.profile.playerName} • HP\`, 'hp', this.hp, this.maxHp);
    this.manaBar = createStatusBar('Mana', 'mana', this.mana, this.maxMana);
    this.staminaBar = createStatusBar('Stamina', 'stamina', this.stamina, this.maxStamina);
    this.xpBar = createStatusBar('XP Level', 'xp', this.xp, this.xpToNext);
    barsWrap.append(this.hpBar.element, this.manaBar.element, this.staminaBar.element, this.xpBar.element);
    topProfileRow.append(portrait, barsWrap);

    const metaRow = document.createElement('div');
    metaRow.style.cssText =
      'display:flex;justify-content:space-between;font-size:13px;border-top:1px solid var(--panel-border-subtle);padding-top:6px;';
    this.goldTextEl = document.createElement('span');
    this.goldTextEl.style.color = 'var(--color-gold-light)';
    this.goldTextEl.style.fontWeight = '700';
    this.weaponTextEl = document.createElement('span');
    this.weaponTextEl.style.color = 'var(--color-crystal-blue)';
    this.weaponTextEl.style.fontWeight = '700';
    metaRow.append(this.goldTextEl, this.weaponTextEl);

    statusCard.body.append(topProfileRow, metaRow);

    // TENGAH ATAS: RAID BOSS HP BAR BESAR
    this.bossRaidHudEl = document.createElement('div');
    this.bossRaidHudEl.style.cssText =
      'width:min(540px,42vw);padding:12px 18px;background:var(--panel-bg-elevated);border:2px solid var(--color-danger-red);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,0.85);display:none;flex-direction:column;gap:6px;';
    this.bossNameEl = document.createElement('div');
    this.bossNameEl.style.cssText =
      'font-family:var(--font-title);font-size:17px;font-weight:800;color:var(--color-gold-light);text-align:center;letter-spacing:0.08em;';
    const bossBarTrack = document.createElement('div');
    bossBarTrack.style.cssText =
      'position:relative;width:100%;height:22px;background:#12141c;border:1.5px solid var(--color-gold-light);border-radius:6px;overflow:hidden;';
    this.bossBarFillEl = document.createElement('div');
    this.bossBarFillEl.style.cssText =
      'position:absolute;top:0;left:0;bottom:0;width:100%;background:linear-gradient(90deg,#8b1e24,#d64545,#f2c14e);transition:width 120ms ease-out;';
    this.bossHpTextEl = document.createElement('div');
    this.bossHpTextEl.style.cssText =
      'position:relative;z-index:2;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#efe6d2;text-shadow:0 1px 4px #000;';
    bossBarTrack.append(this.bossBarFillEl, this.bossHpTextEl);
    this.bossRaidHudEl.append(this.bossNameEl, bossBarTrack);

    // KANAN ATAS: RADAR MINIMAP REAL-TIME
    const minimapWrap = document.createElement('div');
    minimapWrap.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:6px;';
    const radarFrame = document.createElement('div');
    radarFrame.style.cssText =
      'width:156px;height:156px;border-radius:50%;border:2.5px solid var(--color-gold-light);background:#12141c;box-shadow:var(--panel-inner-shadow);position:relative;overflow:hidden;';
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 156;
    this.minimapCanvas.height = 156;
    this.compassNeedleEl = document.createElement('div');
    this.compassNeedleEl.style.cssText =
      'position:absolute;top:3px;left:50%;transform:translateX(-50%);font-family:var(--font-title);font-size:11px;font-weight:700;color:var(--color-gold-light);';
    this.compassNeedleEl.textContent = 'U';
    radarFrame.append(this.minimapCanvas, this.compassNeedleEl);

    this.regionLabelEl = document.createElement('div');
    this.regionLabelEl.style.cssText =
      'padding:4px 12px;background:var(--panel-bg);border:1px solid var(--panel-border-subtle);border-radius:99px;font-family:var(--font-title);font-size:12px;color:var(--color-gold-light);';
    this.regionLabelEl.textContent = 'Desa Embermere';
    minimapWrap.append(radarFrame, this.regionLabelEl);

    topRow.append(statusCard.element, this.bossRaidHudEl, minimapWrap);

    this.promptEl = document.createElement('div');
    this.promptEl.style.cssText =
      'align-self:center;padding:8px 20px;background:var(--panel-bg-elevated);border:1.5px solid var(--color-gold-light);border-radius:99px;font-family:var(--font-title);color:var(--color-gold-light);display:none;';

    // BARIS BAWAH: Pelacak Quest Raid (Kiri), Skill Bar (Tengah), Pintasan Overworld (Kanan)
    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-end;width:100%;';

    const questTracker = createPanel({ title: 'Ekspedisi & Raid (8 Babak)' });
    questTracker.element.style.width = '345px';
    this.questTitleEl = document.createElement('div');
    this.questTitleEl.style.cssText =
      'font-family:var(--font-title);color:var(--color-gold-light);font-weight:700;font-size:15px;';
    this.questDescEl = document.createElement('div');
    this.questDescEl.style.cssText = 'font-size:13px;color:var(--text-primary);margin-top:4px;';
    this.questProgEl = document.createElement('div');
    this.questProgEl.style.cssText =
      'font-size:13px;color:var(--color-crystal-blue);font-weight:700;margin-top:6px;';
    questTracker.body.append(this.questTitleEl, this.questDescEl, this.questProgEl);

    const skillBar = createPanel();
    skillBar.element.style.padding = '10px 14px';
    skillBar.body.style.cssText = 'display:flex;gap:12px;align-items:center;';

    cls.skills.forEach((sk, idx) => {
      const slot = document.createElement('div');
      slot.style.cssText =
        'position:relative;width:58px;height:58px;border:1.5px solid var(--color-gold-light);border-radius:8px;background:color-mix(in srgb,var(--color-night-black) 90%,transparent);display:flex;align-items:center;justify-content:center;overflow:hidden;';
      slot.innerHTML = \`
        <span style="position:absolute;top:2px;left:6px;font-family:var(--font-title);font-size:12px;font-weight:700;color:var(--color-gold-light);">[\${idx + 1}]</span>
        <div style="width:36px;height:36px;">\${getSvgIcon(sk.icon as IconName)}</div>
      \`;
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
    potSlot.innerHTML = \`
      <span style="position:absolute;top:2px;left:6px;font-family:var(--font-title);font-size:12px;font-weight:700;color:var(--color-gold-light);">[R]</span>
      <div style="width:34px;height:34px;">\${getSvgIcon('potionHp')}</div>
    \`;
    this.potionCdOverlay = document.createElement('div');
    this.potionCdOverlay.style.cssText =
      'position:absolute;inset:0;background:color-mix(in srgb,var(--color-night-black) 84%,transparent);display:none;align-items:center;justify-content:center;font-family:var(--font-title);font-weight:700;color:var(--color-bone-white);';
    potSlot.appendChild(this.potionCdOverlay);
    skillBar.body.appendChild(potSlot);

    const controlsCard = createPanel();
    controlsCard.element.style.width = '335px';
    controlsCard.body.style.fontSize = '13px';
    controlsCard.body.innerHTML = \`
      <div><strong style="color:var(--color-gold-light)">Klik Kiri (4x)</strong> Kombo 4-Langkah • <strong style="color:var(--color-gold-light)">1-3</strong> Skill</div>
      <div><strong style="color:var(--color-gold-light)">[V]</strong> Langkah Cahaya (+85% Lari) • <strong style="color:var(--color-gold-light)">[T]</strong> Teleport Desa</div>
      <div><strong style="color:var(--color-gold-light)">[G]</strong> Rekan Raid AI • <strong style="color:var(--color-gold-light)">[Q]</strong> Lock-On • <strong style="color:var(--color-gold-light)">[F]</strong> Interaksi</div>
    \`;

    bottomRow.append(questTracker.element, skillBar.element, controlsCard.element);
    this.hudRoot.append(topRow, this.promptEl, bottomRow);
    document.body.appendChild(this.hudRoot);
  }

  private bindInputs(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      if (e.code === 'Escape') {
        this.togglePauseMenu();
        return;
      }
      if (this.isPaused) return;

      if (e.code === 'KeyQ') this.toggleLockOn();
      if (e.code === 'KeyR') this.useHealthPotion();
      if (e.code === 'KeyF') this.interactWithNearestNPC();
      if (e.code === 'KeyV') {
        this.lightStrideActive = !this.lightStrideActive;
        this.speedAuraMesh.visible = this.lightStrideActive;
        this.spawnFloatingText(
          this.playerPos.clone().add(new THREE.Vector3(0, 2.1, 0)),
          this.lightStrideActive ? 'LANGKAH CAHAYA AKTIF!' : 'Langkah Normal',
          'crit'
        );
      }
      if (e.code === 'KeyT') {
        this.playerPos.set(0, 0, 14);
        this.spawnGuardianPillarVFX(this.playerPos.clone());
        this.spawnFloatingText(
          this.playerPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
          'Teleport: Desa Embermere',
          'heal'
        );
      }
      if (e.code === 'KeyG') {
        this.companionsActive = !this.companionsActive;
        this.companions.forEach((c) => (c.rig.root.visible = this.companionsActive));
        this.spawnFloatingText(
          this.playerPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
          this.companionsActive ? 'Rekan Raid Dipanggil!' : 'Rekan Raid Istirahat',
          'crit'
        );
      }
      if (e.code === 'Digit1') this.triggerSkill(0);
      if (e.code === 'Digit2') this.triggerSkill(1);
      if (e.code === 'Digit3') this.triggerSkill(2);
      if ((e.code === 'ControlLeft' || e.code === 'AltLeft') && this.isGrounded && !this.isRolling) {
        if (this.consumeStamina(20)) {
          this.isRolling = true;
          this.rollTimer = 0.4;
          this.invulnerableTimer = 0.35;
          this.spawnDashDust(this.playerPos);
        }
      }
      if (e.code === 'Space' && this.isGrounded && !this.isRolling) {
        this.velocityY = 8.0;
        this.isGrounded = false;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (this.isPaused) return;
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
        if (this.profile.classId !== 'knight' && this.chargeTime >= 0.35) {
          this.performChargedAttack(Math.min(1.6, 1.0 + this.chargeTime * 0.6));
        }
        this.isBlocking = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPaused) return;
      if (document.pointerLockElement === this.renderer.domElement || this.rightMouseDown) {
        this.camYaw -= e.movementX * 0.0028;
        this.camPitch = Math.max(0.08, Math.min(1.15, this.camPitch + e.movementY * 0.0024));
      }
    });

    window.addEventListener('wheel', (e) => {
      if (this.lockedTarget && this.enemies.length > 1) {
        const idx = this.enemies.indexOf(this.lockedTarget);
        const step = e.deltaY > 0 ? 1 : -1;
        this.lockedTarget = this.enemies[(idx + step + this.enemies.length) % this.enemies.length];
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
    this.staminaRegenDelay = 0.75;
    return true;
  }

  // KOMBO 4-LANGKAH DINAMIS DENGAN GAYA TIAP KELAS
  private performBasicAttack(): void {
    if (this.attackCooldown > 0 || this.isRolling) return;
    if (!this.consumeStamina(9)) return;

    this.audio.playClick();
    this.currentAttackStep = this.comboStep;
    this.attackAnimDuration = this.currentAttackStep === 3 ? 0.52 : 0.34;
    this.attackAnimTimer = this.attackAnimDuration;
    this.attackCooldown = this.currentAttackStep === 3 ? 0.44 : 0.27;

    if (this.lockedTarget) {
      this.targetRotY = Math.atan2(
        this.lockedTarget.position.x - this.playerPos.x,
        this.lockedTarget.position.z - this.playerPos.z
      );
      this.playerRotY = this.targetRotY;
    }

    const forward = new THREE.Vector3(Math.sin(this.playerRotY), 0, Math.cos(this.playerRotY));
    this.playerPos.addScaledVector(forward, this.currentAttackStep === 3 ? 0.85 : 0.45);

    if (this.profile.classId === 'knight') {
      const mults = [1.0, 1.15, 1.35, 1.85];
      const mult = mults[this.currentAttackStep];
      this.spawnSlashArcVFX(this.currentAttackStep, 0x5fb7e5);
      if (this.currentAttackStep === 3) {
        this.spawnShockwaveDomeVFX(
          this.playerPos.clone().addScaledVector(forward, 1.5),
          0xf2c14e,
          3.2
        );
      }
      this.hitEnemiesInRadius(
        this.playerPos.clone().addScaledVector(forward, 1.35),
        this.currentAttackStep >= 2 ? 3.5 : 2.8,
        mult
      );
    } else if (this.profile.classId === 'mage') {
      if (this.currentAttackStep === 2) {
        // Kombo 3 Penyihir: 3 Bola Sihir Menyebar
        for (let a = -1; a <= 1; a++) {
          this.fireProjectile(26, 0.85, 0x5fb7e5, a * 0.2);
        }
      } else if (this.currentAttackStep === 3) {
        // Kombo 4 Penyihir: Tombak Kristal Agung
        this.fireProjectile(34, 1.65, 0xb66bff, 0);
      } else {
        this.fireProjectile(25, 1.0, 0x5fb7e5, 0);
      }
    } else {
      if (this.currentAttackStep === 2) {
        // Kombo 3 Pemanah: 3 Anak Panah Kipas (Cone Volleys)
        for (let a = -1; a <= 1; a++) {
          this.fireProjectile(32, 0.9, 0xf2c14e, a * 0.16);
        }
      } else if (this.currentAttackStep === 3) {
        // Kombo 4 Pemanah: Panah Naga Cahaya
        this.fireProjectile(40, 1.7, 0x5fb7e5, 0);
      } else {
        this.fireProjectile(32, 1.05, 0xf2c14e, 0);
      }
    }

    this.comboStep = (this.comboStep + 1) % 4;
    this.comboResetTimer = 1.5;
  }

  private performChargedAttack(multiplier: number): void {
    this.audio.playHeroChime();
    this.attackAnimDuration = 0.42;
    this.attackAnimTimer = 0.42;
    const speed = this.profile.classId === 'mage' ? 30 : 38;
    this.fireProjectile(speed, multiplier, 0xb66bff, 0);
  }

  private spawnSlashArcVFX(step: number, colorHex: number): void {
    const arcGeo = new THREE.RingGeometry(1.15, 2.05, 28, 1, -Math.PI * 0.5, Math.PI);
    const arcMat = new THREE.MeshBasicMaterial({
      color: step >= 2 ? 0xf2c14e : colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.copy(this.playerPos).add(new THREE.Vector3(0, 1.15, 0));
    arc.rotation.y = this.playerRotY;
    arc.rotation.x = Math.PI / 2 + (step === 0 ? 0.25 : step === 1 ? -0.32 : 0);
    if (step === 3) {
      arc.rotation.y = this.playerRotY + Math.PI / 2;
      arc.rotation.x = 0;
      this.camShake = 0.22;
    }
    this.scene.add(arc);

    this.vfxList.push({
      mesh: arc,
      life: 0.24,
      maxLife: 0.24,
      onUpdate: (dt, prog) => {
        arc.rotation.z += (step === 1 ? -1 : 1) * dt * 16;
        arc.scale.multiplyScalar(1 + dt * 2.4);
        arcMat.opacity = 1 - prog;
      }
    });
  }

  private fireProjectile(speed: number, multiplier: number, color: number, angleOffset = 0): void {
    const baseDir = this.lockedTarget
      ? this.lockedTarget.position.clone().sub(this.playerPos).normalize()
      : new THREE.Vector3(Math.sin(this.playerRotY), 0, Math.cos(this.playerRotY)).normalize();
    baseDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);

    const group = new THREE.Group();
    group.position.copy(this.playerPos).add(new THREE.Vector3(0, 1.25, 0));

    if (this.profile.classId === 'archer') {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1.05, 8),
        new THREE.MeshBasicMaterial({ color })
      );
      shaft.rotation.x = Math.PI / 2;
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.24, 8),
        new THREE.MeshBasicMaterial({ color: 0x5fb7e5 })
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 0.55;
      group.add(shaft, tip);
      group.lookAt(group.position.clone().add(baseDir));
    } else {
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.26, 1),
        new THREE.MeshBasicMaterial({ color })
      );
      const aura = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.42, 16),
        new THREE.MeshBasicMaterial({ color: 0xf2c14e, side: THREE.DoubleSide })
      );
      group.add(core, aura);
    }

    this.scene.add(group);
    this.projectiles.push({
      mesh: group,
      velocity: baseDir.multiplyScalar(speed),
      multiplier,
      life: 1.5
    });
  }

  private triggerSkill(index: number): void {
    if (this.skillCooldowns[index] > 0 || this.isRolling) return;
    const cls =
      classesData.classes.find((c) => c.id === this.profile.classId) ?? classesData.classes[0];
    const sk = cls.skills[index];
    if (!sk || this.mana < sk.manaCost) return;

    this.mana -= sk.manaCost;
    this.skillCooldowns[index] = sk.cooldown;
    this.currentSkillIdx = index;
    this.skillAnimDuration = 0.55;
    this.skillAnimTimer = 0.55;
    this.camShake = 0.28;
    this.audio.playHeroChime();

    const forward = new THREE.Vector3(Math.sin(this.playerRotY), 0, Math.cos(this.playerRotY));
    const targetCenter = this.lockedTarget
      ? this.lockedTarget.position.clone()
      : this.playerPos.clone().addScaledVector(forward, 3.5);

    if (this.profile.classId === 'knight') {
      if (index === 0) {
        this.playerPos.addScaledVector(forward, 2.2);
        this.spawnShockwaveDomeVFX(this.playerPos.clone().addScaledVector(forward, 1.2), 0x5fb7e5, 3.6);
        this.hitEnemiesInRadius(this.playerPos, 3.8, 1.4, 2.0);
      } else if (index === 1) {
        this.spawnWhirlwindVFX(this.playerPos.clone());
        this.hitEnemiesInRadius(this.playerPos, 4.4, 1.85);
      } else {
        this.defBuffTimer = 8.0;
        this.spawnGuardianPillarVFX(this.playerPos.clone());
        this.spawnFloatingText(
          this.playerPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
          'PERTAHANAN +40%!',
          'crit'
        );
      }
    } else if (this.profile.classId === 'mage') {
      if (index === 0) {
        this.spawnShockwaveDomeVFX(targetCenter, 0xd64545, 4.0);
        this.hitEnemiesInRadius(targetCenter, 4.2, 1.7);
      } else if (index === 1) {
        this.spawnIceWallVFX(targetCenter, this.playerRotY);
        this.hitEnemiesInRadius(targetCenter, 4.2, 1.3, 2.5);
      } else {
        this.spawnSkyLightningVFX(targetCenter);
        this.hitEnemiesInRadius(targetCenter, 4.8, 2.45);
      }
    } else {
      if (index === 0) {
        this.fireProjectile(36, 1.2, 0x5fb7e5, -0.06);
        window.setTimeout(() => this.fireProjectile(36, 1.2, 0xf2c14e, 0.06), 110);
      } else if (index === 1) {
        this.spawnArrowRainVFX(targetCenter);
        this.hitEnemiesInRadius(targetCenter, 4.6, 2.15);
      } else {
        this.spawnShockwaveDomeVFX(targetCenter, 0x4fa66a, 3.8);
        this.hitEnemiesInRadius(targetCenter, 4.0, 1.35, 2.2);
      }
    }
  }

  // MEKANIK RAID TELEGRAPH AOE (Lingkaran Merah Serangan Raid Boss)
  private spawnRaidBossTelegraph(boss: CombatTarget): void {
    const group = new THREE.Group();
    const center = this.playerPos.clone();
    center.y = 0.08;
    group.position.copy(center);

    const radius = 4.6;
    const borderRing = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.18, radius, 36),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a, side: THREE.DoubleSide })
    );
    borderRing.rotation.x = -Math.PI / 2;

    const innerFill = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 36),
      new THREE.MeshBasicMaterial({
        color: 0xd64545,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38
      })
    );
    innerFill.rotation.x = -Math.PI / 2;
    innerFill.scale.setScalar(0.05);

    group.add(borderRing, innerFill);
    this.scene.add(group);

    this.telegraphs.push({
      mesh: group,
      innerFill,
      center,
      radius,
      timer: 0,
      maxTime: 1.75,
      damage: boss.atk * 1.65,
      bossName: boss.name
    });
  }

  private spawnShockwaveDomeVFX(center: THREE.Vector3, colorHex: number, maxRadius: number): void {
    const group = new THREE.Group();
    group.position.copy(center);

    const domeMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), domeMat);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf2c14e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.95, 28), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;

    group.add(dome, ring);
    this.scene.add(group);

    this.vfxList.push({
      mesh: group,
      life: 0.42,
      maxLife: 0.42,
      onUpdate: (_dt, prog) => {
        const s = 1 + prog * maxRadius;
        dome.scale.setScalar(s);
        ring.scale.setScalar(s * 1.15);
        domeMat.opacity = 1 - prog;
        ringMat.opacity = 1 - prog;
      }
    });
  }

  private spawnWhirlwindVFX(center: THREE.Vector3): void {
    const group = new THREE.Group();
    group.position.copy(center);

    const mats: THREE.MeshBasicMaterial[] = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x5fb7e5 : 0xf2c14e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      mats.push(mat);
      const torus = new THREE.Mesh(new THREE.RingGeometry(1.2 + i * 0.65, 1.55 + i * 0.65, 28), mat);
      torus.rotation.x = -Math.PI / 2;
      torus.position.y = 0.4 + i * 0.45;
      group.add(torus);
    }
    this.scene.add(group);

    this.vfxList.push({
      mesh: group,
      life: 0.5,
      maxLife: 0.5,
      onUpdate: (dt, prog) => {
        group.rotation.y += dt * 18;
        group.scale.setScalar(0.8 + prog * 0.5);
        mats.forEach((m) => (m.opacity = 1 - prog));
      }
    });
  }

  private spawnGuardianPillarVFX(center: THREE.Vector3): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf2c14e,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 6, 24, 1, true), mat);
    pillar.position.copy(center).add(new THREE.Vector3(0, 3, 0));
    this.scene.add(pillar);

    this.vfxList.push({
      mesh: pillar,
      life: 0.65,
      maxLife: 0.65,
      onUpdate: (dt, prog) => {
        pillar.rotation.y += dt * 6;
        pillar.scale.set(1 + prog * 0.4, 1, 1 + prog * 0.4);
        mat.opacity = (1 - prog) * 0.75;
      }
    });
  }

  private spawnIceWallVFX(center: THREE.Vector3, yaw: number): void {
    const group = new THREE.Group();
    group.position.copy(center);
    group.rotation.y = yaw;

    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x5fb7e5,
      emissive: 0x3c7bd9,
      emissiveIntensity: 1.2,
      roughness: 0.15
    });

    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 2.6 - Math.abs(i) * 0.25, 6),
        iceMat
      );
      spike.position.set(i * 0.75, 1.1, 0);
      group.add(spike);
    }
    this.scene.add(group);

    this.vfxList.push({
      mesh: group,
      life: 1.6,
      maxLife: 1.6,
      onUpdate: (_dt, prog) => {
        if (prog < 0.15) group.scale.y = prog / 0.15;
        else if (prog > 0.8) group.scale.y = (1 - prog) / 0.2;
        else group.scale.y = 1;
      }
    });
  }

  private spawnSkyLightningVFX(center: THREE.Vector3): void {
    const group = new THREE.Group();
    group.position.copy(center);

    const boltMat = new THREE.MeshBasicMaterial({
      color: 0x5fb7e5,
      transparent: true,
      opacity: 0.95
    });
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, 18, 8), boltMat);
    bolt.position.y = 9;
    const impactRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 3.8, 24), boltMat);
    impactRing.rotation.x = -Math.PI / 2;
    impactRing.position.y = 0.12;
    group.add(bolt, impactRing);
    this.scene.add(group);

    this.vfxList.push({
      mesh: group,
      life: 0.45,
      maxLife: 0.45,
      onUpdate: (_dt, prog) => {
        boltMat.opacity = 1 - prog;
        bolt.scale.x = 1 + Math.sin(prog * 30) * 0.4;
      }
    });
  }

  private spawnArrowRainVFX(center: THREE.Vector3): void {
    const group = new THREE.Group();
    group.position.copy(center);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.95 });

    for (let i = 0; i < 14; i++) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), arrowMat);
      const angle = (i / 14) * Math.PI * 2;
      const r = (i % 3) * 1.1 + 0.4;
      a.position.set(Math.cos(angle) * r, 6 + (i % 4) * 1.2, Math.sin(angle) * r);
      group.add(a);
    }
    this.scene.add(group);

    this.vfxList.push({
      mesh: group,
      life: 0.5,
      maxLife: 0.5,
      onUpdate: (dt, prog) => {
        group.position.y -= dt * 14;
        arrowMat.opacity = 1 - prog;
      }
    });
  }

  private spawnHitSparks(pos: THREE.Vector3, colorHex: number): void {
    const group = new THREE.Group();
    group.position.copy(pos);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
    const dirs: THREE.Vector3[] = [];

    for (let i = 0; i < 8; i++) {
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), mat);
      group.add(spark);
      dirs.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 4 + 1,
          (Math.random() - 0.5) * 6
        )
      );
    }
    this.scene.add(group);

    this.vfxList.push({
      mesh: group,
      life: 0.32,
      maxLife: 0.32,
      onUpdate: (dt, prog) => {
        group.children.forEach((child, idx) => {
          child.position.addScaledVector(dirs[idx], dt);
        });
        mat.opacity = 1 - prog;
      }
    });
  }

  private spawnDashDust(pos: THREE.Vector3): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xefe6d2,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.85, 18), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
    this.scene.add(ring);

    this.vfxList.push({
      mesh: ring,
      life: 0.3,
      maxLife: 0.3,
      onUpdate: (_dt, prog) => {
        ring.scale.setScalar(1 + prog * 1.8);
        mat.opacity = (1 - prog) * 0.65;
      }
    });
  }

  private hitEnemiesInRadius(
    origin: THREE.Vector3,
    radius: number,
    multiplier: number,
    stunSeconds = 0
  ): void {
    let hitAny = false;
    for (const enemy of this.enemies) {
      const reach = enemy.kind === 'boss' ? radius + 1.2 : radius;
      if (enemy.position.distanceTo(origin) <= reach) {
        this.applyDamageToEnemy(enemy, multiplier, stunSeconds);
        hitAny = true;
      }
    }
    if (hitAny) {
      this.hitStopTimer = 0.032; // Micro hit-stop agar tebasan terasa berbobot
    } else {
      const front = this.playerPos
        .clone()
        .add(new THREE.Vector3(Math.sin(this.playerRotY) * 1.8, 1.35, Math.cos(this.playerRotY) * 1.8));
      this.spawnHitSparks(front, 0x5fb7e5);
    }
  }

  private applyDamageToEnemy(
    enemy: CombatTarget,
    multiplier: number,
    stunSeconds = 0
  ): void {
    const res = this.calculateFormulaDamage(enemy.def, multiplier);
    enemy.hp = Math.max(0, enemy.hp - res.value);
    enemy.wobbleTimer = 0.42;
    if (stunSeconds > 0) enemy.stunTimer = Math.max(enemy.stunTimer, stunSeconds);

    if (enemy.kind !== 'dummy' && enemy.kind !== 'boss') {
      const knockDir = enemy.position.clone().sub(this.playerPos).normalize();
      enemy.position.addScaledVector(knockDir, 0.55);
      enemy.mesh.position.copy(enemy.position);
    }

    const hitPos = enemy.position.clone().add(new THREE.Vector3(0, enemy.kind === 'boss' ? 2.4 : 1.5, 0));
    this.spawnHitSparks(hitPos, res.isCrit ? 0xf2c14e : 0x5fb7e5);
    this.spawnFloatingText(
      hitPos.clone().add(new THREE.Vector3(0, 0.5, 0)),
      res.isCrit ? \`\${res.value}! (KRIT)\` : \`\${res.value}\`,
      res.isCrit ? 'crit' : 'normal'
    );

    if (enemy.hp <= 0) {
      this.onEnemyDefeated(enemy);
    }
  }

  private onEnemyDefeated(enemy: CombatTarget): void {
    this.spawnShockwaveDomeVFX(enemy.position, 0xf2c14e, enemy.kind === 'boss' ? 4.5 : 2.2);
    this.gainXpAndGold(enemy.xpReward, enemy.goldReward, enemy.position);

    // Cek Progres Quest Aktif
    const q = this.quests[this.activeQuestIdx];
    if (q) {
      const isMatch =
        (q.targetKind === 'forest_mob' && (enemy.kind === 'wolf' || enemy.kind === 'goblin')) ||
        (q.targetKind === 'ruins_mob' && enemy.kind === 'skeleton') ||
        (q.targetKind === 'crystal_mob' && enemy.kind === 'golem') ||
        q.targetKind === enemy.id;

      if (isMatch) {
        q.currentCount++;
        if (q.currentCount >= q.requiredCount) {
          this.completeActiveQuest();
        }
      }
    }

    // Respawn Musuh
    enemy.hp = enemy.maxHp;
    enemy.position.copy(enemy.spawnOrigin);
    enemy.mesh.position.copy(enemy.spawnOrigin);
  }

  private gainXpAndGold(xpGain: number, goldGain: number, pos: THREE.Vector3): void {
    this.xp += xpGain;
    this.gold += goldGain;
    this.spawnFloatingText(
      pos.clone().add(new THREE.Vector3(0, 2.5, 0)),
      \`+\${xpGain} XP  +\${goldGain} Emas\`,
      'heal'
    );

    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.round(this.xpToNext * 1.35);
      this.maxHp += 24;
      this.hp = this.maxHp;
      this.maxMana += 12;
      this.mana = this.maxMana;
      this.atk += 4;
      this.def += 2;
      this.audio.playHeroChime();
      this.spawnGuardianPillarVFX(this.playerPos.clone());
      this.spawnFloatingText(
        this.playerPos.clone().add(new THREE.Vector3(0, 2.8, 0)),
        \`NAIK LEVEL \${this.level}! (ATK & HP Meningkat)\`,
        'crit'
      );
    }
  }

  private completeActiveQuest(): void {
    const q = this.quests[this.activeQuestIdx];
    if (!q) return;
    this.audio.playHeroChime();
    this.gainXpAndGold(q.xpReward, q.goldReward, this.playerPos);
    this.spawnFloatingText(
      this.playerPos.clone().add(new THREE.Vector3(0, 3.1, 0)),
      \`QUEST SELESAI: \${q.title}!\`,
      'crit'
    );
    if (this.activeQuestIdx < this.quests.length - 1) {
      this.activeQuestIdx++;
    } else {
      q.currentCount = q.requiredCount;
    }
  }

  private calculateFormulaDamage(
    targetDef: number,
    skillMultiplier: number
  ): { value: number; isCrit: boolean } {
    const rand = 0.92 + Math.random() * 0.18;
    let raw = this.atk * skillMultiplier * (100 / (100 + targetDef)) * rand;
    const isCrit = Math.random() < 0.18;
    if (isCrit) raw *= 1.75;
    return { value: Math.max(1, Math.round(raw)), isCrit };
  }

  private useHealthPotion(): void {
    if (this.potionCooldown > 0 || this.hp >= this.maxHp) return;
    this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.45));
    this.potionCooldown = 4.5;
    this.audio.playHeroChime();
    this.spawnGuardianPillarVFX(this.playerPos.clone());
    this.spawnFloatingText(
      this.playerPos.clone().add(new THREE.Vector3(0, 2.1, 0)),
      '+45% HP Pulih',
      'heal'
    );
  }

  private toggleLockOn(): void {
    if (this.lockedTarget) {
      this.lockedTarget = null;
      return;
    }
    let nearest: CombatTarget | null = null;
    let bestDist = 32;
    for (const e of this.enemies) {
      const d = e.position.distanceTo(this.playerPos);
      if (d < bestDist) {
        bestDist = d;
        nearest = e;
      }
    }
    this.lockedTarget = nearest;
  }

  private interactWithNearestNPC(): void {
    if (this.dialogBoxEl) {
      this.dialogBoxEl.remove();
      this.dialogBoxEl = null;
      return;
    }
    const nearest = this.findNearestNPC();
    if (!nearest) return;

    this.audio.playClick();

    // Cek Quest 1 (Bicara dengan Tetua Maren)
    const q = this.quests[this.activeQuestIdx];
    if (q && q.targetKind === 'talk_maren' && nearest.id === 'maren') {
      q.currentCount = 1;
      this.completeActiveQuest();
    }

    // Fitur Pandai Besi Brann: Upgrade Senjata dengan Emas
    if (nearest.id === 'brann') {
      const cost = (this.weaponUpgradeLevel + 1) * 100;
      if (this.gold >= cost) {
        this.gold -= cost;
        this.weaponUpgradeLevel++;
        this.atk += 5;
        this.audio.playHeroChime();
        this.spawnGuardianPillarVFX(this.playerPos.clone());
        this.spawnFloatingText(
          this.playerPos.clone().add(new THREE.Vector3(0, 2.3, 0)),
          \`SENJATA DITEMPA +\${this.weaponUpgradeLevel}! (ATK +5)\`,
          'crit'
        );
      } else {
        this.spawnFloatingText(
          this.playerPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
          \`Butuh \${cost} Emas untuk Tempa +\${this.weaponUpgradeLevel + 1}\`,
          'normal'
        );
      }
    }

    // Fitur Apoteker Lysa: Pulihkan Penuh
    if (nearest.id === 'lysa') {
      this.hp = this.maxHp;
      this.mana = this.maxMana;
      this.spawnGuardianPillarVFX(this.playerPos.clone());
    }

    const box = createPanel({ title: \`\${nearest.name} — \${nearest.role}\` });
    box.element.style.cssText =
      'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);width:min(680px,90vw);z-index:120;';
    box.body.innerHTML = \`
      <p style="font-size:16px;margin-bottom:12px;">"\${nearest.dialog.join(' ')}"</p>
      <div style="font-size:13px;color:var(--color-gold-light);">Tekan [F] lagi untuk menutup dialog</div>
    \`;
    document.body.appendChild(box.element);
    this.dialogBoxEl = box.element;
  }

  private findNearestNPC(): VillageNPC | null {
    for (const npc of this.npcs) {
      if (npc.position.distanceTo(this.playerPos) < 3.8) return npc;
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

    const modal = createPanel({ title: 'Menu Jeda — Overworld Aethermoor', className: 'modal-box' });
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
    el.style.cssText = \`
      position:fixed;left:\${x}px;top:\${y}px;pointer-events:none;z-index:150;
      font-family:var(--font-title);font-weight:800;
      font-size:\${type === 'crit' ? '28px' : '20px'};
      color:\${
        type === 'crit'
          ? 'var(--color-gold-light)'
          : type === 'heal'
          ? 'var(--color-bar-stamina)'
          : 'var(--color-bone-white)'
      };
      text-shadow:0 2px 8px var(--color-night-black),0 0 4px var(--color-night-black);
      transform:translate(-50%,-50%);transition:opacity 180ms ease-out;
    \`;
    document.body.appendChild(el);

    let dy = 0;
    const timer = window.setInterval(() => {
      dy -= 2.2;
      el.style.transform = \`translate(-50%, calc(-50% + \${dy}px))\`;
    }, 16);

    window.setTimeout(() => {
      el.style.opacity = '0';
      window.setTimeout(() => {
        window.clearInterval(timer);
        el.remove();
      }, 180);
    }, 680);
  }

  private lerpAngle(current: number, target: number, t: number): number {
    let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * t;
  }

  private updateWeaponRibbonTrail(): void {
    const tipObj = this.playerRig.bones['WeaponTip'];
    const baseObj = this.playerRig.bones['WeaponBase'];
    if (!tipObj || !baseObj) return;

    const isSwinging = this.attackAnimTimer > 0 || this.skillAnimTimer > 0 || this.isRolling;
    if (isSwinging) {
      const tipWorld = new THREE.Vector3();
      const baseWorld = new THREE.Vector3();
      tipObj.getWorldPosition(tipWorld);
      baseObj.getWorldPosition(baseWorld);
      this.trailHistory.unshift({ tip: tipWorld, base: baseWorld });
      if (this.trailHistory.length > 14) this.trailHistory.pop();
    } else if (this.trailHistory.length > 0) {
      this.trailHistory.pop();
    }

    if (this.trailHistory.length < 2) {
      this.trailMesh.visible = false;
      return;
    }

    this.trailMesh.visible = true;
    const posAttr = this.trailGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 14; i++) {
      const sample = this.trailHistory[Math.min(i, this.trailHistory.length - 1)];
      posAttr.setXYZ(i * 2, sample.base.x, sample.base.y, sample.base.z);
      posAttr.setXYZ(i * 2 + 1, sample.tip.x, sample.tip.y, sample.tip.z);
    }
    posAttr.needsUpdate = true;
  }

  private updateRadarMinimap(): void {
    const ctx = this.minimapCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 156, 156);
    ctx.fillStyle = '#14241f';
    ctx.fillRect(0, 0, 156, 156);

    const cx = 78;
    const cy = 78;
    const scale = 0.42;

    // Gambar Jalan Kompas Overworld
    ctx.strokeStyle = 'rgba(239, 230, 210, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, 156);
    ctx.moveTo(0, cy);
    ctx.lineTo(156, cy);
    ctx.stroke();

    // Gambar Target Quest Aktif (Bintang Biru Kristal)
    const q = this.quests[this.activeQuestIdx];
    if (q) {
      const qx = cx + (q.targetPos.x - this.playerPos.x) * scale;
      const qy = cy + (q.targetPos.z - this.playerPos.z) * scale;
      ctx.fillStyle = '#5FB7E5';
      ctx.beginPath();
      ctx.arc(
        Math.max(10, Math.min(146, qx)),
        Math.max(10, Math.min(146, qy)),
        5.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Gambar Musuh & Raid Boss
    for (const e of this.enemies) {
      if (e.kind === 'dummy') continue;
      const ex = cx + (e.position.x - this.playerPos.x) * scale;
      const ey = cy + (e.position.z - this.playerPos.z) * scale;
      if (ex < 6 || ex > 150 || ey < 6 || ey > 150) continue;

      ctx.fillStyle = e.kind === 'boss' ? '#F2C14E' : '#D64545';
      ctx.beginPath();
      ctx.arc(ex, ey, e.kind === 'boss' ? 5.0 : 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Titik Pemain di Tengah
    ctx.fillStyle = '#EFE6D2';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  public update(elapsedTime: number, rawDeltaTime: number): void {
    if (this.isPaused) return;

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= rawDeltaTime;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const deltaTime = rawDeltaTime;

    this.fountainCrystal.rotation.y = elapsedTime * 1.4;
    this.fountainCrystal.position.y = 3.7 + Math.sin(elapsedTime * 2.5) * 0.14;
    this.fountainRings.forEach((ring, idx) => {
      ring.rotation.x = elapsedTime * (idx === 0 ? 1.2 : -1.5);
      ring.rotation.y = elapsedTime * 0.9;
    });
    this.swayingFoliage.forEach((f, idx) => {
      f.rotation.z = Math.sin(elapsedTime * 1.5 + idx) * 0.035;
    });
    this.fireflyParticles.rotation.y = elapsedTime * 0.04;
    if (this.lightStrideActive) {
      this.speedAuraMesh.rotation.z = elapsedTime * 5;
    }

    this.npcs.forEach((npc, idx) => {
      npc.rig.updateAnimation(elapsedTime + idx * 0.7, deltaTime, false);
      npc.marker.rotation.y = elapsedTime * 2.2;
      npc.marker.position.y = 2.38 + Math.sin(elapsedTime * 3 + idx) * 0.08;
      if (npc.position.distanceTo(this.playerPos) < 5.5) {
        const angleToPlayer = Math.atan2(
          this.playerPos.x - npc.position.x,
          this.playerPos.z - npc.position.z
        );
        npc.rig.root.rotation.y = this.lerpAngle(npc.rig.root.rotation.y, angleToPlayer, deltaTime * 5);
      }
    });

    if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
    if (this.attackAnimTimer > 0) this.attackAnimTimer = Math.max(0, this.attackAnimTimer - deltaTime);
    if (this.skillAnimTimer > 0) this.skillAnimTimer = Math.max(0, this.skillAnimTimer - deltaTime);
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= deltaTime;
    if (this.defBuffTimer > 0) this.defBuffTimer -= deltaTime;
    if (this.camShake > 0) this.camShake = Math.max(0, this.camShake - deltaTime * 2.8);
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
      this.stamina = Math.min(this.maxStamina, this.stamina + 26 * deltaTime);
    }
    if (this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + 5 * deltaTime);
    }

    // GERAKAN PEMAIN
    const moveX = (this.keys.get('KeyD') ? 1 : 0) - (this.keys.get('KeyA') ? 1 : 0);
    const moveZ = (this.keys.get('KeyS') ? 1 : 0) - (this.keys.get('KeyW') ? 1 : 0);
    const inputVec = new THREE.Vector3(moveX, 0, moveZ);
    const hasInput = inputVec.lengthSq() > 0.01;
    const isSprinting =
      (!!this.keys.get('ShiftLeft') || this.lightStrideActive) &&
      hasInput &&
      this.stamina > 2 &&
      !this.isBlocking;

    if (this.isRolling) {
      this.rollTimer -= deltaTime;
      const rollDir = new THREE.Vector3(Math.sin(this.playerRotY), 0, Math.cos(this.playerRotY));
      this.playerPos.addScaledVector(rollDir, this.baseSpeed * 2.1 * deltaTime);
      if (this.rollTimer <= 0) {
        this.isRolling = false;
      }
    } else {
      if (!!this.keys.get('ShiftLeft') && hasInput) this.consumeStamina(8 * deltaTime);
      const strideMult = this.lightStrideActive ? 1.85 : isSprinting ? 1.45 : 1.0;
      const maxSpeed = this.isBlocking ? this.baseSpeed * 0.55 : this.baseSpeed * strideMult;

      if (hasInput) {
        inputVec.normalize();
        this.targetRotY = Math.atan2(inputVec.x, inputVec.z) + this.camYaw;
        const desiredVel = new THREE.Vector3(
          Math.sin(this.targetRotY) * maxSpeed,
          0,
          Math.cos(this.targetRotY) * maxSpeed
        );
        this.playerVel.lerp(desiredVel, Math.min(1, deltaTime * 14));
      } else {
        this.playerVel.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, deltaTime * 15));
        if (this.lockedTarget) {
          this.targetRotY = Math.atan2(
            this.lockedTarget.position.x - this.playerPos.x,
            this.lockedTarget.position.z - this.playerPos.z
          );
        }
      }

      this.playerPos.addScaledVector(this.playerVel, deltaTime);
      this.playerRotY = this.lerpAngle(
        this.playerRotY,
        this.targetRotY,
        Math.min(1, deltaTime * 16)
      );
    }

    this.velocityY -= 20.0 * deltaTime;
    this.playerPos.y += this.velocityY * deltaTime;
    if (this.playerPos.y <= 0) {
      this.playerPos.y = 0;
      this.velocityY = 0;
      this.isGrounded = true;
    }

    this.resolveCollisions();

    const speedMag = this.playerVel.length();
    const isMoving = speedMag > 0.35;
    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y = this.playerRotY;

    const attackProgress =
      this.attackAnimTimer > 0
        ? 1 - this.attackAnimTimer / Math.max(0.01, this.attackAnimDuration)
        : 0;
    const skillProgress =
      this.skillAnimTimer > 0
        ? 1 - this.skillAnimTimer / Math.max(0.01, this.skillAnimDuration)
        : 0;
    const rollProgress = this.isRolling ? (0.4 - this.rollTimer) / 0.4 : 0;

    this.playerRig.updateAnimation(elapsedTime, deltaTime, true, {
      isMoving,
      isSprinting,
      isGrounded: this.isGrounded,
      isRolling: this.isRolling,
      rollProgress,
      attackComboStep: this.currentAttackStep,
      attackProgress,
      skillIndex: this.currentSkillIdx,
      skillProgress,
      isBlocking: this.isBlocking
    });

    // Update 3D Weapon Ribbon Trail
    this.updateWeaponRibbonTrail();

    // Update Rekan Raid AI
    if (this.companionsActive) {
      this.companions.forEach((comp, idx) => {
        const followOffset = new THREE.Vector3(idx === 0 ? -2.4 : 2.4, 0, -2.2).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.playerRotY
        );
        const homePos = this.playerPos.clone().add(followOffset);

        // Cari musuh terdekat dari pemain
        let nearestEnemy: CombatTarget | null = null;
        let minDist = 16;
        for (const e of this.enemies) {
          if (e.kind === 'dummy') continue;
          const d = e.position.distanceTo(this.playerPos);
          if (d < minDist) {
            minDist = d;
            nearestEnemy = e;
          }
        }

        const targetPos = nearestEnemy ? nearestEnemy.position : homePos;
        const distToTarget = comp.position.distanceTo(targetPos);
        const stopRange = comp.classId === 'archer' && nearestEnemy ? 7.5 : 2.1;

        let compMoving = false;
        if (distToTarget > stopRange) {
          const dir = targetPos.clone().sub(comp.position).normalize();
          comp.position.addScaledVector(dir, 5.4 * deltaTime);
          comp.rotationY = this.lerpAngle(comp.rotationY, Math.atan2(dir.x, dir.z), deltaTime * 10);
          compMoving = true;
        } else if (nearestEnemy) {
          const dir = nearestEnemy.position.clone().sub(comp.position).normalize();
          comp.rotationY = this.lerpAngle(comp.rotationY, Math.atan2(dir.x, dir.z), deltaTime * 10);
          comp.attackTimer -= deltaTime;
          if (comp.attackTimer <= 0) {
            comp.attackTimer = 1.35;
            this.applyDamageToEnemy(nearestEnemy, 0.55);
          }
        }

        comp.rig.root.position.copy(comp.position);
        comp.rig.root.rotation.y = comp.rotationY;
        comp.rig.updateAnimation(elapsedTime + idx, deltaTime, false, {
          isMoving: compMoving,
          attackProgress: comp.attackTimer > 1.0 ? (1.35 - comp.attackTimer) / 0.35 : 0
        });
      });
    }

    // Update Proyektil
    for (const p of this.projectiles) {
      p.life -= deltaTime;
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      for (const e of this.enemies) {
        const hitRadius = e.kind === 'boss' ? 2.2 : 1.25;
        if (p.mesh.position.distanceTo(e.position.clone().add(new THREE.Vector3(0, 1, 0))) < hitRadius) {
          this.applyDamageToEnemy(e, p.multiplier);
          p.life = 0;
          break;
        }
      }
      if (p.life <= 0) this.scene.remove(p.mesh);
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);

    // Update VFX
    for (const vfx of this.vfxList) {
      vfx.life -= deltaTime;
      const prog = Math.min(1, Math.max(0, 1 - vfx.life / vfx.maxLife));
      vfx.onUpdate(deltaTime, prog);
      if (vfx.life <= 0) this.scene.remove(vfx.mesh);
    }
    this.vfxList = this.vfxList.filter((v) => v.life > 0);

    // Update Raid Boss Telegraphs (AOE Merah)
    for (const tel of this.telegraphs) {
      tel.timer += deltaTime;
      const prog = Math.min(1, tel.timer / tel.maxTime);
      tel.innerFill.scale.setScalar(prog);
      if (tel.timer >= tel.maxTime) {
        this.spawnShockwaveDomeVFX(tel.center, 0xd64545, tel.radius * 0.9);
        this.camShake = 0.35;
        if (this.playerPos.distanceTo(tel.center) <= tel.radius && this.invulnerableTimer <= 0) {
          const dmg = Math.max(5, Math.round(tel.damage * (100 / (100 + this.def))));
          this.hp = Math.max(1, this.hp - dmg);
          this.spawnFloatingText(
            this.playerPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
            \`-\${dmg} (SERANGAN RAID!)\`,
            'crit'
          );
        }
        this.scene.remove(tel.mesh);
      }
    }
    this.telegraphs = this.telegraphs.filter((t) => t.timer < t.maxTime);

    // Update AI Musuh & 4 Raid Boss
    let activeRaidBoss: CombatTarget | null = null;
    for (const e of this.enemies) {
      e.hpBarGroup.lookAt(this.camera.position);
      const hpRatio = Math.max(0.001, e.hp / e.maxHp);
      e.hpBarFill.scale.x = hpRatio;
      e.hpBarFill.position.x = -(1 - hpRatio) * 0.54;

      if (e.wobbleTimer > 0) {
        e.wobbleTimer = Math.max(0, e.wobbleTimer - deltaTime);
        e.mesh.rotation.z = Math.sin(e.wobbleTimer * 28) * 0.2 * e.wobbleTimer;
      } else {
        e.mesh.rotation.z = 0;
      }

      const dist = e.position.distanceTo(this.playerPos);
      if (e.kind === 'boss' && dist < 38) {
        activeRaidBoss = e;
      }

      if (e.stunTimer > 0) {
        e.stunTimer -= deltaTime;
        continue;
      }

      if (e.atk <= 0) continue;

      const aggroRange = e.kind === 'boss' ? 26 : 16;
      const stopDist = e.kind === 'boss' ? 2.8 : 1.85;

      if (dist < aggroRange) {
        // Raid Boss memicu lingkaran merah AOE setiap beberapa detik
        if (e.kind === 'boss') {
          e.raidSkillTimer -= deltaTime;
          if (e.raidSkillTimer <= 0) {
            e.raidSkillTimer = 5.5;
            this.spawnRaidBossTelegraph(e);
          }
        }

        if (dist > stopDist) {
          const dir = this.playerPos.clone().sub(e.position).normalize();
          e.position.addScaledVector(dir, (e.kind === 'boss' ? 4.4 : 4.1) * deltaTime);
          e.mesh.position.copy(e.position);
          const targetYaw = Math.atan2(dir.x, dir.z);
          e.rotationY = this.lerpAngle(e.rotationY, targetYaw, deltaTime * 10);
          e.mesh.rotation.y = e.rotationY;

          e.legs.forEach((leg, lIdx) => {
            leg.rotation.x = Math.sin(elapsedTime * 12 + lIdx * Math.PI) * 0.6;
          });
        } else {
          e.legs.forEach((leg) => (leg.rotation.x = 0));
          e.attackCooldown -= deltaTime;
          if (e.attackCooldown <= 0) {
            e.attackCooldown = e.kind === 'boss' ? 1.8 : 1.6;
            if (this.invulnerableTimer <= 0) {
              const effectiveDef = this.def * (this.defBuffTimer > 0 ? 1.4 : 1.0);
              const rawDmg = e.atk * (100 / (100 + effectiveDef));
              const finalDmg = Math.max(1, Math.round(this.isBlocking ? rawDmg * 0.3 : rawDmg));
              this.hp = Math.max(1, this.hp - finalDmg);
              this.camShake = 0.2;
              this.spawnHitSparks(
                this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)),
                0xd64545
              );
              this.spawnFloatingText(
                this.playerPos.clone().add(new THREE.Vector3(0, 1.9, 0)),
                \`-\${finalDmg}\`,
                'normal'
              );
            }
          }
        }
      } else if (e.position.distanceTo(e.spawnOrigin) > 1.0) {
        const backDir = e.spawnOrigin.clone().sub(e.position).normalize();
        e.position.addScaledVector(backDir, 4.5 * deltaTime);
        e.mesh.position.copy(e.position);
      }
    }

    this.updateCamera(deltaTime, isSprinting);
    this.updateHUD(activeRaidBoss);
    this.updateRadarMinimap();

    this.renderer.render(this.scene, this.camera);
  }

  private resolveCollisions(): void {
    this.playerPos.x = Math.max(-210, Math.min(210, this.playerPos.x));
    this.playerPos.z = Math.max(-210, Math.min(210, this.playerPos.z));

    const radius = 0.5;
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
    if (this.lockedTarget) {
      this.lockReticle.visible = true;
      this.lockReticle.position.set(
        this.lockedTarget.position.x,
        0.1,
        this.lockedTarget.position.z
      );
      this.lockReticle.rotation.z += deltaTime * 3.5;
      const toTarget = this.lockedTarget.position.clone().sub(this.playerPos);
      const desiredYaw = Math.atan2(-toTarget.x, -toTarget.z);
      this.camYaw = this.lerpAngle(this.camYaw, desiredYaw, deltaTime * 8);
    } else {
      this.lockReticle.visible = false;
    }

    const targetFov = this.lightStrideActive ? 68 : isSprinting ? 64 : 60;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, deltaTime * 8);
    this.camera.updateProjectionMatrix();

    const dist = 5.2;
    const desiredPivot = new THREE.Vector3(
      this.playerPos.x,
      this.playerPos.y + 1.48,
      this.playerPos.z
    );
    this.camCurrentLook.lerp(desiredPivot, Math.min(1, deltaTime * 16));

    const offset = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist,
      Math.sin(this.camPitch) * dist,
      Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist
    );

    const shake =
      this.camShake > 0
        ? new THREE.Vector3((Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16, 0)
        : new THREE.Vector3();

    const desiredCamPos = this.camCurrentLook.clone().add(offset).add(shake);
    this.camera.position.lerp(desiredCamPos, Math.min(1, deltaTime * 18));

    if (this.lockedTarget) {
      const lockFocus = this.lockedTarget.position
        .clone()
        .add(new THREE.Vector3(0, 1.2, 0))
        .lerp(this.camCurrentLook, 0.45);
      this.camera.lookAt(lockFocus);
    } else {
      this.camera.lookAt(this.camCurrentLook);
    }
  }

  private getCurrentRegionName(): string {
    if (this.playerPos.z > 44) return 'Hutan Berkabut (Zona Raid I)';
    if (this.playerPos.z < -44) return 'Benteng Obsidian (Final Raid)';
    if (this.playerPos.x < -44) return 'Reruntuhan Kuno (Zona Raid II)';
    if (this.playerPos.x > 44) return 'Lembah Kristal (Zona Raid III)';
    return 'Desa Embermere (Zona Aman)';
  }

  private updateHUD(activeRaidBoss: CombatTarget | null): void {
    this.hpBar.setValue(this.hp, this.maxHp);
    this.manaBar.setValue(this.mana, this.maxMana);
    this.staminaBar.setValue(this.stamina, this.maxStamina);
    this.xpBar.setValue(this.xp, this.xpToNext);

    this.levelBadgeEl.textContent = \`Lv \${this.level}\`;
    this.goldTextEl.textContent = \`🪙 \${this.gold} Emas\`;
    this.weaponTextEl.textContent = \`⚔️ Senjata +\${this.weaponUpgradeLevel} (ATK \${this.atk})\`;
    this.regionLabelEl.textContent = this.getCurrentRegionName();

    const q = this.quests[this.activeQuestIdx];
    if (q) {
      const distToQuest = Math.round(this.playerPos.distanceTo(q.targetPos));
      this.questTitleEl.textContent = q.title;
      this.questDescEl.textContent = q.description;
      this.questProgEl.textContent = \`Progres: \${q.currentCount}/\${q.requiredCount} • Jarak: \${distToQuest}m (\${q.region})\`;
    }

    const shownBoss = activeRaidBoss || (this.lockedTarget?.kind === 'boss' ? this.lockedTarget : null);
    if (shownBoss) {
      this.bossRaidHudEl.style.display = 'flex';
      this.bossNameEl.textContent = \`💀 \${shownBoss.name} (Lv.\${shownBoss.level})\`;
      const pct = Math.max(0, (shownBoss.hp / shownBoss.maxHp) * 100);
      this.bossBarFillEl.style.width = \`\${pct}%\`;
      this.bossHpTextEl.textContent = \`\${Math.round(shownBoss.hp)} / \${shownBoss.maxHp} HP\`;
    } else {
      this.bossRaidHudEl.style.display = 'none';
    }

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

    const nearNPC = this.findNearestNPC();
    if (nearNPC) {
      this.promptEl.style.display = 'block';
      this.promptEl.textContent =
        nearNPC.id === 'brann'
          ? \`[F] Tempa Senjata +\${this.weaponUpgradeLevel + 1} pada Brann (\${(this.weaponUpgradeLevel + 1) * 100} Emas)\`
          : \`[F] Bicara dengan \${nearNPC.name} (\${nearNPC.role})\`;
    } else {
      this.promptEl.style.display = 'none';
    }
  }

  public destroy(): void {
    this.hudRoot.remove();
    this.dialogBoxEl?.remove();
    this.pauseModalEl?.remove();
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
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

bootstrap();`
};

for (const [filePath, content] of Object.entries(files)) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('BERHASIL! Overworld 600x600m, 8 Quest & 4 Raid Boss, Rekan Raid AI, dan Kombo 4-Langkah Fluid telah aktif!');