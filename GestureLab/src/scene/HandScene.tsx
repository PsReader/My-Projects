import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import type { HandLandmark } from "../hooks/useHands";
import { buildShaderMaterial } from "../shaders/buildShaderMaterial";
import { CentralSphere } from "../components/CentralSphere"
import { Retrolens } from "../components/Retrolens"
import type { CentralParams } from "../components/centralParams"

const jointIndices = Array.from({ length: 21 }, (_, index) => index);
const skeletonPairs = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
const maxHands = 2;

// Pre-allocated scratch vectors — avoids per-frame GC pressure
const _zero = new THREE.Vector3(0, 0, 0);
const _target = new THREE.Vector3();
const _offscreen = new THREE.Vector3(0, 10, -2);

interface HandSceneProps {
  landmarks: HandLandmark[][];
  shaderMap: Record<number, Record<number, string>>;
  palmCenter: { x: number; y: number } | null;
  handAngle: number;
  lowPerf?: boolean;
  interactiveId: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFilterChange: (name: string) => void;
  centralParams: CentralParams;
  onCentralParamsChange: (update: Partial<CentralParams>) => void;
  centralMode: number;
  modeHandIndex: number;
}

export function HandScene({
  landmarks,
  shaderMap,
  palmCenter,
  handAngle,
  lowPerf,
  interactiveId,
  videoRef,
  onFilterChange,
  centralParams,
  onCentralParamsChange,
  centralMode,
  modeHandIndex,
}: HandSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const handGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const jointGroupRefs = useRef<Array<Array<THREE.Group | null>>>([]);
  const meshRefs = useRef<Array<Array<THREE.Mesh | null>>>([]);
  const materialCacheRef = useRef<Map<string, THREE.ShaderMaterial>>(new Map());
  const prevPositionsRef = useRef<Array<THREE.Vector3>>([]);
  const skeletonRefs = useRef<Array<THREE.LineSegments | null>>([]);
  const skeletonGeometryRefs = useRef<Array<THREE.BufferGeometry | null>>([]);
  const worldPositionsRef = useRef<Array<Array<THREE.Vector3>>>([]);

  const activeHands = [
    ...landmarks.slice(0, maxHands),
    ...Array(maxHands - landmarks.length).fill([]),
  ];

  useFrame(({ clock, size }) => {
    const group = groupRef.current;
    if (!group) return;

    group.rotation.y = Math.sin(clock.elapsedTime * 0.55) * 0.18;
    group.position.z = Math.sin(clock.elapsedTime * 0.35) * 0.04;

    const aspect = size.width / Math.max(size.height, 1);
    const worldScaleX = aspect * 1.3;
    const worldScaleY = 1.3;
    let motionEnergy = 0;

    activeHands.forEach((handLandmarks, handIndex) => {
      const handGroup = handGroupRefs.current[handIndex];
      if (handGroup) {
        handGroup.position.lerp(_zero, 0.24);
      }

      // Reuse positions array from previous frame instead of allocating
      const positionsForHand = worldPositionsRef.current[handIndex];
      if (!positionsForHand) {
        worldPositionsRef.current[handIndex] = new Array(21).fill(null).map(() => new THREE.Vector3());
      }
      const handPositions = worldPositionsRef.current[handIndex]!;

      jointIndices.forEach((jointIndex, index) => {
        const jointGroup = jointGroupRefs.current[handIndex]?.[index];
        const mesh = meshRefs.current[handIndex]?.[index];
        const landmark = handLandmarks[jointIndex];

        const prev = prevPositionsRef.current[handIndex * 21 + index];

        // Mutate _target instead of allocating new Vector3
        if (landmark) {
          _target.set(
            (landmark.x - 0.5) * worldScaleX,
            (0.5 - landmark.y) * worldScaleY,
            (landmark.z ?? 0) * 0.35,
          );
        } else if (prev) {
          _target.copy(prev);
        } else {
          _target.copy(_offscreen);
        }

        const smoothFactor = landmark ? 0.72 : 0.2;
        if (prev) {
          prev.lerp(_target, smoothFactor);
        } else {
          prevPositionsRef.current[handIndex * 21 + index] = _target.clone();
        }
        const currentPos = prevPositionsRef.current[handIndex * 21 + index]!;
        const velocity = _target.distanceTo(currentPos);
        motionEnergy += velocity;
        handPositions[index].copy(currentPos);

        if (jointGroup) {
          jointGroup.position.lerp(currentPos, 0.85);
        }

        if (mesh) {
          mesh.scale.setScalar(0.55 + Math.min(velocity * 2.6, 0.7));
          const shaderId = shaderMap[handIndex]?.[jointIndex] ?? shaderMap[0]?.[jointIndex] ?? "thermal-vision";
          const material =
            materialCacheRef.current.get(shaderId) ??
            buildShaderMaterial(shaderId);
          if (!materialCacheRef.current.has(shaderId)) {
            materialCacheRef.current.set(shaderId, material);
          }
          material.uniforms.u_time.value = clock.elapsedTime;
          material.uniforms.u_resolution.value.set(size.width, size.height);
          material.uniforms.u_velocity.value.set(
            velocity * 0.08,
            velocity * 0.08,
          );
          mesh.material = material;
        }
      });

      const skeletonGeometry = skeletonGeometryRefs.current[handIndex];
      if (skeletonGeometry && handPositions.length) {
        // Mutate the existing Float32Array instead of recreating the attribute
        const posAttr = skeletonGeometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        let writeIdx = 0;
        skeletonPairs.forEach(([from, to]) => {
          const fromPoint = handPositions[from];
          const toPoint = handPositions[to];
          if (fromPoint && toPoint) {
            arr[writeIdx++] = fromPoint.x;
            arr[writeIdx++] = fromPoint.y;
            arr[writeIdx++] = fromPoint.z;
            arr[writeIdx++] = toPoint.x;
            arr[writeIdx++] = toPoint.y;
            arr[writeIdx++] = toPoint.z;
          }
        });
        posAttr.needsUpdate = true;
      }
    });

  });

  return (
    <group ref={groupRef}>
      {interactiveId === "retrolens" && (
        <Retrolens
          landmarks={landmarks}
          videoRef={videoRef}
          lowPerf={lowPerf}
          onFilterChange={onFilterChange}
        />
      )}
      {interactiveId === "sphere-halo" && (
        <CentralSphere
          landmarks={landmarks}
          palmCenter={palmCenter}
          handAngle={handAngle}
          params={centralParams}
          onParamsChange={onCentralParamsChange}
          mode={centralMode}
          modeHandIndex={modeHandIndex}
          lowPerf={lowPerf}
        />
      )}
      {Array.from({ length: maxHands }).map((_, handIndex) => {
        const handLandmarks = activeHands[handIndex] ?? [];
        return (
          <group
            key={`hand-${handIndex}`}
            visible={handLandmarks.length > 0}
            ref={(node) => {
              handGroupRefs.current[handIndex] = node;
            }}
          >
            {jointIndices.map((jointIndex, index) => (
              <group
                key={`${handIndex}-${jointIndex}-${index}`}
                ref={(node) => {
                  if (!jointGroupRefs.current[handIndex]) {
                    jointGroupRefs.current[handIndex] = [];
                  }
                  jointGroupRefs.current[handIndex][index] = node;
                }}
              >
                <mesh
                  ref={(node) => {
                    if (!meshRefs.current[handIndex]) {
                      meshRefs.current[handIndex] = [];
                    }
                    meshRefs.current[handIndex][index] = node;
                  }}
                >
                  <sphereGeometry args={[0.035, lowPerf ? 8 : 16, lowPerf ? 8 : 16]} />
                </mesh>
              </group>
            ))}
            <lineSegments
              ref={(node) => {
                skeletonRefs.current[handIndex] = node;
              }}
            >
              <bufferGeometry
                ref={(node) => {
                  skeletonGeometryRefs.current[handIndex] = node;
                  if (node) {
                    // Pre-allocate buffer: 20 bone pairs × 2 points × 3 coords = 120 floats
                    const arr = new Float32Array(120);
                    node.setAttribute("position", new THREE.BufferAttribute(arr, 3));
                  }
                }}
              />
              <lineBasicMaterial
                color={handIndex === 0 ? "#6cdcff" : "#a6a2ff"}
                transparent
                opacity={0.24}
              />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}
