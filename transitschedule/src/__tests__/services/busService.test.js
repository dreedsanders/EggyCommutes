import { fetchBusRoute, processBusResponse, getBusStopData, CAP_METRO_STOPS } from "../../services/busService";

// Mock axios
jest.mock("axios");
const axios = require("axios");

describe("busService", () => {
  const mockApiKey = "test-api-key";
  const mockDestination = "Downtown Station, Austin, TX";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchBusRoute", () => {
    it("should fetch bus route successfully", async () => {
      const mockOrigin = "Congress and Oltorf, Austin, TX";
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
                        line: { short_name: "801", name: "801" },
                        arrival_time: { value: 1234567890, text: "10:30 AM" },
                        departure_time: { value: 1234567800, text: "10:20 AM" },
                        arrival_stop: { name: "Downtown Station" },
                        headsign: "Downtown",
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

      const result = await fetchBusRoute(mockOrigin, mockDestination, mockApiKey);

      expect(axios.get).toHaveBeenCalledWith(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin: mockOrigin,
            destination: mockDestination,
            mode: "transit",
            transit_mode: "bus",
            departure_time: "now",
            alternatives: true,
            key: mockApiKey,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("processBusResponse", () => {
    it("should process successful bus response with route 801", () => {
      const stopConfig = {
        name: "Congress and Oltorf",
        type: "bus",
        origin: "Congress and Oltorf, Austin, TX",
        destination: mockDestination,
        routeFilter: "801",
        transitMode: "bus",
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
                      line: { short_name: "801", name: "801" },
                      arrival_time: { value: 1234567890, text: "10:30 AM" },
                      departure_time: { value: 1234567800, text: "10:20 AM" },
                      arrival_stop: { name: "Downtown Station" },
                      headsign: "Downtown",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = processBusResponse(stopConfig, response);

      expect(result).toMatchObject({
        name: "Congress and Oltorf",
        type: "bus",
        routeFilter: "801",
        transitMode: "bus",
      });
      expect(result.allArrivalTimes.length).toBeGreaterThan(0);
    });
  });

  describe("getBusStopData - test ALL Cap Metro stops", () => {
    // Test that all Cap Metro stops in dropdown return successful responses
    CAP_METRO_STOPS.forEach((stop) => {
      it(`should successfully fetch data for ${stop}`, async () => {
        const stopConfig = {
          name: stop,
          type: "bus",
          origin: stop,
          destination: mockDestination,
          routeFilter: "801",
          transitMode: "bus",
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
                          line: { short_name: "801", name: "801" },
                          arrival_time: { value: 1234567890, text: "10:30 AM" },
                          departure_time: { value: 1234567800, text: "10:20 AM" },
                          arrival_stop: { name: "Downtown Station" },
                          headsign: "Downtown",
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

        const result = await getBusStopData(stopConfig, mockApiKey);

        expect(result).toMatchObject({
          name: stop,
          type: "bus",
          origin: stop,
          destination: mockDestination,
        });
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });
});

