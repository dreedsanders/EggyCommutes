/**
 * Format user stops for display
 *
 * @param {Array} userStops - Array of user stops from backend
 * @returns {Array} - Formatted stops array
 */
export const formatUserStops = (userStops) => {
  return userStops.map((stop) => ({
    id: stop.id,
    name: stop.name || stop.destination,
    type: stop.transit_type,
    origin: stop.origin || "",
    destination: stop.destination,
    routeFilter: stop.route_filter,
    stopFilter: stop.stop_filter,
    ferryDirection: stop.ferry_direction,
    location: stop.location,
    arrival: stop.arrival,
    departure: stop.departure,
    allArrivalTimes: [],
    nextArrivalTime: null,
    lastStopTime: null,
    isWithinTwoStops: false,
    isUserStop: true,
  }));
};

