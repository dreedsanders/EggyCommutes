import React, { useState } from "react";
import "./EditHomeForm.css";

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

export default EditHomeForm;

