import * as THREE from 'three';
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
    root.name = `Character_${classId}`;
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
      shoulder.name = `${prefix}Shoulder`;
      shoulder.position.set(sign * (chestTopR * 1.15 + 0.045), 0.17, 0);
      chest.add(shoulder);
      bones[`${prefix}Shoulder`] = shoulder;

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
      arm.name = `${prefix}Arm`;
      arm.position.set(0, -0.04, 0);
      shoulder.add(arm);
      bones[`${prefix}Arm`] = arm;

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
      foreArm.name = `${prefix}ForeArm`;
      foreArm.position.set(0, -0.25, 0);
      arm.add(foreArm);
      bones[`${prefix}ForeArm`] = foreArm;

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
      hand.name = `${prefix}Hand`;
      hand.position.set(0, -0.24, 0);
      foreArm.add(hand);
      bones[`${prefix}Hand`] = hand;

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
      upLeg.name = `${prefix}UpLeg`;
      upLeg.position.set(sign * 0.105, -0.06, 0);
      hips.add(upLeg);
      bones[`${prefix}UpLeg`] = upLeg;

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
      leg.name = `${prefix}Leg`;
      leg.position.set(0, -0.38, 0);
      upLeg.add(leg);
      bones[`${prefix}Leg`] = leg;

      const greave = new THREE.Mesh(
        new THREE.CylinderGeometry(0.066, 0.05, 0.38, 14),
        primaryArmorMat
      );
      greave.position.y = -0.19;
      greave.castShadow = true;
      leg.add(greave);

      const foot = new THREE.Group();
      foot.name = `${prefix}Foot`;
      foot.position.set(0, -0.39, 0.035);
      leg.add(foot);
      bones[`${prefix}Foot`] = foot;

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
}