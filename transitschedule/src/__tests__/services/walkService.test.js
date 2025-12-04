import { fetchWalkRoute, processWalkResponse, getWalkStopData } from "../../services/walkService";

// Mock axios
jest.mock("axios");
const axios = require("axios");

describe("walkService", () => {
  const mockApiKey = "test-api-key";
  const mockOrigin = "2215 post rd austin tx 78704";
  const mockDestination = "2400 S. CONGRESS AVE. AUSTIN, TX 78704";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchWalkRoute", () => {
    it("should fetch walk route successfully", async () => {
      const mockResponse = {
        data: {
          status: "OK",
          routes: [
            {
              legs: [
                {
                  duration: { value: 600, text: "10 mins" },
                },
              ],
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchWalkRoute(mockOrigin, mockDestination, mockApiKey);

      expect(axios.get).toHaveBeenCalledWith(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin: mockOrigin,
            destination: mockDestination,
            mode: "walking",
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
        fetchWalkRoute(mockOrigin, mockDestination, mockApiKey)
      ).rejects.toThrow("Network error");
    });
  });

  describe("processWalkResponse", () => {
    it("should process successful walk response", () => {
      const stopConfig = {
        name: "To HEB",
        type: "walk",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "walking",
      };

      const response = {
        status: "OK",
        routes: [
          {
            legs: [
              {
                duration: { value: 600, text: "10 mins" },
              },
            ],
          },
        ],
      };

      const result = processWalkResponse(stopConfig, response);

      expect(result).toMatchObject({
        name: "To HEB",
        type: "walk",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "walking",
        estimatedTime: "10 min",
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      });
    });

    it("should handle failed response", () => {
      const stopConfig = {
        name: "To HEB",
        type: "walk",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "walking",
      };

      const response = {
        status: "ZERO_RESULTS",
      };

      const result = processWalkResponse(stopConfig, response);

      expect(result).toMatchObject({
        name: "To HEB",
        type: "walk",
        estimatedTime: null,
        allArrivalTimes: [],
      });
    });
  });

  describe("getWalkStopData", () => {
    it("should fetch and process walk stop data", async () => {
      const stopConfig = {
        name: "To HEB",
        type: "walk",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "walking",
      };

      const mockResponse = {
        data: {
          status: "OK",
          routes: [
            {
              legs: [
                {
                  duration: { value: 600, text: "10 mins" },
                },
              ],
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await getWalkStopData(stopConfig, mockApiKey);

      expect(result).toMatchObject({
        name: "To HEB",
        type: "walk",
        estimatedTime: "10 min",
      });
    });
  });
});

