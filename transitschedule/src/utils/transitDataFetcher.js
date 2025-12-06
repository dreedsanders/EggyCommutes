import { INITIAL_HOME_ADDRESS } from "./constants";
// Import services
import { getBikeStopData } from "../services/bikeService";
import { getWalkStopData } from "../services/walkService";
import { getDriveStopData } from "../services/driveService";
import { getBusStopData } from "../services/busService";
import { getTrainStopData } from "../services/trainService";
import { getFerryStopData } from "../services/ferryService";

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
export const fetchAllTransitTimes = async (
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

