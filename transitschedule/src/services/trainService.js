import axios from "axios";
import { convertToCentralTime } from "../utils/helpers";
import { CALTRAIN_STOPS } from "../utils/constants";
import {
  findNextArrival,
  calculateLastStopTime,
  calculateIsWithinTwoStops,
} from "../utils/timeCalculations";
import { loadSavedData, hasMatchingTrainRoute } from "../utils/fileLoader";

/**
 * Train Service
 * 
 * Handles train transit API calls and processing for Caltrain routes.
 */

const BASE_URL = "https://maps.googleapis.com/maps/api/directions/json";

/**
 * Fetches train transit data from Google Directions API
 * 
 * @param {string} origin - Starting train stop
 * @param {string} destination - Destination train stop (always San Francisco)
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - API response data
 */
export const fetchTrainRoute = async (origin, destination, apiKey) => {
  const params = {
    origin,
    destination: destination || "San Francisco Caltrain Station, CA",
    mode: "transit",
    transit_mode: "rail",
    departure_time: "now",
    alternatives: true,
    key: apiKey,
  };

  try {
    const response = await axios.get(BASE_URL, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching train route:", error);
    throw error;
  }
};

/**
 * Processes train transit response and returns formatted stop data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @param {Object} response - API response data
 * @returns {Object} - Formatted stop data
 */
export const processTrainResponse = (stopConfig, response) => {
  if (
    !response ||
    response.status !== "OK" ||
    !response.routes ||
    response.routes.length === 0
  ) {
    console.log(
      `✗ No stop times found for ${stopConfig.name} (train) - ${response?.status || "No response"}`
    );
    return {
      name: stopConfig.name,
      type: "train",
      origin: stopConfig.origin,
      destination: stopConfig.destination,
      routeFilter: stopConfig.routeFilter || "Caltrain",
      transitMode: "rail",
      allArrivalTimes: [],
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }

  // Extract all arrival times from all routes, filtering by Caltrain
  const allArrivalTimes = [];

  response.routes.forEach((route) => {
    route.legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        if (step.travel_mode === "TRANSIT" && step.transit_details) {
          const transitDetails = step.transit_details;

          // Filter by Caltrain
          const lineName =
            transitDetails.line?.short_name ||
            transitDetails.line?.name ||
            "";
          const matchesRoute =
            lineName.toLowerCase().includes("caltrain") ||
            transitDetails.line?.agencies?.[0]?.name
              ?.toLowerCase()
              .includes("caltrain");

          if (matchesRoute && transitDetails.arrival_time) {
            // Check if we have real-time data
            const isRealTime =
              transitDetails.arrival_time.value !== undefined;

            if (isRealTime || transitDetails.arrival_time.text) {
              const arrivalTime = convertToCentralTime(
                transitDetails.arrival_time
              );
              const departureTime = convertToCentralTime(
                transitDetails.departure_time
              );

              if (arrivalTime) {
                allArrivalTimes.push({
                  stopName:
                    transitDetails.arrival_stop?.name || stopConfig.name,
                  arrivalTime: arrivalTime,
                  departureTime: departureTime,
                  headsign: transitDetails.headsign || "Unknown",
                  lineName: lineName,
                  isRealTime: isRealTime,
                });
              }
            }
          }
        }
      });
    });
  });

  // Sort all arrival times by time, prioritizing real-time data
  allArrivalTimes.sort((a, b) => {
    if (a.isRealTime && !b.isRealTime) return -1;
    if (!a.isRealTime && b.isRealTime) return 1;
    return a.arrivalTime - b.arrivalTime;
  });

  // Log if we found stop times
  if (allArrivalTimes.length > 0) {
    console.log(
      `✓ Stop times found for ${stopConfig.name} (train): ${allArrivalTimes.length} times`
    );
  } else {
    console.log(
      `✗ No stop times found for ${stopConfig.name} (train) - No matching routes`
    );
  }

  // Find next arrival time using utility
  const now = new Date();
  const nextArrival = findNextArrival(allArrivalTimes, now);

  // Determine last stop time using utility
  const lastStopTime = calculateLastStopTime(
    allArrivalTimes,
    nextArrival,
    now
  );

  // Calculate if next arrival is within 2 stops using utility
  const isWithinTwoStops = calculateIsWithinTwoStops(
    nextArrival,
    lastStopTime,
    allArrivalTimes
  );

  return {
    name: stopConfig.name,
    type: "train",
    origin: stopConfig.origin,
    destination: stopConfig.destination || "San Francisco Caltrain Station, CA",
    routeFilter: stopConfig.routeFilter || "Caltrain",
    transitMode: "rail",
    allArrivalTimes: allArrivalTimes,
    nextArrivalTime: nextArrival?.arrivalTime || null,
    lastStopTime: lastStopTime,
    isWithinTwoStops: isWithinTwoStops,
  };
};

/**
 * Fetches and processes train transit data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - Formatted stop data
 */
export const getTrainStopData = async (stopConfig, apiKey) => {
  try {
    // Try to load from saved file first
    if (stopConfig.dataFile) {
      const filePath = `${process.env.PUBLIC_URL || ""}${stopConfig.dataFile}`;
      const data = await loadSavedData(filePath);
      if (data && hasMatchingTrainRoute(data)) {
        console.log(`✓ Loaded saved data for ${stopConfig.name} (train)`);
        return processTrainResponse(stopConfig, data);
      }
    }

    // If file doesn't exist or failed to load, make API call
    const response = await fetchTrainRoute(
      stopConfig.origin,
      stopConfig.destination,
      apiKey
    );

    if (response && response.status === "OK") {
      console.log(
        `✓ Request successful for ${stopConfig.name} (train)`
      );
    } else {
      console.log(
        `✗ Request unsuccessful for ${stopConfig.name} (train): ${response?.status || "Unknown error"}`
      );
    }

    return processTrainResponse(stopConfig, response);
  } catch (error) {
    console.error(`Error fetching train data for ${stopConfig.name}:`, error);
    return {
      name: stopConfig.name,
      type: "train",
      origin: stopConfig.origin,
      destination: stopConfig.destination || "San Francisco Caltrain Station, CA",
      routeFilter: stopConfig.routeFilter || "Caltrain",
      transitMode: "rail",
      allArrivalTimes: [],
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }
};

// Export Caltrain stops list for use in dropdowns
export { CALTRAIN_STOPS };

