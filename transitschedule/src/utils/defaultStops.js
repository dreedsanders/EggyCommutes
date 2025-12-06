import { INITIAL_HOME_ADDRESS } from "./constants";

/**
 * Get default stops configuration
 *
 * @returns {Array} - Array of default stop configurations
 */
export const getDefaultStops = () => [
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
];

