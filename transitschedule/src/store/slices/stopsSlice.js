import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { getDefaultStops } from '../../utils/defaultStops';
import { INITIAL_HOME_ADDRESS } from '../../utils/constants';
import { fetchUserStops } from '../../services/stopService';
import { formatUserStops } from '../../utils/stopFormatters';
import { createStop, hideStop as hideStopService, deleteStop as deleteStopService } from '../../services/stopService';
import { getBikeStopData } from '../../services/bikeService';
import { getWalkStopData } from '../../services/walkService';
import { getDriveStopData } from '../../services/driveService';
import { getBusStopData } from '../../services/busService';
import { getTrainStopData } from '../../services/trainService';
import { getFerryStopData } from '../../services/ferryService';

const initialState = {
  defaultStops: getDefaultStops(),
  userStops: [],
  formattedUserStops: [],
  loading: false,
  error: null,
  homeAddress: INITIAL_HOME_ADDRESS,
  ferryDirection: 'anacortes',
};

/**
 * Async thunk to load user stops from backend and fetch transit data
 */
export const loadUserStops = createAsyncThunk(
  'stops/loadUserStops',
  async ({ apiKey, homeAddress }, { getState }) => {
    const stops = await fetchUserStops();
    
    // Fetch transit data for user stops if API key is available
    let formatted = [];
    if (stops && stops.length > 0 && apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
      formatted = await formatUserStops(stops, apiKey, homeAddress);
    }
    
    return { stops, formatted };
  }
);

/**
 * Helper function to fetch default stops transit data and return the result
 */
const fetchDefaultStopsData = async (apiKey, homeAddress, ferryDirection) => {
  const homeAddr = homeAddress || INITIAL_HOME_ADDRESS;
  
  const stopsConfig = [
    {
      name: 'Congress and Oltorf',
      type: 'bus',
      origin: 'Congress and Oltorf, Austin, TX',
      destination: 'Downtown Station, Austin, TX',
      routeFilter: '801',
      transitMode: 'bus',
      dataFile: '/data/congress-oltorf-bus.json',
    },
    {
      name: 'South San Francisco',
      type: 'train',
      origin: 'South San Francisco Caltrain Station, CA',
      destination: 'San Francisco Caltrain Station, CA',
      routeFilter: 'Caltrain',
      transitMode: 'rail',
      dataFile: '/data/south-san-francisco-train.json',
    },
    {
      name: 'To Springs',
      type: 'bike',
      origin: homeAddr,
      destination: 'barton springs pool in austin tx',
      mode: 'bicycling',
      dataFile: '/data/to-springs-bike.json',
    },
    {
      name: 'To HEB',
      type: 'walk',
      origin: homeAddr,
      destination: '2400 S. CONGRESS AVE. AUSTIN, TX 78704',
      mode: 'walking',
      dataFile: '/data/to-heb-walk.json',
    },
    {
      name: 'Central Market',
      type: 'drive',
      origin: homeAddr,
      destination: '4477 S Lamar Blvd, Austin, TX 78745',
      mode: 'driving',
      dataFile: '/data/central-market-drive.json',
    },
    {
      name:
        ferryDirection === 'orcas'
          ? 'Orcas Island To Anacortes'
          : 'Anacortes To Orcas Island',
      type: 'ferry',
      location:
        ferryDirection === 'orcas' ? 'Orcas Island, WA' : 'Anacortes, WA',
      ferryDirection: ferryDirection,
    },
  ];

  const stopPromises = stopsConfig.map(async (stopConfig) => {
    try {
      switch (stopConfig.type) {
        case 'bike':
          return await getBikeStopData(stopConfig, apiKey);
        case 'walk':
          return await getWalkStopData(stopConfig, apiKey);
        case 'drive':
          return await getDriveStopData(stopConfig, apiKey);
        case 'bus':
          return await getBusStopData(stopConfig, apiKey);
        case 'train':
          return await getTrainStopData(stopConfig, apiKey);
        case 'ferry':
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

  const processedStops = await Promise.all(stopPromises);
  
  return processedStops
    .filter((stop) => stop !== null)
    .map((stop) => ({
      ...stop,
      origin: stop.origin || '',
      destination: stop.destination || '',
      allArrivalTimes: stop.allArrivalTimes || [],
      nextArrivalTime: stop.nextArrivalTime || null,
      lastStopTime: stop.lastStopTime || null,
      isWithinTwoStops: stop.isWithinTwoStops || false,
    }));
};

/**
 * Async thunk to fetch transit data for all default stops
 */
export const fetchDefaultStopsTransitData = createAsyncThunk(
  'stops/fetchDefaultStopsTransitData',
  async ({ apiKey, homeAddress, ferryDirection }) => {
    return await fetchDefaultStopsData(apiKey, homeAddress, ferryDirection);
  }
);

/**
 * Async thunk to add a new stop
 */
export const addStop = createAsyncThunk(
  'stops/addStop',
  async ({ stopData, apiKey, homeAddress }, { getState, dispatch }) => {
    // Create stop in backend
    const createdStop = await createStop(stopData);
    
    // Fetch transit data for the new stop
    let processedStop = null;
    if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
      let origin, destination;
      if (stopData.transit_type === 'bus') {
        origin = stopData.destination || stopData.origin || 'Congress and Oltorf, Austin, TX';
        destination = 'Downtown Station, Austin, TX';
      } else if (stopData.transit_type === 'train') {
        origin = stopData.destination || stopData.origin || 'South San Francisco Caltrain Station, CA';
        destination = 'San Francisco Caltrain Station, CA';
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
          stopData.transit_type === 'bike'
            ? 'bicycling'
            : stopData.transit_type === 'walk'
            ? 'walking'
            : stopData.transit_type === 'drive'
            ? 'driving'
            : undefined,
      };
      
      try {
        switch (stopData.transit_type) {
          case 'bike':
            processedStop = await getBikeStopData(stopConfig, apiKey);
            break;
          case 'walk':
            processedStop = await getWalkStopData(stopConfig, apiKey);
            break;
          case 'drive':
            processedStop = await getDriveStopData(stopConfig, apiKey);
            break;
          case 'bus':
            processedStop = await getBusStopData(stopConfig, apiKey);
            break;
          case 'train':
            processedStop = await getTrainStopData(stopConfig, apiKey);
            break;
          case 'ferry':
            processedStop = await getFerryStopData(stopConfig);
            break;
          default:
            console.error('Unknown transit type:', stopData.transit_type);
            processedStop = null;
        }
        
        processedStop.id = createdStop.id;
        processedStop.isUserStop = true;
        processedStop.routeFilter = stopData.route_filter;
        processedStop.stopFilter = stopData.stop_filter;
        processedStop.ferryDirection = stopData.ferry_direction;
        processedStop.location = stopData.location;
      } catch (fetchError) {
        console.error('Error fetching transit data for new stop:', fetchError);
      }
    }
    
    // Reload user stops to get the complete list from backend
    await dispatch(loadUserStops({ apiKey, homeAddress }));
    
    return { createdStop, processedStop };
  }
);

/**
 * Async thunk to hide a stop (soft delete)
 */
export const hideStopAction = createAsyncThunk(
  'stops/hideStop',
  async ({ stopId, apiKey, homeAddress }, { getState, dispatch }) => {
    await hideStopService(stopId);
    // Reload user stops after hiding
    await dispatch(loadUserStops({ apiKey, homeAddress }));
    return stopId;
  }
);

/**
 * Async thunk to delete a stop permanently
 */
export const deleteStopAction = createAsyncThunk(
  'stops/deleteStop',
  async ({ stopId, apiKey, homeAddress }, { getState, dispatch, rejectWithValue }) => {
    try {
      await deleteStopService(stopId);
      // Reload user stops after deletion to ensure consistency
      await dispatch(loadUserStops({ apiKey, homeAddress }));
      return stopId;
    } catch (error) {
      // If deletion fails, reload to restore correct state
      await dispatch(loadUserStops({ apiKey, homeAddress }));
      return rejectWithValue(error.message || 'Failed to delete stop');
    }
  }
);

/**
 * Async thunk to update default stops transit data
 */
export const refreshDefaultStops = createAsyncThunk(
  'stops/refreshDefaultStops',
  async ({ apiKey, homeAddress, ferryDirection }) => {
    return await fetchDefaultStopsData(apiKey, homeAddress, ferryDirection);
  }
);

const stopsSlice = createSlice({
  name: 'stops',
  initialState,
  reducers: {
    setDefaultStops: (state, action) => {
      state.defaultStops = action.payload;
    },
    setHomeAddress: (state, action) => {
      state.homeAddress = action.payload;
    },
    setFerryDirection: (state, action) => {
      state.ferryDirection = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load user stops
      .addCase(loadUserStops.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUserStops.fulfilled, (state, action) => {
        state.loading = false;
        state.userStops = action.payload.stops || [];
        state.formattedUserStops = action.payload.formatted || [];
      })
      .addCase(loadUserStops.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.userStops = [];
        state.formattedUserStops = [];
      })
      // Fetch default stops transit data
      .addCase(fetchDefaultStopsTransitData.fulfilled, (state, action) => {
        state.defaultStops = action.payload;
      })
      // Refresh default stops
      .addCase(refreshDefaultStops.fulfilled, (state, action) => {
        state.defaultStops = action.payload;
      })
      // Hide stop
      .addCase(hideStopAction.fulfilled, (state) => {
        // State is updated via loadUserStops in the thunk
      })
      // Delete stop
      .addCase(deleteStopAction.pending, (state, action) => {
        // Optimistically remove the stop from formattedUserStops immediately
        const stopId = action.meta.arg?.stopId;
        if (stopId !== undefined && stopId !== null) {
          // Convert both to string for reliable comparison
          const stopIdStr = String(stopId);
          state.formattedUserStops = state.formattedUserStops.filter(
            (stop) => String(stop.id) !== stopIdStr
          );
          state.userStops = state.userStops.filter(
            (stop) => String(stop.id) !== stopIdStr
          );
        }
      })
      .addCase(deleteStopAction.fulfilled, (state) => {
        // State is updated via loadUserStops in the thunk, but we already removed it optimistically
      })
      .addCase(deleteStopAction.rejected, (state, action) => {
        // If deletion fails, reload from backend to restore the correct state
        state.error = action.error.message || 'Failed to delete stop';
      });
  },
});

export const { setDefaultStops, setHomeAddress, setFerryDirection, clearError } = stopsSlice.actions;

// Selectors
export const selectDefaultStops = (state) => state.stops.defaultStops;
export const selectUserStops = (state) => state.stops.userStops;
export const selectFormattedUserStops = (state) => state.stops.formattedUserStops;

// Memoized selector to prevent unnecessary rerenders
export const selectAllStops = createSelector(
  [selectDefaultStops, selectFormattedUserStops],
  (defaultStops, formattedUserStops) => {
    // Filter out hidden stops (user stops are already filtered by backend)
    // Default stops don't have hidden property, but we can check formattedUserStops
    const visibleUserStops = formattedUserStops.filter(
      (stop) => !stop.hidden
    );
    return [...defaultStops, ...visibleUserStops];
  }
);
export const selectHomeAddress = (state) => state.stops.homeAddress;
export const selectFerryDirection = (state) => state.stops.ferryDirection;
export const selectStopsLoading = (state) => state.stops.loading;
export const selectStopsError = (state) => state.stops.error;

export default stopsSlice.reducer;

