import axios from "axios";
import api from "../config/api";
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
 * Fetches train transit data from Google Directions API via backend proxy
 * This avoids CORS issues and ensures live data is always fetched
 * 
 * @param {string} origin - Starting train stop
 * @param {string} destination - Destination train stop (always San Francisco)
 * @param {string} apiKey - Google Maps API key (for fallback direct call)
 * @returns {Promise<Object>} - API response data
 */
export const fetchTrainRoute = async (origin, destination, apiKey) => {
  // First try backend proxy (avoids CORS issues)
  try {
    const proxyResponse = await api.get("/api/v1/transit_data/live_transit", {
      params: {
        origin,
        destination: destination || "San Francisco Caltrain Station, CA",
        transit_mode: "rail",
      },
    });
    console.log("✓ Live train data fetched via backend proxy");
    return proxyResponse.data;
  } catch (proxyError) {
    console.warn("Backend proxy failed, trying direct API call:", proxyError.message);
    
    // Fallback to direct API call if proxy fails
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

          if (matchesRoute && transitDetails.departure_time) {
            // Check if we have real-time data
            const isRealTime =
              transitDetails.departure_time.value !== undefined;

            if (isRealTime || transitDetails.departure_time.text) {
              // For train stops, use departure_time (when train leaves your stop)
              // not arrival_time (when it arrives at the next stop)
              const departureTime = convertToCentralTime(
                transitDetails.departure_time
              );
              const arrivalTime = convertToCentralTime(
                transitDetails.arrival_time
              );

              if (departureTime) {
                allArrivalTimes.push({
                  stopName:
                    transitDetails.departure_stop?.name || stopConfig.name,
                  arrivalTime: departureTime, // Using departure as the primary time
                  departureTime: departureTime,
                  arrivalAtNextStop: arrivalTime,
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
    walkTime: stopConfig.walkTime || null,
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
    // Always try API call first to get current/real-time data
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      console.warn(
        `⚠ No API key configured for ${stopConfig.name} (train) - cannot fetch live data`
      );
      // Fallback to saved data if no API key
      if (stopConfig.dataFile) {
        const filePath = `${process.env.PUBLIC_URL || ""}${stopConfig.dataFile}`;
        const savedData = await loadSavedData(filePath);
        if (savedData && hasMatchingTrainRoute(savedData)) {
          console.log(
            `⚠ Using saved data for ${stopConfig.name} (no API key available)`
          );
          return processTrainResponse(stopConfig, savedData);
        }
      }
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
        walkTime: stopConfig.walkTime || null,
      };
    }

    // Try live API call first
    try {
      const response = await fetchTrainRoute(
        stopConfig.origin,
        stopConfig.destination,
        apiKey
      );

      if (response && response.status === "OK") {
        console.log(
          `✓ Request successful for ${stopConfig.name} (train) - using live data`
        );
        return processTrainResponse(stopConfig, response);
      } else {
        console.warn(
          `⚠ API call failed for ${stopConfig.name} (train): ${response?.status || "Unknown error"}, falling back to saved data`
        );
      }
    } catch (networkError) {
      console.warn(
        `⚠ Network error fetching live data for ${stopConfig.name} (train), attempting to use saved data as fallback:`,
        networkError.message
      );
    }

    // Fallback to saved data only if API call fails
    if (stopConfig.dataFile) {
      const filePath = `${process.env.PUBLIC_URL || ""}${stopConfig.dataFile}`;
      const savedData = await loadSavedData(filePath);
      if (savedData && hasMatchingTrainRoute(savedData)) {
        console.log(
          `⚠ Using saved data for ${stopConfig.name} (API call failed)`
        );
        return processTrainResponse(stopConfig, savedData);
      }
    }

    // If we get here, both API and saved data failed
    console.error(
      `✗ Failed to fetch data for ${stopConfig.name} (train) from both API and saved files`
    );
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
      walkTime: stopConfig.walkTime || null,
    };
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
      walkTime: stopConfig.walkTime || null,
    };
  }
};

// Export Caltrain stops list for use in dropdowns
export { CALTRAIN_STOPS };

