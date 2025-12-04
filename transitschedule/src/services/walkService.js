import axios from "axios";

/**
 * Walk Service
 * 
 * Handles walking route API calls and processing for walking transit mode.
 */

const BASE_URL = "https://maps.googleapis.com/maps/api/directions/json";

/**
 * Fetches walking route data from Google Directions API
 * 
 * @param {string} origin - Starting location
 * @param {string} destination - Destination location
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - API response data
 */
export const fetchWalkRoute = async (origin, destination, apiKey) => {
  const params = {
    origin,
    destination,
    mode: "walking",
    key: apiKey,
  };

  try {
    const response = await axios.get(BASE_URL, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching walk route:", error);
    throw error;
  }
};

/**
 * Processes walking route response and returns formatted stop data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @param {Object} response - API response data
 * @returns {Object} - Formatted stop data
 */
export const processWalkResponse = (stopConfig, response) => {
  if (
    !response ||
    response.status !== "OK" ||
    !response.routes ||
    response.routes.length === 0
  ) {
    console.log(
      `✗ Request unsuccessful for ${stopConfig.name} (walk) - ${response?.status || "No response"}`
    );
    return {
      name: stopConfig.name,
      type: "walk",
      origin: stopConfig.origin,
      destination: stopConfig.destination,
      mode: "walking",
      allArrivalTimes: [],
      estimatedTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }

  // Get the first route's duration for walking
  const route = response.routes[0];
  const leg = route.legs[0];
  const durationInSeconds = leg.duration.value; // Duration in seconds
  const durationInMinutes = Math.round(durationInSeconds / 60);

  // Create a time string for display (e.g., "15 min")
  const estimatedTime = `${durationInMinutes} min`;

  console.log(
    `✓ Stop times found for ${stopConfig.name} (walk): ${estimatedTime}`
  );

  return {
    name: stopConfig.name,
    type: "walk",
    origin: stopConfig.origin,
    destination: stopConfig.destination,
    mode: "walking",
    allArrivalTimes: [],
    estimatedTime: estimatedTime,
    nextArrivalTime: null,
    lastStopTime: null,
    isWithinTwoStops: false,
  };
};

/**
 * Fetches and processes walking route data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - Formatted stop data
 */
export const getWalkStopData = async (stopConfig, apiKey) => {
  try {
    // Try to load from saved file first
    if (stopConfig.dataFile) {
      try {
        const filePath = `${process.env.PUBLIC_URL || ""}${stopConfig.dataFile}`;
        const response = await fetch(filePath);
        if (response.ok) {
          const data = await response.json();
          console.log(
            `✓ Loaded saved data for ${stopConfig.name} (walk)`
          );
          return processWalkResponse(stopConfig, data);
        }
      } catch (error) {
        console.log(
          `✗ Error loading saved file for ${stopConfig.name}, will fetch from API:`,
          error.message
        );
      }
    }

    // If file doesn't exist or failed to load, make API call
    const response = await fetchWalkRoute(
      stopConfig.origin,
      stopConfig.destination,
      apiKey
    );

    if (response && response.status === "OK") {
      console.log(
        `✓ Request successful for ${stopConfig.name} (walk)`
      );
    } else {
      console.log(
        `✗ Request unsuccessful for ${stopConfig.name} (walk): ${response?.status || "Unknown error"}`
      );
    }

    return processWalkResponse(stopConfig, response);
  } catch (error) {
    console.error(`Error fetching walk data for ${stopConfig.name}:`, error);
    return {
      name: stopConfig.name,
      type: "walk",
      origin: stopConfig.origin,
      destination: stopConfig.destination,
      mode: "walking",
      allArrivalTimes: [],
      estimatedTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }
};

