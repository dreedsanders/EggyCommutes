import axios from "axios";

/**
 * convertToCentralTime Function
 *
 * Converts API time responses to Central Time Zone.
 * Handles various time formats from the Google Directions API.
 *
 * @param {Object} timeValue - Time value from API (can be time object or timestamp)
 * @returns {Date|null} - Date object in Central Time Zone, or null if invalid
 */
export const convertToCentralTime = (timeValue) => {
  if (!timeValue) return null;

  // If timeValue has a value property (Google API time object)
  if (timeValue.value) {
    // Convert Unix timestamp to Date, then convert to Central Time
    const date = new Date(timeValue.value * 1000);
    return date;
  }

  // If it's already a Date object
  if (timeValue instanceof Date) {
    return timeValue;
  }

  // If it's a timestamp string
  if (typeof timeValue === "string") {
    return new Date(timeValue);
  }

  return null;
};

/**
 * getDestinationName Function
 *
 * Uses Google Places API Text Search to determine the appropriate name for a destination.
 * Returns business name for businesses, address for residential, cross streets for intersections.
 *
 * @param {string} destination - The destination address or query
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string>} - The appropriate name for the destination
 */
export const getDestinationName = async (destination, apiKey) => {
  try {
    // Use Places API Text Search endpoint
    const placesUrl =
      "https://maps.googleapis.com/maps/api/place/textsearch/json";

    const placesResponse = await axios.get(placesUrl, {
      params: {
        query: destination,
        key: apiKey,
      },
    });

    if (
      placesResponse.data &&
      placesResponse.data.status === "OK" &&
      placesResponse.data.results &&
      placesResponse.data.results.length > 0
    ) {
      const place = placesResponse.data.results[0];
      const types = place.types || [];

      // Check if it's a business/establishment
      if (
        types.includes("establishment") ||
        types.includes("point_of_interest") ||
        types.includes("store") ||
        types.includes("restaurant") ||
        types.includes("gas_station") ||
        types.includes("lodging") ||
        types.includes("gym") ||
        types.includes("supermarket")
      ) {
        // Use business name
        return place.name || place.formatted_address || destination;
      }

      // Check if it's an intersection
      if (types.includes("intersection")) {
        // Extract route names from address components
        const routes = place.address_components
          ?.filter((comp) => comp.types?.includes("route"))
          .map((comp) => comp.long_name || comp.short_name)
          .join(" & ");
        return routes || place.formatted_address || destination;
      }

      // For residential addresses, use formatted address
      if (types.includes("street_address") || types.includes("premise")) {
        return place.formatted_address || destination;
      }

      // Default: use place name or formatted address
      return place.name || place.formatted_address || destination;
    }

    // Fallback: try Geocoding API if Places API doesn't return results
    const geocodeUrl = "https://maps.googleapis.com/maps/api/geocode/json";
    const geocodeResponse = await axios.get(geocodeUrl, {
      params: {
        address: destination,
        key: apiKey,
      },
    });

    if (
      geocodeResponse.data &&
      geocodeResponse.data.status === "OK" &&
      geocodeResponse.data.results &&
      geocodeResponse.data.results.length > 0
    ) {
      const result = geocodeResponse.data.results[0];
      const types = result.types || [];

      // Check for intersection
      if (types.includes("intersection")) {
        const routes = result.address_components
          ?.filter((comp) => comp.types?.includes("route"))
          .map((comp) => comp.long_name || comp.short_name)
          .join(" & ");
        return routes || result.formatted_address || destination;
      }

      // For street addresses, use formatted address
      return result.formatted_address || destination;
    }

    // If all else fails, return original destination
    return destination;
  } catch (error) {
    console.error("Error getting destination name:", error);
    // Return original destination on error
    return destination;
  }
};

/**
 * parseApiError Function
 *
 * Parses API error responses and returns user-friendly error messages.
 *
 * @param {Object} error - Error object from API call
 * @returns {string} - User-friendly error message
 */
export const parseApiError = (error) => {
  if (error.response?.data?.error_message) {
    return error.response.data.error_message;
  }

  if (error.response?.data?.status) {
    const status = error.response.data.status;
    if (status === "ZERO_RESULTS") {
      return "Can not route to destination";
    } else if (status === "NOT_FOUND") {
      return "Address does not exist";
    } else if (status === "INVALID_REQUEST") {
      return "Invalid request - please check your inputs";
    }
    return status;
  }

  if (error.message) {
    return error.message;
  }

  return "An error occurred";
};

/**
 * createNextDate Function
 *
 * Creates a Date object for the next occurrence of a given hour and minute.
 *
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @param {string} timeZone - Time zone (default: "America/Los_Angeles")
 * @returns {Date} - Date object for the next occurrence
 */
export const createNextDate = (hour, minute, timeZone = "America/Los_Angeles") => {
  const now = new Date();
  const targetDate = new Date();

  // Set the target time in the specified timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Get current time in target timezone
  const parts = formatter.formatToParts(now);
  const currentHour = parseInt(parts.find((p) => p.type === "hour").value);
  const currentMinute = parseInt(parts.find((p) => p.type === "minute").value);

  // Set target time
  targetDate.setUTCHours(hour, minute, 0, 0);

  // If the time has already passed today, set for tomorrow
  if (hour < currentHour || (hour === currentHour && minute <= currentMinute)) {
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
  }

  return targetDate;
};

/**
 * getTimeInMinutes Function
 *
 * Converts hours and minutes to total minutes.
 *
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @returns {number} - Total minutes
 */
export const getTimeInMinutes = (hour, minute) => {
  return hour * 60 + minute;
};

