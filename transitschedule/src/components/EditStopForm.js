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

export default EditStopForm;

