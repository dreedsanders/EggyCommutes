import axios from "axios";

/**
 * Geocoding Service
 *
 * Handles Google Maps Geocoding API calls to get destination names from addresses.
 */

const GEOCODING_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

/**
 * Get destination name from address using Google Maps Geocoding API
 *
 * @param {string} address - The destination address
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string|null>} - Formatted place name if available, null otherwise
 */
export const getDestinationName = async (address, apiKey) => {
  if (!address || !apiKey) {
    return null;
  }

  try {
    const response = await axios.get(GEOCODING_BASE_URL, {
      params: {
        address: address,
        key: apiKey,
      },
    });

    if (
      response.data &&
      response.data.status === "OK" &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      const result = response.data.results[0];
      
      // Try to get a meaningful name from the result
      // Prefer formatted_address or use the first address component
      const name = result.formatted_address || result.address_components?.[0]?.long_name || address;
      
      return name;
    }

    return null;
  } catch (error) {
    console.error("Error getting destination name from Geocoding API:", error);
    return null;
  }
};

