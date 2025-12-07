import axios from "axios";
import { parseApiError } from "./helpers";
import { processBikeResponse } from "../services/bikeService";
import { processWalkResponse } from "../services/walkService";
import { processDriveResponse } from "../services/driveService";
import { fetchAllTransitTimes } from "./transitDataFetcher";
import { createStop } from "../services/stopService";
import {
  findClosestStopOnRoute,
  findClosestStopByName,
  calculateWalkTime,
  formatStopName,
} from "./stopFormHelpers";
import { getBusStopData } from "../services/busService";
import { getTrainStopData } from "../services/trainService";
import { hideStop } from "../services/stopService";
import api from "../config/api";

/**
 * Update a single stop's configuration
 * Now creates a new stop via POST to backend instead of updating existing stop
 *
 * @param {Object} params - Update parameters
 * @param {Object} params.stop - Current stop object
 * @param {number} params.stopIndex - Index of stop in stops array
 * @param {Object} params.newConfig - New configuration from form
 * @param {string} params.apiKey - Google Maps API key
 * @param {string} params.homeAddress - Home address
 * @param {string} params.ferryDirection - Ferry direction
 * @param {Array} params.stops - Current stops array
 * @param {Function} params.setStops - Function to update stops state
 * @param {Function} params.setFerryDirection - Function to update ferry direction
 * @param {Function} params.setEditingStop - Function to close edit modal
 * @param {Function} params.setReviewData - Function to clear review data
 * @param {Function} params.loadUserStops - Function to reload user stops from backend
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
  loadUserStops,
}) => {
  console.log("[stopUpdater] updateStop called");
  console.log("[stopUpdater] stop:", stop ? { id: stop.id, name: stop.name, type: stop.type } : null);
  console.log("[stopUpdater] stopIndex:", stopIndex);
  console.log("[stopUpdater] newConfig:", newConfig);
  console.log("[stopUpdater] homeAddress:", homeAddress);
  console.log("[stopUpdater] apiKey exists:", !!apiKey);
  
  if (!stop) {
    console.error("[stopUpdater] No stop provided, returning early");
    return;
  }

  try {
    // Validate API key is provided
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      console.error("[stopUpdater] API key not configured");
      throw new Error("Google Maps API key is not configured. Please check your environment variables.");
    }
    
    console.log("[stopUpdater] API key validated, proceeding...");

    // For ferry, just update direction (keep existing behavior)
    if (stop.type === "ferry") {
      const newFerryDirection = newConfig.ferryDirection || "anacortes";
      setFerryDirection(newFerryDirection);
      await fetchAllTransitTimes(setStops, apiKey, homeAddress, newFerryDirection);
      setEditingStop(null);
      setReviewData(null);
      window.location.reload();
      return;
    }

    let processedStop;
    let stopName;
    let origin;
    let destination;
    let routeFilter;
    let walkTime = null;

    // Handle different stop types
    console.log("[stopUpdater] Processing stop type:", stop.type);
    
    if (stop.type === "bike" || stop.type === "walk" || stop.type === "drive") {
      console.log("[stopUpdater] Processing drive/walk/bike stop");
      // Drive/Walk/Bike stops: require origin and destination
      console.log("[stopUpdater] newConfig.origin:", newConfig.origin);
      console.log("[stopUpdater] newConfig.destination:", newConfig.destination);
      
      if (!newConfig.origin || !newConfig.origin.trim()) {
        console.error("[stopUpdater] Origin address is missing");
        throw new Error("Origin address is required");
      }
      if (!newConfig.destination || !newConfig.destination.trim()) {
        console.error("[stopUpdater] Destination address is missing");
        throw new Error("Destination address is required");
      }
      
      console.log("[stopUpdater] Origin and destination validated");

      origin = newConfig.origin.trim();
      destination = newConfig.destination.trim();
      console.log("[stopUpdater] Trimmed origin:", origin);
      console.log("[stopUpdater] Trimmed destination:", destination);

      // Get trip duration and format stop name
      const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
      let mode = stop.mode;
      if (!mode) {
        if (stop.type === "bike") {
          mode = "bicycling";
        } else if (stop.type === "walk") {
          mode = "walking";
        } else if (stop.type === "drive") {
          mode = "driving";
        }
      }
      console.log("[stopUpdater] Mode determined:", mode);

      console.log("[stopUpdater] Making Google Maps Directions API call...");
      console.log("[stopUpdater] API params:", {
        origin: origin,
        destination: destination,
        mode: mode,
        hasKey: !!apiKey,
      });

      // Try backend proxy first to avoid CORS issues
      let response;
      try {
        console.log("[stopUpdater] Trying backend proxy for directions API...");
        const proxyResponse = await api.get("/api/v1/transit_data/live_transit", {
          params: {
            origin: origin,
            destination: destination,
            mode: mode,
          },
        });
        console.log("[stopUpdater] Backend proxy response received");
        response = { data: proxyResponse.data };
      } catch (proxyError) {
        console.warn("[stopUpdater] Backend proxy failed, trying direct API call:", proxyError.message);
        // Fallback to direct API call if proxy fails
        try {
          response = await axios.get(baseUrl, {
            params: {
              origin: origin,
              destination: destination,
              mode: mode,
              key: apiKey,
            },
          });
        } catch (directError) {
          console.error("[stopUpdater] Direct API call also failed:", directError);
          throw directError;
        }
      }

      console.log("[stopUpdater] Google Maps API response received");
      console.log("[stopUpdater] Response status:", response.data?.status);
      console.log("[stopUpdater] Response has routes:", !!response.data?.routes);

      if (response.data && response.data.status === "OK") {
        console.log("[stopUpdater] API response OK, formatting stop name...");
        // Format stop name
        stopName = await formatStopName(origin, destination, apiKey);
        console.log("[stopUpdater] Stop name formatted:", stopName);

        // Process the response
        const stopConfig = {
          name: stopName,
          type: stop.type,
          origin: origin,
          destination: destination,
          mode: mode,
        };

        console.log("[stopUpdater] Processing response for stop type:", stop.type);
        switch (stop.type) {
          case "bike":
            processedStop = processBikeResponse(stopConfig, response.data);
            break;
          case "walk":
            processedStop = processWalkResponse(stopConfig, response.data);
            break;
          case "drive":
            processedStop = processDriveResponse(stopConfig, response.data);
            break;
          default:
            console.error("[stopUpdater] Unknown stop type:", stop.type);
            processedStop = null;
        }
        console.log("[stopUpdater] Stop processed:", {
          name: processedStop.name,
          type: processedStop.type,
          hasEstimatedTime: !!processedStop.estimatedTime,
        });
      } else {
        console.error("[stopUpdater] API response not OK:", response.data?.status);
        throw new Error("Could not route to destination");
      }
      
      console.log("[stopUpdater] Drive/walk/bike processing complete, proceeding to backend POST");
    } else if (stop.type === "bus") {
      // Bus stops: handle route number, stop name, and destination
      let busOrigin;
      let busDestination = newConfig.destination || "Downtown Station, Austin, TX";

      // Determine origin based on what's provided
      if (newConfig.routeNumber && !newConfig.stopName && !newConfig.destination) {
        // Only route provided: find closest stop on route
        const closestStop = await findClosestStopOnRoute(
          newConfig.routeNumber.trim(),
          homeAddress,
          apiKey
        );
        busOrigin = closestStop.address;
        stopName = closestStop.name;

        // Calculate walk time from home to stop
        walkTime = await calculateWalkTime(homeAddress, busOrigin, apiKey);

        // Get bus ETA at that stop
        const busStopConfig = {
          name: stopName,
          type: "bus",
          origin: busOrigin,
          destination: busDestination,
          routeFilter: newConfig.routeNumber.trim(),
        };
        processedStop = await getBusStopData(busStopConfig, apiKey);
        processedStop.walkTime = walkTime;
      } else if (newConfig.stopName && !newConfig.routeNumber && !newConfig.destination) {
        // Only stop name provided: find closest stop with that name
        const closestStop = await findClosestStopByName(
          newConfig.stopName.trim(),
          homeAddress,
          apiKey
        );
        busOrigin = closestStop.address;
        stopName = closestStop.name;

        // Calculate walk time from home to stop
        walkTime = await calculateWalkTime(homeAddress, busOrigin, apiKey);

        // Get bus ETA at that stop (try to find route)
        const busStopConfig = {
          name: stopName,
          type: "bus",
          origin: busOrigin,
          destination: busDestination,
          routeFilter: stop.routeFilter || "801",
        };
        processedStop = await getBusStopData(busStopConfig, apiKey);
        processedStop.walkTime = walkTime;
      } else if (newConfig.destination) {
        // Origin and destination provided: get trip duration
        busOrigin = newConfig.stopName || newConfig.origin || homeAddress;
        busDestination = newConfig.destination.trim();

        // Format stop name
        stopName = await formatStopName(busOrigin, busDestination, apiKey);

        // Get bus trip data
        const busStopConfig = {
          name: stopName,
          type: "bus",
          origin: busOrigin,
          destination: busDestination,
          routeFilter: newConfig.routeNumber || stop.routeFilter || "801",
        };
        processedStop = await getBusStopData(busStopConfig, apiKey);
      } else {
        throw new Error("Please provide at least one of: route number, stop name, or destination");
      }

      origin = busOrigin;
      destination = busDestination;
      routeFilter = newConfig.routeNumber || stop.routeFilter || "801";
    } else if (stop.type === "train") {
      // Train stops: either origin+destination OR stop name
      if (newConfig.trainInputMode === "stopName") {
        // Stop name mode
        if (!newConfig.selectedStop || !newConfig.selectedStop.trim()) {
          throw new Error("Stop name is required");
        }

        const trainOrigin = newConfig.selectedStop.trim();
        const trainDestination = "San Francisco Caltrain Station, CA";
        stopName = trainOrigin;

        // Calculate walk time from home to stop
        walkTime = await calculateWalkTime(homeAddress, trainOrigin, apiKey);

        // Get train ETA at that stop
        const trainStopConfig = {
          name: stopName,
          type: "train",
          origin: trainOrigin,
          destination: trainDestination,
        };
        processedStop = await getTrainStopData(trainStopConfig, apiKey);
        processedStop.walkTime = walkTime;

        origin = trainOrigin;
        destination = trainDestination;
      } else {
        // Origin and destination mode
        if (!newConfig.origin || !newConfig.origin.trim()) {
          throw new Error("Origin is required");
        }
        if (!newConfig.destination || !newConfig.destination.trim()) {
          throw new Error("Destination is required");
        }

        origin = newConfig.origin.trim();
        destination = newConfig.destination.trim();

        // Format stop name
        stopName = await formatStopName(origin, destination, apiKey);

        // Get train trip data
        const trainStopConfig = {
          name: stopName,
          type: "train",
          origin: origin,
          destination: destination,
        };
        processedStop = await getTrainStopData(trainStopConfig, apiKey);
      }
      
      console.log("[stopUpdater] Train processing complete, proceeding to backend POST");
    }
    
    console.log("[stopUpdater] All stop type processing complete");
    console.log("[stopUpdater] Final values:", {
      stopName,
      origin,
      destination,
      routeFilter,
      walkTime,
      hasProcessedStop: !!processedStop,
    });

    // Prepare stop data for backend
    console.log("[stopUpdater] Preparing stop data for backend POST...");
    const stopData = {
      transit_type: stop.type,
      origin: origin,
      destination: destination,
      name: stopName,
      route_filter: routeFilter || stop.routeFilter || null,
      stop_filter: null,
      ferry_direction: null,
      location: null,
    };

    // POST to backend
    try {
      console.log("[stopUpdater] Preparing to POST stop to Rails backend");
      console.log("[stopUpdater] Stop data to be sent:", JSON.stringify(stopData, null, 2));
      
      const createdStop = await createStop(stopData);
      
      console.log("[stopUpdater] Stop created in Rails backend");
      console.log("[stopUpdater] Created stop object from backend:", JSON.stringify(createdStop, null, 2));
      console.log("[stopUpdater] Created stop ID:", createdStop.id);
      console.log("[stopUpdater] Created stop name:", createdStop.name);
      console.log("[stopUpdater] Created stop transit_type:", createdStop.transit_type);

      // Ensure processedStop has all the display information before adding to state
      processedStop.id = createdStop.id;
      processedStop.isUserStop = true;
      processedStop.name = stopName;
      processedStop.origin = origin;
      processedStop.destination = destination;
      if (routeFilter) {
        processedStop.routeFilter = routeFilter;
      }
      if (walkTime) {
        processedStop.walkTime = walkTime;
      }

      console.log("[stopUpdater] Stop processed with display info:", {
        id: processedStop.id,
        name: processedStop.name,
        type: processedStop.type,
        hasArrivalTime: !!processedStop.nextArrivalTime,
        hasWalkTime: !!processedStop.walkTime,
        hasEstimatedTime: !!processedStop.estimatedTime,
      });

      // If editing an existing stop (has an ID), hide the old stop
      if (stop.id) {
        try {
          console.log("[stopUpdater] Hiding old stop with ID:", stop.id);
          await hideStop(stop.id);
          console.log("[stopUpdater] Old stop hidden successfully");
        } catch (hideError) {
          console.error("[stopUpdater] Error hiding old stop:", hideError);
          // Continue even if hide fails - the new stop will still be created
        }
      }

      // Reload user stops from backend - this will include the newly created stop
      // and exclude the hidden old stop (if it was hidden)
      if (loadUserStops) {
        console.log("[stopUpdater] Loading user stops from backend...");
        await loadUserStops();
        console.log("[stopUpdater] User stops loaded");
      }

      // Close edit modal - the stop will appear via userStops after transit data is fetched
      setEditingStop(null);
      setReviewData(null);

      // Refresh transit times for default stops
      // User stops will be fetched transit data separately in App.js via formatUserStops
      await fetchAllTransitTimes(setStops, apiKey, homeAddress, ferryDirection);
      
      // Note: The newly created stop will appear in userStops and will have transit data
      // fetched automatically via the useEffect in App.js that watches userStops
      
      // No window refresh - state updates handle the display
      console.log("[stopUpdater] All processing completed successfully");
    } catch (backendError) {
      console.error("[stopUpdater] Backend error caught in inner try/catch");
      console.error("[stopUpdater] Backend error:", backendError);
      console.error("[stopUpdater] Backend error message:", backendError.message);
      console.error("[stopUpdater] Backend error response:", backendError.response);
      console.error("[stopUpdater] Backend error response status:", backendError.response?.status);
      console.error("[stopUpdater] Backend error response data:", backendError.response?.data);
      
      // Handle backend validation errors
      let errorMessage = "An error occurred";
      
      // Check for 404 - endpoint doesn't exist
      if (backendError.response?.status === 404) {
        errorMessage = "The stops endpoint was not found on the backend. Please check that the Rails backend has the POST /api/v1/stops route configured.";
      } 
      // Check for HTML error response (Rails error page)
      else if (typeof backendError.response?.data === 'string' && backendError.response.data.includes('<!DOCTYPE html>')) {
        // Try to extract error message from HTML
        const htmlMatch = backendError.response.data.match(/<div class="message">([^<]+)/);
        if (htmlMatch) {
          errorMessage = `Backend error: ${htmlMatch[1].trim()}`;
        } else {
          errorMessage = "Backend returned an error page. Check the Rails server logs for details.";
        }
      }
      // Check for JSON error response
      else if (backendError.response?.data?.errors) {
        const errors = backendError.response.data.errors;
        if (errors.full_messages) {
          errorMessage = errors.full_messages.join(", ");
        } else if (errors.base) {
          errorMessage = Array.isArray(errors.base)
            ? errors.base.join(", ")
            : errors.base;
        } else {
          errorMessage = Object.values(errors).flat().join(", ");
        }
      } else if (backendError.message) {
        errorMessage = backendError.message;
      }
      
      console.error("[stopUpdater] Throwing backend error:", errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("[stopUpdater] Outer catch block - error caught");
    console.error("[stopUpdater] Error type:", error.constructor.name);
    console.error("[stopUpdater] Error message:", error.message);
    console.error("[stopUpdater] Error stack:", error.stack);
    
    // Use the error message if it's already a user-friendly message (from inner catch)
    // Otherwise, parse it for API errors
    let errorMessage = error.message || "An error occurred";
    if (errorMessage === "An error occurred" || errorMessage.includes("Network Error")) {
      errorMessage = parseApiError(error);
    }
    console.error("[stopUpdater] Final error message:", errorMessage);
    alert(`Error: ${errorMessage}`);
    setEditingStop(null);
    setReviewData(null);
  }
};

