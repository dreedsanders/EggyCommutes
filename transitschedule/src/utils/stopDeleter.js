import { hideStop } from "../services/stopService";

/**
 * Handle stop deletion (hiding)
 *
 * @param {Object} params - Deletion parameters
 * @param {string} params.stopId - ID of stop to delete
 * @param {Function} params.setUserStops - Function to update user stops state
 * @param {Function} params.setStops - Function to update stops state
 * @returns {Promise<void>}
 */
export const handleDeleteStop = async ({ stopId, setUserStops, setStops }) => {
  if (!window.confirm("Are you sure you want to remove this stop?")) {
    return;
  }

  try {
    await hideStop(stopId);
    // Remove from local state immediately
    setUserStops((prev) => prev.filter((stop) => stop.id !== stopId));
    // Also remove from stops if it's there
    setStops((prev) => prev.filter((stop) => stop.id !== stopId));
  } catch (error) {
    console.error("Error hiding stop:", error);
    alert(`Error removing stop: ${error.message || "Unknown error"}`);
  }
};

