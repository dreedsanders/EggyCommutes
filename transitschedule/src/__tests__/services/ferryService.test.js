import { getFerrySchedule, processFerryStop, getFerryStopData } from "../../services/ferryService";

describe("ferryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getFerrySchedule", () => {
    it("should return Anacortes schedule times", () => {
      const times = getFerrySchedule("anacortes");
      
      expect(times).toHaveLength(6);
      expect(times.every(time => time instanceof Date)).toBe(true);
    });

    it("should return Orcas schedule times", () => {
      const times = getFerrySchedule("orcas");
      
      expect(times).toHaveLength(6);
      expect(times.every(time => time instanceof Date)).toBe(true);
    });

    it("should default to Anacortes when no direction specified", () => {
      const times = getFerrySchedule();
      
      expect(times).toHaveLength(6);
    });
  });

  describe("processFerryStop", () => {
    it("should process Anacortes ferry stop", () => {
      const stopConfig = {
        name: "Anacortes To Orcas Island",
        type: "ferry",
        ferryDirection: "anacortes",
        location: "Anacortes, WA",
      };

      const result = processFerryStop(stopConfig);

      expect(result).toMatchObject({
        name: "Anacortes To Orcas Island",
        type: "ferry",
        ferryDirection: "anacortes",
        location: "Anacortes, WA",
        nextDepartureTime: expect.any(Date),
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      });
      expect(result.allArrivalTimes).toHaveLength(6);
    });

    it("should process Orcas ferry stop", () => {
      const stopConfig = {
        name: "Orcas Island To Anacortes",
        type: "ferry",
        ferryDirection: "orcas",
        location: "Orcas Island, WA",
      };

      const result = processFerryStop(stopConfig);

      expect(result).toMatchObject({
        name: "Orcas Island To Anacortes",
        type: "ferry",
        ferryDirection: "orcas",
        location: "Orcas Island, WA",
        nextDepartureTime: expect.any(Date),
        nextArrivalTime: null,
        lastStopTime: null,
        isWithinTwoStops: false,
      });
      expect(result.allArrivalTimes).toHaveLength(6);
    });
  });

  describe("getFerryStopData", () => {
    it("should fetch and process ferry stop data", async () => {
      const stopConfig = {
        name: "Anacortes To Orcas Island",
        type: "ferry",
        ferryDirection: "anacortes",
        location: "Anacortes, WA",
      };

      const result = await getFerryStopData(stopConfig);

      expect(result).toMatchObject({
        name: "Anacortes To Orcas Island",
        type: "ferry",
        ferryDirection: "anacortes",
        allArrivalTimes: expect.any(Array),
        nextDepartureTime: expect.any(Date),
      });
    });
  });
});

