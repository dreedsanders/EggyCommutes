import React, { useState, useRef, useEffect } from "react";
import "./TransitDisplay.css";
import "@fontsource/press-start-2p";
// Import constants
import { CAP_METRO_STOPS, CALTRAIN_STOPS } from "./utils/constants";

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
  onAddStop,
  onDeleteStop,
  editingStop,
  editingHome,
  onCloseEdit,
  onReview,
  onUpdateStop,
  onUpdateHome,
  reviewData,
  pageTitle,
  homeAddress,
  onLogout,
}) {
  // Menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Get customizable colors from environment variables with defaults
  const bgColor = process.env.REACT_APP_DISPLAY_BG_COLOR || "#000000";
  const textColor = process.env.REACT_APP_DISPLAY_TEXT_COLOR || "#CCFF00";

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle logout with confirmation
  const handleLogoutClick = () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (confirmed) {
      setIsMenuOpen(false);
      if (onLogout) {
        onLogout();
      }
    } else {
      setIsMenuOpen(false);
    }
  };

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

  return (
    <div
      className="transit-display-container"
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
      }}
    >
      {/* Page Title Box with Title and Menu */}
      <div className="page-title-box">
        <h1 className="page-title">{pageTitle || "Eggy Commutes"}</h1>
        {/* Menu Button and Dropdown */}
        <div className="menu-container" ref={menuRef}>
          <button
            className="menu-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Menu"
          >
            ☰
          </button>
          {isMenuOpen && (
            <div className="menu-dropdown">
              <div className="menu-item" onClick={() => setIsMenuOpen(false)}>
                Edit Profile
              </div>
              <div
                className="menu-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onEditHome) {
                    onEditHome();
                  }
                }}
              >
                Edit Home Address
              </div>
              <div
                className="menu-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onAddStop) {
                    onAddStop();
                  }
                }}
              >
                Add Stop
              </div>
              <div className="menu-item" onClick={handleLogoutClick}>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All stops in a single flex container */}
      <div className="stops-container">
        {stops.map((stop, index) => {
          const fullIndex = index;
          const isBikeWalkDrive =
            stop.type === "bike" ||
            stop.type === "walk" ||
            stop.type === "drive";
          const bikeBgColor = "rgb(61, 179, 218)"; // Light blue with full opacity
          const bikeTextColor = "#FFA500"; // Highlighter orange

          // Determine the type label
          const typeLabel =
            stop.type === "bike"
              ? "BIKE"
              : stop.type === "walk"
              ? "WALK"
              : stop.type === "drive"
              ? "DRIVE"
              : stop.type === "bus"
              ? "BUS"
              : stop.type === "train"
              ? "TRAIN"
              : "FERRY";

          return (
            <div
              key={`stop-${index}-${stop.id || stop.name}`}
              className={`stop-box ${isBikeWalkDrive ? "bike-box" : ""}`}
              style={{
                backgroundColor: isBikeWalkDrive ? bikeBgColor : bgColor,
                borderColor: "#000000",
                color: isBikeWalkDrive ? bikeTextColor : textColor,
              }}
            >
              {/* Edit and Delete Buttons */}
              <div className="stop-action-buttons">
                <button
                  className="stop-edit-button"
                  onClick={() => onEditStop(fullIndex)}
                  title="Edit stop"
                >
                  ✏️
                </button>
                {stop.id && onDeleteStop && (
                  <button
                    className="stop-delete-button"
                    onClick={() => onDeleteStop(stop.id)}
                    title="Delete stop"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Transit Type Label */}
              <div className="transit-type">{typeLabel}</div>

              {/* Scrolling Stop Name */}
              <div className="stop-name-container">
                <ScrollText
                  text={stop.name}
                  textColor={isBikeWalkDrive ? bikeTextColor : textColor}
                />
              </div>

              {/* Estimated Time for bike/walk/drive, Arrival/Departure for transit */}
              {isBikeWalkDrive ? (
                <div className="arrival-time">
                  <span className="arrival-label">Estimated time:</span>
                  <span className="arrival-value">
                    {stop.estimatedTime || "N/A"}
                  </span>
                </div>
              ) : (
                <>
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
                </>
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
