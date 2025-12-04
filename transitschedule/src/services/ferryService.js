import { FERRY_ANACORTES_TIMES, FERRY_ORCAS_TIMES } from "../utils/constants";

/**
 * Ferry Service
 * 
 * Handles ferry schedule generation for both directions (Anacortes ↔ Orcas Island).
 * Times are extracted from WSDOT schedule and stored locally.
 */

/**
 * Gets the ferry departure times from Anacortes to Orcas Island or Orcas to Anacortes.
 * 
 * @param {string} direction - 'anacortes' or 'orcas' (default: 'anacortes')
 * @returns {Array} Array of Date objects representing departure times in Central Time Zone
 */
export const getFerrySchedule = (direction = "anacortes") => {
  console.log("getFerrySchedule called with direction:", direction);

  const ferryTimes = direction === "orcas" ? FERRY_ORCAS_TIMES : FERRY_ANACORTES_TIMES;

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
 * Processes ferry stop configuration and returns formatted stop data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @returns {Object} - Formatted stop data
 */
export const processFerryStop = (stopConfig) => {
  console.log("Processing ferry stop:", stopConfig.name);
  const direction = stopConfig.ferryDirection || "anacortes";
  const ferryDepartureTimes = getFerrySchedule(direction);
  console.log("Got ferry times:", ferryDepartureTimes.length, "times");

  // Safety check: ensure we have departure times
  if (!ferryDepartureTimes || ferryDepartureTimes.length === 0) {
    console.error("No ferry departure times found!");
    return {
      name: stopConfig.name,
      type: "ferry",
      ferryDirection: direction,
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
      type: "ferry",
      ferryDirection: direction,
      location: stopConfig.location,
      allArrivalTimes: ferryDepartureTimes.map((time) => ({
        stopName: stopConfig.name,
        arrivalTime: time,
        departureTime: time,
        headsign: direction === "orcas" ? "Anacortes" : "Orcas Island",
        lineName: direction === "orcas" ? "Orcas-Anacortes" : "Anacortes-Orcas",
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
    type: "ferry",
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
};

/**
 * Fetches and processes ferry stop data
 * 
 * @param {Object} stopConfig - Stop configuration object
 * @returns {Promise<Object>} - Formatted stop data
 */
export const getFerryStopData = async (stopConfig) => {
  // Ferry doesn't need API call, use schedule function
  return Promise.resolve(processFerryStop(stopConfig));
};

