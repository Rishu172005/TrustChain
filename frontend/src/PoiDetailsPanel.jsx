import { useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────────────────────
   Animated radial ring gauge
   value  : 0–100
   color  : CSS colour
────────────────────────────────────────────────────────────── */
function ScoreRing({ value, color, delay = 0 }) {
  const [animated, setAnimated] = useState(0);
  const r    = 34;
  const circ = 2 * Math.PI * r;
  const dash = circ - (animated / 100) * circ;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" style={{ overflow: 'visible' }}>
      {/* Track */}
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      {/* Fill */}
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        transform="rotate(-90 44 44)"
        style={{ transition: `stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}
      />
      {/* Glow ring */}
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        transform="rotate(-90 44 44)"
        opacity="0.22"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: `stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}
      />
      {/* Value text */}
      <text
        x="44" y="49"
        textAnchor="middle"
        fontSize="16"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="var(--font-heading)"
      >
        {Math.round(animated)}
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Individual scoring component card
────────────────────────────────────────────────────────────── */
function ScoreCard({ icon, label, sublabel, value, color, barDelay, ringDelay, rationale, formula }) {
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBarW(value), barDelay + 150);
    return () => clearTimeout(t);
  }, [value, barDelay]);

  const tier =
    value >= 75 ? { text: 'High',   cls: 'tier--high' } :
    value >= 45 ? { text: 'Medium', cls: 'tier--mid'  } :
                  { text: 'Low',    cls: 'tier--low'   };

  return (
    <div className="why-score-card" style={{ borderColor: color + '33' }}>
      {/* Left: ring */}
      <div className="why-score-ring-col">
        <ScoreRing value={value} color={color} delay={ringDelay} />
        <span className={`poi-tier-badge ${tier.cls}`} style={{ marginTop: '6px' }}>{tier.text}</span>
      </div>

      {/* Right: info */}
      <div className="why-score-info">
        <div className="why-score-header">
          <span className="why-score-icon">{icon}</span>
          <div>
            <p className="why-score-label">{label}</p>
            <p className="why-score-sublabel">{sublabel}</p>
          </div>
        </div>

        {/* Bar */}
        <div className="why-score-bar-track">
          <div
            className="why-score-bar-fill"
            style={{
              width: `${barW}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              boxShadow: `0 0 8px ${color}44`,
              transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${barDelay}ms`,
            }}
          />
        </div>

        {/* Rationale */}
        <p className="why-score-rationale">{rationale}</p>

        {/* Formula pill */}
        <code className="why-score-formula">{formula}</code>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main panel
────────────────────────────────────────────────────────────── */
export default function PoiDetailsPanel({ poi, metrics, profileLabel, onClose, onCheckIn, onWriteReview }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!poi || !metrics) return null;

  const { proximityScore, communityRating, modelScore } = metrics;
  const compositeScore = Math.round((proximityScore * 0.25) + (communityRating * 0.25) + (modelScore * 0.50));

  const compositeColor =
    compositeScore >= 75 ? '#34d399' :
    compositeScore >= 45 ? '#f59e0b' : '#f87171';

  return (
    <div
      className="modal-overlay poi-details-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-panel-title"
    >
      <div className="modal why-panel" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="why-panel-header">
          <div className="why-panel-header-left">
            <span className="why-panel-eyebrow">⛓️ Blockchain-Verified Transparency</span>
            <h2 id="why-panel-title" className="why-panel-title">
              Why was this recommended?
            </h2>
            <p className="why-panel-poi-name">{poi.name}</p>
            <p className="why-panel-poi-meta">
              <span className="poi-details-category-badge">{poi.category}</span>
              &nbsp; Profile: <strong style={{ color: '#a78bfa' }}>{profileLabel ?? 'Unknown'}</strong>
              &nbsp;·&nbsp; {poi.checkins?.toLocaleString() ?? '—'} check-ins
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="why-panel-body">

          {/* Composite score banner */}
          <div className="why-composite-banner" style={{ borderColor: compositeColor + '44', background: compositeColor + '0d' }}>
            <div className="why-composite-left">
              <p className="why-composite-label">Composite Recommendation Score</p>
              <p className="why-composite-formula">
                Score = 0.25 × Proximity + 0.25 × Community + 0.50 × FL Model
              </p>
            </div>
            <div className="why-composite-score" style={{ color: compositeColor, borderColor: compositeColor + '55', background: compositeColor + '12' }}>
              <span className="why-composite-number">{compositeScore}</span>
              <span className="why-composite-unit">/100</span>
            </div>
          </div>

          {/* Section heading */}
          <div className="why-section-heading">
            <div className="why-section-line" />
            <span className="why-section-text">Score Components</span>
            <div className="why-section-line" />
          </div>

          {/* Three scoring component cards */}
          <ScoreCard
            icon="📡"
            label="Proximity Score"
            sublabel="Geographic distance signal — 25% weight"
            value={proximityScore}
            color="#38bdf8"
            ringDelay={0}
            barDelay={0}
            rationale={`Measures how close this POI is to your current location. A score of ${proximityScore} means you are ${proximityScore >= 75 ? 'very close — likely within walking distance' : proximityScore >= 45 ? 'at a moderate distance — a short transit ride' : 'further away — consider transit options'}.`}
            formula="proximity = max(0, 110 − dist_degrees × 55)"
          />

          <ScoreCard
            icon="👥"
            label="Community Rating"
            sublabel="Crowd-sourced check-in signal — 25% weight"
            value={communityRating}
            color="#a78bfa"
            ringDelay={120}
            barDelay={120}
            rationale={`Based on relative check-in volume. This location has ${poi.checkins?.toLocaleString() ?? '?'} check-ins. Higher scores indicate popular, well-loved destinations that the broader community has validated on-chain.`}
            formula="community = (poi.checkins / max_checkins_dataset) × 100"
          />

          <ScoreCard
            icon="🤖"
            label="Federated Model Score"
            sublabel="FL recommendation confidence — 50% weight"
            value={modelScore}
            color="#34d399"
            ringDelay={240}
            barDelay={240}
            rationale={`The federated learning model trained across the '${profileLabel ?? 'unknown'}' profile without exposing raw user data. Differential Privacy (ε = 1.0) noise was applied before on-chain weight aggregation.`}
            formula="model_score = FL_model.predict(poi_id, profile) × 100"
          />

          {/* Blockchain provenance */}
          <div className="why-chain-proof">
            <div className="why-chain-proof-left">
              <span className="why-chain-proof-icon">⛓️</span>
              <div>
                <p className="why-chain-proof-title">On-Chain Provenance</p>
                <p className="why-chain-proof-sub">
                  Model weights are SHA-256 hashed and stored in the TrustChain smart contract.
                  Tampering with scores is publicly verifiable and cryptographically impossible to hide.
                </p>
              </div>
            </div>
            <div className="why-chain-proof-badges">
              <span className="why-chain-badge why-chain-badge--green">DP ε = 1.0</span>
              <span className="why-chain-badge why-chain-badge--blue">PoR Verified</span>
            </div>
          </div>

          {/* Actions */}
          <div className="poi-details-actions">
            <button
              type="button"
              className="primary-button poi-action-checkin"
              onClick={() => { onCheckIn(poi); onClose(); }}
              id="poi-details-checkin-btn"
            >
              ✅ Check-in &nbsp;<span style={{ opacity: 0.7 }}>(+1 TC)</span>
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
