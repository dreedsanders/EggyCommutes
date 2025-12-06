import api from "../config/api";

/**
 * Stop Service
 *
 * Handles API calls for stops CRUD operations.
 */

// Simple flag to prevent multiple simultaneous calls - reuse the same promise
let fetchTransitDataPromise = null;

/**
 * Fetch all visible stops for the current user
 * @returns {Promise<Array>} - Array of stop objects
 */
export const fetchUserStops = async () => {
  try {
    const response = await api.get("/api/v1/stops");
    return response.data;
  } catch (error) {
    // Backend endpoint might not be available in development
    if (error.response?.status === 404) {
      console.warn(
        "Backend stops endpoint not available (404). Continuing without user stops."
      );
      return []; // Return empty array instead of throwing
    }
    console.error("Error fetching user stops:", error);
    // Still return empty array so app continues to work
    return [];
  }
};

/**
 * Create a new stop
 * @param {Object} stopData - Stop data object
 * @returns {Promise<Object>} - Created stop object
 */
export const createStop = async (stopData) => {
  try {
    const response = await api.post("/api/v1/stops", {
      stop: stopData,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating stop:", error);
    throw error;
  }
};

/**
 * Update an existing stop
 * @param {number} id - Stop ID
 * @param {Object} stopData - Updated stop data
 * @returns {Promise<Object>} - Updated stop object
 */
export const updateStop = async (id, stopData) => {
  try {
    const response = await api.patch(`/api/v1/stops/${id}`, {
      stop: stopData,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating stop:", error);
    throw error;
  }
};

/**
 * Hide a stop (soft delete)
 * @param {number} id - Stop ID
 * @returns {Promise<Object>} - Response message
 */
export const hideStop = async (id) => {
  try {
    const response = await api.patch(`/api/v1/stops/${id}/hide`);
    return response.data;
  } catch (error) {
    console.error("Error hiding stop:", error);
    throw error;
  }
};

/**
 * Reorder a stop by updating its position
 * @param {number} id - Stop ID
 * @param {number} position - New position
 * @returns {Promise<Object>} - Updated stop object
 */
export const reorderStop = async (id, position) => {
  try {
    const response = await api.patch(`/api/v1/stops/${id}/reorder`, {
      position: position,
    });
    return response.data;
  } catch (error) {
    console.error("Error reordering stop:", error);
    throw error;
  }
};

/**
 * Fetch transit data by triggering the fetch-transit-data.js script
 * @returns {Promise<Object>} - Response with status message
 */
export const fetchTransitData = async () => {
  // If a request is already in progress, return the same promise
  if (fetchTransitDataPromise) {
    console.log("fetchTransitData already in progress, reusing existing request");
    return fetchTransitDataPromise;
  }

  // Create new request promise
  fetchTransitDataPromise = (async () => {
    try {
      const response = await api.post("/api/v1/transit_data/fetch");
      return response.data;
    } catch (error) {
      // Backend endpoint might not be available in development
      // This is okay - the app can still function with live API calls
      if (error.response?.status === 404) {
        console.warn(
          "Backend transit data fetch endpoint not available (404). Continuing with live API calls."
        );
        return { message: "Backend endpoint not available", skipped: true };
      }
      console.error("Error fetching transit data:", error);
      throw error;
    } finally {
      // Clear the promise when done so future calls can make new requests
      fetchTransitDataPromise = null;
    }
  })();

  return fetchTransitDataPromise;
};

