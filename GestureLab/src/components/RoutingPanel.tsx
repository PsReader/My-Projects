import type { InteractiveDefinition } from "./interactives";

interface RoutingPanelProps {
  activeJointLabel: string;
  activeShaderLabel: string;
  activeShaderDescription: string;
  isReady: boolean;
  isTracking: boolean;
  hasDetectedHand: boolean;
  error: string | null;
  onScreenshot?: () => void;
  onNavToggle: () => void;
  onReset: () => void;
  interactives: InteractiveDefinition[];
  activeInteractive: string;
  onInteractiveChange: (id: string) => void;
}

export function RoutingPanel({
  activeJointLabel,
  activeShaderLabel,
  activeShaderDescription,
  isReady,
  isTracking,
  hasDetectedHand,
  error,
  onScreenshot,
  onNavToggle,
  onReset,
  interactives,
  activeInteractive,
  onInteractiveChange,
}: RoutingPanelProps) {
  const statusText =
    isReady && isTracking
      ? hasDetectedHand
        ? "Hand detected — live view"
        : "Camera live — waiting for hand"
      : "Camera idle — initializing";

  return (
    <div className="overlay-panel drawer-content">
      <div className="drawer-section">
        <p className="drawer-title">GestureLab</p>
        <p className="drawer-subtitle">Route light through the hand</p>
        <p className="drawer-tag">{activeShaderLabel} &middot; {activeJointLabel}</p>
        <a
          href="../index.html"
          className="drawer-back"
          title="Back to Demo Hub"
          aria-label="Back to Demo Hub"
        >
          <span aria-hidden="true">←</span> Back
        </a>
      </div>

      <div className="drawer-section">
        <div className="drawer-row">
          <span className="drawer-label">Interactive</span>
          <select
            className="drawer-select"
            value={activeInteractive}
            onChange={(e) => onInteractiveChange(e.target.value)}
            aria-label="Select interactive"
          >
            {interactives.map((interactive) => (
              <option key={interactive.id} value={interactive.id}>
                {interactive.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="drawer-section">
        <div className="drawer-row">
          <div className="drawer-status">
            <span className="status-pill" style={{ margin: 0 }}>
              <span className={`status-dot ${isReady && isTracking ? "active" : ""}`} />
              {isReady && isTracking ? "Live" : "Standby"}
            </span>
            <span className="drawer-status-text">{statusText}</span>
          </div>
          <div className="drawer-actions">
            <button className="drawer-action-btn" onClick={onReset} title="Reset">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
            <button className="drawer-action-btn" onClick={onScreenshot} title="Screenshot">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="drawer-section">
        <p className="drawer-desc">
          {activeShaderDescription}
          {error ? <span style={{ color: "#ff8c8c", display: "block", marginTop: 4 }}>{error}</span> : null}
        </p>
      </div>

      <div className="drawer-handle" onClick={onNavToggle}>
        <div className="drawer-handle-bar" />
      </div>
    </div>
  );
}
