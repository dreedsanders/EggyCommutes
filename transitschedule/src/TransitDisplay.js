import React from "react";
import "./TransitDisplay.css";
import "@fontsource/press-start-2p";

/**
 * ScrollText Component
 *
 * Handles the scrolling animation for stop names to mimic a bus display sign.
 * The text scrolls horizontally when it overflows the container width.
 *
 * @param {string} text - The stop name text to scroll
 * @param {string} textColor - The color of the scrolling text
 */
const ScrollText = ({ text, textColor }) => {
  // Always enable scrolling for bus-style display effect
  const needsScroll = text && text.length > 0;

  // Duplicate text multiple times for seamless wrapping effect
  const wrappedText = needsScroll ? `${text} • ${text} • ${text} • ` : text;

  return (
    <div className="scroll-text-container">
      <div
        className={`scroll-text ${needsScroll ? "scrolling" : ""}`}
        style={{ color: textColor }}
      >
        {wrappedText}
      </div>
    </div>
  );
};

/**
 * formatArrivalTime Function
 *
 * Formats the arrival time for display. Converts Date object or time string
 * to a readable format in Central Time Zone.
 *
 * @param {Date|string} time - The arrival time to format
 * @returns {string} - Formatted time string (e.g., "3:45 PM")
 */
const formatArrivalTime = (time) => {
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

/**
 * TransitDisplay Component
 *
 * Main component that renders transit arrival times in a bus-style display format.
 * Each stop is displayed in a box with scrolling stop names, pixelated fonts,
 * and customizable styling. Shows transit type, next arrival time, and conditional
 * last stop information.
 *
 * @param {Object} props - Component props
 * @param {Array} props.stops - Array of stop data objects containing:
 *   - name: string - The stop name
 *   - type: 'bus' | 'train' - The transit type
 *   - allArrivalTimes: Array - All arrival times for this stop
 *   - nextArrivalTime: string - Next arrival time in Central Time Zone
 *   - lastStopTime: string | null - Last stop time for this stop
 *   - isWithinTwoStops: boolean - Whether next arrival is within 2 stops of last stop
 */
function TransitDisplay({ stops }) {
  // Get customizable colors from environment variables with defaults
  const bgColor = process.env.REACT_APP_DISPLAY_BG_COLOR || "#000000";
  const textColor = process.env.REACT_APP_DISPLAY_TEXT_COLOR || "#CCFF00";

  if (!stops || stops.length === 0) {
    return (
      <div className="transit-display-container">
        <div className="no-data-message" style={{ color: textColor }}>
          Loading transit data...
        </div>
      </div>
    );
  }

  // Background image path - using process.env.PUBLIC_URL for proper path resolution
  const backgroundImageUrl = `${
    process.env.PUBLIC_URL || ""
  }/images/Commute_Champions.jpg`;

  // Separate bike/walk/drive stops and transit stops for different positioning
  const bikeWalkDriveStops = stops.filter(
    (stop) =>
      stop.type === "bike" || stop.type === "walk" || stop.type === "drive"
  );
  const transitStops = stops.filter(
    (stop) =>
      stop.type !== "bike" && stop.type !== "walk" && stop.type !== "drive"
  );

  return (
    <div
      className="transit-display-container"
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
      }}
    >
      {/* Page Title */}
      <div className="page-title-box">
        <h1 className="page-title">Eggy Commutes</h1>
      </div>

      {/* Bike/Walk/Drive stops on the left */}
      <div className="bike-stops-container">
        {bikeWalkDriveStops.map((stop, index) => {
          const bikeBgColor = "rgb(61, 179, 218)"; // Light blue with full opacity
          const bikeTextColor = "#FFA500"; // Highlighter orange

          // Determine the type label
          const typeLabel =
            stop.type === "bike"
              ? "BIKE"
              : stop.type === "walk"
              ? "WALK"
              : "DRIVE";

          return (
            <div
              key={`bike-walk-drive-${index}`}
              className="stop-box bike-box"
              style={{
                backgroundColor: bikeBgColor,
                borderColor: "#000000",
                color: bikeTextColor,
              }}
            >
              {/* Transit Type Label */}
              <div className="transit-type">{typeLabel}</div>

              {/* Scrolling Stop Name */}
              <div className="stop-name-container">
                <ScrollText text={stop.name} textColor={bikeTextColor} />
              </div>

              {/* Estimated Time */}
              <div className="arrival-time">
                <span className="arrival-label">Estimated time:</span>
                <span className="arrival-value">
                  {stop.estimatedTime || "N/A"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transit stops on the right */}
      <div className="transit-stops-container">
        {transitStops.map((stop, index) => (
          <div
            key={`transit-${index}`}
            className="stop-box"
            style={{
              backgroundColor: bgColor,
              borderColor: "#000000",
              color: textColor,
            }}
          >
            {/* Transit Type Label */}
            <div className="transit-type">
              {stop.type === "bus"
                ? "BUS"
                : stop.type === "train"
                ? "TRAIN"
                : "FERRY"}
            </div>

            {/* Scrolling Stop Name */}
            <div className="stop-name-container">
              <ScrollText text={stop.name} textColor={textColor} />
            </div>

            {/* Next Arrival/Departure Time */}
            <div className="arrival-time">
              <span className="arrival-label">
                {stop.type === "ferry"
                  ? "Next departure time:"
                  : "Next arrival time:"}
              </span>
              <span className="arrival-value">
                {stop.type === "ferry"
                  ? formatArrivalTime(stop.nextDepartureTime)
                  : formatArrivalTime(stop.nextArrivalTime)}
              </span>
            </div>

            {/* Conditional Last Stop Display */}
            {stop.isWithinTwoStops && stop.lastStopTime && (
              <div className="last-stop">
                Last stop: {formatArrivalTime(stop.lastStopTime)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransitDisplay;
