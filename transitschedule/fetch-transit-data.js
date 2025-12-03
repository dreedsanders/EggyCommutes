#!/usr/bin/env node

/**
 * Script to fetch transit data once and save to JSON files
 * Run this script once to populate the data files, then the app will use those files
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Read API key from .env file
require("dotenv").config({ path: path.join(__dirname, ".env") });
const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
  console.error("Error: REACT_APP_GOOGLE_MAPS_API_KEY not set in .env file");
  process.exit(1);
}

const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
const dataDir = path.join(__dirname, "public", "data");

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Define the stops we want to fetch
const stopsConfig = [
  {
    name: "Congress and Oltorf",
    type: "bus",
    origin: "Congress and Oltorf, Austin, TX",
    destination: "Downtown Station, Austin, TX",
    routeFilter: "801",
    transitMode: "bus",
    filename: "congress-oltorf-bus.json",
  },
  {
    name: "South San Francisco",
    type: "train",
    origin: "South San Francisco Caltrain Station, CA",
    destination: "San Francisco Caltrain Station, CA",
    routeFilter: "Caltrain",
    transitMode: "rail",
    filename: "south-san-francisco-train.json",
  },
  {
    name: "To Springs",
    type: "bike",
    origin: "2215 post rd austin tx 78704",
    destination: "barton springs pool in austin tx",
    mode: "bicycling",
    filename: "to-springs-bike.json",
  },
  {
    name: "To HEB",
    type: "walk",
    origin: "2215 post rd austin tx 78704",
    destination: "2400 S. CONGRESS AVE. AUSTIN, TX 78704",
    mode: "walking",
    filename: "to-heb-walk.json",
  },
  {
    name: "Central Market",
    type: "drive",
    origin: "2215 post rd austin tx 78704",
    destination: "4477 S Lamar Blvd, Austin, TX 78745",
    mode: "driving",
    filename: "central-market-drive.json",
  },
];

async function fetchAndSaveData() {
  console.log("Fetching transit data...\n");

  for (const stopConfig of stopsConfig) {
    try {
      let params;

      if (
        stopConfig.type === "bike" ||
        stopConfig.type === "walk" ||
        stopConfig.type === "drive"
      ) {
        params = {
          origin: stopConfig.origin,
          destination: stopConfig.destination,
          mode: stopConfig.mode,
          key: apiKey,
        };
      } else {
        params = {
          origin: stopConfig.origin,
          destination: stopConfig.destination,
          mode: "transit",
          transit_mode: stopConfig.transitMode,
          departure_time: "now",
          alternatives: true,
          key: apiKey,
        };
      }

      console.log(
        `Fetching data for ${stopConfig.name} (${stopConfig.type})...`
      );
      const response = await axios.get(baseUrl, { params });

      if (response.data && response.data.status === "OK") {
        const filePath = path.join(dataDir, stopConfig.filename);
        fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));
        console.log(`✓ Saved data to ${stopConfig.filename}`);
      } else {
        console.log(
          `✗ Error for ${stopConfig.name}: ${
            response.data?.status || "Unknown error"
          }`
        );
        if (response.data?.error_message) {
          console.log(`  ${response.data.error_message}`);
        }
      }
    } catch (error) {
      console.error(`✗ Error fetching ${stopConfig.name}:`, error.message);
    }
  }

  console.log("\n✓ Data fetch complete!");
  console.log(`Data files saved in: ${dataDir}`);
}

fetchAndSaveData();
