import axios from "axios";
import api from "../config/api";

/**
 * Bike Service
 * 
 * Handles bike route API calls and processing for bicycle transit mode.
 */

const BASE_URL = "https://maps.googleapis.com/maps/api/directions/json";

/**
 * Fetches bike route data from Google Directions API via backend proxy
 * This avoids CORS issues and ensures live data is always fetched
 * 
 * @param {string} origin - Starting location
 * @param {string} destination - Destination location
 * @param {string} apiKey - Google Maps API key (for fallback direct call)
 * @returns {Promise<Object>} - API response data
 */
export const fetchBikeRoute = async (origin, destination, apiKey) => {
  // First try backend proxy (avoids CORS issues)
  try {
    const proxyResponse = await api.get("/api/v1/transit_data/live_transit", {
      params: {
        origin,
        destination,
        mode: "bicycling",
      },
    });
    console.log("✓ Live bike data fetched via backend proxy");
    return proxyResponse.data;
  } catch (proxyError) {
    console.warn(
      "Backend proxy failed, trying direct API call:",
      proxyError.message
    );

    // Fallback to direct API call if proxy fails
    const params = {
      origin,
      destination,
      mode: "bicycling",
      key: apiKey,
    };

    try {
      const response = await axios.get(BASE_URL, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching bike route:", error);
      throw error;
    }
  }
};

/**
 * Processes bike route response and returns formatted stop data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @param {Object} response - API response data
 * @returns {Object} - Formatted stop data
 */
export const processBikeResponse = (stopConfig, response) => {
  if (
    !response ||
    response.status !== "OK" ||
    !response.routes ||
    response.routes.length === 0
  ) {
    console.log(
      `✗ Request unsuccessful for ${stopConfig.name} (bike) - ${response?.status || "No response"}`
    );
    return {
      name: stopConfig.name,
      type: "bike",
      origin: stopConfig.origin,
      destination: stopConfig.destination,
      mode: "bicycling",
      allArrivalTimes: [],
      estimatedTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }

  // Get the first route's duration for biking
  const route = response.routes[0];
  const leg = route.legs[0];
  const durationInSeconds = leg.duration.value; // Duration in seconds
  const durationInMinutes = Math.round(durationInSeconds / 60);

  // Create a time string for display (e.g., "15 min")
  const estimatedTime = `${durationInMinutes} min`;

  console.log(
    `✓ Stop times found for ${stopConfig.name} (bike): ${estimatedTime}`
  );

  return {
    name: stopConfig.name,
    type: "bike",
    origin: stopConfig.origin,
    destination: stopConfig.destination,
    mode: "bicycling",
    allArrivalTimes: [],
    estimatedTime: estimatedTime,
    nextArrivalTime: null,
    lastStopTime: null,
    isWithinTwoStops: false,
  };
};

/**
 * Fetches and processes bike route data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - Formatted stop data
 */
export const getBikeStopData = async (stopConfig, apiKey) => {
  try {
    // Try to load from saved file first
    if (stopConfig.dataFile) {
      try {
        const filePath = `${process.env.PUBLIC_URL || ""}${stopConfig.dataFile}`;
        const response = await fetch(filePath);
        if (response.ok) {
          const data = await response.json();
          console.log(
            `✓ Loaded saved data for ${stopConfig.name} (bike)`
          );
          return processBikeResponse(stopConfig, data);
        }
      } catch (error) {
        console.log(
          `✗ Error loading saved file for ${stopConfig.name}, will fetch from API:`,
          error.message
        );
      }
    }

    // If file doesn't exist or failed to load, make API call
    const response = await fetchBikeRoute(
      stopConfig.origin,
      stopConfig.destination,
      apiKey
    );

    if (response && response.status === "OK") {
      console.log(
        `✓ Request successful for ${stopConfig.name} (bike)`
      );
    } else {
      console.log(
        `✗ Request unsuccessful for ${stopConfig.name} (bike): ${response?.status || "Unknown error"}`
      );
    }

    return processBikeResponse(stopConfig, response);
  } catch (error) {
    console.error(`Error fetching bike data for ${stopConfig.name}:`, error);
    return {
      name: stopConfig.name,
      type: "bike",
      origin: stopConfig.origin,
      destination: stopConfig.destination,
      mode: "bicycling",
      allArrivalTimes: [],
      estimatedTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }
};

