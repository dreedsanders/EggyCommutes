import React, { useState } from "react";
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
 * EditStopForm Component
 *
 * Modal form for editing stop information
 */
// Cap Metro official stops (major stops)
const CAP_METRO_STOPS = [
  "Congress and Oltorf, Austin, TX",
  "Downtown Station, Austin, TX",
  "Lamar and Oltorf, Austin, TX",
  "South Congress and Oltorf, Austin, TX",
  "Riverside and Congress, Austin, TX",
  "South First and Oltorf, Austin, TX",
  "Barton Springs and Lamar, Austin, TX",
  "Guadalupe and 24th, Austin, TX",
  "Guadalupe and MLK, Austin, TX",
  "UT West Mall, Austin, TX",
  "UT Main Building, Austin, TX",
  "Capitol Station, Austin, TX",
  "Republic Square, Austin, TX",
  "Convention Center, Austin, TX",
  "Riverside and Pleasant Valley, Austin, TX",
];

// Caltrain official stops
const CALTRAIN_STOPS = [
  "San Francisco Caltrain Station, CA",
  "22nd Street, CA",
  "Bayshore, CA",
  "South San Francisco Caltrain Station, CA",
  "San Bruno, CA",
  "Millbrae, CA",
  "Broadway, CA",
  "Burlingame, CA",
  "San Mateo, CA",
  "Hayward Park, CA",
  "Hillsdale, CA",
  "Belmont, CA",
  "San Carlos, CA",
  "Redwood City, CA",
  "Menlo Park, CA",
  "Palo Alto, CA",
  "California Avenue, CA",
  "San Antonio, CA",
  "Mountain View, CA",
  "Sunnyvale, CA",
  "Lawrence, CA",
  "Santa Clara, CA",
  "College Park, CA",
  "San Jose Diridon, CA",
  "Tamien, CA",
  "Capitol, CA",
  "Blossom Hill, CA",
  "Morgan Hill, CA",
  "San Martin, CA",
  "Gilroy, CA",
];

const EditStopForm = ({
  stop,
  stopIndex,
  onClose,
  onReview,
  previousConfig,
  homeAddress,
}) => {
  // Default origin to home address for bike, walk, drive stops only
  const defaultOrigin =
    stop.type === "bike" || stop.type === "walk" || stop.type === "drive"
      ? homeAddress || ""
      : stop.origin || "";

  // Default destination to original destination for bike, walk, drive stops
  // Use specific addresses based on stop type/name
  let defaultDestination = "";
  let defaultStop = stop.origin || "";

  if (stop.type === "bike" && stop.name === "To Springs") {
    defaultDestination = "2131 William Barton Dr, Austin, TX 78746";
  } else if (stop.type === "walk" && stop.name === "To HEB") {
    defaultDestination = "2400 S. CONGRESS AVE. AUSTIN, TX 78704";
  } else if (stop.type === "drive" && stop.name === "Central Market") {
    defaultDestination = "4477 S Lamar Blvd, Austin, TX 78745";
  } else if (stop.type === "bus") {
    // For bus, use origin as the selected stop
    defaultStop = stop.origin || "Congress and Oltorf, Austin, TX";
  } else if (stop.type === "train") {
    // For train, use origin as the selected stop
    defaultStop = stop.origin || "South San Francisco Caltrain Station, CA";
  }

  const [formData, setFormData] = useState({
    origin: defaultOrigin,
    destination: defaultDestination,
    selectedStop: defaultStop,
    ferryDirection: stop.ferryDirection || "anacortes",
  });

  // Use previousConfig if available, otherwise use stop
  const configToCompare = previousConfig || stop;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleReview = () => {
    const changes = {};
    if (stop.type === "ferry") {
      if (formData.ferryDirection !== configToCompare.ferryDirection) {
        changes.direction = {
          from:
            configToCompare.ferryDirection === "anacortes"
              ? "Anacortes"
              : "Orcas Island",
          to:
            formData.ferryDirection === "anacortes"
              ? "Anacortes"
              : "Orcas Island",
        };
      }
    } else if (stop.type === "bus" || stop.type === "train") {
      // For bus and train, only track stop changes
      if (formData.selectedStop !== (configToCompare.origin || "")) {
        changes.stop = {
          from: configToCompare.origin || "",
          to: formData.selectedStop,
        };
      }
    } else {
      // For bike, walk, drive
      if (formData.origin !== (configToCompare.origin || "")) {
        changes.origin = {
          from: configToCompare.origin || "",
          to: formData.origin,
        };
      }
      if (formData.destination !== (configToCompare.destination || "")) {
        changes.destination = {
          from: configToCompare.destination || "",
          to: formData.destination,
        };
      }
    }

    // Only show review if there are changes
    if (Object.keys(changes).length > 0) {
      // For bus/train, set origin from selectedStop
      const reviewFormData = { ...formData };
      if (stop.type === "bus" || stop.type === "train") {
        reviewFormData.origin = formData.selectedStop;
      }
      onReview({ stopIndex, formData: reviewFormData, changes });
    } else {
      alert("No changes to review");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-form-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="edit-form-title">Edit Stop</h2>
        {stop.type === "ferry" ? (
          <div className="edit-form-field">
            <label>Direction:</label>
            <select
              value={formData.ferryDirection}
              onChange={(e) => handleChange("ferryDirection", e.target.value)}
              className="edit-form-input"
            >
              <option value="anacortes">Anacortes to Orcas Island</option>
              <option value="orcas">Orcas Island to Anacortes</option>
            </select>
          </div>
        ) : stop.type === "bus" ? (
          <div className="edit-form-field">
            <label>Cap Metro Stop:</label>
            <select
              value={formData.selectedStop}
              onChange={(e) => handleChange("selectedStop", e.target.value)}
              className="edit-form-input"
            >
              {CAP_METRO_STOPS.map((stopName) => (
                <option key={stopName} value={stopName}>
                  {stopName}
                </option>
              ))}
            </select>
          </div>
        ) : stop.type === "train" ? (
          <div className="edit-form-field">
            <label>Caltrain Stop:</label>
            <select
              value={formData.selectedStop}
              onChange={(e) => handleChange("selectedStop", e.target.value)}
              className="edit-form-input"
            >
              {CALTRAIN_STOPS.map((stopName) => (
                <option key={stopName} value={stopName}>
                  {stopName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="edit-form-field">
              <label>Origin:</label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => handleChange("origin", e.target.value)}
                className="edit-form-input"
                placeholder="Enter origin"
              />
            </div>
            <div className="edit-form-field">
              <label>Destination:</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => handleChange("destination", e.target.value)}
                className="edit-form-input"
                placeholder="Enter destination"
              />
            </div>
          </>
        )}
        <div className="edit-form-buttons">
          <button onClick={onClose} className="edit-form-cancel">
            Cancel
          </button>
          <button onClick={handleReview} className="edit-form-review">
            Review
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * ReviewPopup Component
 *
 * Popup showing changes summary before submission
 */
const ReviewPopup = ({ reviewData, onClose, onSubmit }) => {
  const { changes } = reviewData;

  return (
    <div className="review-popup-overlay">
      <div className="review-popup">
        <h3>Review Changes</h3>
        <div className="review-changes">
          {Object.keys(changes).map((key) => (
            <div key={key} className="review-change-item">
              <strong>
                {key === "direction"
                  ? "Direction"
                  : key.charAt(0).toUpperCase() + key.slice(1)}
                :
              </strong>
              <div className="review-change">
                <span className="review-from">{changes[key].from}</span>
                <span className="review-arrow">→</span>
                <span className="review-to">{changes[key].to}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="review-popup-buttons">
          <button onClick={onClose} className="review-cancel">
            Cancel
          </button>
          <button onClick={onSubmit} className="review-submit">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * EditHomeForm Component
 *
 * Modal form for editing home address and page title
 */
const EditHomeForm = ({ homeAddress, pageTitle, onClose, onReview }) => {
  // Parse home address - format is typically "street city state zip"
  const parseAddress = (addr) => {
    if (!addr)
      return { address1: "", address2: "", city: "", state: "", zip: "" };

    const parts = addr.split(",").map((p) => p.trim());
    if (parts.length >= 3) {
      // Format: "street, city, state zip"
      const stateZip = parts[2].split(" ");
      return {
        address1: parts[0] || "",
        address2: "",
        city: parts[1] || "",
        state: stateZip[0] || "",
        zip: stateZip[1] || "",
      };
    } else if (parts.length === 2) {
      // Format: "street, city state zip" or "street city, state zip"
      const lastPart = parts[1].split(" ");
      if (lastPart.length >= 3) {
        // "city state zip"
        return {
          address1: parts[0] || "",
          address2: "",
          city: lastPart[0] || "",
          state: lastPart[1] || "",
          zip: lastPart[2] || "",
        };
      } else {
        // "state zip"
        return {
          address1: parts[0] || "",
          address2: "",
          city: "",
          state: lastPart[0] || "",
          zip: lastPart[1] || "",
        };
      }
    } else {
      // Single part - try to parse "street city state zip"
      const words = addr.split(" ");
      if (words.length >= 4) {
        const zip = words[words.length - 1];
        const state = words[words.length - 2];
        const cityStart = words.length - 3;
        return {
          address1: words.slice(0, cityStart).join(" ") || "",
          address2: "",
          city: words[cityStart] || "",
          state: state || "",
          zip: zip || "",
        };
      }
    }
    return { address1: addr, address2: "", city: "", state: "", zip: "" };
  };

  const parsed = parseAddress(homeAddress);
  const [formData, setFormData] = useState({
    name: pageTitle || "",
    address1: parsed.address1,
    address2: parsed.address2,
    city: parsed.city,
    state: parsed.state,
    zip: parsed.zip,
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleReview = () => {
    const fullAddress = `${formData.address1}${
      formData.address2 ? " " + formData.address2 : ""
    }, ${formData.city}, ${formData.state} ${formData.zip}`.trim();
    const changes = {};
    if (formData.name !== pageTitle) {
      changes.name = { from: pageTitle, to: formData.name };
    }
    if (fullAddress !== homeAddress) {
      changes.address = { from: homeAddress, to: fullAddress };
    }

    // Only show review if there are changes
    if (Object.keys(changes).length > 0) {
      onReview({ formData, changes, fullAddress });
    } else {
      alert("No changes to review");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-form-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="edit-form-title">Edit Home Address</h2>
        <div className="edit-form-field">
          <label>Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="edit-form-input"
            placeholder="Enter name (e.g., Eggy Commutes)"
          />
        </div>
        <div className="edit-form-field">
          <label>Address Line 1:</label>
          <input
            type="text"
            value={formData.address1}
            onChange={(e) => handleChange("address1", e.target.value)}
            className="edit-form-input"
            placeholder="Enter address line 1"
          />
        </div>
        <div className="edit-form-field">
          <label>Address Line 2:</label>
          <input
            type="text"
            value={formData.address2}
            onChange={(e) => handleChange("address2", e.target.value)}
            className="edit-form-input"
            placeholder="Enter address line 2 (optional)"
          />
        </div>
        <div className="edit-form-field">
          <label>City:</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            className="edit-form-input"
            placeholder="Enter city"
          />
        </div>
        <div className="edit-form-field">
          <label>State:</label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => handleChange("state", e.target.value)}
            className="edit-form-input"
            placeholder="Enter state"
          />
        </div>
        <div className="edit-form-field">
          <label>Zip Code:</label>
          <input
            type="text"
            value={formData.zip}
            onChange={(e) => handleChange("zip", e.target.value)}
            className="edit-form-input"
            placeholder="Enter zip code"
          />
        </div>
        <div className="edit-form-buttons">
          <button onClick={onClose} className="edit-form-cancel">
            Cancel
          </button>
          <button onClick={handleReview} className="edit-form-review">
            Review
          </button>
        </div>
      </div>
    </div>
  );
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
function TransitDisplay({
  stops,
  onEditStop,
  onEditHome,
  editingStop,
  editingHome,
  onCloseEdit,
  onReview,
  onUpdateStop,
  onUpdateHome,
  reviewData,
  pageTitle,
  homeAddress,
}) {
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
        <h1 className="page-title">{pageTitle || "Eggy Commutes"}</h1>
        <button
          className="home-edit-button"
          onClick={onEditHome}
          title="Edit home address and title"
        >
          ✏️
        </button>
      </div>

      {/* Bike/Walk/Drive stops on the left */}
      <div className="bike-stops-container">
        {bikeWalkDriveStops.map((stop, index) => {
          // Find the actual index in the full stops array
          const fullIndex = stops.findIndex((s) => s === stop);
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
              {/* Edit Button */}
              <button
                className="stop-edit-button"
                onClick={() => onEditStop(fullIndex)}
                title="Edit stop"
              >
                ✏️
              </button>

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
        {transitStops.map((stop, index) => {
          // Find the actual index in the full stops array
          const fullIndex = stops.findIndex((s) => s === stop);
          return (
            <div
              key={`transit-${index}`}
              className="stop-box"
              style={{
                backgroundColor: bgColor,
                borderColor: "#000000",
                color: textColor,
              }}
            >
              {/* Edit Button */}
              <button
                className="stop-edit-button"
                onClick={() => onEditStop(fullIndex)}
                title="Edit stop"
              >
                ✏️
              </button>

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
          );
        })}
      </div>

      {/* Edit Stop Modal */}
      {editingStop !== null && stops[editingStop] && (
        <EditStopForm
          stop={stops[editingStop]}
          stopIndex={editingStop}
          onClose={onCloseEdit}
          onReview={onReview}
          previousConfig={stops[editingStop]}
          homeAddress={homeAddress}
        />
      )}

      {/* Edit Home Modal */}
      {editingHome && (
        <EditHomeForm
          homeAddress={homeAddress}
          pageTitle={pageTitle}
          onClose={onCloseEdit}
          onReview={onReview}
        />
      )}

      {/* Review Popup */}
      {reviewData && (
        <ReviewPopup
          reviewData={reviewData}
          onClose={() => onReview(null)}
          onSubmit={() => {
            if (reviewData.fullAddress) {
              // Home address update
              onUpdateHome(reviewData.fullAddress, reviewData.formData.name);
            } else {
              // Stop update
              onUpdateStop(reviewData.stopIndex, reviewData.formData);
            }
          }}
        />
      )}
    </div>
  );
}

export default TransitDisplay;
