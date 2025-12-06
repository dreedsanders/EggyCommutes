import React, { useState, useEffect } from "react";
import TransitDisplay from "./TransitDisplay";
import AuthPage from "./components/AuthPage";
import { isAuthenticated, logout as authLogout } from "./services/authService";
import "./App.css";

// Import utilities
import { INITIAL_HOME_ADDRESS, INITIAL_PAGE_TITLE } from "./utils/constants";
import { fetchAllTransitTimes } from "./utils/transitDataFetcher";
import { updateStop } from "./utils/stopUpdater";
import { handleCreateStop } from "./utils/stopCreator";
import { handleDeleteStop } from "./utils/stopDeleter";
import { getDefaultStops } from "./utils/defaultStops";
import { formatUserStops } from "./utils/stopFormatters";

// Import stop service and form
import { fetchUserStops, fetchTransitData } from "./services/stopService";
import AddStopForm from "./components/AddStopForm";

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
  const [addingStop, setAddingStop] = useState(false);
  const [userStops, setUserStops] = useState([]);
  const [fetchingTransitData, setFetchingTransitData] = useState(false);

  // State for storing all transit stops data
  const [stops, setStops] = useState(getDefaultStops());

  // State for ferry direction
  const [ferryDirection, setFerryDirection] = useState("anacortes");

  // Get API key from environment variables with default
  const apiKey =
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";

  /**
   * Check authentication on mount
   * DO NOT call fetchTransitData here - only call it after successful login
   */
  useEffect(() => {
    const authStatus = isAuthenticated();
    if (authStatus) {
      // User has a token, set authenticated state
      // Transit data will be fetched in handleLoginSuccess or when authenticated becomes true
      setAuthenticated(true);
      loadUserStops();
    } else {
      setAuthenticated(false);
    }
  }, []);

  /**
   * Load user stops from backend
   */
  const loadUserStops = async () => {
    try {
      const stops = await fetchUserStops();
      setUserStops(stops || []);
    } catch (error) {
      // fetchUserStops now handles errors internally and returns []
      // This catch is just for safety
      console.error("Error loading user stops:", error);
      setUserStops([]);
    }
  };

  /**
   * Handle successful login
   */
  const handleLoginSuccess = async () => {
    setFetchingTransitData(true);
    try {
      // Fetch transit data before showing the main page
      const result = await fetchTransitData();
      if (!result?.skipped) {
        console.log("Transit data fetched successfully");
        // Small delay to ensure JSON files are fully written
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      // Error already logged in fetchTransitData, continue anyway
    }

    // Always fetch transit times - will use live API or saved files
    try {
      if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
        await fetchAllTransitTimes(
          setStops,
          apiKey,
          homeAddress,
          ferryDirection
        );
        console.log("Transit times refreshed after login");
      }
    } catch (error) {
      console.error("Error fetching transit times:", error);
    } finally {
      setFetchingTransitData(false);
      setAuthenticated(true);
      // Load user stops after authentication is set
      await loadUserStops();
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    authLogout();
    setAuthenticated(false);
  };

  // Only fetch transit times when authenticated - DO NOT call fetchTransitData here
  useEffect(() => {
    if (!authenticated) return; // Don't fetch on login page

    // Set up interval for refreshing transit times (but don't fetch transit data here)
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
      fetchAllTransitTimes(setStops, apiKey, homeAddress, ferryDirection);
      const interval = setInterval(() => {
        fetchAllTransitTimes(setStops, apiKey, homeAddress, ferryDirection);
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      console.warn("Google Maps API key not configured");
      fetchAllTransitTimes(
        setStops,
        apiKey || "YOUR_API_KEY_HERE",
        homeAddress,
        ferryDirection
      );
    }
  }, [apiKey, homeAddress, ferryDirection, authenticated]);

  const handleUpdateStop = async (stopIndex, newConfig) => {
    const stop = stops[stopIndex];
    if (!stop) return;
    const previousConfig = {
      ...stop,
      origin: stop.origin,
      destination: stop.destination,
      ferryDirection: stop.ferryDirection,
    };
    setPreviousStopConfig(previousConfig);
    await updateStop({
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
    });
  };

  const updateHomeAddress = async (newHomeAddress, newPageTitle) => {
    setHomeAddress(newHomeAddress);
    if (newPageTitle) setPageTitle(newPageTitle);
    await fetchAllTransitTimes(
      setStops,
      apiKey,
      newHomeAddress,
      ferryDirection
    );
    setEditingHome(false);
    setReviewData(null);
  };

  const handleCreateStopWrapper = async (stopData) => {
    await handleCreateStop({
      stopData,
      apiKey,
      homeAddress,
      setStops,
      loadUserStops,
      setAddingStop,
    });
  };

  const handleDeleteStopWrapper = async (stopId) => {
    await handleDeleteStop({ stopId, setUserStops, setStops });
  };

  // Show auth page if not authenticated
  if (!authenticated) {
    return (
      <div className="App">
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Show loading state while fetching transit data
  if (fetchingTransitData) {
    return (
      <div className="App loading-container">
        <div className="loading-content">
          <h2>Fetching transit data...</h2>
          <p>Please wait...</p>
        </div>
      </div>
    );
  }

  // Merge user stops with default stops for display
  const allStops = [...stops, ...formatUserStops(userStops)];

  return (
    <div className="App">
      {addingStop && (
        <AddStopForm
          onClose={() => setAddingStop(false)}
          onSubmit={handleCreateStopWrapper}
          apiKey={apiKey}
        />
      )}
      <TransitDisplay
        stops={allStops}
        onEditStop={(index) => {
          setEditingStop(index);
          setPreviousStopConfig({ ...allStops[index] });
        }}
        onEditHome={() => setEditingHome(true)}
        onAddStop={() => setAddingStop(true)}
        onDeleteStop={handleDeleteStopWrapper}
        editingStop={editingStop}
        editingHome={editingHome}
        onCloseEdit={() => {
          setEditingStop(null);
          setEditingHome(false);
          setReviewData(null);
        }}
        onReview={(data) => setReviewData(data)}
        onUpdateStop={handleUpdateStop}
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
