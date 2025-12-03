# Fetching Transit Data

To avoid making API calls on every page load, you can fetch the transit data once via command line and save it to files. The app will then use these saved files instead of making API calls.

## Setup

1. Make sure you have your API key set in `.env`:

   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

2. Run the fetch script:
   ```bash
   node fetch-transit-data.js
   ```

This will:

- Fetch data for all stops (bus, train, bike, walk, drive)
- Save the responses to JSON files in `public/data/`
- The app will automatically use these files instead of making API calls

## Files Created

The script creates the following files in `public/data/`:

- `congress-oltorf-bus.json` - Bus stop data
- `south-san-francisco-train.json` - Train stop data
- `to-springs-bike.json` - Bike directions
- `to-heb-walk.json` - Walking directions
- `central-market-drive.json` - Driving directions

## How It Works

- The app checks for saved data files first
- If a file exists, it loads from that file (no API call)
- If a file doesn't exist, it falls back to making an API call
- This avoids API rate limits and network issues

## Updating Data

To refresh the data, simply run the fetch script again:

```bash
node fetch-transit-data.js
```

The old files will be overwritten with fresh data.
