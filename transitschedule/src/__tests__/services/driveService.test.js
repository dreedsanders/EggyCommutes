import { fetchDriveRoute, processDriveResponse, getDriveStopData } from "../../services/driveService";

// Mock axios
jest.mock("axios");
const axios = require("axios");

describe("driveService", () => {
  const mockApiKey = "test-api-key";
  const mockOrigin = "2215 post rd austin tx 78704";
  const mockDestination = "4477 S Lamar Blvd, Austin, TX 78745";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchDriveRoute", () => {
    it("should fetch drive route successfully", async () => {
      const mockResponse = {
        data: {
          status: "OK",
          routes: [
            {
              legs: [
                {
                  duration: { value: 420, text: "7 mins" },
                },
              ],
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchDriveRoute(mockOrigin, mockDestination, mockApiKey);

      expect(axios.get).toHaveBeenCalledWith(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin: mockOrigin,
            destination: mockDestination,
            mode: "driving",
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
        fetchDriveRoute(mockOrigin, mockDestination, mockApiKey)
      ).rejects.toThrow("Network error");
    });
  });

  describe("processDriveResponse", () => {
    it("should process successful drive response", () => {
      const stopConfig = {
        name: "Central Market",
        type: "drive",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "driving",
      };

      const response = {
        status: "OK",
        routes: [
          {
            legs: [
              {
                duration: { value: 420, text: "7 mins" },
              },
            ],
          },
        ],
      };

      const result = processDriveResponse(stopConfig, response);

      expect(result).toMatchObject({
        name: "Central Market",
        type: "drive",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "driving",
        estimatedTime: "7 min",
        allArrivalTimes: [],
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      });
    });

    it("should handle failed response", () => {
      const stopConfig = {
        name: "Central Market",
        type: "drive",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "driving",
      };

      const response = {
        status: "ZERO_RESULTS",
      };

      const result = processDriveResponse(stopConfig, response);

      expect(result).toMatchObject({
        name: "Central Market",
        type: "drive",
        estimatedTime: null,
        allArrivalTimes: [],
      });
    });
  });

  describe("getDriveStopData", () => {
    it("should fetch and process drive stop data", async () => {
      const stopConfig = {
        name: "Central Market",
        type: "drive",
        origin: mockOrigin,
        destination: mockDestination,
        mode: "driving",
      };

      const mockResponse = {
        data: {
          status: "OK",
          routes: [
            {
              legs: [
                {
                  duration: { value: 420, text: "7 mins" },
                },
              ],
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await getDriveStopData(stopConfig, mockApiKey);

      expect(result).toMatchObject({
        name: "Central Market",
        type: "drive",
        estimatedTime: "7 min",
      });
    });
  });
});

