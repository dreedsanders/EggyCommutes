import axios from "axios";
import { getDestinationName, parseApiError } from "./helpers";
import { processBikeResponse } from "../services/bikeService";
import { processWalkResponse } from "../services/walkService";
import { processDriveResponse } from "../services/driveService";
import { processBusResponse } from "../services/busService";
import { processTrainResponse } from "../services/trainService";
import { fetchAllTransitTimes } from "./transitDataFetcher";

/**
 * Update a single stop's configuration
 *
 * @param {Object} params - Update parameters
 * @param {Object} params.stop - Current stop object
 * @param {number} params.stopIndex - Index of stop in stops array
 * @param {Object} params.newConfig - New configuration
 * @param {string} params.apiKey - Google Maps API key
 * @param {string} params.homeAddress - Home address
 * @param {string} params.ferryDirection - Ferry direction
 * @param {Array} params.stops - Current stops array
 * @param {Function} params.setStops - Function to update stops state
 * @param {Function} params.setFerryDirection - Function to update ferry direction
 * @param {Function} params.setEditingStop - Function to close edit modal
 * @param {Function} params.setReviewData - Function to clear review data
 * @returns {Promise<void>}
 */
export const updateStop = async ({
  stop,
  stopIndex,
  newConfig,
  apiKey,
  homeAddress,
  ferryDirection,
  stops,
  setStops,
  setFerryDirection,
  setEditingStop,
  setReviewData,
}) => {
  if (!stop) return;

  // Save previous config for rollback
  const previousConfig = {
    ...stop,
    origin: stop.origin,
    destination: stop.destination,
    ferryDirection: stop.ferryDirection,
  };

  try {
    // For ferry, just update direction
    if (stop.type === "ferry") {
      const newFerryDirection = newConfig.ferryDirection || "anacortes";
      setFerryDirection(newFerryDirection);
      // Re-fetch to update ferry schedule
      await fetchAllTransitTimes(setStops, apiKey, homeAddress, newFerryDirection);
      setEditingStop(null);
      setReviewData(null);
      // Reload page with new information
      window.location.reload();
      return;
    }

    // For other stops, make API call
    const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
    let params;

    if (stop.type === "bike" || stop.type === "walk" || stop.type === "drive") {
      params = {
        origin: newConfig.origin,
        destination: newConfig.destination,
        mode: stop.mode,
        key: apiKey,
      };
    } else if (stop.type === "bus") {
      // For bus, use selectedStop as origin, destination is always Downtown
      params = {
        origin: newConfig.selectedStop || newConfig.origin,
        destination: "Downtown Station, Austin, TX",
        mode: "transit",
        transit_mode: "bus",
        departure_time: "now",
        alternatives: true,
        key: apiKey,
      };
    } else if (stop.type === "train") {
      // For train, use selectedStop as origin, destination is always SF
      params = {
        origin: newConfig.selectedStop || newConfig.origin,
        destination: "San Francisco Caltrain Station, CA",
        mode: "transit",
        transit_mode: "rail",
        departure_time: "now",
        alternatives: true,
        key: apiKey,
      };
    }

    const response = await axios.get(baseUrl, { params });

    if (response.data && response.data.status === "OK") {
      // Get updated destination name if destination was changed
      let updatedName = stop.name;
      if (
        (stop.type === "bike" ||
          stop.type === "walk" ||
          stop.type === "drive") &&
        newConfig.destination !== (stop.destination || "")
      ) {
        // Destination was changed, get the new name
        updatedName = await getDestinationName(newConfig.destination, apiKey);
      } else if (
        (stop.type === "bus" || stop.type === "train") &&
        newConfig.selectedStop !== (stop.origin || "")
      ) {
        // Stop was changed for bus/train, use the selected stop name
        updatedName = newConfig.selectedStop || stop.name;
      }

      // Process the response using appropriate service
      const updatedConfig = {
        ...stop,
        name: updatedName,
        origin:
          stop.type === "bus" || stop.type === "train"
            ? newConfig.selectedStop || newConfig.origin
            : newConfig.origin,
        destination:
          stop.type === "bus" || stop.type === "train"
            ? stop.type === "bus"
              ? "Downtown Station, Austin, TX"
              : "San Francisco Caltrain Station, CA"
            : newConfig.destination,
      };

      let processedStop;
      switch (stop.type) {
        case "bike":
          processedStop = processBikeResponse(updatedConfig, response.data);
          break;
        case "walk":
          processedStop = processWalkResponse(updatedConfig, response.data);
          break;
        case "drive":
          processedStop = processDriveResponse(updatedConfig, response.data);
          break;
        case "bus":
          processedStop = processBusResponse(updatedConfig, response.data);
          break;
        case "train":
          processedStop = processTrainResponse(updatedConfig, response.data);
          break;
        default:
          processedStop = updatedConfig;
      }

      const newStops = [...stops];
      newStops[stopIndex] = processedStop;
      setStops(newStops);
      setEditingStop(null);
      setReviewData(null);

      // Re-fetch all transit data
      await fetchAllTransitTimes(setStops, apiKey, homeAddress, ferryDirection);

      // Reload page with new information after data is fetched
      window.location.reload();
    } else {
      // Handle API error responses
      const status = response.data?.status;
      let errorMsg = response.data?.error_message || "Unknown error occurred";

      if (status === "ZERO_RESULTS") {
        errorMsg = "Can not route to destination";
      } else if (status === "NOT_FOUND") {
        errorMsg = "Address does not exist";
      } else if (status === "INVALID_REQUEST") {
        errorMsg = "Invalid request - please check your inputs";
      }

      throw new Error(errorMsg);
    }
  } catch (error) {
    let errorMessage = "An error occurred";

    // Parse specific error messages using helper
    errorMessage = parseApiError(error);

    // Show error alert with specific message
    alert(`Error: ${errorMessage}`);

    // Revert to previous configuration
    if (previousConfig) {
      const newStops = [...stops];
      newStops[stopIndex] = previousConfig;
      setStops(newStops);
    }

    setEditingStop(null);
    setReviewData(null);
  }
};

