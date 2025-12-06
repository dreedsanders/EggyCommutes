/**
 * Time Calculation Utilities
 *
 * Common utilities for calculating transit times, next arrivals, and stop relationships
 */

/**
 * Get time of day in minutes from a Date object
 *
 * @param {Date} date - Date object
 * @returns {number} - Time of day in minutes (0-1439)
 */
export const getTimeInMinutes = (date) => {
  return date.getHours() * 60 + date.getMinutes();
};

/**
 * Create a Date object for the next occurrence of a given time in minutes
 *
 * @param {number} timeInMinutes - Time of day in minutes
 * @param {Date} now - Current date/time (defaults to new Date())
 * @returns {Date} - Date object for the next occurrence
 */
export const createNextDate = (timeInMinutes, now = new Date()) => {
  const nextDate = new Date(now);
  const hours = Math.floor(timeInMinutes / 60);
  const minutes = timeInMinutes % 60;
  nextDate.setHours(hours, minutes, 0, 0);

  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
};

/**
 * Find the next arrival time from a list of arrival times
 *
 * @param {Array} allArrivalTimes - Array of arrival time objects with arrivalTime and isRealTime properties
 * @param {Date} now - Current date/time (defaults to new Date())
 * @returns {Object|null} - Next arrival object or null
 */
export const findNextArrival = (allArrivalTimes, now = new Date()) => {
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  // First, try to find real-time arrivals that are still in the future
  const realTimeArrivals = allArrivalTimes.filter(
    (time) => time.isRealTime && time.arrivalTime > now
  );

  if (realTimeArrivals.length > 0) {
    return realTimeArrivals[0];
  }

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
    return {
      ...nextToday,
      arrivalTime: createNextDate(nextToday.timeOfDay, now),
    };
  } else {
    const firstTomorrow = timesByTimeOfDay[0];
    if (firstTomorrow) {
      return {
        ...firstTomorrow,
        arrivalTime: createNextDate(firstTomorrow.timeOfDay, now),
      };
    }
  }

  return null;
};

/**
 * Calculate the last stop time from arrival times
 *
 * @param {Array} allArrivalTimes - Array of arrival time objects
 * @param {Object} nextArrival - Next arrival object
 * @param {Date} now - Current date/time (defaults to new Date())
 * @returns {Date|null} - Last stop time or null
 */
export const calculateLastStopTime = (
  allArrivalTimes,
  nextArrival,
  now = new Date()
) => {
  if (allArrivalTimes.length === 0 || !nextArrival) {
    return null;
  }

  const timesByTimeOfDay = allArrivalTimes
    .map((time) => ({
      ...time,
      timeOfDay: getTimeInMinutes(time.arrivalTime),
    }))
    .sort((a, b) => a.timeOfDay - b.timeOfDay);

  const lastTimeOfDay = timesByTimeOfDay[timesByTimeOfDay.length - 1];
  const nextArrivalTimeOfDay = getTimeInMinutes(nextArrival.arrivalTime);

  if (lastTimeOfDay.timeOfDay > nextArrivalTimeOfDay) {
    return createNextDate(lastTimeOfDay.timeOfDay, now);
  } else {
    const tomorrowDate = createNextDate(lastTimeOfDay.timeOfDay, now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    return tomorrowDate;
  }
};

/**
 * Calculate if next arrival is within 2 stops of last stop
 *
 * @param {Object} nextArrival - Next arrival object
 * @param {Date} lastStopTime - Last stop time
 * @param {Array} allArrivalTimes - Array of arrival time objects
 * @returns {boolean} - True if within 2 stops
 */
export const calculateIsWithinTwoStops = (
  nextArrival,
  lastStopTime,
  allArrivalTimes
) => {
  if (!nextArrival || !lastStopTime) {
    return false;
  }

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
    return stopsBetween <= 2;
  }

  return false;
};

