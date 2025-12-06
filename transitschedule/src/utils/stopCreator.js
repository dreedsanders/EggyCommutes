import axios from "axios";
import { parseApiError } from "./helpers";
import { createStop } from "../services/stopService";
import { getBikeStopData } from "../services/bikeService";
import { getWalkStopData } from "../services/walkService";
import { getDriveStopData } from "../services/driveService";
import { getBusStopData } from "../services/busService";
import { getTrainStopData } from "../services/trainService";
import { getFerryStopData } from "../services/ferryService";

/**
 * Handle stop creation from AddStopForm
 *
 * @param {Object} params - Creation parameters
 * @param {Object} params.stopData - Stop data from form
 * @param {string} params.apiKey - Google Maps API key
 * @param {string} params.homeAddress - Home address
 * @param {Function} params.setStops - Function to update stops state
 * @param {Function} params.loadUserStops - Function to reload user stops
 * @param {Function} params.setAddingStop - Function to close add form
 * @returns {Promise<void>}
 */
export const handleCreateStop = async ({
  stopData,
  apiKey,
  homeAddress,
  setStops,
  loadUserStops,
  setAddingStop,
}) => {
  try {
    // First, validate the stop with Google Maps API
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
      const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
      let params;

      // Validate based on transit type
      if (
        stopData.transit_type === "bike" ||
        stopData.transit_type === "walk" ||
        stopData.transit_type === "drive"
      ) {
        const origin = stopData.origin || homeAddress;
        if (!origin) {
          throw new Error(
            "Origin address is required for " + stopData.transit_type + " stops"
          );
        }
        params = {
          origin: origin,
          destination: stopData.destination,
          mode:
            stopData.transit_type === "bike"
              ? "bicycling"
              : stopData.transit_type === "walk"
              ? "walking"
              : "driving",
          key: apiKey,
        };
      } else if (stopData.transit_type === "bus") {
        const origin =
          stopData.destination ||
          stopData.origin ||
          "Congress and Oltorf, Austin, TX";
        params = {
          origin: origin,
          destination: "Downtown Station, Austin, TX",
          mode: "transit",
          transit_mode: "bus",
          departure_time: "now",
          alternatives: true,
          key: apiKey,
        };
      } else if (stopData.transit_type === "train") {
        const origin =
          stopData.destination ||
          stopData.origin ||
          "South San Francisco Caltrain Station, CA";
        params = {
          origin: origin,
          destination: "San Francisco Caltrain Station, CA",
          mode: "transit",
          transit_mode: "rail",
          departure_time: "now",
          alternatives: true,
          key: apiKey,
        };
      }
      // Ferry doesn't need API validation

      // Validate with API if not ferry
      if (params && stopData.transit_type !== "ferry") {
        try {
          const validationResponse = await axios.get(baseUrl, { params });
          if (
            validationResponse.data &&
            validationResponse.data.status !== "OK"
          ) {
            const status = validationResponse.data.status;
            let errorMsg =
              validationResponse.data.error_message || "Unknown error occurred";
            if (status === "ZERO_RESULTS") {
              errorMsg =
                "Cannot route to destination. Please check your addresses.";
            } else if (status === "NOT_FOUND") {
              errorMsg = "Address does not exist. Please check your addresses.";
            } else if (status === "INVALID_REQUEST") {
              errorMsg = "Invalid request - please check your inputs.";
            }
            throw new Error(errorMsg);
          }
        } catch (apiError) {
          // If it's an API validation error, throw it
          if (apiError.message && !apiError.response) {
            throw apiError;
          }
          // Otherwise parse the error
          const errorMessage = parseApiError(apiError);
          throw new Error(errorMessage);
        }
      }
    }

    // If validation passed (or no API key), create the stop
    const createdStop = await createStop(stopData);

    // Fetch transit data for the new stop immediately
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
      // For bus/train, the destination in stopData is actually the stop location (origin for API)
      // The actual destination is always Downtown Station (bus) or San Francisco (train)
      let origin, destination;
      if (stopData.transit_type === "bus") {
        origin =
          stopData.destination ||
          stopData.origin ||
          "Congress and Oltorf, Austin, TX";
        destination = "Downtown Station, Austin, TX";
      } else if (stopData.transit_type === "train") {
        origin =
          stopData.destination ||
          stopData.origin ||
          "South San Francisco Caltrain Station, CA";
        destination = "San Francisco Caltrain Station, CA";
      } else {
        origin = stopData.origin || homeAddress;
        destination = stopData.destination;
      }

      const stopConfig = {
        name: stopData.name || stopData.destination,
        type: stopData.transit_type,
        origin: origin,
        destination: destination,
        routeFilter: stopData.route_filter,
        stopFilter: stopData.stop_filter,
        ferryDirection: stopData.ferry_direction,
        location: stopData.location,
        mode:
          stopData.transit_type === "bike"
            ? "bicycling"
            : stopData.transit_type === "walk"
            ? "walking"
            : stopData.transit_type === "drive"
            ? "driving"
            : undefined,
      };

      let processedStop;
      try {
        switch (stopData.transit_type) {
          case "bike":
            processedStop = await getBikeStopData(stopConfig, apiKey);
            break;
          case "walk":
            processedStop = await getWalkStopData(stopConfig, apiKey);
            break;
          case "drive":
            processedStop = await getDriveStopData(stopConfig, apiKey);
            break;
          case "bus":
            processedStop = await getBusStopData(stopConfig, apiKey);
            break;
          case "train":
            processedStop = await getTrainStopData(stopConfig, apiKey);
            break;
          case "ferry":
            processedStop = await getFerryStopData(stopConfig);
            break;
          default:
            processedStop = {
              name: stopConfig.name,
              type: stopData.transit_type,
              origin: stopConfig.origin,
              destination: stopConfig.destination,
              allArrivalTimes: [],
              nextArrivalTime: null,
              lastStopTime: null,
              isWithinTwoStops: false,
            };
        }

        // Add the stop ID and other backend fields
        processedStop.id = createdStop.id;
        processedStop.isUserStop = true;
        processedStop.routeFilter = stopData.route_filter;
        processedStop.stopFilter = stopData.stop_filter;
        processedStop.ferryDirection = stopData.ferry_direction;
        processedStop.location = stopData.location;

        // Add the processed stop to the stops state immediately
        setStops((prevStops) => [...prevStops, processedStop]);
      } catch (fetchError) {
        console.error("Error fetching transit data for new stop:", fetchError);
        // Still add the stop even if transit data fetch fails
        const fallbackStop = {
          id: createdStop.id,
          name: stopData.name || stopData.destination,
          type: stopData.transit_type,
          origin: stopData.origin || "",
          destination: stopData.destination,
          allArrivalTimes: [],
          nextArrivalTime: null,
          lastStopTime: null,
          isWithinTwoStops: false,
          isUserStop: true,
        };
        setStops((prevStops) => [...prevStops, fallbackStop]);
      }
    } else {
      // No API key, just add the stop without transit data
      const fallbackStop = {
        id: createdStop.id,
        name: stopData.name || stopData.destination,
        type: stopData.transit_type,
        origin: stopData.origin || "",
        destination: stopData.destination,
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
        isUserStop: true,
      };
      setStops((prevStops) => [...prevStops, fallbackStop]);
    }

    // Reload user stops to keep backend in sync
    await loadUserStops();
    setAddingStop(false); // Close the form on success
  } catch (error) {
    console.error("Error creating stop:", error);
    // Parse error message for better user feedback
    let errorMessage = "Unknown error occurred";
    if (error.response?.data?.errors) {
      // Backend validation errors
      const errors = error.response.data.errors;
      if (errors.full_messages) {
        errorMessage = errors.full_messages.join(", ");
      } else if (errors.base) {
        errorMessage = Array.isArray(errors.base)
          ? errors.base.join(", ")
          : errors.base;
      } else {
        errorMessage = Object.values(errors).flat().join(", ");
      }
    } else if (error.message) {
      errorMessage = error.message;
    } else {
      errorMessage = parseApiError(error);
    }
    throw new Error(errorMessage);
  }
};

