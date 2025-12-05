import axios from "axios";
import { convertToCentralTime } from "../utils/helpers";
import { CAP_METRO_STOPS } from "../utils/constants";

/**
 * Bus Service
 *
 * Handles bus transit API calls and processing for Cap Metro bus routes.
 */

const BASE_URL = "https://maps.googleapis.com/maps/api/directions/json";

/**
 * Fetches bus transit data from Google Directions API
 *
 * @param {string} origin - Starting bus stop
 * @param {string} destination - Destination bus stop (always Downtown Station)
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<Object>} - API response data
 */
export const fetchBusRoute = async (origin, destination, apiKey) => {
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

          if (matchesRoute && transitDetails.arrival_time) {
            // Check if we have real-time data
            const isRealTime = transitDetails.arrival_time.value !== undefined;

            if (isRealTime || transitDetails.arrival_time.text) {
              const arrivalTime = convertToCentralTime(
                transitDetails.arrival_time
              );
              const departureTime = convertToCentralTime(
                transitDetails.departure_time
              );

              if (arrivalTime) {
                allArrivalTimes.push({
                  stopName:
                    transitDetails.arrival_stop?.name || stopConfig.name,
                  arrivalTime: arrivalTime,
                  departureTime: departureTime,
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

  // Find next arrival time
  const now = new Date();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper function to get time of day in minutes from a Date
  const getTimeInMinutes = (date) => {
    return date.getHours() * 60 + date.getMinutes();
  };

  // Helper function to create a Date for today or tomorrow with given time
  const createNextDate = (timeInMinutes) => {
    const nextDate = new Date(now);
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    nextDate.setHours(hours, minutes, 0, 0);

    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  };

  // Find next arrival by time of day
  let nextArrival = null;

  // First, try to find real-time arrivals that are still in the future
  const realTimeArrivals = allArrivalTimes.filter(
    (time) => time.isRealTime && time.arrivalTime > now
  );

  if (realTimeArrivals.length > 0) {
    nextArrival = realTimeArrivals[0];
  } else {
    // Find the next time by comparing time of day
    const timesByTimeOfDay = allArrivalTimes
      .map((time) => ({
        ...time,
        timeOfDay: getTimeInMinutes(time.arrivalTime),
      }))
      .sort((a, b) => a.timeOfDay - b.timeOfDay);

    const nextToday = timesByTimeOfDay.find(
      (time) => time.timeOfDay > currentTimeInMinutes
    );

    if (nextToday) {
      nextArrival = {
        ...nextToday,
        arrivalTime: createNextDate(nextToday.timeOfDay),
      };
    } else {
      const firstTomorrow = timesByTimeOfDay[0];
      if (firstTomorrow) {
        nextArrival = {
          ...firstTomorrow,
          arrivalTime: createNextDate(firstTomorrow.timeOfDay),
        };
      }
    }
  }

  // Determine last stop time
  let lastStopTime = null;
  if (allArrivalTimes.length > 0 && nextArrival) {
    const timesByTimeOfDay = allArrivalTimes
      .map((time) => ({
        ...time,
        timeOfDay: getTimeInMinutes(time.arrivalTime),
      }))
      .sort((a, b) => a.timeOfDay - b.timeOfDay);

    const lastTimeOfDay = timesByTimeOfDay[timesByTimeOfDay.length - 1];
    const nextArrivalTimeOfDay = getTimeInMinutes(nextArrival.arrivalTime);

    if (lastTimeOfDay.timeOfDay > nextArrivalTimeOfDay) {
      lastStopTime = createNextDate(lastTimeOfDay.timeOfDay);
    } else {
      const tomorrowDate = createNextDate(lastTimeOfDay.timeOfDay);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      lastStopTime = tomorrowDate;
    }
  }

  // Calculate if next arrival is within 2 stops
  let isWithinTwoStops = false;
  if (nextArrival && lastStopTime) {
    const nextArrivalTimeOfDay = getTimeInMinutes(nextArrival.arrivalTime);
    const lastStopTimeOfDay = getTimeInMinutes(lastStopTime);

    const timesByTimeOfDay = allArrivalTimes
      .map((time) => getTimeInMinutes(time.arrivalTime))
      .sort((a, b) => a - b);

    const nextIndex = timesByTimeOfDay.findIndex(
      (time) => time === nextArrivalTimeOfDay
    );
    const lastIndex = timesByTimeOfDay.findIndex(
      (time) => time === lastStopTimeOfDay
    );

    if (nextIndex >= 0 && lastIndex >= 0) {
      const stopsBetween = Math.abs(lastIndex - nextIndex);
      isWithinTwoStops = stopsBetween <= 2;
    }
  }

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
    // Try to load from saved file first, but verify it has the correct route
    if (stopConfig.dataFile) {
      try {
        const filePath = `${process.env.PUBLIC_URL || ""}${
          stopConfig.dataFile
        }`;
        const response = await fetch(filePath);
        if (response.ok) {
          const data = await response.json();
          const routeFilter = stopConfig.routeFilter || "801";

          // Check if saved data contains the requested route
          let hasMatchingRoute = false;
          if (data.routes && data.routes.length > 0) {
            data.routes.forEach((route) => {
              route.legs.forEach((leg) => {
                leg.steps.forEach((step) => {
                  if (step.travel_mode === "TRANSIT" && step.transit_details) {
                    const lineName =
                      step.transit_details.line?.short_name ||
                      step.transit_details.line?.name ||
                      "";
                    if (lineName === routeFilter) {
                      hasMatchingRoute = true;
                    }
                  }
                });
              });
            });
          }

          if (hasMatchingRoute) {
            console.log(`✓ Loaded saved data for ${stopConfig.name} (bus)`);
            return processBusResponse(stopConfig, data);
          } else {
            console.log(
              `✗ Saved data for ${stopConfig.name} doesn't contain route ${routeFilter}, fetching from API`
            );
          }
        }
      } catch (error) {
        console.log(
          `✗ Error loading saved file for ${stopConfig.name}, will fetch from API:`,
          error.message
        );
      }
    }

    // If file doesn't exist or failed to load, make API call
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      console.warn(
        `⚠ No API key configured for ${stopConfig.name} (bus) - cannot fetch live data`
      );
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

    let response;
    try {
      response = await fetchBusRoute(
        stopConfig.origin,
        stopConfig.destination,
        apiKey
      );

      if (response && response.status === "OK") {
        console.log(`✓ Request successful for ${stopConfig.name} (bus)`);
        return processBusResponse(stopConfig, response);
      } else {
        console.log(
          `✗ Request unsuccessful for ${stopConfig.name} (bus): ${
            response?.status || "Unknown error"
          }`
        );
        if (response?.error_message) {
          console.error(`API Error Message: ${response.error_message}`);
        }
        // Fall through to try saved data
      }
    } catch (networkError) {
      // Network error - try to use saved data as fallback
      console.warn(
        `⚠ Network error fetching live data for ${stopConfig.name} (bus), attempting to use saved data as fallback`
      );
      if (stopConfig.dataFile) {
        try {
          const filePath = `${process.env.PUBLIC_URL || ""}${
            stopConfig.dataFile
          }`;
          const fileResponse = await fetch(filePath);
          if (fileResponse.ok) {
            const savedData = await fileResponse.json();
            console.log(
              `⚠ Using saved data for ${stopConfig.name} (may not have route ${
                stopConfig.routeFilter || "801"
              })`
            );
            return processBusResponse(stopConfig, savedData);
          }
        } catch (fileError) {
          console.error(`Could not load saved data: ${fileError.message}`);
        }
      }
      // If we have a response object despite the error, process it
      if (response) {
        return processBusResponse(stopConfig, response);
      }
      // Re-throw if we can't use fallback
      throw networkError;
    }

    // If we get here, we have a response but it's not OK - process it anyway
    if (response) {
      return processBusResponse(stopConfig, response);
    }

    // Last resort - try saved data
    if (stopConfig.dataFile) {
      try {
        const filePath = `${process.env.PUBLIC_URL || ""}${
          stopConfig.dataFile
        }`;
        const fileResponse = await fetch(filePath);
        if (fileResponse.ok) {
          const savedData = await fileResponse.json();
          console.log(
            `⚠ Using saved data for ${stopConfig.name} (may not have route ${
              stopConfig.routeFilter || "801"
            })`
          );
          return processBusResponse(stopConfig, savedData);
        }
      } catch (fileError) {
        // Ignore file errors
      }
    }
  } catch (error) {
    console.error(`Error fetching bus data for ${stopConfig.name}:`, error);
    if (error.response) {
      console.error(`API Error Status: ${error.response.status}`);
      console.error(`API Error Data:`, error.response.data);
    } else if (error.request) {
      console.error(
        "No response from API - check network connection and API key"
      );
    } else {
      console.error(`Error: ${error.message}`);
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
};

// Export Cap Metro stops list for use in dropdowns
export { CAP_METRO_STOPS };
