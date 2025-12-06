import axios from "axios";
import api from "../config/api";
import { convertToCentralTime } from "../utils/helpers";
import { CAP_METRO_STOPS } from "../utils/constants";
import {
  findNextArrival,
  calculateLastStopTime,
  calculateIsWithinTwoStops,
} from "../utils/timeCalculations";
import { loadSavedData, hasMatchingRoute } from "../utils/fileLoader";

/**
 * Bus Service
 *
 * Handles bus transit API calls and processing for Cap Metro bus routes.
 */

const BASE_URL = "https://maps.googleapis.com/maps/api/directions/json";

/**
 * Fetches bus transit data from Google Directions API via backend proxy
 * This avoids CORS issues and ensures live data is always fetched
 *
 * @param {string} origin - Starting bus stop
 * @param {string} destination - Destination bus stop (always Downtown Station)
 * @param {string} apiKey - Google Maps API key (for fallback direct call)
 * @returns {Promise<Object>} - API response data
 */
export const fetchBusRoute = async (origin, destination, apiKey) => {
  // First try backend proxy (avoids CORS issues)
  try {
    const proxyResponse = await api.get("/api/v1/transit_data/live_transit", {
      params: {
        origin,
        destination: destination || "Downtown Station, Austin, TX",
        transit_mode: "bus",
      },
    });
    console.log("✓ Live transit data fetched via backend proxy");
    return proxyResponse.data;
  } catch (proxyError) {
    console.warn(
      "Backend proxy failed, trying direct API call:",
      proxyError.message
    );

    // Fallback to direct API call if proxy fails
    const params = {
      origin,
      destination: destination || "Downtown Station, Austin, TX",
      mode: "transit",
      transit_mode: "bus",
      departure_time: "now",
      alternatives: true,
      key: apiKey,
    };

    try {
      const response = await axios.get(BASE_URL, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching bus route:", error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", error.message);
      }
      throw error;
    }
  }
};

/**
 * Processes bus transit response and returns formatted stop data
 *
 * @param {Object} stopConfig - Stop configuration object
 * @param {Object} response - API response data
 * @returns {Object} - Formatted stop data
 */
export const processBusResponse = (stopConfig, response) => {
  if (
    !response ||
    response.status !== "OK" ||
    !response.routes ||
    response.routes.length === 0
  ) {
    console.log(
      `✗ No stop times found for ${stopConfig.name} (bus) - ${
        response?.status || "No response"
      }`
    );
    return {
      name: stopConfig.name,
      type: "bus",
      origin: stopConfig.origin,
      destination: stopConfig.destination,
      routeFilter: stopConfig.routeFilter || "801",
      transitMode: "bus",
      allArrivalTimes: [],
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }

  // Extract all arrival times from all routes, filtering by route 801
  const allArrivalTimes = [];
  const routeFilter = stopConfig.routeFilter || "801";

  response.routes.forEach((route) => {
    route.legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        if (step.travel_mode === "TRANSIT" && step.transit_details) {
          const transitDetails = step.transit_details;

          // Filter by route (801 for bus)
          const lineName =
            transitDetails.line?.short_name || transitDetails.line?.name || "";
          const matchesRoute = lineName === routeFilter;

          if (matchesRoute && transitDetails.departure_time) {
            // Check if we have real-time data
            const isRealTime =
              transitDetails.departure_time.value !== undefined;

            if (isRealTime || transitDetails.departure_time.text) {
              // For bus stops, use departure_time (when bus leaves your stop)
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
      `✓ Stop times found for ${stopConfig.name} (bus): ${allArrivalTimes.length} times`
    );
  } else {
    console.log(
      `✗ No stop times found for ${stopConfig.name} (bus) - No matching routes`
    );
  }

  // Find next arrival time using utility
  const now = new Date();
  const nextArrival = findNextArrival(allArrivalTimes, now);

  // Determine last stop time using utility
  const lastStopTime = calculateLastStopTime(allArrivalTimes, nextArrival, now);

  // Calculate if next arrival is within 2 stops using utility
  const isWithinTwoStops = calculateIsWithinTwoStops(
    nextArrival,
    lastStopTime,
    allArrivalTimes
  );

  return {
    name: stopConfig.name,
    type: "bus",
    origin: stopConfig.origin,
    destination: stopConfig.destination || "Downtown Station, Austin, TX",
    routeFilter: routeFilter,
    transitMode: "bus",
    allArrivalTimes: allArrivalTimes,
    nextArrivalTime: nextArrival?.arrivalTime || null,
    lastStopTime: lastStopTime,
    isWithinTwoStops: isWithinTwoStops,
  };
};

/**
 * Fetches and processes bus transit data
 *
 * @param {Object} stopConfig - Stop configuration object
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - Formatted stop data
 */
export const getBusStopData = async (stopConfig, apiKey) => {
  try {
    // Always try API call first to get current/real-time data
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      console.warn(
        `⚠ No API key configured for ${stopConfig.name} (bus) - cannot fetch live data`
      );
      // Fallback to saved data if no API key
      if (stopConfig.dataFile) {
        const filePath = `${process.env.PUBLIC_URL || ""}${
          stopConfig.dataFile
        }`;
        const savedData = await loadSavedData(filePath);
        if (savedData) {
          console.log(
            `⚠ Using saved data for ${stopConfig.name} (no API key available)`
          );
          return processBusResponse(stopConfig, savedData);
        }
      }
      return {
        name: stopConfig.name,
        type: "bus",
        origin: stopConfig.origin,
        destination: stopConfig.destination || "Downtown Station, Austin, TX",
        routeFilter: stopConfig.routeFilter || "801",
        transitMode: "bus",
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      };
    }

    // Try live API call first
    try {
      const response = await fetchBusRoute(
        stopConfig.origin,
        stopConfig.destination,
        apiKey
      );

      if (response && response.status === "OK") {
        console.log(
          `✓ Request successful for ${stopConfig.name} (bus) - using live data`
        );
        return processBusResponse(stopConfig, response);
      } else {
        console.warn(
          `⚠ API call failed for ${stopConfig.name} (bus): ${
            response?.status || "Unknown error"
          }, falling back to saved data`
        );
      }
    } catch (networkError) {
      console.warn(
        `⚠ Network error fetching live data for ${stopConfig.name} (bus), attempting to use saved data as fallback:`,
        networkError.message
      );
    }

    // Fallback to saved data only if API call fails
    if (stopConfig.dataFile) {
      const filePath = `${process.env.PUBLIC_URL || ""}${stopConfig.dataFile}`;
      const savedData = await loadSavedData(filePath);
      if (savedData) {
        const routeFilter = stopConfig.routeFilter || "801";
        if (hasMatchingRoute(savedData, routeFilter)) {
          console.log(
            `⚠ Using saved data for ${stopConfig.name} (API call failed)`
          );
          return processBusResponse(stopConfig, savedData);
        } else {
          console.log(
            `✗ Saved data for ${stopConfig.name} doesn't contain route ${routeFilter}`
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching bus data for ${stopConfig.name}:`, error);
    return {
      name: stopConfig.name,
      type: "bus",
      origin: stopConfig.origin,
      destination: stopConfig.destination || "Downtown Station, Austin, TX",
      routeFilter: stopConfig.routeFilter || "801",
      transitMode: "bus",
      allArrivalTimes: [],
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }
};

// Export Cap Metro stops list for use in dropdowns
export { CAP_METRO_STOPS };
