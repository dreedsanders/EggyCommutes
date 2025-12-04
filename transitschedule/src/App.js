import React, { useState, useEffect } from "react";
import axios from "axios";
import TransitDisplay from "./TransitDisplay";
import "./App.css";

// Initial home address - will be moved to state
const INITIAL_HOME_ADDRESS = "2215 post rd austin tx 78704";
const INITIAL_PAGE_TITLE = "Eggy Commutes";

/**
 * getFerrySchedule Function
 *
 * Gets the ferry departure times from Anacortes to Orcas Island or Orcas to Anacortes.
 * Times are extracted from WSDOT schedule and stored locally.
 * Anacortes Schedule: AM - 5:30, 7:30, 10:05, 11:55; PM - 3:20, 8:40
 * Orcas Schedule: AM - 6:15, 8:15, 10:50, 12:40; PM - 4:05, 9:25
 *
 * @param {string} direction - 'anacortes' or 'orcas' (default: 'anacortes')
 * @returns {Array} Array of Date objects representing departure times in Central Time Zone
 */
const getFerrySchedule = (direction = "anacortes") => {
  console.log("getFerrySchedule called with direction:", direction);

  // Ferry departure times from Anacortes (in 24-hour format, Pacific Time)
  const anacortesTimes = [
    { hour: 5, minute: 30 }, // 5:30 AM
    { hour: 7, minute: 30 }, // 7:30 AM
    { hour: 10, minute: 5 }, // 10:05 AM
    { hour: 11, minute: 55 }, // 11:55 AM
    { hour: 15, minute: 20 }, // 3:20 PM
    { hour: 20, minute: 40 }, // 8:40 PM
  ];

  // Ferry departure times from Orcas Island (in 24-hour format, Pacific Time)
  const orcasTimes = [
    { hour: 6, minute: 15 }, // 6:15 AM
    { hour: 8, minute: 15 }, // 8:15 AM
    { hour: 10, minute: 50 }, // 10:50 AM
    { hour: 12, minute: 40 }, // 12:40 PM
    { hour: 16, minute: 5 }, // 4:05 PM
    { hour: 21, minute: 25 }, // 9:25 PM
  ];

  const ferryTimes = direction === "orcas" ? orcasTimes : anacortesTimes;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get current time in Central Time (hours and minutes only)
  const centralNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  const currentHour = centralNow.getHours();
  const currentMinute = centralNow.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Convert Pacific Time to Central Time (add 2 hours) and create Date objects
  const departureTimes = ferryTimes.map(({ hour, minute }) => {
    // Convert Pacific Time to Central Time (add 2 hours)
    let centralHour = hour + 2;
    let centralMinute = minute;

    // Handle hour overflow
    if (centralHour >= 24) {
      centralHour -= 24;
    }

    // Create date for today
    const centralTime = new Date(today);
    centralTime.setHours(centralHour, centralMinute, 0, 0);

    // Calculate time in minutes for comparison
    const timeInMinutes = centralHour * 60 + centralMinute;

    // If the time has passed today (based on time only, not date), set it for tomorrow
    if (timeInMinutes <= currentTimeInMinutes) {
      centralTime.setDate(centralTime.getDate() + 1);
    }

    return centralTime;
  });

  // Sort times
  departureTimes.sort((a, b) => a - b);

  console.log(
    "getFerrySchedule returning",
    departureTimes.length,
    "times:",
    departureTimes.map((d) => d.toString())
  );

  // Store in localStorage
  try {
    const storageKey =
      direction === "orcas"
        ? "ferry_schedule_orcas_anacortes"
        : "ferry_schedule_anacortes_orcas";
    localStorage.setItem(
      storageKey,
      JSON.stringify(departureTimes.map((dt) => dt.toISOString()))
    );
  } catch (error) {
    console.error("Error storing ferry schedule:", error);
  }

  return departureTimes;
};

/**
 * convertToCentralTime Function
 *
 * Converts API time responses to Central Time Zone.
 * Handles various time formats from the Google Directions API.
 *
 * @param {Object} timeValue - Time value from API (can be time object or timestamp)
 * @returns {Date} - Date object in Central Time Zone
 */
const convertToCentralTime = (timeValue) => {
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
const getDestinationName = async (destination, apiKey) => {
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
 * fetchAllTransitTimes Function
 *
 * Makes API calls to fetch transit data for both stops (route 801 bus at Lamar/Oltorf
 * and Caltrain at South San Francisco). Since Google Directions API requires origin
 * and destination, we make optimized calls for each stop. All arrival times are stored
 * locally, converted to Central Time Zone, and processed to determine next arrival
 * and last stop times.
 *
 * @param {Function} setStops - React setState function to update stops state
 * @param {string} apiKey - Google Maps API key
 * @param {string} homeAddress - Home address to use for stops that depend on it
 * @param {string} ferryDirection - Ferry direction ('anacortes' or 'orcas')
 */
const fetchAllTransitTimes = async (
  setStops,
  apiKey,
  homeAddress = INITIAL_HOME_ADDRESS,
  ferryDirection = "anacortes"
) => {
  const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";

  // Define the stops we want to track
  const stopsConfig = [
    {
      name: "Congress and Oltorf",
      type: "bus",
      origin: "Congress and Oltorf, Austin, TX",
      destination: "Downtown Station, Austin, TX", // Route 801 goes downtown
      routeFilter: "801", // Filter for route 801
      transitMode: "bus",
      dataFile: "/data/congress-oltorf-bus.json",
    },
    {
      name: "South San Francisco",
      type: "train",
      origin: "South San Francisco Caltrain Station, CA",
      destination: "San Francisco Caltrain Station, CA", // Caltrain goes to SF
      routeFilter: "Caltrain", // Filter for Caltrain
      transitMode: "rail",
      dataFile: "/data/south-san-francisco-train.json",
    },
    {
      name: "To Springs",
      type: "bike",
      origin: homeAddress,
      destination: "barton springs pool in austin tx",
      mode: "bicycling",
      dataFile: "/data/to-springs-bike.json",
    },
    {
      name: "To HEB",
      type: "walk",
      origin: homeAddress,
      destination: "2400 S. CONGRESS AVE. AUSTIN, TX 78704",
      mode: "walking",
      dataFile: "/data/to-heb-walk.json",
    },
    {
      name: "Central Market",
      type: "drive",
      origin: homeAddress,
      destination: "4477 S Lamar Blvd, Austin, TX 78745",
      mode: "driving",
      dataFile: "/data/central-market-drive.json",
    },
    {
      name:
        ferryDirection === "orcas"
          ? "Orcas Island To Anacortes"
          : "Anacortes To Orcas Island",
      type: "ferry",
      location:
        ferryDirection === "orcas" ? "Orcas Island, WA" : "Anacortes, WA",
      ferryDirection: ferryDirection,
    },
  ];

  try {
    // Try to load from saved files first, then fall back to API calls if files don't exist
    const apiCalls = stopsConfig.map(async (stopConfig) => {
      // Ferry doesn't need API call, use schedule function
      if (stopConfig.type === "ferry") {
        return Promise.resolve({
          stopConfig,
          response: { status: "OK" }, // Dummy response for ferry
        });
      }

      // Try to load from saved file first
      if (stopConfig.dataFile) {
        try {
          const filePath = `${process.env.PUBLIC_URL || ""}${
            stopConfig.dataFile
          }`;
          const response = await fetch(filePath);
          if (response.ok) {
            const data = await response.json();
            console.log(
              `✓ Loaded saved data for ${stopConfig.name} (${stopConfig.type})`
            );
            return {
              stopConfig,
              response: data,
            };
          } else {
            console.log(
              `✗ Saved file not found for ${stopConfig.name}, will fetch from API`
            );
          }
        } catch (error) {
          console.log(
            `✗ Error loading saved file for ${stopConfig.name}, will fetch from API:`,
            error.message
          );
        }
      }

      // If file doesn't exist or failed to load, make API call
      let params;

      if (
        stopConfig.type === "bike" ||
        stopConfig.type === "walk" ||
        stopConfig.type === "drive"
      ) {
        // Bike, walking, or driving directions
        params = {
          origin: stopConfig.origin,
          destination: stopConfig.destination,
          mode: stopConfig.mode,
          key: apiKey,
        };
      } else {
        // Transit directions - use origin and destination on the route
        params = {
          origin: stopConfig.origin,
          destination: stopConfig.destination,
          mode: "transit",
          transit_mode: stopConfig.transitMode,
          departure_time: "now",
          alternatives: true,
          key: apiKey,
        };
      }

      return axios
        .get(baseUrl, { params })
        .then((response) => {
          if (response.data && response.data.status === "OK") {
            console.log(
              `✓ Request successful for ${stopConfig.name} (${stopConfig.type})`
            );
          } else {
            console.log(
              `✗ Request unsuccessful for ${stopConfig.name} (${
                stopConfig.type
              }): ${response.data?.status || "Unknown error"}`
            );
          }
          return {
            stopConfig,
            response: response.data,
          };
        })
        .catch((error) => {
          if (error.code === "ERR_NETWORK") {
            console.error(
              `✗ Network error for ${stopConfig.name} (${stopConfig.type}): Network Error`
            );
            console.error(
              `  Possible causes: API key restrictions, CORS issues, or network connectivity`
            );
            console.error(
              `  API Key configured: ${
                apiKey ? "Yes (" + apiKey.substring(0, 10) + "...)" : "No"
              }`
            );
            console.error(`  Request URL: ${baseUrl}`);
            console.error(
              `  Check: Google Cloud Console > APIs & Services > Credentials`
            );
            console.error(
              `  Ensure: Directions API is enabled and API key allows localhost:3000`
            );
          } else if (error.response) {
            console.error(
              `✗ Request unsuccessful for ${stopConfig.name} (${stopConfig.type}):`,
              error.response.data?.error_message || error.response.statusText
            );
            console.error(`  Status: ${error.response.status}`);
            if (error.response.data?.error_message) {
              console.error(`  Error: ${error.response.data.error_message}`);
            }
          } else {
            console.error(
              `✗ Request unsuccessful for ${stopConfig.name} (${stopConfig.type}):`,
              error.message || error
            );
          }
          return { stopConfig, response: null };
        });
    });

    // Wait for all API calls to complete
    const results = await Promise.all(apiCalls);

    // Process each result
    const processedStops = results.map(({ stopConfig, response }) => {
      // Handle ferry type - get schedule from WSDOT
      if (stopConfig.type === "ferry") {
        console.log("Processing ferry stop:", stopConfig.name);
        const direction = stopConfig.ferryDirection || "anacortes";
        const ferryDepartureTimes = getFerrySchedule(direction);
        console.log("Got ferry times:", ferryDepartureTimes.length, "times");

        // Safety check: ensure we have departure times
        if (!ferryDepartureTimes || ferryDepartureTimes.length === 0) {
          console.error("No ferry departure times found!");
          return {
            name: stopConfig.name,
            type: stopConfig.type,
            ferryDirection: stopConfig.ferryDirection || "anacortes",
            location: stopConfig.location,
            allArrivalTimes: [],
            nextDepartureTime: null,
            nextArrivalTime: null,
            lastStopTime: null,
            isWithinTwoStops: false,
          };
        }

        const now = new Date();

        // Get current time in Central Time (hours and minutes only for comparison)
        // Use Intl.DateTimeFormat to get hours/minutes in Central Time
        const centralTimeFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        });
        const centralTimeParts = centralTimeFormatter.formatToParts(now);
        const currentHour = parseInt(
          centralTimeParts.find((p) => p.type === "hour").value
        );
        const currentMinute = parseInt(
          centralTimeParts.find((p) => p.type === "minute").value
        );
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        // Find next departure time based on time of day (not date)
        // Compare times in minutes: find first time that's later in the day
        const nextDeparture =
          ferryDepartureTimes.find((time) => {
            if (!(time instanceof Date) || isNaN(time.getTime())) {
              console.error("Invalid date in ferryDepartureTimes:", time);
              return false;
            }
            const timeHour = time.getHours();
            const timeMinute = time.getMinutes();
            const timeInMinutes = timeHour * 60 + timeMinute;
            return timeInMinutes > currentTimeInMinutes;
          }) || ferryDepartureTimes[0]; // If all times passed, use first one (next day)

        // Validate nextDeparture
        if (
          !nextDeparture ||
          !(nextDeparture instanceof Date) ||
          isNaN(nextDeparture.getTime())
        ) {
          console.error("Invalid nextDeparture:", nextDeparture);
          return {
            name: stopConfig.name,
            type: stopConfig.type,
            allArrivalTimes: ferryDepartureTimes.map((time) => ({
              stopName: stopConfig.name,
              arrivalTime: time,
              departureTime: time,
              headsign: "Orcas Island",
              lineName: "Anacortes-Orcas",
            })),
            nextDepartureTime: null,
            nextArrivalTime: null,
            lastStopTime: null,
            isWithinTwoStops: false,
          };
        }

        console.log("Ferry Debug:", {
          ferryDepartureTimes: ferryDepartureTimes.map((d) => d.toString()),
          currentTimeInMinutes,
          nextDeparture: nextDeparture.toString(),
          nextDepartureIsValid:
            nextDeparture instanceof Date && !isNaN(nextDeparture.getTime()),
        });

        const destinationName =
          direction === "orcas" ? "Anacortes" : "Orcas Island";
        const routeName =
          direction === "orcas" ? "Orcas-Anacortes" : "Anacortes-Orcas";

        return {
          name: stopConfig.name,
          type: stopConfig.type,
          ferryDirection: direction,
          location: stopConfig.location,
          allArrivalTimes: ferryDepartureTimes.map((time) => ({
            stopName: stopConfig.name,
            arrivalTime: time,
            departureTime: time,
            headsign: destinationName,
            lineName: routeName,
          })),
          nextDepartureTime: nextDeparture,
          nextArrivalTime: null,
          lastStopTime: null,
          isWithinTwoStops: false,
        };
      }

      // Handle bike, walk, and drive types differently
      if (
        stopConfig.type === "bike" ||
        stopConfig.type === "walk" ||
        stopConfig.type === "drive"
      ) {
        if (
          !response ||
          response.status !== "OK" ||
          !response.routes ||
          response.routes.length === 0
        ) {
          console.log(
            `✗ Request unsuccessful for ${stopConfig.name} (${
              stopConfig.type
            }) - ${response?.status || "No response"}`
          );
          return {
            name: stopConfig.name,
            type: stopConfig.type,
            origin: stopConfig.origin,
            destination: stopConfig.destination,
            mode: stopConfig.mode,
            allArrivalTimes: [],
            estimatedTime: null,
            lastStopTime: null,
            isWithinTwoStops: false,
          };
        }

        // Get the first route's duration for biking, walking, or driving
        const route = response.routes[0];
        const leg = route.legs[0];
        const durationInSeconds = leg.duration.value; // Duration in seconds
        const durationInMinutes = Math.round(durationInSeconds / 60);

        // Create a time string for display (e.g., "15 min")
        const estimatedTime = `${durationInMinutes} min`;

        console.log(
          `✓ Stop times found for ${stopConfig.name} (${stopConfig.type}): ${estimatedTime}`
        );

        return {
          name: stopConfig.name,
          type: stopConfig.type,
          allArrivalTimes: [],
          estimatedTime: estimatedTime,
          nextArrivalTime: null,
          lastStopTime: null,
          isWithinTwoStops: false,
        };
      }

      // Handle transit stops (bus and train)
      if (
        !response ||
        response.status !== "OK" ||
        !response.routes ||
        response.routes.length === 0
      ) {
        console.log(
          `✗ No stop times found for ${stopConfig.name} (${
            stopConfig.type
          }) - ${response?.status || "No response"}`
        );
        return {
          name: stopConfig.name,
          type: stopConfig.type,
          origin: stopConfig.origin,
          destination: stopConfig.destination,
          routeFilter: stopConfig.routeFilter,
          transitMode: stopConfig.transitMode,
          allArrivalTimes: [],
          nextArrivalTime: null,
          lastStopTime: null,
          isWithinTwoStops: false,
        };
      }

      // Extract all arrival times from all routes
      const allArrivalTimes = [];

      response.routes.forEach((route) => {
        route.legs.forEach((leg) => {
          leg.steps.forEach((step) => {
            if (step.travel_mode === "TRANSIT" && step.transit_details) {
              const transitDetails = step.transit_details;

              // Filter by route (801 for bus, Caltrain for train)
              const lineName =
                transitDetails.line?.short_name ||
                transitDetails.line?.name ||
                "";
              const matchesRoute =
                stopConfig.type === "bus"
                  ? lineName === stopConfig.routeFilter
                  : lineName.toLowerCase().includes("caltrain") ||
                    transitDetails.line?.agencies?.[0]?.name
                      ?.toLowerCase()
                      .includes("caltrain");

              if (matchesRoute && transitDetails.arrival_time) {
                // Check if we have real-time data (value property indicates real-time)
                const isRealTime =
                  transitDetails.arrival_time.value !== undefined;

                // Prioritize real-time data - only use if we have value property (real-time)
                // or if it's the only data available
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
                      isRealTime: isRealTime, // Track if this is real-time data
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
        // If one is real-time and the other isn't, prioritize real-time
        if (a.isRealTime && !b.isRealTime) return -1;
        if (!a.isRealTime && b.isRealTime) return 1;
        // Otherwise sort by time
        return a.arrivalTime - b.arrivalTime;
      });

      // Log if we found stop times
      if (allArrivalTimes.length > 0) {
        console.log(
          `✓ Stop times found for ${stopConfig.name} (${stopConfig.type}): ${allArrivalTimes.length} times`
        );
      } else {
        console.log(
          `✗ No stop times found for ${stopConfig.name} (${stopConfig.type}) - No matching routes`
        );
      }

      // Find next arrival time (earliest upcoming time)
      // Compare by time of day, not full date, so there's always a next arrival
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

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

        // If the time has passed today, set it for tomorrow
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
        // Use real-time data if available and still in the future
        nextArrival = realTimeArrivals[0];
      } else {
        // Find the next time by comparing time of day
        // Sort all times by their time of day
        const timesByTimeOfDay = allArrivalTimes
          .map((time) => ({
            ...time,
            timeOfDay: getTimeInMinutes(time.arrivalTime),
          }))
          .sort((a, b) => a.timeOfDay - b.timeOfDay);

        // Find first time that's later in the day than current time
        const nextToday = timesByTimeOfDay.find(
          (time) => time.timeOfDay > currentTimeInMinutes
        );

        if (nextToday) {
          // Found a time later today
          nextArrival = {
            ...nextToday,
            arrivalTime: createNextDate(nextToday.timeOfDay),
          };
        } else {
          // All times passed today, use first time tomorrow
          const firstTomorrow = timesByTimeOfDay[0];
          if (firstTomorrow) {
            nextArrival = {
              ...firstTomorrow,
              arrivalTime: createNextDate(firstTomorrow.timeOfDay),
            };
          }
        }
      }

      if (nextArrival) {
        console.log(
          `✓ Next arrival time for ${stopConfig.name}: ${nextArrival.arrivalTime}`
        );
      } else {
        console.log(`✗ No next arrival time found for ${stopConfig.name}`);
      }

      // Determine last stop time
      // The last stop is the final destination in the route
      // Use time of day logic to ensure it's always in the future
      let lastStopTime = null;
      if (allArrivalTimes.length > 0 && nextArrival) {
        // Find the last stop time relative to the next arrival
        // Get all times sorted by time of day
        const timesByTimeOfDay = allArrivalTimes
          .map((time) => ({
            ...time,
            timeOfDay: getTimeInMinutes(time.arrivalTime),
          }))
          .sort((a, b) => a.timeOfDay - b.timeOfDay);

        // Find the last time in the sorted list
        const lastTimeOfDay = timesByTimeOfDay[timesByTimeOfDay.length - 1];
        const nextArrivalTimeOfDay = getTimeInMinutes(nextArrival.arrivalTime);

        // If last time is after next arrival time, use same day, otherwise tomorrow
        if (lastTimeOfDay.timeOfDay > nextArrivalTimeOfDay) {
          lastStopTime = createNextDate(lastTimeOfDay.timeOfDay);
        } else {
          // Last time is before next arrival, so it's tomorrow
          const tomorrowDate = createNextDate(lastTimeOfDay.timeOfDay);
          tomorrowDate.setDate(tomorrowDate.getDate() + 1);
          lastStopTime = tomorrowDate;
        }
      }

      // Calculate if next arrival is within 2 stops
      // Compare by time of day since dates may differ
      let isWithinTwoStops = false;
      if (nextArrival && lastStopTime) {
        // Get time of day for next arrival and last stop
        const nextArrivalTimeOfDay = getTimeInMinutes(nextArrival.arrivalTime);
        const lastStopTimeOfDay = getTimeInMinutes(lastStopTime);

        // Find how many stops are between next arrival and last stop
        // Sort all times by time of day
        const timesByTimeOfDay = allArrivalTimes
          .map((time) => getTimeInMinutes(time.arrivalTime))
          .sort((a, b) => a - b);

        // Find index of next arrival time and last stop time
        const nextIndex = timesByTimeOfDay.findIndex(
          (time) => time === nextArrivalTimeOfDay
        );
        const lastIndex = timesByTimeOfDay.findIndex(
          (time) => time === lastStopTimeOfDay
        );

        // Check if there are 2 or fewer stops between them
        if (nextIndex >= 0 && lastIndex >= 0) {
          const stopsBetween = Math.abs(lastIndex - nextIndex);
          isWithinTwoStops = stopsBetween <= 2;
        }
      }

      return {
        name: stopConfig.name,
        type: stopConfig.type,
        origin: stopConfig.origin,
        destination: stopConfig.destination,
        routeFilter: stopConfig.routeFilter,
        transitMode: stopConfig.transitMode,
        allArrivalTimes: allArrivalTimes,
        nextArrivalTime: nextArrival?.arrivalTime || null,
        lastStopTime: lastStopTime,
        isWithinTwoStops: isWithinTwoStops,
      };
    });

    // Store all stop data locally in localStorage
    // Serialize Date objects to ISO strings for storage
    processedStops.forEach((stop) => {
      try {
        const serializedTimes = stop.allArrivalTimes.map((time) => ({
          ...time,
          arrivalTime: time.arrivalTime?.toISOString(),
          departureTime: time.departureTime?.toISOString(),
        }));
        localStorage.setItem(
          `stop_${stop.name}`,
          JSON.stringify(serializedTimes)
        );
      } catch (error) {
        console.error(`Error storing data for ${stop.name}:`, error);
      }
    });

    // Update state with processed stops
    setStops(processedStops);
  } catch (error) {
    console.error("Error fetching transit times:", error);
    // Set error state
    setStops([
      {
        name: "Congress and Oltorf",
        type: "bus",
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "South San Francisco",
        type: "train",
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "To Springs",
        type: "bike",
        allArrivalTimes: [],
        estimatedTime: null,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "To HEB",
        type: "walk",
        allArrivalTimes: [],
        estimatedTime: null,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "Central Market",
        type: "drive",
        allArrivalTimes: [],
        estimatedTime: null,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "Anacortes To Orcas Island",
        type: "ferry",
        allArrivalTimes: [],
        nextDepartureTime: null,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
    ]);
  }
};

/**
 * App Component
 *
 * Main application component that manages transit data fetching and display.
 * Makes a single optimized API call (or parallel calls) to fetch data for both
 * transit stops, stores all arrival times locally, converts times to Central Time Zone,
 * and passes processed data to the TransitDisplay component.
 */
function App() {
  // State for home address and page title
  const [homeAddress, setHomeAddress] = useState(INITIAL_HOME_ADDRESS);
  const [pageTitle, setPageTitle] = useState(INITIAL_PAGE_TITLE);

  // State for editing
  const [editingStop, setEditingStop] = useState(null);
  const [editingHome, setEditingHome] = useState(false);
  const [previousStopConfig, setPreviousStopConfig] = useState(null);
  const [reviewData, setReviewData] = useState(null);

  // State for storing all transit stops data
  const [stops, setStops] = useState([
    {
      name: "Congress and Oltorf",
      type: "bus",
      origin: "Congress and Oltorf, Austin, TX",
      destination: "Downtown Station, Austin, TX",
      routeFilter: "801",
      transitMode: "bus",
      allArrivalTimes: [],
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "South San Francisco",
      type: "train",
      origin: "South San Francisco Caltrain Station, CA",
      destination: "San Francisco Caltrain Station, CA",
      routeFilter: "Caltrain",
      transitMode: "rail",
      allArrivalTimes: [],
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "To Springs",
      type: "bike",
      origin: INITIAL_HOME_ADDRESS,
      destination: "barton springs pool in austin tx",
      mode: "bicycling",
      allArrivalTimes: [],
      estimatedTime: null,
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "To HEB",
      type: "walk",
      origin: INITIAL_HOME_ADDRESS,
      destination: "2400 S. CONGRESS AVE. AUSTIN, TX 78704",
      mode: "walking",
      allArrivalTimes: [],
      estimatedTime: null,
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "Central Market",
      type: "drive",
      origin: INITIAL_HOME_ADDRESS,
      destination: "4477 S Lamar Blvd, Austin, TX 78745",
      mode: "driving",
      allArrivalTimes: [],
      estimatedTime: null,
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "Anacortes To Orcas Island",
      type: "ferry",
      ferryDirection: "anacortes",
      location: "Anacortes, WA",
      allArrivalTimes: [],
      nextDepartureTime: null,
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
  ]);

  // State for ferry direction
  const [ferryDirection, setFerryDirection] = useState("anacortes");

  // Get API key from environment variables with default
  const apiKey =
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";

  /**
   * useEffect Hook
   *
   * Runs once when the component mounts to fetch transit data.
   * Makes a single API call (or parallel optimized calls) to get data for both stops.
   * All data is stored locally in state and localStorage for persistence.
   */
  useEffect(() => {
    // Fetch transit times - ferry doesn't need API key, others do
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
      fetchAllTransitTimes(setStops, apiKey, homeAddress, ferryDirection);

      // Set up interval to refresh data every 5 minutes
      const interval = setInterval(() => {
        fetchAllTransitTimes(setStops, apiKey, homeAddress, ferryDirection);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    } else {
      console.warn(
        "Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY in .env file"
      );
      // Still process ferry stops even without API key
      fetchAllTransitTimes(
        setStops,
        apiKey || "YOUR_API_KEY_HERE",
        homeAddress,
        ferryDirection
      );
    }
  }, [apiKey, homeAddress, ferryDirection]);

  /**
   * Update a single stop's configuration
   */
  const updateStop = async (stopIndex, newConfig) => {
    const stop = stops[stopIndex];
    if (!stop) return;

    // Save previous config for rollback
    const previousConfig = {
      ...stop,
      origin: stop.origin,
      destination: stop.destination,
      ferryDirection: stop.ferryDirection,
    };
    setPreviousStopConfig(previousConfig);

    try {
      // For ferry, just update direction
      if (stop.type === "ferry") {
        const newFerryDirection = newConfig.ferryDirection || "anacortes";
        setFerryDirection(newFerryDirection);
        // Re-fetch to update ferry schedule
        await fetchAllTransitTimes(
          setStops,
          apiKey,
          homeAddress,
          newFerryDirection
        );
        setEditingStop(null);
        setReviewData(null);
        // Reload page with new information
        window.location.reload();
        return;
      }

      // For other stops, make API call
      const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
      let params;

      if (
        stop.type === "bike" ||
        stop.type === "walk" ||
        stop.type === "drive"
      ) {
        params = {
          origin: newConfig.origin,
          destination: newConfig.destination,
          mode: stop.mode,
          key: apiKey,
        };
      } else if (stop.type === "bus") {
        // For bus, use selectedStop as origin, destination is always Downtown
        params = {
          origin: newConfig.selectedStop || newConfig.origin,
          destination: "Downtown Station, Austin, TX",
          mode: "transit",
          transit_mode: "bus",
          departure_time: "now",
          alternatives: true,
          key: apiKey,
        };
      } else if (stop.type === "train") {
        // For train, use selectedStop as origin, destination is always SF
        params = {
          origin: newConfig.selectedStop || newConfig.origin,
          destination: "San Francisco Caltrain Station, CA",
          mode: "transit",
          transit_mode: "rail",
          departure_time: "now",
          alternatives: true,
          key: apiKey,
        };
      }

      const response = await axios.get(baseUrl, { params });

      if (response.data && response.data.status === "OK") {
        // Get updated destination name if destination was changed
        let updatedName = stop.name;
        if (
          (stop.type === "bike" ||
            stop.type === "walk" ||
            stop.type === "drive") &&
          newConfig.destination !== (stop.destination || "")
        ) {
          // Destination was changed, get the new name
          updatedName = await getDestinationName(newConfig.destination, apiKey);
        } else if (
          (stop.type === "bus" || stop.type === "train") &&
          newConfig.selectedStop !== (stop.origin || "")
        ) {
          // Stop was changed for bus/train, use the selected stop name
          updatedName = newConfig.selectedStop || stop.name;
        }

        // Process the response similar to fetchAllTransitTimes
        const updatedConfig = {
          ...stop,
          name: updatedName,
          origin:
            stop.type === "bus" || stop.type === "train"
              ? newConfig.selectedStop || newConfig.origin
              : newConfig.origin,
          destination:
            stop.type === "bus" || stop.type === "train"
              ? stop.type === "bus"
                ? "Downtown Station, Austin, TX"
                : "San Francisco Caltrain Station, CA"
              : newConfig.destination,
        };
        const processedStop = processStopResponse(updatedConfig, response.data);

        const newStops = [...stops];
        newStops[stopIndex] = processedStop;
        setStops(newStops);
        setEditingStop(null);
        setReviewData(null);

        // Re-fetch all transit data (similar to fetch-transit-data.js functionality)
        // Wait for all data to be fetched before reloading
        await fetchAllTransitTimes(
          setStops,
          apiKey,
          homeAddress,
          ferryDirection
        );

        // Reload page with new information after data is fetched
        window.location.reload();
      } else {
        // Handle API error responses
        const status = response.data?.status;
        let errorMsg = response.data?.error_message || "Unknown error occurred";

        if (status === "ZERO_RESULTS") {
          errorMsg = "Can not route to destination";
        } else if (status === "NOT_FOUND") {
          errorMsg = "Address does not exist";
        } else if (status === "INVALID_REQUEST") {
          errorMsg = "Invalid request - please check your inputs";
        }

        throw new Error(errorMsg);
      }
    } catch (error) {
      let errorMessage = "An error occurred";

      // Parse specific error messages
      if (error.response?.data?.error_message) {
        errorMessage = error.response.data.error_message;
      } else if (error.response?.data?.status) {
        const status = error.response.data.status;
        if (status === "ZERO_RESULTS") {
          errorMessage = "Can not route to destination";
        } else if (status === "NOT_FOUND") {
          errorMessage = "Address does not exist";
        } else if (status === "INVALID_REQUEST") {
          errorMessage = "Invalid request - please check your inputs";
        } else {
          errorMessage = status;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Show error alert with specific message
      alert(`Error: ${errorMessage}`);

      // Revert to previous configuration
      if (previousConfig) {
        const newStops = [...stops];
        newStops[stopIndex] = previousConfig;
        setStops(newStops);
      }

      setEditingStop(null);
      setReviewData(null);
    }
  };

  /**
   * Process stop response similar to fetchAllTransitTimes
   */
  const processStopResponse = (stopConfig, response) => {
    if (
      stopConfig.type === "bike" ||
      stopConfig.type === "walk" ||
      stopConfig.type === "drive"
    ) {
      if (
        !response ||
        response.status !== "OK" ||
        !response.routes ||
        response.routes.length === 0
      ) {
        return {
          ...stopConfig,
          allArrivalTimes: [],
          estimatedTime: null,
          nextArrivalTime: null,
          lastStopTime: null,
          isWithinTwoStops: false,
        };
      }

      const route = response.routes[0];
      const leg = route.legs[0];
      const durationInSeconds = leg.duration.value;
      const durationInMinutes = Math.round(durationInSeconds / 60);
      const estimatedTime = `${durationInMinutes} min`;

      return {
        ...stopConfig,
        origin: stopConfig.origin,
        destination: stopConfig.destination,
        mode: stopConfig.mode,
        allArrivalTimes: [],
        estimatedTime: estimatedTime,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      };
    } else if (stopConfig.type === "bus" || stopConfig.type === "train") {
      // Process transit stop (similar logic to fetchAllTransitTimes)
      if (
        !response ||
        response.status !== "OK" ||
        !response.routes ||
        response.routes.length === 0
      ) {
        return {
          ...stopConfig,
          origin: stopConfig.origin,
          destination: stopConfig.destination,
          routeFilter: stopConfig.routeFilter,
          transitMode: stopConfig.transitMode,
          allArrivalTimes: [],
          nextArrivalTime: null,
          lastStopTime: null,
          isWithinTwoStops: false,
        };
      }

      // Extract arrival times (similar to fetchAllTransitTimes)
      const allArrivalTimes = [];
      response.routes.forEach((route) => {
        route.legs.forEach((leg) => {
          leg.steps.forEach((step) => {
            if (step.travel_mode === "TRANSIT" && step.transit_details) {
              const transitDetails = step.transit_details;
              const lineName =
                transitDetails.line?.short_name ||
                transitDetails.line?.name ||
                "";
              const matchesRoute =
                stopConfig.type === "bus"
                  ? lineName === stopConfig.routeFilter
                  : lineName.toLowerCase().includes("caltrain") ||
                    transitDetails.line?.agencies?.[0]?.name
                      ?.toLowerCase()
                      .includes("caltrain");

              if (matchesRoute && transitDetails.arrival_time) {
                const isRealTime =
                  transitDetails.arrival_time.value !== undefined;
                if (isRealTime || transitDetails.arrival_time.text) {
                  const arrivalTime = convertToCentralTime(
                    transitDetails.arrival_time
                  );
                  if (arrivalTime) {
                    allArrivalTimes.push({
                      stopName:
                        transitDetails.arrival_stop?.name || stopConfig.name,
                      arrivalTime: arrivalTime,
                      departureTime: convertToCentralTime(
                        transitDetails.departure_time
                      ),
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

      allArrivalTimes.sort((a, b) => {
        if (a.isRealTime && !b.isRealTime) return -1;
        if (!a.isRealTime && b.isRealTime) return 1;
        return a.arrivalTime - b.arrivalTime;
      });

      const now = new Date();
      const realTimeArrivals = allArrivalTimes.filter(
        (time) => time.isRealTime && time.arrivalTime > now
      );
      const nextArrival =
        realTimeArrivals.length > 0
          ? realTimeArrivals[0]
          : allArrivalTimes.length > 0
          ? allArrivalTimes[0]
          : null;

      return {
        ...stopConfig,
        origin: stopConfig.origin,
        destination: stopConfig.destination,
        routeFilter: stopConfig.routeFilter,
        transitMode: stopConfig.transitMode,
        allArrivalTimes: allArrivalTimes,
        nextArrivalTime: nextArrival?.arrivalTime || null,
        lastStopTime:
          allArrivalTimes.length > 0
            ? allArrivalTimes[allArrivalTimes.length - 1]?.arrivalTime
            : null,
        isWithinTwoStops: false,
      };
    }

    return stopConfig;
  };

  /**
   * Update home address and refresh dependent stops
   */
  const updateHomeAddress = async (newHomeAddress, newPageTitle) => {
    setHomeAddress(newHomeAddress);
    if (newPageTitle) {
      setPageTitle(newPageTitle);
    }

    // Refresh all stops that use home address
    await fetchAllTransitTimes(
      setStops,
      apiKey,
      newHomeAddress,
      ferryDirection
    );
    setEditingHome(false);
    setReviewData(null);
  };

  return (
    <div className="App">
      <TransitDisplay
        stops={stops}
        onEditStop={(index) => {
          setEditingStop(index);
          setPreviousStopConfig({ ...stops[index] });
        }}
        onEditHome={() => setEditingHome(true)}
        editingStop={editingStop}
        editingHome={editingHome}
        onCloseEdit={() => {
          setEditingStop(null);
          setEditingHome(false);
          setReviewData(null);
        }}
        onReview={(data) => setReviewData(data)}
        onUpdateStop={updateStop}
        onUpdateHome={updateHomeAddress}
        reviewData={reviewData}
        pageTitle={pageTitle}
        homeAddress={homeAddress}
      />
    </div>
  );
}

export default App;
