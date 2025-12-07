import { getBikeStopData } from "../services/bikeService";
import { getWalkStopData } from "../services/walkService";
import { getDriveStopData } from "../services/driveService";
import { getBusStopData } from "../services/busService";
import { getTrainStopData } from "../services/trainService";
import { getFerryStopData } from "../services/ferryService";

/**
 * Format user stops for display and fetch transit data
 *
 * @param {Array} userStops - Array of user stops from backend
 * @param {string} apiKey - Google Maps API key
 * @param {string} homeAddress - Home address for stops that need it
 * @returns {Promise<Array>} - Formatted stops array with transit data
 */
export const formatUserStops = async (userStops, apiKey, homeAddress) => {
  if (!userStops || userStops.length === 0) {
    return [];
  }

  // Fetch transit data for all user stops in parallel
  const formattedStops = await Promise.all(
    userStops.map(async (stop) => {
      try {
        const stopConfig = {
          name: stop.name || stop.destination,
          type: stop.transit_type,
          origin: stop.origin || homeAddress || "",
          destination: stop.destination || "",
          routeFilter: stop.route_filter,
          stopFilter: stop.stop_filter,
          ferryDirection: stop.ferry_direction,
          location: stop.location,
          mode:
            stop.transit_type === "bike"
              ? "bicycling"
              : stop.transit_type === "walk"
              ? "walking"
              : stop.transit_type === "drive"
              ? "driving"
              : null,
        };

        // Fetch transit data based on stop type
        let transitData;
        if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
          try {
            switch (stop.transit_type) {
              case "bike":
                transitData = await getBikeStopData(stopConfig, apiKey);
                break;
              case "walk":
                transitData = await getWalkStopData(stopConfig, apiKey);
                break;
              case "drive":
                transitData = await getDriveStopData(stopConfig, apiKey);
                break;
              case "bus":
                transitData = await getBusStopData(stopConfig, apiKey);
                break;
              case "train":
                transitData = await getTrainStopData(stopConfig, apiKey);
                break;
              case "ferry":
                transitData = await getFerryStopData(stopConfig);
                break;
              default:
                transitData = null;
            }
          } catch (error) {
            console.error(
              `Error fetching transit data for stop ${stop.id}:`,
              error
            );
            transitData = null;
          }
        }

        // Merge backend stop data with transit data
        return {
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
          hidden: stop.hidden || false,
          allArrivalTimes: transitData?.allArrivalTimes || [],
          nextArrivalTime: transitData?.nextArrivalTime || null,
          nextDepartureTime: transitData?.nextDepartureTime || null,
          estimatedTime: transitData?.estimatedTime || null,
          lastStopTime: transitData?.lastStopTime || null,
          isWithinTwoStops: transitData?.isWithinTwoStops || false,
          walkTime: transitData?.walkTime || null,
          isUserStop: true,
        };
      } catch (error) {
        console.error(`Error formatting stop ${stop.id}:`, error);
        // Return basic stop data if transit fetch fails
        return {
          id: stop.id,
          name: stop.name || stop.destination,
          type: stop.transit_type,
          origin: stop.origin || "",
          destination: stop.destination,
          routeFilter: stop.route_filter,
          stopFilter: stop.stop_filter,
          ferryDirection: stop.ferry_direction,
          location: stop.location,
          hidden: stop.hidden || false,
          allArrivalTimes: [],
          nextArrivalTime: null,
          estimatedTime: null,
          lastStopTime: null,
          isWithinTwoStops: false,
          isUserStop: true,
        };
      }
    })
  );

  return formattedStops;
};

