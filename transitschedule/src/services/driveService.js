import axios from "axios";

/**
 * Drive Service
 * 
 * Handles driving route API calls and processing for driving transit mode.
 */

const BASE_URL = "https://maps.googleapis.com/maps/api/directions/json";

/**
 * Fetches driving route data from Google Directions API
 * 
 * @param {string} origin - Starting location
 * @param {string} destination - Destination location
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - API response data
 */
export const fetchDriveRoute = async (origin, destination, apiKey) => {
  const params = {
    origin,
    destination,
    mode: "driving",
    key: apiKey,
  };

  try {
    const response = await axios.get(BASE_URL, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching drive route:", error);
    throw error;
  }
};

/**
 * Processes driving route response and returns formatted stop data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @param {Object} response - API response data
 * @returns {Object} - Formatted stop data
 */
export const processDriveResponse = (stopConfig, response) => {
  if (
    !response ||
    response.status !== "OK" ||
    !response.routes ||
    response.routes.length === 0
  ) {
    console.log(
      `✗ Request unsuccessful for ${stopConfig.name} (drive) - ${response?.status || "No response"}`
    );
    return {
      name: stopConfig.name,
      type: "drive",
      origin: stopConfig.origin,
      destination: stopConfig.destination,
      mode: "driving",
      allArrivalTimes: [],
      estimatedTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }

  // Get the first route's duration for driving
  const route = response.routes[0];
  const leg = route.legs[0];
  const durationInSeconds = leg.duration.value; // Duration in seconds
  const durationInMinutes = Math.round(durationInSeconds / 60);

  // Create a time string for display (e.g., "15 min")
  const estimatedTime = `${durationInMinutes} min`;

  console.log(
    `✓ Stop times found for ${stopConfig.name} (drive): ${estimatedTime}`
  );

  return {
    name: stopConfig.name,
    type: "drive",
    origin: stopConfig.origin,
    destination: stopConfig.destination,
    mode: "driving",
    allArrivalTimes: [],
    estimatedTime: estimatedTime,
    nextArrivalTime: null,
    lastStopTime: null,
    isWithinTwoStops: false,
  };
};

/**
 * Fetches and processes driving route data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - Formatted stop data
 */
export const getDriveStopData = async (stopConfig, apiKey) => {
  try {
    // Try to load from saved file first
    if (stopConfig.dataFile) {
      try {
        const filePath = `${process.env.PUBLIC_URL || ""}${stopConfig.dataFile}`;
        const response = await fetch(filePath);
        if (response.ok) {
          const data = await response.json();
          console.log(
            `✓ Loaded saved data for ${stopConfig.name} (drive)`
          );
          return processDriveResponse(stopConfig, data);
        }
      } catch (error) {
        console.log(
          `✗ Error loading saved file for ${stopConfig.name}, will fetch from API:`,
          error.message
        );
      }
    }

    // If file doesn't exist or failed to load, make API call
    const response = await fetchDriveRoute(
      stopConfig.origin,
      stopConfig.destination,
      apiKey
    );

    if (response && response.status === "OK") {
      console.log(
        `✓ Request successful for ${stopConfig.name} (drive)`
      );
    } else {
      console.log(
        `✗ Request unsuccessful for ${stopConfig.name} (drive): ${response?.status || "Unknown error"}`
      );
    }

    return processDriveResponse(stopConfig, response);
  } catch (error) {
    console.error(`Error fetching drive data for ${stopConfig.name}:`, error);
    return {
      name: stopConfig.name,
      type: "drive",
      origin: stopConfig.origin,
      destination: stopConfig.destination,
      mode: "driving",
      allArrivalTimes: [],
      estimatedTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    };
  }
};

