import React from "react";
import "./ReviewPopup.css";

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
          <button
            onClick={() => {
              console.log("[ReviewPopup] Submit button clicked");
              console.log("[ReviewPopup] reviewData:", reviewData);
              console.log("[ReviewPopup] reviewData.stopIndex:", reviewData.stopIndex);
              console.log("[ReviewPopup] reviewData.formData:", reviewData.formData);
              onSubmit();
            }}
            className="review-submit"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPopup;

