import React, { useState, useEffect } from "react";
import axios from "axios";
import TransitDisplay from "./TransitDisplay";
import AuthPage from "./components/AuthPage";
import { isAuthenticated, logout as authLogout } from "./services/authService";
import "./App.css";

// Import services
import { getBikeStopData, processBikeResponse } from "./services/bikeService";
import { getWalkStopData, processWalkResponse } from "./services/walkService";
import {
  getDriveStopData,
  processDriveResponse,
} from "./services/driveService";
import { getBusStopData, processBusResponse } from "./services/busService";
import {
  getTrainStopData,
  processTrainResponse,
} from "./services/trainService";
import { getFerryStopData } from "./services/ferryService";

// Import utilities
import { getDestinationName, parseApiError } from "./utils/helpers";
import { INITIAL_HOME_ADDRESS, INITIAL_PAGE_TITLE } from "./utils/constants";

/**
 * fetchAllTransitTimes Function
 *
 * Orchestrates fetching transit data for all stops by delegating to appropriate services.
 * Each service handles its own API calls and data processing.
 *
 * @param {Function} setStops - React setState function to update stops state
 * @param {string} apiKey - Google Maps API key
 * @param {string} homeAddress - Home address to use for stops that depend on it
 * @param {string} ferryDirection - Ferry direction ('anacortes' or 'orcas')
 */

const fetchAllTransitTimes = async (
  setStops,
  apiKey,
  homeAddress = INITIAL_HOME_ADDRESS,
  ferryDirection = "anacortes"
) => {
  // Define the stops we want to track
  const stopsConfig = [
    {
      name: "Congress and Oltorf",
      type: "bus",
      origin: "Congress and Oltorf, Austin, TX",
      destination: "Downtown Station, Austin, TX",
      routeFilter: "801",
      transitMode: "bus",
      dataFile: "/data/congress-oltorf-bus.json",
    },
    {
      name: "South San Francisco",
      type: "train",
      origin: "South San Francisco Caltrain Station, CA",
      destination: "San Francisco Caltrain Station, CA",
      routeFilter: "Caltrain",
      transitMode: "rail",
      dataFile: "/data/south-san-francisco-train.json",
    },
    {
      name: "To Springs",
      type: "bike",
      origin: homeAddress,
      destination: "barton springs pool in austin tx",
      mode: "bicycling",
      dataFile: "/data/to-springs-bike.json",
    },
    {
      name: "To HEB",
      type: "walk",
      origin: homeAddress,
      destination: "2400 S. CONGRESS AVE. AUSTIN, TX 78704",
      mode: "walking",
      dataFile: "/data/to-heb-walk.json",
    },
    {
      name: "Central Market",
      type: "drive",
      origin: homeAddress,
      destination: "4477 S Lamar Blvd, Austin, TX 78745",
      mode: "driving",
      dataFile: "/data/central-market-drive.json",
    },
    {
      name:
        ferryDirection === "orcas"
          ? "Orcas Island To Anacortes"
          : "Anacortes To Orcas Island",
      type: "ferry",
      location:
        ferryDirection === "orcas" ? "Orcas Island, WA" : "Anacortes, WA",
      ferryDirection: ferryDirection,
    },
  ];

  try {
    // Fetch all stops in parallel using appropriate services
    const stopPromises = stopsConfig.map(async (stopConfig) => {
      try {
        switch (stopConfig.type) {
          case "bike":
            return await getBikeStopData(stopConfig, apiKey);
          case "walk":
            return await getWalkStopData(stopConfig, apiKey);
          case "drive":
            return await getDriveStopData(stopConfig, apiKey);
          case "bus":
            return await getBusStopData(stopConfig, apiKey);
          case "train":
            return await getTrainStopData(stopConfig, apiKey);
          case "ferry":
            return await getFerryStopData(stopConfig);
          default:
            console.error(`Unknown stop type: ${stopConfig.type}`);
            return null;
        }
      } catch (error) {
        console.error(`Error fetching ${stopConfig.name}:`, error);
        return null;
      }
    });

    // Wait for all stops to be fetched
    const processedStops = await Promise.all(stopPromises);

    // Filter out null results and ensure all required fields are present
    const validStops = processedStops
      .filter((stop) => stop !== null)
      .map((stop) => ({
        ...stop,
        // Ensure all required fields are present
        origin: stop.origin || "",
        destination: stop.destination || "",
        allArrivalTimes: stop.allArrivalTimes || [],
        nextArrivalTime: stop.nextArrivalTime || null,
        lastStopTime: stop.lastStopTime || null,
        isWithinTwoStops: stop.isWithinTwoStops || false,
      }));

    // Store all stop data locally in localStorage
    validStops.forEach((stop) => {
      try {
        const serializedTimes = stop.allArrivalTimes.map((time) => ({
          ...time,
          arrivalTime: time.arrivalTime?.toISOString(),
          departureTime: time.departureTime?.toISOString(),
        }));
        localStorage.setItem(
          `stop_${stop.name}`,
          JSON.stringify(serializedTimes)
        );
      } catch (error) {
        console.error(`Error storing data for ${stop.name}:`, error);
      }
    });

    // Update state with processed stops
    setStops(validStops);
  } catch (error) {
    console.error("Error fetching transit times:", error);
    // Set error state with default stops
    setStops([
      {
        name: "Congress and Oltorf",
        type: "bus",
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "South San Francisco",
        type: "train",
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "To Springs",
        type: "bike",
        allArrivalTimes: [],
        estimatedTime: null,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "To HEB",
        type: "walk",
        allArrivalTimes: [],
        estimatedTime: null,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "Central Market",
        type: "drive",
        allArrivalTimes: [],
        estimatedTime: null,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
      {
        name: "Anacortes To Orcas Island",
        type: "ferry",
        allArrivalTimes: [],
        nextDepartureTime: null,
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      },
    ]);
  }
};

/**
 * App Component
 *
 * Main application component that manages transit data fetching and display.
 * Makes a single optimized API call (or parallel calls) to fetch data for both
 * transit stops, stores all arrival times locally, converts times to Central Time Zone,
 * and passes processed data to the TransitDisplay component.
 */
function App() {
  // State for authentication
  const [authenticated, setAuthenticated] = useState(false);

  // State for home address and page title
  const [homeAddress, setHomeAddress] = useState(INITIAL_HOME_ADDRESS);
  const [pageTitle, setPageTitle] = useState(INITIAL_PAGE_TITLE);

  // State for editing
  const [editingStop, setEditingStop] = useState(null);
  const [editingHome, setEditingHome] = useState(false);
  const [previousStopConfig, setPreviousStopConfig] = useState(null);
  const [reviewData, setReviewData] = useState(null);

  // State for storing all transit stops data
  const [stops, setStops] = useState([
    {
      name: "Congress and Oltorf",
      type: "bus",
      origin: "Congress and Oltorf, Austin, TX",
      destination: "Downtown Station, Austin, TX",
      routeFilter: "801",
      transitMode: "bus",
      allArrivalTimes: [],
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "South San Francisco",
      type: "train",
      origin: "South San Francisco Caltrain Station, CA",
      destination: "San Francisco Caltrain Station, CA",
      routeFilter: "Caltrain",
      transitMode: "rail",
      allArrivalTimes: [],
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "To Springs",
      type: "bike",
      origin: INITIAL_HOME_ADDRESS,
      destination: "barton springs pool in austin tx",
      mode: "bicycling",
      allArrivalTimes: [],
      estimatedTime: null,
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "To HEB",
      type: "walk",
      origin: INITIAL_HOME_ADDRESS,
      destination: "2400 S. CONGRESS AVE. AUSTIN, TX 78704",
      mode: "walking",
      allArrivalTimes: [],
      estimatedTime: null,
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "Central Market",
      type: "drive",
      origin: INITIAL_HOME_ADDRESS,
      destination: "4477 S Lamar Blvd, Austin, TX 78745",
      mode: "driving",
      allArrivalTimes: [],
      estimatedTime: null,
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
    {
      name: "Anacortes To Orcas Island",
      type: "ferry",
      ferryDirection: "anacortes",
      location: "Anacortes, WA",
      allArrivalTimes: [],
      nextDepartureTime: null,
      nextArrivalTime: null,
      lastStopTime: null,
      isWithinTwoStops: false,
    },
  ]);

  // State for ferry direction
  const [ferryDirection, setFerryDirection] = useState("anacortes");

  // Get API key from environment variables with default
  const apiKey =
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";

  /**
   * Check authentication on mount
   */
  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  /**
   * Handle successful login
   */
  const handleLoginSuccess = () => {
    setAuthenticated(true);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    authLogout();
    setAuthenticated(false);
  };

  /**
   * useEffect Hook
   *
   * Runs once when the component mounts to fetch transit data.
   * Makes a single API call (or parallel optimized calls) to get data for both stops.
   * All data is stored locally in state and localStorage for persistence.
   */
  useEffect(() => {
    // Only fetch transit data if authenticated
    if (!authenticated) return;

    // Fetch transit times - ferry doesn't need API key, others do
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
      fetchAllTransitTimes(setStops, apiKey, homeAddress, ferryDirection);

      // Set up interval to refresh data every 5 minutes
      const interval = setInterval(() => {
        fetchAllTransitTimes(setStops, apiKey, homeAddress, ferryDirection);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    } else {
      console.warn(
        "Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY in .env file"
      );
      // Still process ferry stops even without API key
      fetchAllTransitTimes(
        setStops,
        apiKey || "YOUR_API_KEY_HERE",
        homeAddress,
        ferryDirection
      );
    }
  }, [apiKey, homeAddress, ferryDirection, authenticated]);

  /**
   * Update a single stop's configuration
   */
  const updateStop = async (stopIndex, newConfig) => {
    const stop = stops[stopIndex];
    if (!stop) return;

    // Save previous config for rollback
    const previousConfig = {
      ...stop,
      origin: stop.origin,
      destination: stop.destination,
      ferryDirection: stop.ferryDirection,
    };
    setPreviousStopConfig(previousConfig);

    try {
      // For ferry, just update direction
      if (stop.type === "ferry") {
        const newFerryDirection = newConfig.ferryDirection || "anacortes";
        setFerryDirection(newFerryDirection);
        // Re-fetch to update ferry schedule
        await fetchAllTransitTimes(
          setStops,
          apiKey,
          homeAddress,
          newFerryDirection
        );
        setEditingStop(null);
        setReviewData(null);
        // Reload page with new information
        window.location.reload();
        return;
      }

      // For other stops, make API call
      const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
      let params;

      if (
        stop.type === "bike" ||
        stop.type === "walk" ||
        stop.type === "drive"
      ) {
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

        // Re-fetch all transit data (similar to fetch-transit-data.js functionality)
        // Wait for all data to be fetched before reloading
        await fetchAllTransitTimes(
          setStops,
          apiKey,
          homeAddress,
          ferryDirection
        );

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

  /**
   * Update home address and refresh dependent stops
   */
  const updateHomeAddress = async (newHomeAddress, newPageTitle) => {
    setHomeAddress(newHomeAddress);
    if (newPageTitle) {
      setPageTitle(newPageTitle);
    }

    // Refresh all stops that use home address
    await fetchAllTransitTimes(
      setStops,
      apiKey,
      newHomeAddress,
      ferryDirection
    );
    setEditingHome(false);
    setReviewData(null);
  };

  // Show auth page if not authenticated
  if (!authenticated) {
    return (
      <div className="App">
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="App">
      <TransitDisplay
        stops={stops}
        onEditStop={(index) => {
          setEditingStop(index);
          setPreviousStopConfig({ ...stops[index] });
        }}
        onEditHome={() => setEditingHome(true)}
        editingStop={editingStop}
        editingHome={editingHome}
        onCloseEdit={() => {
          setEditingStop(null);
          setEditingHome(false);
          setReviewData(null);
        }}
        onReview={(data) => setReviewData(data)}
        onUpdateStop={updateStop}
        onUpdateHome={updateHomeAddress}
        reviewData={reviewData}
        pageTitle={pageTitle}
        homeAddress={homeAddress}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
