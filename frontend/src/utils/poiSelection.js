export function resolveSelectedPoi({ currentPoi, recommendations = [], poiData = [] }) {
  if (poiData.length > 0) {
    const currentIsInDataset = Boolean(currentPoi && poiData.some((poi) => poi.id === currentPoi.id));
    if (currentIsInDataset) {
      return currentPoi;
    }
    return poiData[0] ?? null;
  }

  return currentPoi ?? recommendations[0] ?? null;
}
