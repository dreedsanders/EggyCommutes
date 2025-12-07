import axios from "axios";

/**
 * Stop Form Helpers
 *
 * Utility functions for finding closest stops, calculating walk times,
 * and formatting stop names using Google Maps APIs.
 */

/**
 * Find closest stop on a route to home address
 * Uses Google Directions API transit mode to find stops on a route, then finds closest to home
 *
 * @param {string} routeNumber - Route number (e.g., "801")
 * @param {string} homeAddress - Home address
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - Object with stop name and address
 */
export const findClosestStopOnRoute = async (routeNumber, homeAddress, apiKey) => {
  try {
    // Use Directions API with transit mode to find stops on the route
    // We'll use a general destination to get route information
    const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
    const params = {
      origin: homeAddress,
      destination: "Downtown Station, Austin, TX", // General destination for bus routes
      mode: "transit",
      transit_mode: "bus",
      departure_time: "now",
      alternatives: true,
      key: apiKey,
    };

    const response = await axios.get(baseUrl, { params });

    if (response.data && response.data.status === "OK" && response.data.routes) {
      const stops = [];
      
      // Extract all stops on the specified route
      response.data.routes.forEach((route) => {
        route.legs.forEach((leg) => {
          leg.steps.forEach((step) => {
            if (step.travel_mode === "TRANSIT" && step.transit_details) {
              const transitDetails = step.transit_details;
              const lineName = transitDetails.line?.short_name || transitDetails.line?.name || "";
              
              if (lineName === routeNumber) {
                const departureStop = transitDetails.departure_stop;
                if (departureStop) {
                  stops.push({
                    name: departureStop.name,
                    location: departureStop.location,
                    address: `${departureStop.name}, Austin, TX`,
                  });
                }
              }
            }
          });
        });
      });

      if (stops.length === 0) {
        throw new Error(`No stops found on route ${routeNumber}`);
      }

      // Use Distance Matrix API to find closest stop
      const distanceMatrixUrl = "https://maps.googleapis.com/maps/api/distancematrix/json";
      const origins = homeAddress;
      const destinations = stops.map(s => s.address).join("|");
      
      const distanceResponse = await axios.get(distanceMatrixUrl, {
        params: {
          origins: origins,
          destinations: destinations,
          mode: "walking",
          key: apiKey,
        },
      });

      if (distanceResponse.data && distanceResponse.data.status === "OK") {
        const elements = distanceResponse.data.rows[0]?.elements || [];
        let closestIndex = 0;
        let closestDistance = Infinity;

        elements.forEach((element, index) => {
          if (element.status === "OK" && element.distance) {
            const distance = element.distance.value; // distance in meters
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }
          }
        });

        return stops[closestIndex];
      }
    }

    throw new Error("Could not find closest stop on route");
  } catch (error) {
    console.error("Error finding closest stop on route:", error);
    throw error;
  }
};

/**
 * Find closest stop by name to home address
 * Searches for stops with that name and finds closest to home address
 *
 * @param {string} stopName - Stop name to search for
 * @param {string} homeAddress - Home address
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - Object with stop name and address
 */
export const findClosestStopByName = async (stopName, homeAddress, apiKey) => {
  try {
    // Use Places API Text Search to find stops with the name
    const placesUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
    const placesResponse = await axios.get(placesUrl, {
      params: {
        query: `${stopName} bus stop Austin TX`,
        key: apiKey,
      },
    });

    if (
      placesResponse.data &&
      placesResponse.data.status === "OK" &&
      placesResponse.data.results &&
      placesResponse.data.results.length > 0
    ) {
      const stops = placesResponse.data.results.map((place) => ({
        name: place.name,
        address: place.formatted_address,
        location: place.geometry?.location,
      }));

      // Use Distance Matrix API to find closest stop
      const distanceMatrixUrl = "https://maps.googleapis.com/maps/api/distancematrix/json";
      const origins = homeAddress;
      const destinations = stops.map(s => s.address).join("|");

      const distanceResponse = await axios.get(distanceMatrixUrl, {
        params: {
          origins: origins,
          destinations: destinations,
          mode: "walking",
          key: apiKey,
        },
      });

      if (distanceResponse.data && distanceResponse.data.status === "OK") {
        const elements = distanceResponse.data.rows[0]?.elements || [];
        let closestIndex = 0;
        let closestDistance = Infinity;

        elements.forEach((element, index) => {
          if (element.status === "OK" && element.distance) {
            const distance = element.distance.value;
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }
          }
        });

        return stops[closestIndex];
      }
    }

    // Fallback: if Places API doesn't find results, try using the stop name directly
    return {
      name: stopName,
      address: `${stopName}, Austin, TX`,
    };
  } catch (error) {
    console.error("Error finding closest stop by name:", error);
    // Fallback to using the stop name directly
    return {
      name: stopName,
      address: `${stopName}, Austin, TX`,
    };
  }
};

/**
 * Get place details using Place Details API
 *
 * @param {string} placeId - Place ID from geocoding or places API
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string|null>} - Business name if found, null otherwise
 */
const getPlaceDetails = async (placeId, apiKey) => {
  try {
    const placeDetailsUrl = "https://maps.googleapis.com/maps/api/place/details/json";
    const response = await axios.get(placeDetailsUrl, {
      params: {
        place_id: placeId,
        fields: "name,types,formatted_address",
        key: apiKey,
      },
    });

    if (
      response.data &&
      response.data.status === "OK" &&
      response.data.result
    ) {
      const place = response.data.result;
      const types = place.types || [];

      // If we have a name, check if it's a business/establishment
      if (place.name) {
        // Return name if it's a business type
        if (isBusinessType(types)) {
          return place.name;
        }
        // Also return name if it's different from formatted_address (likely a business name)
        // This catches cases where the business type might not be in our list
        if (place.formatted_address && place.name !== place.formatted_address) {
          // Only return if it's not just a partial address match
          const addressLower = place.formatted_address.toLowerCase();
          const nameLower = place.name.toLowerCase();
          // If name is not contained in formatted address, it's likely a business name
          if (!addressLower.includes(nameLower)) {
            return place.name;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting place details:", error);
    return null;
  }
};

/**
 * Search for nearby businesses using Places API Nearby Search
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string|null>} - Business name if found, null otherwise
 */
const searchNearbyPlaces = async (lat, lng, apiKey) => {
  try {
    const nearbyUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
    const response = await axios.get(nearbyUrl, {
      params: {
        location: `${lat},${lng}`,
        radius: 50, // Search within 50 meters
        key: apiKey,
      },
    });

    if (
      response.data &&
      response.data.status === "OK" &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      // Look for the first business in the results
      for (const place of response.data.results) {
        const types = place.types || [];
        if (isBusinessType(types)) {
          return place.name || null;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error searching nearby places:", error);
    return null;
  }
};

/**
 * Check if place types indicate a business/establishment
 *
 * @param {Array<string>} types - Array of place types
 * @returns {boolean} - True if it's a business type
 */
const isBusinessType = (types) => {
  const businessTypes = [
    "establishment",
    "point_of_interest",
    "store",
    "restaurant",
    "gas_station",
    "lodging",
    "gym",
    "supermarket",
    "food",
    "cafe",
    "bar",
    "bakery",
    "bank",
    "beauty_salon",
    "bicycle_store",
    "book_store",
    "clothing_store",
    "convenience_store",
    "department_store",
    "electronics_store",
    "furniture_store",
    "hardware_store",
    "home_goods_store",
    "jewelry_store",
    "laundry",
    "library",
    "liquor_store",
    "movie_theater",
    "museum",
    "night_club",
    "parking",
    "pet_store",
    "pharmacy",
    "post_office",
    "real_estate_agency",
    "shoe_store",
    "shopping_mall",
    "spa",
    "stadium",
    "store",
    "subway_station",
    "train_station",
    "travel_agency",
    "university",
    "veterinary_care",
    "zoo",
    "art_gallery",
    "car_dealer",
    "car_rental",
    "car_repair",
    "car_wash",
    "dentist",
    "doctor",
    "hospital",
    "physiotherapist",
    "accounting",
    "lawyer",
    "insurance_agency",
    "moving_company",
    "plumber",
    "roofing_contractor",
    "storage",
    "tourist_attraction",
  ];

  return types.some((type) => businessTypes.includes(type));
};

/**
 * Get place name from address using comprehensive lookup strategy
 * Uses geocoding, Place Details API, Nearby Search before falling back to street names
 *
 * @param {string} address - Address to get place name for
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string>} - Place name or formatted address
 */
export const getPlaceNameFromAddress = async (address, apiKey) => {
  try {
    // Step 1: Geocode the address to get coordinates and place_id
    const geocodeUrl = "https://maps.googleapis.com/maps/api/geocode/json";
    let geocodeResponse;
    try {
      geocodeResponse = await axios.get(geocodeUrl, {
        params: {
          address: address,
          key: apiKey,
        },
      });
    } catch (error) {
      console.error("Error geocoding address:", error);
      // Fall through to try other methods
    }

    if (
      geocodeResponse?.data &&
      geocodeResponse.data.status === "OK" &&
      geocodeResponse.data.results &&
      geocodeResponse.data.results.length > 0
    ) {
      const result = geocodeResponse.data.results[0];
      const location = result.geometry?.location;
      const placeId = result.place_id;

      // Step 2: Try Place Details API if we have a place_id
      if (placeId) {
        const placeName = await getPlaceDetails(placeId, apiKey);
        if (placeName) {
          return placeName;
        }
      }

      // Step 3: If we have coordinates, try Nearby Search
      if (location && location.lat && location.lng) {
        const nearbyName = await searchNearbyPlaces(
          location.lat,
          location.lng,
          apiKey
        );
        if (nearbyName) {
          return nearbyName;
        }
      }
    }

    // Step 4: Try Places API Text Search as a fallback
    try {
      const placesUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
      const placesResponse = await axios.get(placesUrl, {
        params: {
          query: address,
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

        if (isBusinessType(types)) {
          return place.name || place.formatted_address || address;
        }
      }
    } catch (error) {
      console.error("Error with Places API Text Search:", error);
      // Fall through to street name extraction
    }

    // Step 5: Final fallback to street name extraction
    return await extractStreetNames(address, apiKey);
  } catch (error) {
    console.error("Error getting place name from address:", error);
    // Ultimate fallback to street names
    try {
      return await extractStreetNames(address, apiKey);
    } catch (fallbackError) {
      console.error("Error in fallback street name extraction:", fallbackError);
      return address;
    }
  }
};

/**
 * Calculate walk time from origin to destination
 * Uses Directions API walking mode
 *
 * @param {string} origin - Origin address
 * @param {string} destination - Destination address
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string>} - Walk time formatted as "X min"
 */
export const calculateWalkTime = async (origin, destination, apiKey) => {
  try {
    const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
    const params = {
      origin: origin,
      destination: destination,
      mode: "walking",
      key: apiKey,
    };

    const response = await axios.get(baseUrl, { params });

    if (response.data && response.data.status === "OK" && response.data.routes) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      const durationInSeconds = leg.duration.value;
      const durationInMinutes = Math.round(durationInSeconds / 60);
      return `${durationInMinutes} min`;
    }

    return "N/A";
  } catch (error) {
    console.error("Error calculating walk time:", error);
    return "N/A";
  }
};

/**
 * Extract street names from address using Geocoding API
 *
 * @param {string} address - Address to extract street names from
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string>} - Street name or formatted address
 */
export const extractStreetNames = async (address, apiKey) => {
  try {
    const geocodeUrl = "https://maps.googleapis.com/maps/api/geocode/json";
    const geocodeResponse = await axios.get(geocodeUrl, {
      params: {
        address: address,
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
      const addressComponents = result.address_components || [];

      // Extract route (street name)
      const routeComponent = addressComponents.find((comp) =>
        comp.types.includes("route")
      );

      if (routeComponent) {
        return routeComponent.long_name || routeComponent.short_name || address;
      }

      // If no route found, return formatted address
      return result.formatted_address || address;
    }

    return address;
  } catch (error) {
    console.error("Error extracting street names:", error);
    return address;
  }
};

/**
 * Format stop name from origin and destination
 * Gets place names or formats as "streetname to streetname"
 * If a business name is found for destination, uses just that name
 *
 * @param {string} origin - Origin address
 * @param {string} destination - Destination address
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string>} - Formatted stop name
 */
export const formatStopName = async (origin, destination, apiKey) => {
  try {
    const [originName, destinationName] = await Promise.all([
      getPlaceNameFromAddress(origin, apiKey),
      getPlaceNameFromAddress(destination, apiKey),
    ]);

    // Check if destination name is a business name (not just address or street name)
    // Business names are typically different from the original address
    // and don't match typical street address patterns
    if (destinationName && destinationName !== destination) {
      // Check if it's not just a street name by comparing with street name extraction
      const streetName = await extractStreetNames(destination, apiKey);
      
      // If destination name is different from both the original address and street name,
      // it's likely a business/place name - use it directly as the stop name
      if (destinationName !== streetName) {
        // Also check if it doesn't look like an address (contains numbers at start, common address patterns)
        const looksLikeAddress = /^\d+\s+/.test(destinationName) || 
                                 destinationName.includes(',') && 
                                 (destinationName.includes('St') || destinationName.includes('Ave') || 
                                  destinationName.includes('Rd') || destinationName.includes('Blvd') ||
                                  destinationName.includes('Dr') || destinationName.includes('Ln'));
        
        if (!looksLikeAddress) {
          // It's a business/place name, use it directly as the stop name
          return destinationName;
        }
      }
    }

    // If both are place names (not just addresses), use them
    // Otherwise, try to extract street names
    let originStreet = originName;
    let destinationStreet = destinationName;

    // If the names are the same as the addresses, try to extract street names
    if (originName === origin) {
      originStreet = await extractStreetNames(origin, apiKey);
    }
    if (destinationName === destination) {
      destinationStreet = await extractStreetNames(destination, apiKey);
    }

    // Format as "streetname to streetname" or "place to place"
    return `${originStreet} to ${destinationStreet}`;
  } catch (error) {
    console.error("Error formatting stop name:", error);
    return `${origin} to ${destination}`;
  }
};

