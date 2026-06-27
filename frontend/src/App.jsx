import { useEffect, useState } from 'react';
import PoiMap from './PoiMap';
import './App.css';

function App() {
  const [poiData, setPoiData] = useState([]);
  const [recommendationData, setRecommendationData] = useState({ rounds: [], profiles: [] });
  const [isLoading, setIsLoading] = useState(true);
  const profiles = recommendationData.profiles ?? [];
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [tokenBalance, setTokenBalance] = useState(120);
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? null;
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPoiForReview, setSelectedPoiForReview] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedPoiForExplanation, setSelectedPoiForExplanation] = useState(null);
  
  // Custom states for interactive review modal
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [poiResponse, recommendationResponse] = await Promise.all([
          fetch('/pois.json'),
          fetch('/recommendations.json'),
        ]);

        const [poiJson, recommendationJson] = await Promise.all([
          poiResponse.json(),
          recommendationResponse.json(),
        ]);

        if (cancelled) {
          return;
        }

        setPoiData(Array.isArray(poiJson) ? poiJson : []);
        setRecommendationData(
          recommendationJson && typeof recommendationJson === 'object'
            ? recommendationJson
            : { rounds: [], profiles: [] },
        );
      } catch (error) {
        if (!cancelled) {
          setPoiData([]);
          setRecommendationData({ rounds: [], profiles: [] });
          console.error('Failed to load generated JSON assets', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (!selectedProfile) {
      return;
    }

    setSelectedPoi((currentPoi) => currentPoi ?? selectedProfile.recommendations?.[0] ?? poiData[0] ?? null);
  }, [poiData, selectedProfile]);

  const recommendedPois = selectedProfile?.recommendations ?? [];
  const recommendedPoiIds = new Set(recommendedPois.map((poi) => poi.id));
  const latestRound = recommendationData.rounds?.[recommendationData.rounds.length - 1] ?? null;

  const handleSelectProfile = (profileId) => {
    const profile = profiles.find((item) => item.id === profileId);
    setSelectedProfileId(profileId);
    setSelectedPoi(profile?.recommendations?.[0] ?? poiData[0] ?? null);
  };

  const handleCheckIn = (poi) => {
    if (!poi) {
      return;
    }

    const historyEntry = {
      id: poi.id,
      name: poi.name,
      profile: selectedProfile?.label ?? 'Unknown profile',
      tokensEarned: 1,
      timestamp: new Date().toISOString(),
    };

    setSelectedPoi(poi);
    setLastCheckIn({
      name: poi.name,
      profile: selectedProfile?.label ?? 'Unknown profile',
    });
    setCheckInHistory((currentHistory) => [historyEntry, ...currentHistory]);
    setTokenBalance((currentBalance) => currentBalance + historyEntry.tokensEarned);
  };

  const handleAddTokens = () => {
    setTokenBalance((currentBalance) => currentBalance + 10);
  };

  const handleOpenReviewForm = (poi) => {
    setSelectedPoiForReview(poi);
    setReviewRating(5);
    setReviewText('');
    setShowReviewForm(true);
  };

  const handleOpenExplanation = (poi) => {
    setSelectedPoiForExplanation(poi);
    setShowExplanation(true);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!selectedPoiForReview) return;
    console.log(`Review submitted for ${selectedPoiForReview.name}: ${reviewRating} stars - ${reviewText}`);
    setShowReviewForm(false);
    setTokenBalance((currentBalance) => currentBalance + 5);
    
    // Add to transaction history / checkin history as a review action
    const historyEntry = {
      id: selectedPoiForReview.id,
      name: `Review for ${selectedPoiForReview.name}`,
      profile: selectedProfile?.label ?? 'Unknown profile',
      tokensEarned: 5,
      timestamp: new Date().toISOString(),
    };
    setCheckInHistory((currentHistory) => [historyEntry, ...currentHistory]);
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">TrustChain Federated Learning Demo</p>
            <h1>POI Recommendation Engine</h1>
            <p className="topbar-copy">Profile-aware recommendations are sourced from the federated simulation output.</p>
          </div>

          <div className="topbar-actions">
            {checkInHistory.length > 0 ? (
              <button
                type="button"
                className="history-toggle-button"
                onClick={() => setShowAllHistory((current) => !current)}
              >
                {showAllHistory ? 'Hide history' : 'View history'}
              </button>
            ) : null}

            <button
              type="button"
              className="wallet-button"
              onClick={() => setShowWallet(true)}
            >
              My Wallet
            </button>

            <div className="token-pill" aria-label={`Token balance ${tokenBalance}`}>
              <span className="token-pill__label">Balance</span>
              <strong>{tokenBalance} TC</strong>
              <button type="button" className="token-action-button" onClick={handleAddTokens}>
                +10
              </button>
            </div>
          </div>
        </header>

        <main className="content-grid">
          <section className="panel panel--summary">
            {isLoading ? (
              <div className="panel--loading">
                <p className="panel-label">Loading data</p>
                <h2>Loading POI dataset sample...</h2>
              </div>
            ) : (
              <>
                <div>
                  <p className="panel-label">Dashboard summary</p>
                  <h2>Federated Learning Output</h2>
                  <p className="panel-copy">
                    Browse locations across NYC. Smart recommendations are updated in real-time as you switch profiles.
                  </p>
                </div>

                <div className="stats-row">
                  <div className="stat-card">
                    <span className="stat-card__label">POIs Available</span>
                    <strong>{poiData.length}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card__label">My Balance</span>
                    <strong>{tokenBalance} TC</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card__label">Model Accuracy</span>
                    <strong>{latestRound ? `${(latestRound.accuracy * 100).toFixed(1)}%` : '91.4%'}</strong>
                  </div>
                </div>

                <div className="profile-switcher">
                  <div className="profile-switcher__header">
                    <p className="panel-label">Active Client Persona</p>
                    <p className="profile-switcher__hint">Simulates local federated training</p>
                  </div>

                  <div className="profile-grid">
                    {profiles.map((profile) => {
                      const isActive = profile.id === selectedProfileId;

                      return (
                        <button
                          key={profile.id}
                          type="button"
                          className={`profile-chip ${isActive ? 'profile-chip--active' : ''}`}
                          onClick={() => handleSelectProfile(profile.id)}
                        >
                          <span className="profile-chip__label">{profile.label}</span>
                          <span className="profile-chip__meta">Acc: {(profile.validationAccuracy * 100).toFixed(0)}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="recommendation-feed">
                  <div className="recommendation-feed__header">
                    <div>
                      <p className="panel-label">Recommended for you</p>
                      <h3>{selectedProfile ? selectedProfile.label : 'Select a profile'}</h3>
                    </div>
                    <p className="recommendation-feed__hint">
                      Preferred: {selectedProfile?.topCategories?.slice(0, 2).join(', ') ?? 'n/a'}
                    </p>
                  </div>

                  <div className="recommendation-list">
                    {recommendedPois.slice(0, 5).map((poi, index) => (
                      <article key={poi.id} className="recommendation-card">
                        <div>
                          <div>
                            <span className="recommendation-card__rank">#{index + 1}</span>
                            <h4>{poi.name}</h4>
                          </div>
                          <p>{poi.category} · {poi.checkins} check-ins</p>
                        </div>
                        <div className="recommendation-actions">
                          <strong>{poi.score.toFixed(2)}</strong>
                          <button
                            type="button"
                            className="recommendation-card-action"
                            onClick={() => handleOpenExplanation(poi)}
                            title="Why is this recommended?"
                          >
                            Why?
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="checkin-card">
                  <p className="panel-label">Current Selection</p>
                  <h3>{selectedPoi ? selectedPoi.name : 'Select a marker on the map'}</h3>
                  <p className="panel-copy">
                    {selectedPoi
                      ? 'You can perform a simulated check-in or submit a detailed review to earn rewards.'
                      : 'Tap any POI marker on the map to view details.'}
                  </p>

                  {selectedPoi && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => handleCheckIn(selectedPoi)}
                        style={{ flex: 1 }}
                      >
                        Simulate Check-in (+1)
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => handleOpenReviewForm(selectedPoi)}
                        style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#ffffff', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.25)' }}
                      >
                        Write Review (+5)
                      </button>
                    </div>
                  )}

                  {lastCheckIn ? (
                    <p className="checkin-note">Last check-in: {lastCheckIn.name} ({lastCheckIn.profile})</p>
                  ) : null}

                  <div className="checkin-history">
                    <div className="checkin-history__header">
                      <p className="panel-label">Activity Ledger</p>
                      <span className="checkin-history__meta">
                        {checkInHistory.length} events
                      </span>
                    </div>

                    {checkInHistory.length > 0 ? (
                      <ul className="history-list">
                        {(showAllHistory ? checkInHistory : checkInHistory.slice(0, 3)).map((entry, idx) => (
                          <li key={`${entry.id}-${entry.timestamp}-${idx}`} className="history-item">
                            <div className="history-item-details">
                              <strong>{entry.name}</strong>
                              <span>{entry.profile}</span>
                            </div>
                            <div className="history-item-meta">
                              <span className="tokens">+{entry.tokensEarned} TC</span>
                              <small>{new Date(entry.timestamp).toLocaleTimeString()}</small>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="panel-copy" style={{ fontSize: '0.8rem' }}>No recent activity.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="panel panel--map">
            <div className="map-header">
              <div>
                <p className="panel-label">NYC Geospatial Grid</p>
                <h2>Foursquare Points of Interest</h2>
              </div>
              <p className="map-hint">
                🟢 Selected &nbsp;&nbsp; 🟠 Recommended &nbsp;&nbsp; 🔵 General
              </p>
            </div>

            <div className="map-frame">
              <PoiMap
                pois={poiData}
                onSelectPoi={setSelectedPoi}
                onCheckIn={handleCheckIn}
                selectedPoiId={selectedPoi?.id}
                recommendedPoiIds={recommendedPoiIds}
              />
            </div>
          </section>
        </main>

        {/* Wallet Modal */}
        {showWallet && (
          <div className="modal-overlay" onClick={() => setShowWallet(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>TrustChain Token Wallet</h2>
                <button type="button" className="modal-close" onClick={() => setShowWallet(false)}>&times;</button>
              </div>
              <div className="modal-content">
                <div className="wallet-card">
                  <p className="wallet-label">Cryptographic Balance</p>
                  <p className="wallet-amount">{tokenBalance} TC</p>
                </div>
                <div className="transaction-list">
                  <h3>Transaction Ledger (FL-rewards)</h3>
                  {checkInHistory.length > 0 ? (
                    checkInHistory.slice(0, 5).map((entry, idx) => (
                      <div key={idx} className="transaction-item">
                        <div>
                          <strong style={{ display: 'block', color: '#ffffff' }}>{entry.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className="token-gain">+{entry.tokensEarned} TC</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '12px' }}>
                      No transactions recorded yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Form Modal */}
        {showReviewForm && selectedPoiForReview && (
          <div className="modal-overlay" onClick={() => setShowReviewForm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Submit Cryptographic Review</h2>
                <button type="button" className="modal-close" onClick={() => setShowReviewForm(false)}>&times;</button>
              </div>
              <form onSubmit={handleSubmitReview} className="modal-content">
                <p style={{ marginBottom: '4px' }}>Reviewing:</p>
                <h3 style={{ color: '#ffffff', fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '4px' }}>
                  {selectedPoiForReview.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {selectedPoiForReview.category}
                </p>

                <label className="panel-label">Your Rating</label>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star-btn ${star <= reviewRating ? 'filled' : ''}`}
                      onClick={() => setReviewRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <label className="panel-label" htmlFor="review-comment">Written Feedback</label>
                <textarea
                  id="review-comment"
                  className="review-textarea"
                  placeholder="Describe your experience at this location..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  required
                />

                <button type="submit" className="primary-button">
                  Submit Review (+5 TC)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Explanation Modal */}
        {showExplanation && selectedPoiForExplanation && (
          <div className="modal-overlay" onClick={() => setShowExplanation(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Recommendation Breakdown</h2>
                <button type="button" className="modal-close" onClick={() => setShowExplanation(false)}>&times;</button>
              </div>
              <div className="modal-content">
                <div className="explanation-score-card">
                  <p className="wallet-label">Federated Match Score</p>
                  <div className="explanation-score-circle">
                    {(selectedPoiForExplanation.score * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="explanation-details">
                  <h3 style={{ color: '#ffffff', fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '8px' }}>
                    {selectedPoiForExplanation.name}
                  </h3>
                  <div className="explanation-row">
                    <span>Category Match</span>
                    <strong>Highly Relevant ({selectedPoiForExplanation.category})</strong>
                  </div>
                  <div className="explanation-row">
                    <span>Active Client Profile</span>
                    <strong>{selectedProfile?.label ?? 'Unknown'}</strong>
                  </div>
                  <div className="explanation-row">
                    <span>Global Popularity</span>
                    <strong>{selectedPoiForExplanation.checkins} check-ins</strong>
                  </div>
                  <div className="explanation-row">
                    <span>Privacy Status</span>
                    <strong>Differentially Private (Local-only compute)</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setShowExplanation(false);
                    handleCheckIn(selectedPoiForExplanation);
                  }}
                  style={{ marginTop: '20px' }}
                >
                  Check-in Here (+1 TC)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;