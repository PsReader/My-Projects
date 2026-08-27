import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AmbientBackground } from "./components/AmbientBackground";
import { isLowPerfDevice } from "./lib/utils";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import { RoutingPanel } from "./components/RoutingPanel";
import { useHands } from "./hooks/useHands";
import { useWebcam } from "./hooks/useWebcam";
import { HandScene } from "./scene/HandScene";
import { shaderRegistry } from "./shaders/shaderRegistry";
import { useFingerCount, useRingFingerFolded } from "./hooks/useFingerCount";
import { captureStore } from "./captureStore";
import { CaptureBridge } from "./components/CaptureBridge";
import { ErrorBoundary } from "./components/ErrorBoundary";

import { defaultCentralParams, MODE_INFO, type CentralParams } from "./components/centralParams";
import { INTERACTIVES, type InteractiveDefinition } from "./components/interactives";
import { AirGlow, AIRGLOW_TOOL_INFO, type PenHand } from "./components/AirGlow";

const jointOptions = [
  { value: 4, label: "Thumb Tip" },
  { value: 8, label: "Index Tip" },
  { value: 12, label: "Middle Tip" },
  { value: 16, label: "Ring Tip" },
  { value: 20, label: "Pinky Tip" },
];

/* Palm = average of wrist(0) + finger MCP joints (5,9,13,17) */
const palmJoints = [0, 5, 9, 13, 17];

function computePalmCenter(
  handLandmarks: Array<{ x: number; y: number; z?: number }>,
) {
  if (!handLandmarks || handLandmarks.length < 21) return null;
  let sx = 0,
    sy = 0;
  for (const idx of palmJoints) {
    const lm = handLandmarks[idx];
    if (!lm) return null;
    sx += lm.x;
    sy += lm.y;
  }
  // Return in normalized coords [0,1] matching MediaPipe output
  return { x: sx / palmJoints.length, y: sy / palmJoints.length };
}

function computeHandAngle(
  handLandmarks: Array<{ x: number; y: number; z?: number }>,
): number {
  if (!handLandmarks || handLandmarks.length < 21) return 0
  const wrist = handLandmarks[0]
  const midMcp = handLandmarks[9]
  if (!wrist || !midMcp) return 0
  return Math.atan2(midMcp.y - wrist.y, midMcp.x - wrist.x)
}

type RoutingPanelBaseProps = {
  activeJointLabel: string;
  activeShaderLabel: string;
  activeShaderDescription: string;
  isReady: boolean;
  isTracking: boolean;
  hasDetectedHand: boolean;
  error: string | null;
  onNavToggle: () => void;
  onReset: () => void;
  interactives: InteractiveDefinition[];
  activeInteractive: string;
  onInteractiveChange: (id: string) => void;
}

function RoutingPanelWithCapture(props: RoutingPanelBaseProps) {
  const capture = useSyncExternalStore(
    captureStore.subscribe,
    captureStore.getSnapshot,
  );
  return (
    <RoutingPanel
      {...props}
      onScreenshot={capture.takeScreenshot}
    />
  );
}
function App() {
  const { videoRef, isReady, error } = useWebcam();
  const isLowPerf = useMemo(() => isLowPerfDevice(), []);
  const { landmarks, handedness, isTracking } = useHands(videoRef, { lowPerf: isLowPerf });
  const selectedJoint = 8;
  const activeHand = 0;

  const initialShaderMap = {
    4: "plasma-bridge",
    8: "chromatic-aberration",
    12: "neon-scattering",
    16: "scanline-pulse",
    20: "topographic-matrix",
  }

  const [shaderMap] = useState<Record<number, Record<number, string>>>({
    0: { ...initialShaderMap },
    1: { ...initialShaderMap },
  });

  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem("gesturelab-onboarded") === "true");

  const handleOnboardingDismiss = useCallback(() => {
    setOnboardingDone(true)
    localStorage.setItem("gesturelab-onboarded", "true")
  }, [])

  const [centralParams, setCentralParams] = useState<CentralParams>(defaultCentralParams)

  const [interactiveId, setInteractiveId] = useState<string>(
    () => localStorage.getItem("gesturelab-interactive") ?? "sphere-halo",
  )
  const handleInteractiveChange = useCallback((id: string) => {
    setInteractiveId(id)
    localStorage.setItem("gesturelab-interactive", id)
  }, [])

  const handleReset = useCallback(() => setResetSignal((s) => s + 1), [])

  const [portalFilter, setPortalFilter] = useState("MONO")

  const [resetSignal, setResetSignal] = useState(0)

  const [navOpen, setNavOpen] = useState(false)
  const prevRingRef = useRef(false)
  const ringCooldownRef = useRef(0)

  const [penHand, setPenHand] = useState<PenHand>(
    () => (localStorage.getItem("gesturelab-airglow-hand") as PenHand) ?? "auto",
  )
  const handlePenHandChange = useCallback((hand: PenHand) => {
    setPenHand(hand)
    localStorage.setItem("gesturelab-airglow-hand", hand)
  }, [])

  const shaderOptions = useMemo(
    () =>
      Object.entries(shaderRegistry).map(([value, entry]) => ({
        value,
        label: entry.name,
      })),
    [],
  );

  const hasDetectedHand = landmarks.some((hand) => hand.length > 0);

  // Compute palm data from the first detected hand
  const firstHand = landmarks.find((hand) => hand.length > 0);
  const palmCenter = firstHand ? computePalmCenter(firstHand) : null;
  const handAngle = firstHand ? computeHandAngle(firstHand) : 0;

  const fCount0 = useFingerCount(landmarks[0] || [])
  const fCount1 = useFingerCount(landmarks[1] || [])
  const modeHandIndex = useMemo(() => {
    if (fCount0 >= 1 && fCount0 <= 4) return 0
    if (fCount1 >= 1 && fCount1 <= 4) return 1
    return -1
  }, [fCount0, fCount1])
  const activeMode = modeHandIndex >= 0
    ? (modeHandIndex === 0 ? fCount0 : fCount1)
    : 0
  const ringFolded = useRingFingerFolded(landmarks)

  const handleCentralChange = useCallback((update: Partial<CentralParams>) => {
    setCentralParams(prev => ({ ...prev, ...update }))
  }, [])

  const activeJointLabel =
    jointOptions.find((joint) => joint.value === selectedJoint)?.label ??
    "Index Tip";

  const currentShaderId = shaderMap[activeHand]?.[selectedJoint] ?? shaderMap[0]?.[selectedJoint] ?? "thermal-vision";
  const activeShaderEntry = shaderOptions.find(
    (option) => option.value === currentShaderId,
  );
  const activeShaderLabel = activeShaderEntry?.label ?? "Thermal Vision";
  const activeShaderDescription =
    Object.entries(shaderRegistry).find(
      ([value]) => value === currentShaderId,
    )?.[1]?.description ?? "A luminous membrane that responds to motion.";

  // Ring finger → navbar toggle
  useEffect(() => {
    if (ringFolded && !prevRingRef.current) {
      const now = Date.now()
      if (now - ringCooldownRef.current > 500) {
        ringCooldownRef.current = now
        setNavOpen(p => !p)
      }
    }
    prevRingRef.current = ringFolded
  }, [ringFolded])

  return (
      <div className="app-shell">
        <div className="canvas-shell">
          <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }} dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true }} style={{ zIndex: 0 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[2, 2, 4]} intensity={1.2} />
            <AmbientBackground
              palmCenter={palmCenter}
              interactionStrength={hasDetectedHand ? 1 : 0}
              lowPerf={isLowPerf}
            />
            <HandScene
              landmarks={landmarks}
              shaderMap={shaderMap}
              palmCenter={palmCenter}
              handAngle={handAngle}
              lowPerf={isLowPerf}
              interactiveId={interactiveId}
              videoRef={videoRef}
              onFilterChange={setPortalFilter}
              centralParams={centralParams}
              onCentralParamsChange={handleCentralChange}
              centralMode={activeMode}
              modeHandIndex={modeHandIndex}
            />
            <OrbitControls enableZoom={false} enablePan={false} />
            <CaptureBridge />
          </Canvas>
        </div>

        <ErrorBoundary>
          {!onboardingDone && (
          <OnboardingOverlay
            hasDetectedHand={hasDetectedHand}
            isReady={isReady}
            onDismiss={handleOnboardingDismiss}
          />
        )}
        <div className="hand-debug-overlay">
          {handedness.map((label, index) => (
            <div
              key={index}
              className={`hand-debug-pill hand-debug-${label.toLowerCase()}`}
            >
              {`Hand ${index + 1}: ${label}`}
            </div>
          ))}
        </div>
        <div className={`nav-grip ${navOpen ? "hidden" : ""}`} onClick={() => setNavOpen(true)} />
        <nav className={`nav-overlay ${!navOpen ? "nav-closed" : ""}`}>
          <RoutingPanelWithCapture
            activeJointLabel={activeJointLabel}
            activeShaderLabel={activeShaderLabel}
            activeShaderDescription={activeShaderDescription}
            isReady={isReady}
            isTracking={isTracking}
            hasDetectedHand={hasDetectedHand}
            error={error}
            onNavToggle={() => setNavOpen(p => !p)}
            onReset={handleReset}
            interactives={INTERACTIVES}
            activeInteractive={interactiveId}
            onInteractiveChange={handleInteractiveChange}
          />
        </nav>
        </ErrorBoundary>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden-video"
        />
        {interactiveId === "sphere-halo" && (
          <div className="mode-badge">
            {MODE_INFO[activeMode].icon} {MODE_INFO[activeMode].label}
          </div>
        )}
        {interactiveId === "airglow" && (
          <div className="airglow-layer">
            <AirGlow
              landmarks={landmarks}
              handedness={handedness}
              penHand={penHand}
              mode={activeMode}
              modeHandIndex={modeHandIndex}
              resetSignal={resetSignal}
            />
            <div className="airglow-hand-menu" role="group" aria-label="Pen hand">
              {(["left", "auto", "right"] as const).map((hand) => (
                <button
                  key={hand}
                  className={`airglow-hand-btn ${penHand === hand ? "active" : ""}`}
                  aria-pressed={penHand === hand}
                  onClick={() => handlePenHandChange(hand)}
                >
                  {hand === "auto" ? "Auto" : hand[0].toUpperCase() + hand.slice(1)}
                </button>
              ))}
            </div>
            <div className="mode-badge airglow-badge">
              AIRGLOW &middot; {AIRGLOW_TOOL_INFO[activeMode]?.label ?? "Pen"}
            </div>
          </div>
        )}
        {interactiveId === "retrolens" && (
          <div className="portal-badge">RETROLENS &middot; {portalFilter}</div>
        )}
      </div>
  );
}

export default App;
