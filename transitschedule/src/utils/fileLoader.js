/**
 * File Loader Utilities
 *
 * Common utilities for loading saved transit data files
 */

/**
 * Load saved data from a file path
 *
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object|null>} - Parsed JSON data or null if failed
 */
export const loadSavedData = async (filePath) => {
  try {
    const response = await fetch(filePath);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(`Error loading saved file: ${error.message}`);
  }
  return null;
};

/**
 * Check if data contains a matching route
 *
 * @param {Object} data - API response data
 * @param {string} routeFilter - Route name to match (e.g., "801", "Caltrain")
 * @returns {boolean} - True if data contains matching route
 */
export const hasMatchingRoute = (data, routeFilter) => {
  if (!data.routes || data.routes.length === 0) {
    return false;
  }

  for (const route of data.routes) {
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        if (step.travel_mode === "TRANSIT" && step.transit_details) {
          const lineName =
            step.transit_details.line?.short_name ||
            step.transit_details.line?.name ||
            "";
          if (lineName === routeFilter) {
            return true;
          }
        }
      }
    }
  }

  return false;
};

/**
 * Check if data contains a matching train route (Caltrain)
 *
 * @param {Object} data - API response data
 * @returns {boolean} - True if data contains Caltrain route
 */
export const hasMatchingTrainRoute = (data) => {
  if (!data.routes || data.routes.length === 0) {
    return false;
  }

  for (const route of data.routes) {
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        if (step.travel_mode === "TRANSIT" && step.transit_details) {
          const transitDetails = step.transit_details;
          const lineName =
            transitDetails.line?.short_name ||
            transitDetails.line?.name ||
            "";
          const matchesRoute =
            lineName.toLowerCase().includes("caltrain") ||
            transitDetails.line?.agencies?.[0]?.name
              ?.toLowerCase()
              .includes("caltrain");
          if (matchesRoute) {
            return true;
          }
        }
      }
    }
  }

  return false;
};

