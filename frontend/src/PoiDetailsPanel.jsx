import { useEffect, useRef, useState } from 'react';

/**
 * Animated ring gauge for a single score.
 *   value: 0–100
 *   color: CSS colour string
 */
function ScoreRing({ value, color, label, icon, delay = 0 }) {
  const [animated, setAnimated] = useState(0);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (animated / 100) * circ;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimated(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="poi-score-ring-wrapper">
      <svg width="92" height="92" viewBox="0 0 92 92" className="poi-score-svg">
        {/* Track */}
        <circle
          cx="46" cy="46" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="7"
        />
        {/* Progress */}
        <circle
          cx="46" cy="46" r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 46 46)"
          style={{ transition: `stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms` }}
        />
        {/* Glow */}
        <circle
          cx="46" cy="46" r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 46 46)"
          opacity="0.25"
          filter="url(#glow)"
          style={{ transition: `stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms` }}
        />
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
          </filter>
        </defs>
        <text
          x="46" y="50"
          textAnchor="middle"
          fontSize="15"
          fontWeight="800"
          fill="#ffffff"
          fontFamily="'Space Grotesk', sans-serif"
        >
          {Math.round(animated)}
        </text>
      </svg>
      <div className="poi-score-ring-label">
        <span className="poi-score-ring-icon">{icon}</span>
        <span>{label}</span>
      </div>
    </div>
  );
}

/**
 * Horizontal bar metric row.
 */
function ScoreBar({ label, value, color, description, delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(value), delay + 100);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const tier =
    value >= 75 ? { text: 'Excellent', cls: 'tier--high' } :
    value >= 45 ? { text: 'Moderate', cls: 'tier--mid' } :
                  { text: 'Low', cls: 'tier--low' };

  return (
    <div className="poi-bar-row">
      <div className="poi-bar-header">
        <span className="poi-bar-label">{label}</span>
        <div className="poi-bar-right">
          <span className={`poi-tier-badge ${tier.cls}`}>{tier.text}</span>
          <span className="poi-bar-value" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="poi-bar-track">
        <div
          className="poi-bar-fill"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 8px ${color}55`,
            transition: `width 0.85s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
          }}
        />
      </div>
      <p className="poi-bar-desc">{description}</p>
    </div>
  );
}

/**
 * POI Details modal/panel.
 *
 * Props:
 *   poi            – the selected POI object (or null)
 *   metrics        – { proximityScore, communityRating, modelScore }
 *   profileLabel   – active profile label string
 *   onClose        – callback to close
 *   onCheckIn      – callback to check-in
 *   onWriteReview  – callback to open the review form
 */
export default function PoiDetailsPanel({ poi, metrics, profileLabel, onClose, onCheckIn, onWriteReview }) {
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!poi || !metrics) return null;

  const { proximityScore, communityRating, modelScore } = metrics;
  const compositeScore = Math.round((proximityScore + communityRating + modelScore) / 3);

  const compositeColor =
    compositeScore >= 75 ? '#34d399' :
    compositeScore >= 45 ? '#f59e0b' : '#f87171';

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      className="modal-overlay poi-details-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`POI details for ${poi.name}`}
    >
      <div className="modal poi-details-modal">
        {/* ── Header ────────────────────────────────── */}
        <div className="poi-details-header">
          <div className="poi-details-header-left">
            <span className="poi-details-category-badge">{poi.category}</span>
            <h2 id="poi-details-title">{poi.name}</h2>
            <p className="poi-details-meta">
              📍 {poi.checkins?.toLocaleString() ?? '—'} check-ins &nbsp;·&nbsp;
              🎯 Profile: <strong>{profileLabel ?? 'Unknown'}</strong>
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close POI details"
          >
            ×
          </button>
        </div>

        <div className="poi-details-body">
          {/* ── Composite score strip ──────────────── */}
          <div className="poi-composite-strip" style={{ borderColor: compositeColor + '55' }}>
            <div className="poi-composite-left">
              <p className="poi-composite-label">Transparency Score</p>
              <p className="poi-composite-caption">
                Weighted average of all three federated signals
              </p>
            </div>
            <div
              className="poi-composite-badge"
              style={{ color: compositeColor, borderColor: compositeColor + '66', background: compositeColor + '12' }}
            >
              <span className="poi-composite-number">{compositeScore}</span>
              <span className="poi-composite-unit">/100</span>
            </div>
          </div>

          {/* ── Ring gauges ───────────────────────── */}
          <div className="poi-rings-row">
            <ScoreRing value={proximityScore} color="#38bdf8" label="Proximity" icon="📡" delay={0} />
            <ScoreRing value={communityRating} color="#a78bfa" label="Community" icon="👥" delay={120} />
            <ScoreRing value={modelScore}      color="#34d399" label="Model"     icon="🤖" delay={240} />
          </div>

          {/* ── Bar breakdown ─────────────────────── */}
          <div className="poi-bars-section">
            <p className="panel-label" style={{ marginBottom: '16px' }}>Score Breakdown</p>

            <ScoreBar
              label="Proximity Score"
              value={proximityScore}
              color="#38bdf8"
              description="Distance from user's current location. Closer POIs score higher."
              delay={0}
            />
            <ScoreBar
              label="Community Rating"
              value={communityRating}
              color="#a78bfa"
              description="Relative check-in volume compared to all POIs — crowd popularity signal."
              delay={120}
            />
            <ScoreBar
              label="Model Score"
              value={modelScore}
              color="#34d399"
              description="Federated learning recommendation confidence for the active profile."
              delay={240}
            />
          </div>

          {/* ── Blockchain badge ──────────────────── */}
          <div className="poi-chain-badge">
            <span className="poi-chain-icon">⛓️</span>
            <div>
              <p className="poi-chain-title">On-Chain Verified</p>
              <p className="poi-chain-sub">Scores derived from PoR-validated federated model · DP ε = 1.0</p>
            </div>
          </div>

          {/* ── Actions ───────────────────────────── */}
          <div className="poi-details-actions">
            <button
              type="button"
              className="primary-button poi-action-checkin"
              onClick={() => { onCheckIn(poi); onClose(); }}
              id="poi-details-checkin-btn"
            >
              ✅ Check-in Here &nbsp;<span style={{ opacity: 0.7 }}>(+1 TC)</span>
            </button>
            <button
              type="button"
              className="primary-button poi-action-review"
              onClick={() => { onWriteReview(poi); onClose(); }}
              id="poi-details-review-btn"
            >
              ✍️ Write Review &nbsp;<span style={{ opacity: 0.7 }}>(+5 TC)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
