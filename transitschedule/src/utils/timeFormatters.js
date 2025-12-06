/**
 * formatArrivalTime Function
 *
 * Formats the arrival time for display. Converts Date object or time string
 * to a readable format in Central Time Zone.
 *
 * @param {Date|string} time - The arrival time to format
 * @returns {string} - Formatted time string (e.g., "3:45 PM")
 */
export const formatArrivalTime = (time) => {
  if (!time) return "N/A";

  // If it's already a Date object, use it; otherwise parse it
  const date = time instanceof Date ? time : new Date(time);

  // Convert to Central Time Zone
  const options = {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  return date.toLocaleString("en-US", options);
};

