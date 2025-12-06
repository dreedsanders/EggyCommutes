import React, { useState, useRef, useEffect } from "react";
import "./TransitDisplay.css";
import "@fontsource/press-start-2p";
// Import components
import ScrollText from "./components/ScrollText";
import EditStopForm from "./components/EditStopForm";
import ReviewPopup from "./components/ReviewPopup";
import EditHomeForm from "./components/EditHomeForm";
// Import utilities
import { formatArrivalTime } from "./utils/timeFormatters";

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
              onClick={() => onEditStop(fullIndex)}
            >
              {/* Delete Button - only show on hover */}
              {stop.id && onDeleteStop && (
                <div className="stop-action-buttons">
                  <button
                    className="stop-delete-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the box click
                      onDeleteStop(stop.id);
                    }}
                    title="Delete stop"
                  >
                    🗑️
                  </button>
                </div>
              )}

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
