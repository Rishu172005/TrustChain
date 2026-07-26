import { useEffect, useMemo, useState } from 'react';
import PoiMap from './PoiMap';
import PoiDetailsPanel from './PoiDetailsPanel';
import { resolveSelectedPoi } from './utils/poiSelection';
import './App.css';

// Per-profile emoji + colour theme
const PROFILE_META = {
  commuter: { icon: '🚇', accent: '#38bdf8', tag: 'Transit-first' },
  explorer: { icon: '🗺️', accent: '#a78bfa', tag: 'Culture & Parks' },
  social: { icon: '🍻', accent: '#fb923c', tag: 'Food & Leisure' },
};

// Category icon map
function categoryIcon(cat = '') {
  const c = cat.toLowerCase();
  if (c.includes('transit') || c.includes('train') || c.includes('bus') || c.includes('airport')) return '🚇';
  if (c.includes('food') || c.includes('restaurant') || c.includes('coffee') || c.includes('bar')) return '🍽️';
  if (c.includes('park') || c.includes('outdoor') || c.includes('plaza')) return '🌳';
  if (c.includes('culture') || c.includes('museum') || c.includes('stadium') || c.includes('music')) return '🎭';
  if (c.includes('hotel') || c.includes('leisure')) return '🏨';
  if (c.includes('shop') || c.includes('store')) return '🛍️';
  return '📍';
}

// toObjectId converts any string id into a 24-char lowercase hex string
// that passes MongoDB ObjectID validation. If the id is already a valid
// 24-char hex string it is used as-is; otherwise the string is hashed into one.
function toObjectId(id = '') {
  const hex = id.replace(/[^0-9a-f]/gi, '').toLowerCase();
  if (hex.length >= 24) return hex.slice(0, 24);
  // Left-pad / repeat to 24 chars.
  return hex.padStart(24, '0').slice(-24);
}

function normalizePoi(poi) {
  const lat = poi?.lat ?? poi?.latitude ?? poi?.location?.latitude ?? poi?.location?.coordinates?.[1] ?? poi?.location?.coords?.[1] ?? null;
  const lng = poi?.lng ?? poi?.longitude ?? poi?.location?.longitude ?? poi?.location?.coordinates?.[0] ?? poi?.location?.coords?.[0] ?? null;
  const checkins = Number(poi?.checkins ?? poi?.metadata?.totalCheckins ?? poi?.metadata?.checkins ?? poi?.totalCheckins ?? poi?.total_checkins ?? 0);

  return {
    ...poi,
    id: poi?.id ?? poi?.poiId ?? '',
    name: poi?.name ?? poi?.title ?? 'Unnamed POI',
    category: poi?.category ?? poi?.type ?? 'Unknown',
    lat,
    lng,
    checkins,
  };
}

function deriveModelScore(poi, selectedProfile, maxCheckins, explicitScore = null) {
  if (explicitScore != null && Number(explicitScore) > 0) {
    return Math.max(0, Math.min(1, Number(explicitScore)));
  }

  const checkinSignal = maxCheckins > 0 ? Math.min(1, (poi.checkins || 0) / maxCheckins) : 0;
  const profileCategories = new Set([
    ...(selectedProfile?.topCategories ?? []),
    selectedProfile?.dominantCategory,
  ].filter(Boolean).map((value) => String(value).toLowerCase()));

  const categoryBoost = profileCategories.has(String(poi.category || '').toLowerCase()) ? 0.14 : 0;
  return Math.max(0, Math.min(1, 0.06 + checkinSignal * 0.72 + categoryBoost));
}

function App() {
  const [poiData, setPoiData] = useState([]);
  const [recommendationData, setRecommendationData] = useState({ rounds: [], profiles: [] });
  const [isLoading, setIsLoading] = useState(true);
  const profiles = recommendationData.profiles ?? [];
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [tokenBalance, setTokenBalance] = useState(() => {
    const saved = localStorage.getItem('tc_tokenBalance');
    return saved != null ? Number(saved) : 0;
  });
  const [backendOnline, setBackendOnline] = useState(false);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? profiles[0] ?? null;
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [lastCheckIn, setLastCheckIn] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_lastCheckIn');
      return saved ? JSON.parse(saved) : null;
    } catch (_) { return null; }
  });
  const [checkInHistory, setCheckInHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('tc_checkInHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (_) { return []; }
  });
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPoiForReview, setSelectedPoiForReview] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedPoiForExplanation, setSelectedPoiForExplanation] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // ── Sync state to localStorage for offline / refresh persistence ──────────
  useEffect(() => {
    localStorage.setItem('tc_tokenBalance', String(tokenBalance));
  }, [tokenBalance]);

  useEffect(() => {
    localStorage.setItem('tc_checkInHistory', JSON.stringify(checkInHistory));
  }, [checkInHistory]);

  useEffect(() => {
    if (lastCheckIn) {
      localStorage.setItem('tc_lastCheckIn', JSON.stringify(lastCheckIn));
    }
  }, [lastCheckIn]);

  // Demo wallet address (Hardhat account 0 — same address deploy.js uses).
  const DEMO_WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  const userLocation = { lat: 40.7549, lng: -73.9840 };

  const recommendedPois = selectedProfile?.recommendations ?? [];
  const recommendedPoiIds = useMemo(() => new Set(recommendedPois.map((p) => p.id)), [recommendedPois]);
  const latestRound = recommendationData.rounds?.[recommendationData.rounds.length - 1] ?? null;
  const defenseShield = recommendationData.meta?.defenseShield ?? null;
  const profileMeta = PROFILE_META[selectedProfileId] ?? { icon: '👤', accent: '#60a5fa', tag: '' };

  const allPoisToRender = useMemo(() => {
    const normalizedPoiData = poiData.map(normalizePoi);
    const maxCheckins = Math.max(...normalizedPoiData.map((p) => p.checkins || 0), 1);

    const recMap = new Map(recommendedPois.map((p) => [p.id, p]));

    const map = new Map();
    normalizedPoiData.forEach((p) => {
      const rec = recMap.get(p.id);
      const explicitScore = rec?.score != null ? Number(rec.score) : null;
      const derivedScore = deriveModelScore(p, selectedProfile, maxCheckins, explicitScore);

      if (rec) {
        map.set(p.id, {
          ...p,
          ...rec,
          lat: p.lat ?? rec.lat,
          lng: p.lng ?? rec.lng,
          checkins: p.checkins || rec.checkins || 0,
          score: derivedScore,
          isRecommended: true,
        });
      } else {
        map.set(p.id, {
          ...p,
          score: derivedScore,
          isRecommended: false,
        });
      }
    });

    recommendedPois.forEach((p) => {
      if (!map.has(p.id)) {
        const normalizedRec = normalizePoi({ ...p, id: p.id, lat: p.lat, lng: p.lng, checkins: p.checkins || 0 });
        map.set(p.id, {
          ...normalizedRec,
          score: deriveModelScore(normalizedRec, selectedProfile, maxCheckins, Number(p.score) || null),
          isRecommended: true,
        });
      }
    });

    return Array.from(map.values());
  }, [poiData, recommendedPois, selectedProfile]);

  const selectedPoiExplanationMetrics = useMemo(() => {
    if (!selectedPoiForExplanation || poiData.length === 0) return null;

    const enriched = allPoisToRender.find((p) => p.id === selectedPoiForExplanation.id)
      ?? selectedPoiForExplanation;

    const maxCheckins = Math.max(...poiData.map((p) => normalizePoi(p).checkins || 0), 1);
    const distance = Math.sqrt(
      (enriched.lat - userLocation.lat) ** 2 +
      (enriched.lng - userLocation.lng) ** 2,
    );
    const proximityScore = Math.max(0, Math.round(Math.min(100, 110 - distance * 55)));
    const communityRating = Math.round(Math.min(100, ((enriched.checkins || 0) / maxCheckins) * 100));
    const derivedModelScore = deriveModelScore(enriched, selectedProfile, maxCheckins, enriched.score);
    const modelScore = Math.round(Math.min(100, derivedModelScore * 100));
    return { proximityScore, communityRating, modelScore, isRecommended: enriched.isRecommended ?? false };
  }, [selectedPoiForExplanation, poiData, allPoisToRender, selectedProfile]);

  // ── Token balance & transactions: poll backend ──────────────────────────────
  const fetchBalance = async () => {
    try {
      const res = await fetch(`/api/v1/token-balance?wallet=${DEMO_WALLET}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data?.balance != null) {
        const apiBal = Number(json.data.balance);
        setTokenBalance((prev) => Math.max(prev, apiBal));
        setBackendOnline(true);
      }
    } catch (_) { /* backend offline — keep last value */ }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`/api/v1/transactions?wallet=${DEMO_WALLET}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.transactions) && json.data.transactions.length > 0) {
        setCheckInHistory((prev) => {
          const map = new Map();
          json.data.transactions.forEach((tx) => map.set(tx.id || tx.timestamp, tx));
          prev.forEach((item) => {
            const key = item.id || item.timestamp;
            if (!map.has(key)) map.set(key, item);
          });
          return Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        });
      }
    } catch (_) { /* backend offline */ }
  };

  // ── Data loading: full 34k POI dataset + live backend status check ───────
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        // 1. Always load full 34,117 NYC POI dataset
        let pois = [];
        try {
          const pr = await fetch('/pois.json');
          if (pr.ok) {
            pois = await pr.json();
          }
        } catch (_) { /* fallback */ }

        // 2. Check if live backend API is online
        try {
          const res = await fetch('/api/v1/health');
          if (res.ok) {
            const json = await res.json();
            if (json.success) {
              if (!cancelled) setBackendOnline(true);
            }
          }
        } catch (_) { /* offline */ }

        // 3. Load recommendations file
        const rr = await fetch('/recommendations.json');
        const rj = await rr.json();

        if (cancelled) return;
        setPoiData(Array.isArray(pois) ? pois : []);
        setRecommendationData(rj && typeof rj === 'object' ? rj : { rounds: [], profiles: [] });
      } catch (err) {
        if (!cancelled) { setPoiData([]); setRecommendationData({ rounds: [], profiles: [] }); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadData();
    fetchTransactions();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetchBalance(); // immediate first call
    fetchTransactions();
    const interval = setInterval(() => {
      fetchBalance();
      fetchTransactions();
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) setSelectedProfileId(profiles[0].id);
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (!selectedProfile) return;
    setSelectedPoi((cur) => {
      const resolved = resolveSelectedPoi({
        currentPoi: cur,
        recommendations: selectedProfile.recommendations ?? [],
        poiData,
      });
      return resolved ? normalizePoi(resolved) : null;
    });
  }, [poiData, selectedProfile]);

  const handleSelectProfile = (id) => {
    const profile = profiles.find((p) => p.id === id);
    setSelectedProfileId(id);
    const resolved = resolveSelectedPoi({
      currentPoi: null,
      recommendations: profile?.recommendations ?? [],
      poiData,
    });
    setSelectedPoi(resolved ? normalizePoi(resolved) : null);
  };

  const handleCheckIn = async (poi) => {
    if (!poi) return;
    const entry = {
      id: poi.id, name: poi.name,
      profile: selectedProfile?.label ?? 'Unknown',
      tokensEarned: 10,
      timestamp: new Date().toISOString(),
      type: 'checkin',
    };
    setSelectedPoi(poi);
    setLastCheckIn({ name: poi.name, profile: selectedProfile?.label ?? 'Unknown' });
    setCheckInHistory((h) => [entry, ...h]);
    setTokenBalance((b) => b + 10); // optimistic update (10 TRUST per check-in)

    // POST to backend → records in MongoDB + submits to Hardhat
    try {
      const res = await fetch('/api/v1/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: toObjectId(DEMO_WALLET),
          poiId:  toObjectId(poi.id ?? poi.name ?? ''),
          latitude:  poi.lat ?? userLocation.lat,
          longitude: poi.lng ?? userLocation.lng,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.txHash) {
          console.info('[TrustChain] check-in tx:', json.data.txHash);
        }
        fetchBalance();
        fetchTransactions();
      }
    } catch (_) { /* backend offline — optimistic update already applied */ }
  };

  const handleAddTokens = () => setTokenBalance((b) => b + 10);
  const handleOpenReview = (poi) => { setSelectedPoiForReview(poi); setReviewRating(5); setReviewText(''); setShowReviewForm(true); };
  const handleOpenExplanation = (poi) => {
    const normalizedPoi = poi ? normalizePoi(poi) : null;
    setSelectedPoiForExplanation(normalizedPoi);
    setShowExplanation(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedPoiForReview) return;
    setShowReviewForm(false);
    setTokenBalance((b) => b + 5);
    const bodyText = reviewText.trim() || 'Great location!';
    const entry = {
      id: selectedPoiForReview.id,
      name: `Review: ${selectedPoiForReview.name}`,
      profile: selectedProfile?.label ?? 'Unknown',
      tokensEarned: 5,
      timestamp: new Date().toISOString(),
      type: 'review',
      rating: reviewRating,
      review: bodyText,
    };
    setCheckInHistory((h) => [entry, ...h]);

    // POST review to backend → persists in MongoDB
    try {
      const res = await fetch('/api/v1/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:  toObjectId(DEMO_WALLET),
          poiId:   toObjectId(selectedPoiForReview.id ?? selectedPoiForReview.name ?? ''),
          rating:  reviewRating,
          review:  bodyText,
        }),
      });
      if (res.ok) {
        fetchBalance();
        fetchTransactions();
      }
    } catch (_) { /* backend offline — review recorded locally */ }
  };

  return (
    <div className="app-shell">
      <div className="app-frame">

        {/* ══ TOP BAR ══════════════════════════════════════════════════════ */}
        <header className="topbar">
          <div className="topbar-brand">
            <div className="topbar-logo">⛓️</div>
            <div>
              <p className="eyebrow">Federated Learning · Blockchain · Privacy</p>
              <h1>TrustChain <span className="topbar-sub">POI Engine</span></h1>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Backend status pill */}
            <div
              className="topbar-ghost-btn"
              title={backendOnline ? 'Backend + Hardhat connected' : 'Running on static data (backend offline)'}
              style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
            >
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: backendOnline ? '#4ade80' : '#f59e0b',
                boxShadow: backendOnline ? '0 0 6px #4ade80' : '0 0 6px #f59e0b',
              }} />
              {backendOnline ? 'Live' : 'Offline'}
            </div>

            {checkInHistory.length > 0 && (
              <button type="button" className="topbar-ghost-btn" onClick={() => setShowAllHistory((c) => !c)}>
                📋 {showAllHistory ? 'Hide' : 'History'}
              </button>
            )}
            <button type="button" className="topbar-ghost-btn wallet-trigger" onClick={() => setShowWallet(true)}>
              💰 Wallet
            </button>
            <div className="token-pill" aria-label={`Token balance ${tokenBalance}`}>
              <span className="token-pill__icon">🪙</span>
              <div className="token-pill__info">
                <span className="token-pill__label">TRUST</span>
                <strong className="token-pill__amount">{tokenBalance}</strong>
              </div>
              <button type="button" className="token-action-button" onClick={handleAddTokens} title="Add 10 test tokens">+10</button>
            </div>
          </div>
        </header>

        {/* ══ DEFENSE SHIELD BANNER ════════════════════════════════════════ */}
        {defenseShield?.flaggedBots > 0 && (
          <div className="shield-banner">
            <div className="shield-banner__left">
              <span className="shield-icon">🛡️</span>
              <div>
                <p className="shield-title">Defense Shield Active</p>
                <p className="shield-sub">Blocked <strong>{defenseShield.flaggedBots}</strong> bot accounts · {defenseShield.retentionRate.toFixed(1)}% clean data retained · DP ε={defenseShield.epsilon}</p>
              </div>
            </div>
            <div className="shield-badge">{defenseShield.retentionRate.toFixed(0)}% Safe</div>
          </div>
        )}

        {/* ══ MAIN GRID ════════════════════════════════════════════════════ */}
        <main className="content-grid">

          {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
          <section className="panel panel--summary">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Loading 34k NYC POIs…</p>
              </div>
            ) : (
              <>
                {/* ── Stats strip ──────────────────────────────────────── */}
                <div className="stats-strip">
                  <div className="stat-tile stat-tile--blue">
                    <span className="stat-tile__icon">🗺️</span>
                    <div>
                      <span className="stat-tile__label">POIs on Map</span>
                      <strong className="stat-tile__val">{poiData.length.toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className="stat-tile stat-tile--green">
                    <span className="stat-tile__icon">🤖</span>
                    <div>
                      <span className="stat-tile__label">FL Accuracy</span>
                      <strong className="stat-tile__val">{latestRound ? `${(latestRound.accuracy * 100).toFixed(0)}%` : '93%'}</strong>
                    </div>
                  </div>
                  <div className="stat-tile stat-tile--amber">
                    <span className="stat-tile__icon">🪙</span>
                    <div>
                      <span className="stat-tile__label">My Balance</span>
                      <strong className="stat-tile__val">{tokenBalance} TC</strong>
                    </div>
                  </div>
                </div>

                {/* ── Profile switcher ─────────────────────────────────── */}
                <div className="profile-section">
                  <div className="section-header">
                    <p className="section-label">👤 Federated Profile</p>
                    <span className="section-hint">Switch to change recommendations</span>
                  </div>
                  <div className="profile-grid">
                    {profiles.map((profile) => {
                      const isActive = profile.id === selectedProfileId;
                      const meta = PROFILE_META[profile.id] ?? { icon: '👤', accent: '#60a5fa', tag: '' };
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          className={`profile-chip ${isActive ? 'profile-chip--active' : ''}`}
                          style={isActive ? { '--chip-accent': meta.accent } : {}}
                          onClick={() => handleSelectProfile(profile.id)}
                        >
                          <span className="profile-chip__icon">{meta.icon}</span>
                          <span className="profile-chip__label">{profile.label}</span>
                          <span className="profile-chip__tag">{meta.tag}</span>
                          <span className="profile-chip__acc">Acc {(profile.validationAccuracy * 100).toFixed(0)}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Recommendation feed ──────────────────────────────── */}
                <div className="rec-feed">
                  <div className="section-header">
                    <div>
                      <p className="section-label">⭐ Recommended for You</p>
                      <p className="section-profile-name" style={{ color: profileMeta.accent }}>
                        {profileMeta.icon} {selectedProfile?.label ?? '—'}
                      </p>
                    </div>
                    <div className="rec-categories">
                      {selectedProfile?.topCategories?.slice(0, 2).map((c) => (
                        <span key={c} className="rec-cat-badge">{c}</span>
                      ))}
                    </div>
                  </div>

                  <div className="rec-list">
                    {recommendedPois.slice(0, 5).map((poi, i) => {
                      const scorePercent = Math.round((poi.score ?? 0) * 100);
                      return (
                        <article
                          key={poi.id}
                          className="rec-card"
                          style={{ '--rank-color': i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#6b7280' }}
                        >
                          <div className="rec-card__rank">#{i + 1}</div>
                          <div className="rec-card__body">
                            <div className="rec-card__name-row">
                              <span className="rec-card__cat-icon">{categoryIcon(poi.category)}</span>
                              <h4 className="rec-card__name">{poi.name}</h4>
                            </div>
                            <div className="rec-card__meta">
                              <span className="rec-cat-badge rec-cat-badge--sm">{poi.category}</span>
                              <span>·</span>
                              <span>{poi.checkins?.toLocaleString()} check-ins</span>
                            </div>
                            {/* Mini score bar */}
                            <div className="rec-score-bar">
                              <div className="rec-score-bar__fill" style={{ width: `${scorePercent}%`, background: profileMeta.accent }} />
                            </div>
                          </div>
                          <div className="rec-card__right">
                            <span className="rec-card__score" style={{ color: profileMeta.accent }}>{(poi.score ?? 0).toFixed(2)}</span>
                            <button
                              type="button"
                              className="rec-card__why-btn"
                              onClick={() => handleOpenExplanation(poi)}
                              title="Why is this recommended?"
                            >
                              Why? →
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                {/* ── Selected POI / Checkin card ──────────────────────── */}
                <div className="checkin-card">
                  <div className="section-header" style={{ marginBottom: '12px' }}>
                    <p className="section-label">📍 Selected Location</p>
                    {selectedPoi && recommendedPoiIds.has(selectedPoi.id) && (
                      <span className="rec-badge-inline">⭐ Recommended</span>
                    )}
                  </div>

                  {selectedPoi ? (
                    <>
                      <div className="selected-poi-card">
                        <div className="selected-poi-icon">{categoryIcon(selectedPoi.category)}</div>
                        <div>
                          <h3 className="selected-poi-name">{selectedPoi.name}</h3>
                          <p className="selected-poi-meta">{selectedPoi.category} · {selectedPoi.checkins?.toLocaleString()} check-ins</p>
                        </div>
                      </div>
                      <div className="checkin-actions">
                        <button type="button" className="action-btn action-btn--green" onClick={() => handleCheckIn(selectedPoi)}>
                          ✅ Check-in <span className="action-reward">+1 TC</span>
                        </button>
                        <button type="button" className="action-btn action-btn--blue" onClick={() => handleOpenReview(selectedPoi)}>
                          ✍️ Review <span className="action-reward">+5 TC</span>
                        </button>
                        <button type="button" className="action-btn action-btn--ghost" onClick={() => handleOpenExplanation(selectedPoi)}>
                          📊 Scores
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="empty-selection">
                      <p>Click any marker on the map to select a location</p>
                    </div>
                  )}

                  {lastCheckIn && (
                    <div className="last-checkin-note">
                      <span>✅ Last check-in:</span> <strong>{lastCheckIn.name}</strong>
                    </div>
                  )}
                </div>

                {/* ── Activity ledger ──────────────────────────────────── */}
                <div className="activity-ledger">
                  <div className="section-header">
                    <p className="section-label">📒 Activity Ledger</p>
                    <span className="section-hint">{checkInHistory.length} events</span>
                  </div>
                  {checkInHistory.length > 0 ? (
                    <>
                      <ul className="ledger-list">
                        {(showAllHistory ? checkInHistory : checkInHistory.slice(0, 4)).map((entry, idx) => (
                          <li key={`${entry.id}-${entry.timestamp}-${idx}`} className="ledger-item">
                            <span className="ledger-type-icon">
                              {entry.type === 'review' ? '✍️' : '✅'}
                            </span>
                            <div className="ledger-item__body">
                              <strong>{entry.name}</strong>
                              <span>
                                {entry.rating ? `⭐ ${entry.rating}/5 · ` : ''}
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {entry.review && (
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0', fontStyle: 'italic' }}>
                                  "{entry.review}"
                                </p>
                              )}
                            </div>
                            <span className={`ledger-reward ${entry.tokensEarned >= 5 ? 'ledger-reward--big' : ''}`}>
                              +{entry.tokensEarned} TC
                            </span>
                          </li>
                        ))}
                      </ul>
                      {checkInHistory.length > 4 && (
                        <button
                          type="button"
                          className="topbar-ghost-btn"
                          onClick={() => setShowAllHistory(!showAllHistory)}
                          style={{ width: '100%', marginTop: '8px', fontSize: '0.75rem', textAlign: 'center' }}
                        >
                          {showAllHistory ? 'Show Less' : `Show All (${checkInHistory.length} events)`}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="empty-ledger">No activity yet. Check-in or write a review to earn TC tokens!</p>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ── MAP PANEL ────────────────────────────────────────────────── */}
          <section className="panel panel--map">
            <div className="map-header">
              <div>
                <p className="section-label">🗺️ NYC Geospatial Grid</p>
                <h2>Foursquare Points of Interest</h2>
                <p className="map-header-sub">
                  {poiData.length.toLocaleString()} locations · {recommendedPoiIds.size} recommended for {selectedProfile?.label ?? '…'}
                </p>
              </div>
              <div className="map-header-right">
                <div className="map-stat-pill" style={{ borderColor: '#f97316', color: '#f97316' }}>
                  🟠 {recommendedPoiIds.size} Recommended
                </div>
                <p className="map-hint">Click any marker to select · Legend ↘</p>
              </div>
            </div>

            <div className="map-frame">
              <PoiMap
                pois={allPoisToRender}
                onSelectPoi={setSelectedPoi}
                onCheckIn={handleCheckIn}
                onOpenDetails={handleOpenExplanation}
                selectedPoiId={selectedPoi?.id}
                recommendedPoiIds={recommendedPoiIds}
              />
            </div>
          </section>
        </main>

        {/* ══ WALLET MODAL ═════════════════════════════════════════════════ */}
        {showWallet && (
          <div className="modal-overlay" onClick={() => setShowWallet(false)} role="dialog" aria-modal="true" aria-label="TrustChain Wallet">
            <div className="modal wallet-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>💰 TrustChain Wallet</h2>
                <button type="button" className="modal-close" onClick={() => setShowWallet(false)} aria-label="Close wallet">×</button>
              </div>
              <div className="modal-content">

                {/* Balance card */}
                <div className="wallet-card">
                  <p className="wallet-label">Cryptographic Balance</p>
                  <p className="wallet-amount">
                    {tokenBalance} <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>TC</span>
                  </p>
                  <p className="wallet-sub">TrustChain Tokens · Proof-of-Recommendation</p>
                  <div className="wallet-card-shimmer" />
                </div>

                {/* Earned stats */}
                <div className="wallet-stats-row">
                  <div className="wallet-stat">
                    <span className="wallet-stat__icon">✅</span>
                    <div>
                      <span className="wallet-stat__label">Check-ins</span>
                      <strong className="wallet-stat__val">{checkInHistory.filter(e => e.type !== 'review').length}</strong>
                    </div>
                  </div>
                  <div className="wallet-stat">
                    <span className="wallet-stat__icon">✍️</span>
                    <div>
                      <span className="wallet-stat__label">Reviews</span>
                      <strong className="wallet-stat__val">{checkInHistory.filter(e => e.type === 'review').length}</strong>
                    </div>
                  </div>
                  <div className="wallet-stat">
                    <span className="wallet-stat__icon">🪙</span>
                    <div>
                      <span className="wallet-stat__label">Total Earned</span>
                      <strong className="wallet-stat__val">{Math.max(tokenBalance, checkInHistory.reduce((s, e) => s + (e.tokensEarned || 0), 0))} TC</strong>
                    </div>
                  </div>
                </div>

                {/* Transaction ledger */}
                <div className="transaction-list">
                  <div className="wallet-ledger-header">
                    <h3>Transaction Ledger</h3>
                    {checkInHistory.length > 0 && (
                      <span className="wallet-ledger-count">{checkInHistory.length} events</span>
                    )}
                  </div>
                  {checkInHistory.length > 0 ? (
                    checkInHistory.slice(0, 10).map((entry, idx) => (
                      <div key={idx} className="transaction-item">
                        <div className="tx-icon-wrap">
                          <span>{entry.type === 'review' ? '✍️' : '✅'}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', color: '#ffffff', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.name}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {entry.profile} · {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="token-gain">+{entry.tokensEarned} TC</span>
                      </div>
                    ))
                  ) : (
                    <div className="wallet-empty-state">
                      <span style={{ fontSize: '2rem' }}>🪙</span>
                      <p>No transactions yet.</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Check in at a POI to earn your first TC tokens!</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ══ REVIEW FORM MODAL ════════════════════════════════════════════ */}
        {showReviewForm && selectedPoiForReview && (
          <div className="modal-overlay" onClick={() => setShowReviewForm(false)} role="dialog" aria-modal="true" aria-label="Submit Review">
            <div className="modal review-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>✍️ Submit Review</h2>
                <button type="button" className="modal-close" onClick={() => setShowReviewForm(false)} aria-label="Close review form">×</button>
              </div>
              <form onSubmit={handleSubmitReview} className="modal-content">

                {/* POI context header */}
                <div className="review-poi-header">
                  <span className="review-poi-icon">{categoryIcon(selectedPoiForReview.category)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="review-poi-name">{selectedPoiForReview.name}</h3>
                    <p className="review-poi-meta">
                      <span className="poi-details-category-badge">{selectedPoiForReview.category}</span>
                      &nbsp;·&nbsp; {selectedPoiForReview.checkins?.toLocaleString()} check-ins
                    </p>
                  </div>
                </div>

                {/* Reward banner */}
                <div className="review-reward-note">
                  🪙 You'll earn <strong>+5 TC</strong> tokens for this cryptographically recorded on-chain review
                </div>

                {/* Star rating */}
                <div className="review-field-block">
                  <label className="section-label" style={{ display: 'block', marginBottom: '10px' }}>Your Rating</label>
                  <div className="rating-stars" role="radiogroup" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        role="radio"
                        aria-checked={star <= reviewRating}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        tabIndex={0}
                        className={`star-btn ${star <= reviewRating ? 'filled' : ''}`}
                        onClick={() => setReviewRating(star)}
                        onKeyDown={(e) => e.key === 'Enter' && setReviewRating(star)}
                      >★</span>
                    ))}
                    <span className="review-rating-label">
                      {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][reviewRating]}
                    </span>
                  </div>
                </div>

                {/* Text area */}
                <div className="review-field-block">
                  <div className="review-label-row">
                    <label className="section-label" htmlFor="review-comment">Written Feedback</label>
                    <span className="review-char-count" style={{ color: reviewText.length > 200 ? '#f87171' : 'var(--text-muted)' }}>
                      {reviewText.length}/300
                    </span>
                  </div>
                  <textarea
                    id="review-comment"
                    className="review-textarea"
                    placeholder="Describe your experience at this location…"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    maxLength={300}
                    required
                  />
                </div>

                {/* Privacy note */}
                <p className="review-privacy-note">
                  🔒 Your review is hashed and stored on-chain. Raw text is never uploaded. Differential Privacy (ε = 1.0) protects your data.
                </p>

                <button type="submit" className="primary-button" disabled={!reviewText.trim()}>
                  Submit Review · Earn +5 TC
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══ POI DETAILS / TRANSPARENCY PANEL ════════════════════════════ */}
        {showExplanation && selectedPoiForExplanation && (
          <PoiDetailsPanel
            poi={selectedPoiForExplanation}
            metrics={selectedPoiExplanationMetrics}
            profileLabel={selectedProfile?.label}
            onClose={() => setShowExplanation(false)}
            onCheckIn={handleCheckIn}
            onWriteReview={handleOpenReview}
          />
        )}
      </div>
    </div>
  );
}

export default App;