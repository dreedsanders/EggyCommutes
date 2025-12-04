import { fetchBikeRoute, processBikeResponse, getBikeStopData } from "../../services/bikeService";

// Mock axios
jest.mock("axios");
const axios = require("axios");

describe("bikeService", () => {
  const mockApiKey = "test-api-key";
  const mockOrigin = "2215 post rd austin tx 78704";
  const mockDestination = "barton springs pool in austin tx";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchBikeRoute", () => {
    it("should fetch bike route successfully", async () => {
      const mockResponse = {
        data: {
          status: "OK",
          routes: [
            {
              legs: [
                {
                  duration: { value: 900, text: "15 mins" },
                },
              ],
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchBikeRoute(mockOrigin, mockDestination, mockApiKey);

      expect(axios.get).toHaveBeenCalledWith(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin: mockOrigin,
            destination: mockDestination,
            mode: "bicycling",
            key: mockApiKey,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle API errors", async () => {
      const mockError = new Error("Network error");
      axios.get.mockRejectedValue(mockError);

      await expect(
        fetchBikeRoute(mockOrigin, mockDestination, mockApiKey)
      ).rejects.toThrow("Network error");
    });
  });

  describe("processBikeResponse", () => {
    it("should process successful bike response", () => {
      const stopConfig = {
        name: "To Springs",
        type: "bike",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "bicycling",
      };

      const response = {
        status: "OK",
        routes: [
          {
            legs: [
              {
                duration: { value: 900, text: "15 mins" },
              },
            ],
          },
        ],
      };

      const result = processBikeResponse(stopConfig, response);

      expect(result).toMatchObject({
        name: "To Springs",
        type: "bike",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "bicycling",
        estimatedTime: "15 min",
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      });
    });

    it("should handle failed response", () => {
      const stopConfig = {
        name: "To Springs",
        type: "bike",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "bicycling",
      };

      const response = {
        status: "ZERO_RESULTS",
      };

      const result = processBikeResponse(stopConfig, response);

      expect(result).toMatchObject({
        name: "To Springs",
        type: "bike",
        estimatedTime: null,
        allArrivalTimes: [],
      });
    });
  });

  describe("getBikeStopData", () => {
    it("should fetch and process bike stop data", async () => {
      const stopConfig = {
        name: "To Springs",
        type: "bike",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "bicycling",
      };

      const mockResponse = {
        data: {
          status: "OK",
          routes: [
            {
              legs: [
                {
                  duration: { value: 900, text: "15 mins" },
                },
              ],
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await getBikeStopData(stopConfig, mockApiKey);

      expect(result).toMatchObject({
        name: "To Springs",
        type: "bike",
        estimatedTime: "15 min",
      });
    });
  });
});

