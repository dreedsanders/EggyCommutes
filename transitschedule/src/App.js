import React, { useState, useEffect } from "react";
import TransitDisplay from "./TransitDisplay";
import AuthPage from "./components/AuthPage";
import "./App.css";

// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from "./store/hooks";
import {
  selectAllStops,
  selectHomeAddress,
  selectFerryDirection,
  loadUserStops,
  fetchDefaultStopsTransitData,
  refreshDefaultStops,
  addStop,
  deleteStopAction,
  setHomeAddress,
  setFerryDirection,
} from "./store/slices/stopsSlice";
import {
  selectIsAuthenticated,
  loadUserFromStorage,
  fetchCurrentUser,
  logoutUser,
} from "./store/slices/authSlice";

// Import utilities
import { INITIAL_PAGE_TITLE } from "./utils/constants";
import { updateStop } from "./utils/stopUpdater";
import { fetchTransitData } from "./services/stopService";

// Import stop service and form
import GoogleMapsStopSelector from "./components/GoogleMapsStopSelector";

/**
 * App Component
 *
 * Main application component that manages transit data fetching and display.
 * Uses Redux store to manage stops state.
 */
function App() {
  // Redux hooks
  const dispatch = useAppDispatch();
  const allStops = useAppSelector(selectAllStops);
  const homeAddress = useAppSelector(selectHomeAddress);
  const ferryDirection = useAppSelector(selectFerryDirection);

  // Authentication from Redux
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // State for UI (editing, forms, etc.)
  const [pageTitle, setPageTitle] = useState(INITIAL_PAGE_TITLE);
  const [editingStop, setEditingStop] = useState(null);
  const [editingHome, setEditingHome] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [addingStop, setAddingStop] = useState(false);
  const [addingStopType, setAddingStopType] = useState(null);
  const [fetchingTransitData, setFetchingTransitData] = useState(false);

  // Get API key from environment variables with default
  const apiKey =
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";

  /**
   * Load user from localStorage and fetch user data on mount
   */
  useEffect(() => {
    // Load user from localStorage first
    dispatch(loadUserFromStorage()).then((result) => {
      if (result.payload?.isAuthenticated) {
        // If we have a user in storage, fetch fresh data from backend
        dispatch(fetchCurrentUser()).then(() => {
          // After fetching user, load user stops
          dispatch(loadUserStops({ apiKey, homeAddress }));
        });
      }
    });
  }, [dispatch, apiKey, homeAddress]);

  /**
   * Handle successful login
   */
  const handleLoginSuccess = async () => {
    console.log("[App] handleLoginSuccess called");
    setFetchingTransitData(true);

    try {
      // User data is already stored in Redux by loginUser action
      // Fetch fresh user data from backend
      console.log("[App] Fetching current user data from backend...");
      await dispatch(fetchCurrentUser());

      console.log("[App] Fetching transit data...");
      // Fetch transit data before showing the main page
      const result = await fetchTransitData();
      console.log("[App] Fetch transit data result:", result);
      if (!result?.skipped) {
        console.log("[App] Transit data fetched successfully");
        // Small delay to ensure JSON files are fully written
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        console.log("[App] Transit data fetch was skipped");
      }
    } catch (error) {
      console.error("[App] Error in fetchTransitData:", error);
      // Error already logged in fetchTransitData, continue anyway
    }

    // Always fetch transit times - will use live API or saved files
    try {
      if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
        console.log("[App] Fetching all transit times...");
        await dispatch(
          fetchDefaultStopsTransitData({ apiKey, homeAddress, ferryDirection })
        );
        console.log("[App] Transit times refreshed after login");
      } else {
        console.warn(
          "[App] API key not configured, skipping transit times fetch"
        );
      }
    } catch (error) {
      console.error("[App] Error fetching transit times:", error);
    } finally {
      console.log("[App] Setting fetchingTransitData to false");
      setFetchingTransitData(false);
      // Load user stops after authentication is set
      console.log("[App] Loading user stops...");
      await dispatch(loadUserStops({ apiKey, homeAddress }));
      console.log("[App] Login success flow completed");
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    dispatch(logoutUser());
  };

  // Fetch transit times when authenticated
  useEffect(() => {
    if (!isAuthenticated) return; // Don't fetch on login page

    // Set up initial fetch and interval for refreshing transit times
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
      dispatch(refreshDefaultStops({ apiKey, homeAddress, ferryDirection }));
      const interval = setInterval(() => {
        dispatch(refreshDefaultStops({ apiKey, homeAddress, ferryDirection }));
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      console.warn("Google Maps API key not configured");
      dispatch(
        refreshDefaultStops({
          apiKey: apiKey || "YOUR_API_KEY_HERE",
          homeAddress,
          ferryDirection,
        })
      );
    }
  }, [apiKey, homeAddress, ferryDirection, isAuthenticated, dispatch]);

  const handleUpdateStop = async (stopIndex, newConfig) => {
    console.log("[App] handleUpdateStop called");
    console.log("[App] stopIndex:", stopIndex);
    console.log("[App] newConfig:", newConfig);

    const stop = allStops[stopIndex];
    console.log("[App] stop found:", !!stop);

    if (!stop) {
      console.error("[App] No stop found at index:", stopIndex);
      return;
    }

    console.log("[App] Calling updateStop...");
    try {
      // For ferry, update direction in Redux
      if (stop.type === "ferry") {
        const newFerryDirection = newConfig.ferryDirection || "anacortes";
        dispatch(setFerryDirection(newFerryDirection));
        await dispatch(
          refreshDefaultStops({
            apiKey,
            homeAddress,
            ferryDirection: newFerryDirection,
          })
        );
        setEditingStop(null);
        setReviewData(null);
        window.location.reload();
        return;
      }

      // For other stops, use the existing updateStop utility
      // It will handle creating new stop and reloading user stops via Redux
      await updateStop({
        stop,
        stopIndex,
        newConfig,
        apiKey,
        homeAddress,
        ferryDirection,
        stops: allStops,
        setStops: (updatedStops) => {
          // This won't be used anymore since we're using Redux
          // But keep for compatibility with updateStop utility
        },
        setFerryDirection: (direction) => {
          dispatch(setFerryDirection(direction));
        },
        setEditingStop,
        setReviewData,
        loadUserStops: async () => {
          await dispatch(loadUserStops({ apiKey, homeAddress }));
        },
      });

      // Refresh default stops transit data after update
      await dispatch(
        refreshDefaultStops({ apiKey, homeAddress, ferryDirection })
      );

      console.log("[App] updateStop completed successfully");
    } catch (error) {
      console.error("[App] updateStop failed:", error);
      throw error;
    }
  };

  const updateHomeAddress = async (newHomeAddress, newPageTitle) => {
    dispatch(setHomeAddress(newHomeAddress));
    if (newPageTitle) setPageTitle(newPageTitle);
    await dispatch(
      refreshDefaultStops({
        apiKey,
        homeAddress: newHomeAddress,
        ferryDirection,
      })
    );
    setEditingHome(false);
    setReviewData(null);
  };

  const handleCreateStopWrapper = async (stopData) => {
    try {
      await dispatch(addStop({ stopData, apiKey, homeAddress }));
      setAddingStop(false); // Close the form on success
    } catch (error) {
      console.error("Error creating stop:", error);
      throw error;
    }
  };

  const handleDeleteStopWrapper = async (stopId) => {
    if (
      !window.confirm("Are you sure you want to permanently delete this stop?")
    ) {
      return;
    }
    try {
      await dispatch(deleteStopAction({ stopId, apiKey, homeAddress }));
    } catch (error) {
      console.error("Error deleting stop:", error);
      alert(`Error deleting stop: ${error.message || "Unknown error"}`);
    }
  };

  // Show auth page if not authenticated
  if (!isAuthenticated) {
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

  return (
    <div className="App">
      {addingStop && !addingStopType && (
        <div className="modal-overlay" onClick={() => setAddingStop(false)}>
          <div
            className="stop-type-selector-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="stop-type-selector-title">Select Stop Type</h2>
            <div className="stop-type-options">
              {["drive", "walk", "bike", "bus", "train", "ferry"].map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setAddingStopType(type)}
                    className="stop-type-button"
                  >
                    {type.toUpperCase()}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setAddingStop(false)}
              className="stop-type-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {addingStop && addingStopType && (
        <GoogleMapsStopSelector
          stopType={addingStopType}
          homeAddress={homeAddress}
          apiKey={apiKey}
          onClose={() => {
            setAddingStop(false);
            setAddingStopType(null);
          }}
          onSubmit={async (stopData) => {
            await handleCreateStopWrapper(stopData);
            setAddingStopType(null);
          }}
        />
      )}
      <TransitDisplay
        stops={allStops}
        onEditStop={(index) => {
          setEditingStop(index);
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
