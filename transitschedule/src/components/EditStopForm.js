import React, { useState } from "react";
import { CAP_METRO_STOPS, CALTRAIN_STOPS } from "../utils/constants";
import "./EditStopForm.css";

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
  let defaultRouteNumber = stop.routeFilter || "";
  let defaultStopName = "";
  let inputMode = "stopName"; // For train: "stopName" or "originDestination"

  if (stop.type === "bike" && stop.name === "To Springs") {
    defaultDestination = "2131 William Barton Dr, Austin, TX 78746";
  } else if (stop.type === "walk" && stop.name === "To HEB") {
    defaultDestination = "2400 S. CONGRESS AVE. AUSTIN, TX 78704";
  } else if (stop.type === "drive" && stop.name === "Central Market") {
    defaultDestination = "4477 S Lamar Blvd, Austin, TX 78745";
  } else if (stop.type === "bus") {
    // For bus, use origin as the selected stop
    defaultStop = stop.origin || "";
    defaultRouteNumber = stop.routeFilter || "";
    defaultStopName = stop.origin || "";
  } else if (stop.type === "train") {
    // For train, determine if we have origin/destination or just stop name
    if (stop.origin && stop.destination) {
      inputMode = "originDestination";
      defaultOrigin = stop.origin || "";
      defaultDestination = stop.destination || "";
    } else {
      inputMode = "stopName";
      defaultStop = stop.origin || "South San Francisco Caltrain Station, CA";
    }
  }

  const [formData, setFormData] = useState({
    origin: defaultOrigin,
    destination: defaultDestination,
    selectedStop: defaultStop,
    routeNumber: defaultRouteNumber,
    stopName: defaultStopName,
    ferryDirection: stop.ferryDirection || "anacortes",
    trainInputMode: inputMode,
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
    } else if (stop.type === "bus") {
      // For bus, track route number, stop name, and destination changes
      if (formData.routeNumber !== (configToCompare.routeFilter || "")) {
        changes.routeNumber = {
          from: configToCompare.routeFilter || "",
          to: formData.routeNumber,
        };
      }
      if (formData.stopName !== (configToCompare.origin || "")) {
        changes.stopName = {
          from: configToCompare.origin || "",
          to: formData.stopName,
        };
      }
      if (formData.destination !== (configToCompare.destination || "")) {
        changes.destination = {
          from: configToCompare.destination || "",
          to: formData.destination,
        };
      }
    } else if (stop.type === "train") {
      // For train, track based on input mode
      if (formData.trainInputMode === "stopName") {
        if (formData.selectedStop !== (configToCompare.origin || "")) {
          changes.stop = {
            from: configToCompare.origin || "",
            to: formData.selectedStop,
          };
        }
      } else {
        // originDestination mode
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
      onReview({ stopIndex, formData: { ...formData }, changes });
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
          <>
            <div className="edit-form-field">
              <label>Route Number (optional):</label>
              <input
                type="text"
                value={formData.routeNumber}
                onChange={(e) => handleChange("routeNumber", e.target.value)}
                className="edit-form-input"
                placeholder="Enter route number (e.g., 801)"
              />
            </div>
            <div className="edit-form-field">
              <label>Stop Name (optional):</label>
              <input
                type="text"
                value={formData.stopName}
                onChange={(e) => handleChange("stopName", e.target.value)}
                className="edit-form-input"
                placeholder="Enter stop name"
              />
            </div>
            <div className="edit-form-field">
              <label>Destination (optional):</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => handleChange("destination", e.target.value)}
                className="edit-form-input"
                placeholder="Enter destination"
              />
            </div>
          </>
        ) : stop.type === "train" ? (
          <>
            <div className="edit-form-field">
              <label>Input Mode:</label>
              <div
                style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
              >
                <label
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <input
                    type="radio"
                    value="stopName"
                    checked={formData.trainInputMode === "stopName"}
                    onChange={(e) =>
                      handleChange("trainInputMode", e.target.value)
                    }
                  />
                  Stop Name
                </label>
                <label
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <input
                    type="radio"
                    value="originDestination"
                    checked={formData.trainInputMode === "originDestination"}
                    onChange={(e) =>
                      handleChange("trainInputMode", e.target.value)
                    }
                  />
                  Origin & Destination
                </label>
              </div>
            </div>
            {formData.trainInputMode === "stopName" ? (
              <div className="edit-form-field">
                <label>Caltrain Stop (optional):</label>
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
                  <label>Origin (optional):</label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => handleChange("origin", e.target.value)}
                    className="edit-form-input"
                    placeholder="Enter origin"
                  />
                </div>
                <div className="edit-form-field">
                  <label>Destination (optional):</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) =>
                      handleChange("destination", e.target.value)
                    }
                    className="edit-form-input"
                    placeholder="Enter destination"
                  />
                </div>
              </>
            )}
          </>
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

export default EditStopForm;
