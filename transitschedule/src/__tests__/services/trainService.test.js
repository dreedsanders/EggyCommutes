import { fetchTrainRoute, processTrainResponse, getTrainStopData, CALTRAIN_STOPS } from "../../services/trainService";

// Mock axios
jest.mock("axios");
const axios = require("axios");

describe("trainService", () => {
  const mockApiKey = "test-api-key";
  const mockDestination = "San Francisco Caltrain Station, CA";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchTrainRoute", () => {
    it("should fetch train route successfully", async () => {
      const mockOrigin = "South San Francisco Caltrain Station, CA";
      const mockResponse = {
        data: {
          status: "OK",
          routes: [
            {
              legs: [
                {
                  steps: [
                    {
                      travel_mode: "TRANSIT",
                      transit_details: {
                        line: { name: "Caltrain" },
                        arrival_time: { value: 1234567890, text: "10:30 AM" },
                        departure_time: { value: 1234567800, text: "10:20 AM" },
                        arrival_stop: { name: "San Francisco" },
                        headsign: "San Francisco",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchTrainRoute(mockOrigin, mockDestination, mockApiKey);

      expect(axios.get).toHaveBeenCalledWith(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin: mockOrigin,
            destination: mockDestination,
            mode: "transit",
            transit_mode: "rail",
            departure_time: "now",
            alternatives: true,
            key: mockApiKey,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("processTrainResponse", () => {
    it("should process successful train response with Caltrain", () => {
      const stopConfig = {
        name: "South San Francisco",
        type: "train",
        origin: "South San Francisco Caltrain Station, CA",
        destination: mockDestination,
        routeFilter: "Caltrain",
        transitMode: "rail",
      };

      const response = {
        status: "OK",
        routes: [
          {
            legs: [
              {
                steps: [
                  {
                    travel_mode: "TRANSIT",
                    transit_details: {
                      line: { name: "Caltrain" },
                      arrival_time: { value: 1234567890, text: "10:30 AM" },
                      departure_time: { value: 1234567800, text: "10:20 AM" },
                      arrival_stop: { name: "San Francisco" },
                      headsign: "San Francisco",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = processTrainResponse(stopConfig, response);

      expect(result).toMatchObject({
        name: "South San Francisco",
        type: "train",
        routeFilter: "Caltrain",
        transitMode: "rail",
      });
      expect(result.allArrivalTimes.length).toBeGreaterThan(0);
    });
  });

  describe("getTrainStopData - test ALL Caltrain stops", () => {
    // Test that all Caltrain stops in dropdown return successful responses
    CALTRAIN_STOPS.forEach((stop) => {
      it(`should successfully fetch data for ${stop}`, async () => {
        const stopConfig = {
          name: stop,
          type: "train",
          origin: stop,
          destination: mockDestination,
          routeFilter: "Caltrain",
          transitMode: "rail",
        };

        const mockResponse = {
          data: {
            status: "OK",
            routes: [
              {
                legs: [
                  {
                    steps: [
                      {
                        travel_mode: "TRANSIT",
                        transit_details: {
                          line: { name: "Caltrain" },
                          arrival_time: { value: 1234567890, text: "10:30 AM" },
                          departure_time: { value: 1234567800, text: "10:20 AM" },
                          arrival_stop: { name: "San Francisco" },
                          headsign: "San Francisco",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await getTrainStopData(stopConfig, mockApiKey);

        expect(result).toMatchObject({
          name: stop,
          type: "train",
          origin: stop,
          destination: mockDestination,
        });
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });
});

