import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { HandLandmark } from "../hooks/useHands";
import type { CentralParams } from "./centralParams";

interface Props {
  landmarks: HandLandmark[][];
  palmCenter: { x: number; y: number } | null;
  handAngle: number;
  params: CentralParams;
  onParamsChange: (update: Partial<CentralParams>) => void;
  mode: number;
  modeHandIndex: number;
  lowPerf?: boolean;
}

function avgPalm(hand: HandLandmark[]) {
  if (!hand || hand.length < 21) return null;
  let sx = 0,
    sy = 0;
  for (const i of [0, 5, 9, 13, 17]) {
    const lm = hand[i];
    if (!lm) return null;
    sx += lm.x;
    sy += lm.y;
  }
  return { x: sx / 5, y: sy / 5 };
}

function handAngleOf(hand: HandLandmark[]) {
  if (!hand || hand.length < 21) return 0;
  const wrist = hand[0],
    mid = hand[9];
  if (!wrist || !mid) return 0;
  return Math.atan2(mid.y - wrist.y, mid.x - wrist.x);
}

function pinchDist(hand: HandLandmark[]) {
  if (!hand || hand.length < 21) return 0;
  const thumb = hand[4],
    index = hand[8];
  if (!thumb || !index) return 0;
  return Math.sqrt((thumb.x - index.x) ** 2 + (thumb.y - index.y) ** 2);
}

function generateShellPoints(count: number, radius: number) {
  const positions = [] as number[];
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2.0 - 1.0;
    const theta = Math.random() * Math.PI * 2.0;
    const phi = Math.acos(u);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    positions.push(x, y, z);
  }
  return positions;
}

const autoSmooth = 0.08;

export function CentralSphere({
  landmarks,
  palmCenter: propCenter,
  handAngle: propAngle,
  params,
  onParamsChange,
  mode,
  modeHandIndex,
  lowPerf,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const sphereRef = useRef<THREE.Points>(null);

  const sphereGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        generateShellPoints(lowPerf ? 1200 : 1800, 0.88),
        3,
      ),
    );
    return geo;
  }, [lowPerf]);

  const particleSprite = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.42, "rgba(240, 248, 255, 0.95)");
    gradient.addColorStop(0.45, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  /* ---- HUD tech layers ---- */
  const hudRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);

  const shellGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(1.22, lowPerf ? 0 : 1),
    [lowPerf],
  );

  /* ---- Drag (mouse) ---- */
  const draggingRef = useRef(false);
  const dragOffRef = useRef(new THREE.Vector3());
  const _dragNdc = useMemo(() => new THREE.Vector3(), []);
  const _dragDir = useMemo(() => new THREE.Vector3(), []);

  /* ---- Smoothing refs ---- */
  const sPos = useRef(new THREE.Vector3(0, 0, 0));
  const sScale = useRef(1);
  const sHue = useRef(0.5);
  const sSat = useRef(1);
  const sOp = useRef(0.18);
  const sRotY = useRef(0);

  /* ---- Persistent gesture values ---- */
  const gScale = useRef(1);
  const gHue = useRef(0.5);
  const gRot = useRef(0);
  const hasCustomRot = useRef(false);
  const gPos = useRef(new THREE.Vector3(0, 0, 0));

  /* ---- Mode tracking ---- */
  const prevMode = useRef(0);

  /* ---- Delta tracking for gesture modes 2-4 ---- */
  const prevAngle = useRef(0);
  const prevAngleValid = useRef(false);
  const prevPinch = useRef(0);
  const prevPinchValid = useRef(false);

  /* ---- Motion energy ---- */
  const prevJoints = useRef<THREE.Vector3[]>([]);
  const _energyVec = useMemo(() => new THREE.Vector3(), []);

  /* ---- Ref-forward hot props ---- */
  const pRef = useRef(params);
  pRef.current = params;
  const mRef = useRef(mode);
  mRef.current = mode;
  const mhRef = useRef(modeHandIndex);
  mhRef.current = modeHandIndex;

  const _lerpTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, size, camera, pointer }) => {
    const halo = haloRef.current;
    const sphere = sphereRef.current;
    if (!halo || !sphere) return;

    const p = pRef.current;
    const curMode = mRef.current;
    const mhIdx = mhRef.current;
    const aspect = size.width / Math.max(size.height, 1);
    const wX = aspect * 1.3;
    const wY = 1.3;

    /* ---- Determine manipulation hand ---- */
    const otherIdx = mhIdx === 0 ? 1 : mhIdx === 1 ? 0 : -1;
    const hasOther = otherIdx >= 0 && landmarks[otherIdx]?.length >= 21;
    const manipHand = hasOther
      ? landmarks[otherIdx]
      : mhIdx >= 0
        ? (landmarks[mhIdx] ?? [])
        : [];
    const hasManip = manipHand.length >= 21;

    const manipPalm = hasManip ? avgPalm(manipHand) : null;
    const manipAngle = hasManip ? handAngleOf(manipHand) : propAngle;

    /* ---- Frame-to-frame deltas for gesture control ---- */
    let dAngle = 0;
    if (hasManip) {
      if (prevAngleValid.current) {
        const raw = manipAngle - prevAngle.current;
        dAngle = Math.atan2(Math.sin(raw), Math.cos(raw));
      }
      prevAngle.current = manipAngle;
      prevAngleValid.current = true;
    } else {
      prevAngleValid.current = false;
    }
    let dPinch = 0;
    const curPinch = hasManip ? pinchDist(manipHand) : 0;
    if (hasManip) {
      if (prevPinchValid.current) dPinch = curPinch - prevPinch.current;
      prevPinch.current = curPinch;
      prevPinchValid.current = true;
    } else {
      prevPinchValid.current = false;
    }

    /* ---- Effective center for positioning ---- */
    const effCenter = propCenter ?? manipPalm;

    /* ---- Motion energy from all joints ---- */
    let energy = 0;
    landmarks.forEach((hand) => {
      if (hand.length < 21) return;
      for (let i = 0; i < 21; i++) {
        const lm = hand[i];
        if (!lm) continue;
        _energyVec.set(
          (lm.x - 0.5) * wX,
          (0.5 - lm.y) * wY,
          (lm.z ?? 0) * 0.35,
        );
        const prev = prevJoints.current[i];
        energy += prev ? _energyVec.distanceTo(prev) : 0;
        if (prev) {
          prev.copy(_energyVec);
        } else {
          prevJoints.current[i] = _energyVec.clone();
        }
      }
    });
    if (landmarks.length === 0) prevJoints.current = [];
    const intensity = Math.min(1, energy / 24);

    /* ---- Palm world-space ---- */
    let pX = 0,
      pY = 0;
    if (effCenter) {
      pX = (effCenter.x - 0.5) * wX;
      pY = (0.5 - effCenter.y) * wY;
    }
    const pDist = effCenter ? Math.sqrt(pX ** 2 + pY ** 2) : 999;
    const prox = effCenter ? Math.max(0, 1 - pDist / 1.6) : 0;
    /* ===== Save position on mode-1 exit ===== */
    if (prevMode.current === 1 && curMode !== 1) {
      gPos.current.copy(sPos.current);
      onParamsChange({
        posX: gPos.current.x,
        posY: gPos.current.y,
        posZ: gPos.current.z,
        autoPosition: false,
      });
    }

    /* ===== Position ===== */
    let tx = p.posX,
      ty = p.posY,
      tz = p.posZ;
    if (curMode === 1 && hasOther && manipPalm) {
      tx = (manipPalm.x - 0.5) * wX;
      ty = (0.5 - manipPalm.y) * wY;
      tz = 0;
      gPos.current.set(tx, ty, tz);
    } else if (curMode !== 1 && p.autoPosition && effCenter) {
      const a = prox * 0.35;
      tx = pX * a;
      ty = pY * a;
      tz = 0;
    } else if (!p.autoPosition) {
      tx = gPos.current.x;
      ty = gPos.current.y;
      tz = gPos.current.z;
    }

    if (draggingRef.current) {
      _dragNdc.set(pointer.x, pointer.y, 0.5);
      _dragNdc.unproject(camera);
      _dragDir.copy(_dragNdc).sub(camera.position).normalize();
      const d = -camera.position.z / (_dragDir.z || 0.001);
      tx = camera.position.x + _dragDir.x * d - dragOffRef.current.x;
      ty = camera.position.y + _dragDir.y * d - dragOffRef.current.y;
    }

    const lerpFactor = curMode === 1 && hasOther ? 0.35 : autoSmooth;
    _lerpTarget.set(tx, ty, tz);
    sPos.current.lerp(
      _lerpTarget,
      draggingRef.current ? 1 : lerpFactor,
    );
    prevMode.current = curMode;

    /* ===== Scale (mode 2: pinch delta → scale, persistent) ===== */
    if (curMode === 2 && hasOther && hasManip) {
      gScale.current = Math.max(0.1, gScale.current + dPinch * 12);
      sScale.current = gScale.current;
      onParamsChange({ sphereScale: gScale.current, autoScale: false });
    } else {
      sScale.current = gScale.current;
    }

    /* ===== Color (mode 3: index finger X → hue, persistent) ===== */
    if (curMode === 3 && hasOther && hasManip) {
      const idx = manipHand[8];
      if (idx) {
        gHue.current = ((1 - idx.x) * 0.83 + 1) % 1;
        sHue.current = gHue.current;
        sSat.current = 1;
        onParamsChange({ hue: gHue.current, autoColor: false });
      }
    } else if (curMode !== 3) {
      let hueT = p.hue;
      let satT = 1;
      if (curMode === 0 && p.autoColor) {
        hueT = 0.5 + intensity * 0.08 - prox * 0.06;
        satT = 1;
      } else {
        hueT = gHue.current;
      }
      sHue.current += (hueT - sHue.current) * 0.1;
      sSat.current += (satT - sSat.current) * 0.1;
    }

    /* ===== Rotation (mode 4: hand angle delta → ring tilt, persistent) ===== */
    if (curMode === 4 && hasOther && hasManip) {
      hasCustomRot.current = true;
      gRot.current += dAngle;
      sRotY.current += (gRot.current - sRotY.current) * 0.35;
      onParamsChange({ spinSpeed: 0, autoRotation: false });
    } else if (curMode !== 4) {
      if (curMode === 0 && p.autoRotation && !hasCustomRot.current) {
        sRotY.current +=
          (Math.sin(clock.elapsedTime * 0.55) * 0.18 - sRotY.current) * 0.05;
      } else {
        sRotY.current = gRot.current;
      }
    }

    /* ===== Opacity ===== */
    let opT = p.glowOpacity;
    if (curMode === 0 && p.autoColor) {
      opT = 0.16 + intensity * 0.16 + prox * 0.28;
    }
    sOp.current += (opT - sOp.current) * 0.1;

    /* ===== Apply to meshes ===== */
    halo.position.copy(sPos.current);
    const hScale = p.autoPosition ? 1 + intensity * 0.24 + prox * 0.15 : 1;
    halo.scale.setScalar(hScale);
    if (curMode === 4 && hasManip) {
      halo.rotation.x = Math.PI / 2;
      halo.rotation.y = sRotY.current;
      halo.rotation.z = 0;
      sphere.rotation.y = sRotY.current;
    } else {
      halo.rotation.x = Math.PI / 2 + sPos.current.y * 0.4;
      halo.rotation.z = clock.elapsedTime * p.spinSpeed + sPos.current.x * 0.3;
      halo.rotation.y = sRotY.current;
    }

    const hm = halo.material as THREE.MeshBasicMaterial;
    hm.opacity = sOp.current;
    hm.color.setHSL(sHue.current, sSat.current, 0.5);

    sphere.position.copy(sPos.current);
    sphere.position.z = -0.03;
    sphere.scale.setScalar(sScale.current);

    const sm = sphere.material as THREE.PointsMaterial;
    sm.opacity = 0.4 + intensity * 0.15 + prox * 0.2;
    sm.color.setHSL(sHue.current + 0.02, sSat.current + 0.08, 0.65);
    sm.size = 0.06 + intensity * 0.03;

    /* ---- HUD tech layers ---- */
    const hud = hudRef.current;
    if (hud) {
      hud.position.copy(sPos.current);
      hud.scale.setScalar(sScale.current);
    }
    const shell = shellRef.current;
    if (shell) {
      shell.rotation.x = Math.PI / 4 + clock.elapsedTime * 0.08;
      shell.rotation.y = clock.elapsedTime * 0.15;
    }

    /* ---- Camera sway ---- */
    camera.position.x = Math.sin(clock.elapsedTime * 0.2) * 0.08;
    camera.position.y = Math.sin(clock.elapsedTime * 0.14) * 0.06;
  });

  /* ---- Pointer handlers ---- */
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    draggingRef.current = true;
    dragOffRef.current.set(
      e.point.x - sPos.current.x,
      e.point.y - sPos.current.y,
      0,
    );
    onParamsChange({ autoPosition: false });
  };
  const onUp = () => {
    draggingRef.current = false;
  };

  return (
    <group ref={groupRef}>
      <mesh
        ref={haloRef}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerOut={onUp}
      >
        <torusGeometry args={[1.15, 0.01, lowPerf ? 8 : 16, lowPerf ? 40 : 80]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.18} />
      </mesh>
      <points
        ref={sphereRef}
        geometry={sphereGeometry}
        position={[0, 0, -0.03]}
        frustumCulled={false}
        renderOrder={2}
      >
        <pointsMaterial
          size={0.065}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.45}
          alphaTest={0.25}
          map={particleSprite ?? undefined}
          color={new THREE.Color("#7de5ff")}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <group ref={hudRef}>
        <mesh ref={shellRef} geometry={shellGeometry} renderOrder={1}>
          <meshBasicMaterial
            color="#37c8ff"
            wireframe
            transparent
            opacity={0.12}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}
