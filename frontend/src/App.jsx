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
    setShowReviewForm(true);
  };

  const handleOpenExplanation = (poi) => {
    setSelectedPoiForExplanation(poi);
    setShowExplanation(true);
  };

  const handleSubmitReview = (rating, review) => {
    if (!selectedPoiForReview) return;
    console.log(`Review submitted for ${selectedPoiForReview.name}: ${rating} stars - ${review}`);
    setShowReviewForm(false);
    setTokenBalance((currentBalance) => currentBalance + 5);
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="topbar">
        <div>
          <p className="eyebrow">TrustChain app</p>
          <h1>POI map explorer</h1>
          <p className="topbar-copy">Profile-aware recommendations are sourced from the federated simulation output.</p>
        </div>

        <div className="topbar-actions">
          {checkInHistory.length > 0 ? (
            <button
              type="button"
              className="history-toggle-button"
              onClick={() => setShowAllHistory((current) => !current)}
            >
              {showAllHistory ? 'Hide history' : 'View all history'}
            </button>
          ) : null}

          <button
            type="button"
            className="wallet-button"
            onClick={() => setShowWallet(!showWallet)}
          >
            Wallet
          </button>

          <div className="token-pill" aria-label={`Token balance ${tokenBalance}`}>
            <span className="token-pill__label">Token balance</span>
            <strong>{tokenBalance}</strong>
            <button type="button" className="token-action-button" onClick={handleAddTokens}>
              Add +10
            </button>
          </div>
        </div>
      </header>

      <main className="content-grid">
        {isLoading ? (
          <section className="panel panel--summary panel--loading">
            <p className="panel-label">Loading data</p>
            <h2>Fetching the generated POI and recommendation feeds</h2>
            <p className="panel-copy">The frontend now loads the large dataset at runtime so the build stays lightweight.</p>
          </section>
        ) : null}

        <section className="panel panel--summary">
          <p className="panel-label">Deliverable</p>
          <h2>Map showing POI markers from the dataset</h2>
          <p className="panel-copy">
            Loaded from the local NYC POI dataset sample, with a profile switcher, a live recommendation feed, and a token counter for the TrustChain experience.
          </p>

          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-card__label">POIs available</span>
              <strong>{poiData.length}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Tokens fixed</span>
              <strong>{tokenBalance}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Final accuracy</span>
              <strong>{latestRound ? latestRound.accuracy : 'n/a'}</strong>
            </div>
          </div>

          <div className="profile-switcher">
            <div className="profile-switcher__header">
              <p className="panel-label">Simulated profiles</p>
              <p className="profile-switcher__hint">Switch between the 3 federated client personas.</p>
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
                    <span className="profile-chip__meta">Accuracy {profile.validationAccuracy}</span>
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
              <p className="recommendation-feed__hint">Top categories: {selectedProfile?.topCategories?.join(', ') ?? 'n/a'}</p>
              <p className="panel-copy panel-copy--small">Showing the most relevant POIs first for faster app-style load performance.</p>
            </div>

            <div className="recommendation-list">
              {recommendedPois.slice(0, 5).map((poi, index) => (
                <article key={poi.id} className="recommendation-card">
                  <div>
                    <span className="recommendation-card__rank">#{index + 1}</span>
                    <h4>{poi.name}</h4>
                    <p>{poi.category} · {poi.checkins} check-ins</p>
                  </div>
                  <strong>{poi.score}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="checkin-card">
            <p className="panel-label">Check-in status</p>
            <h3>{selectedPoi ? selectedPoi.name : 'Select a marker on the map'}</h3>
            <p className="panel-copy">
              {selectedPoi
                ? 'Open the marker popup and tap check in there to record the point.'
                : 'Tap any POI marker to select it and check in from the popup.'}
            </p>

            {lastCheckIn ? (
              <p className="checkin-note">Last checked in at {lastCheckIn.name} under {lastCheckIn.profile}.</p>
            ) : (
              <p className="checkin-note">No check-ins yet. Use the popup on a POI marker.</p>
            )}

            <div className="checkin-history">
              <div className="checkin-history__header">
                <p className="panel-label">Check-in history</p>
                <span className="checkin-history__meta">
                  {checkInHistory.length} entr{checkInHistory.length === 1 ? 'y' : 'ies'}
                </span>
              </div>

              {checkInHistory.length > 0 ? (
                <ul className="history-list">
                  {(showAllHistory ? checkInHistory : checkInHistory.slice(0, 5)).map((entry) => (
                    <li key={`${entry.id}-${entry.timestamp}`} className="history-item">
                      <strong>{entry.name}</strong>
                      <span>
                        {entry.profile} · +{entry.tokensEarned} token{entry.tokensEarned !== 1 ? 's' : ''}
                      </span>
                      <small>{new Date(entry.timestamp).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="panel-copy panel-copy--small">No previous check-ins yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="panel panel--map">
          <div className="map-header">
            <div>
              <p className="panel-label">Dataset view</p>
              <h2>NYC points of interest</h2>
            </div>
            <p className="map-hint">Recommended markers are highlighted in amber for the active profile.</p>
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
              <h2>Token Wallet</h2>
              <button type="button" className="modal-close" onClick={() => setShowWallet(false)}>Close</button>
            </div>
            <div className="modal-content">
              <div className="wallet-card">
                <p className="wallet-label">Current Balance</p>
                <p className="wallet-amount">{tokenBalance}</p>
              </div>
              <div className="transaction-list">
                <h3>Recent Transactions</h3>
                {checkInHistory.slice(0, 5).map((entry, idx) => (
                  <div key={idx} className="transaction-item">
                    <span>{entry.name}</span>
                    <span className="token-gain">+{entry.tokensEarned}</span>
                  </div>
                ))}
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
              <h2>Write a Review</h2>
              <button type="button" className="modal-close" onClick={() => setShowReviewForm(false)}>Close</button>
            </div>
            <div className="modal-content">
              <p><strong>{selectedPoiForReview.name}</strong></p>
              <p>{selectedPoiForReview.category}</p>
            </div>
          </div>
        </div>
      )}

      {/* Explanation Modal */}
      {showExplanation && selectedPoiForExplanation && (
        <div className="modal-overlay" onClick={() => setShowExplanation(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Why This Recommendation?</h2>
              <button type="button" className="modal-close" onClick={() => setShowExplanation(false)}>Close</button>
            </div>
            <div className="modal-content">
              <p><strong>{selectedPoiForExplanation.name}</strong></p>
              <p>Score: {(selectedPoiForExplanation.score * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

export default App;