import React, { useState, useEffect } from "react";
import { getDestinationName } from "../utils/geocodingService";
import "./AddStopForm.css";

/**
 * AddStopForm Component
 *
 * Modal form for adding a new stop
 */
const AddStopForm = ({ onClose, onSubmit, apiKey }) => {
  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    origin: "",
    transit_type: "",
    route_filter: "",
    stop_filter: "",
    arrival_vs_departure: "",
    ferry_direction: "anacortes",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch destination name when destination changes
  useEffect(() => {
    const fetchDestinationName = async () => {
      if (formData.destination && apiKey && apiKey !== "YOUR_API_KEY_HERE") {
        setLoading(true);
        try {
          const name = await getDestinationName(formData.destination, apiKey);
          if (name && !formData.name) {
            setFormData((prev) => ({ ...prev, name: name }));
          }
        } catch (err) {
          console.error("Error fetching destination name:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchDestinationName, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.destination, apiKey]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Validation
    if (!formData.destination) {
      setError("Destination is required");
      setSubmitting(false);
      return;
    }

    if (!formData.transit_type) {
      setError("Transit type is required");
      setSubmitting(false);
      return;
    }

    // Prepare stop data for submission
    const stopData = {
      name: formData.name || null,
      destination: formData.destination,
      origin: formData.origin || null,
      transit_type: formData.transit_type,
      route_filter: formData.route_filter || null,
      stop_filter: formData.stop_filter || null,
      ferry_direction: formData.ferry_direction || null,
      location: formData.location || null,
      arrival: formData.arrival_vs_departure === "arrival",
      departure: formData.arrival_vs_departure === "departure",
    };

    try {
      await onSubmit(stopData);
      // If successful, the parent component will close the form
    } catch (err) {
      // Handle errors from onSubmit (API validation errors, backend errors, etc.)
      let errorMessage = "An error occurred while creating the stop";
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        if (errors.full_messages) {
          errorMessage = errors.full_messages.join(", ");
        } else if (errors.base) {
          errorMessage = Array.isArray(errors.base) ? errors.base.join(", ") : errors.base;
        } else {
          errorMessage = Object.values(errors).flat().join(", ");
        }
      }
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const isTransitType = (type) => formData.transit_type === type;
  const showBusTrainFields = isTransitType("bus") || isTransitType("train");
  const showFerryFields = isTransitType("ferry");
  const showOriginDestination = isTransitType("bike") || isTransitType("walk") || isTransitType("drive");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-stop-form-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="add-stop-form-title">Add Stop</h2>
        
        {error && <div className="add-stop-form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="add-stop-form-field">
            <label>Transit Type *</label>
            <select
              value={formData.transit_type}
              onChange={(e) => handleChange("transit_type", e.target.value)}
              className="add-stop-form-input"
              required
            >
              <option value="">Select transit type</option>
              <option value="bus">Bus</option>
              <option value="train">Train</option>
              <option value="ferry">Ferry</option>
              <option value="bike">Bike</option>
              <option value="walk">Walk</option>
              <option value="drive">Drive</option>
            </select>
          </div>

          <div className="add-stop-form-field">
            <label>Destination Address *</label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => handleChange("destination", e.target.value)}
              className="add-stop-form-input"
              placeholder="Enter destination address"
              required
            />
          </div>

          {showOriginDestination && (
            <div className="add-stop-form-field">
              <label>Origin Address</label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => handleChange("origin", e.target.value)}
                className="add-stop-form-input"
                placeholder="Enter origin address"
              />
            </div>
          )}

          <div className="add-stop-form-field">
            <label>Stop Name (optional)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="add-stop-form-input"
              placeholder="Auto-populated from destination"
            />
            {loading && <span className="add-stop-form-loading">Loading name...</span>}
          </div>

          {showBusTrainFields && (
            <>
              <div className="add-stop-form-field">
                <label>Route Filter (optional)</label>
                <input
                  type="text"
                  value={formData.route_filter}
                  onChange={(e) => handleChange("route_filter", e.target.value)}
                  className="add-stop-form-input"
                  placeholder="e.g., 801, Caltrain"
                />
              </div>

              <div className="add-stop-form-field">
                <label>Stop Filter (optional)</label>
                <input
                  type="text"
                  value={formData.stop_filter}
                  onChange={(e) => handleChange("stop_filter", e.target.value)}
                  className="add-stop-form-input"
                  placeholder="Specific stop/station name to track"
                />
              </div>
            </>
          )}

          {showFerryFields && (
            <>
              <div className="add-stop-form-field">
                <label>Ferry Direction</label>
                <select
                  value={formData.ferry_direction}
                  onChange={(e) => handleChange("ferry_direction", e.target.value)}
                  className="add-stop-form-input"
                >
                  <option value="anacortes">Anacortes to Orcas Island</option>
                  <option value="orcas">Orcas Island to Anacortes</option>
                </select>
              </div>

              <div className="add-stop-form-field">
                <label>Location (optional)</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="add-stop-form-input"
                  placeholder="e.g., Anacortes, WA"
                />
              </div>
            </>
          )}

          <div className="add-stop-form-field">
            <label>Track Arrival or Departure (optional)</label>
            <div className="add-stop-form-radio-group">
              <label className="add-stop-form-radio">
                <input
                  type="radio"
                  name="arrival_vs_departure"
                  value="arrival"
                  checked={formData.arrival_vs_departure === "arrival"}
                  onChange={(e) => handleChange("arrival_vs_departure", e.target.value)}
                />
                Arrival
              </label>
              <label className="add-stop-form-radio">
                <input
                  type="radio"
                  name="arrival_vs_departure"
                  value="departure"
                  checked={formData.arrival_vs_departure === "departure"}
                  onChange={(e) => handleChange("arrival_vs_departure", e.target.value)}
                />
                Departure
              </label>
            </div>
          </div>

          <div className="add-stop-form-buttons">
            <button type="button" onClick={onClose} className="add-stop-form-cancel">
              Cancel
            </button>
            <button type="submit" className="add-stop-form-submit" disabled={submitting}>
              {submitting ? "Creating..." : "Add Stop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStopForm;

