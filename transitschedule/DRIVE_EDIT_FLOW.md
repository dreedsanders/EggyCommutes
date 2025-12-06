# Drive Edit Form Submission Flow

Complete file-by-file flow from user clicking the drive box to displaying the updated ETA.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS DRIVE BOX                                            │
│    File: src/TransitDisplay.js                                      │
│    Line: 187 - onClick={() => onEditStop(fullIndex)}                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. EDIT FORM OPENS                                                  │
│    File: src/components/EditStopForm.js                             │
│    Lines: 253-262 - EditStopForm component renders                  │
│                                                                      │
│    User edits:                                                       │
│    - Origin address (line 159-165)                                  │
│    - Destination address (line 169-175)                             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. USER CLICKS "REVIEW" BUTTON                                      │
│    File: src/components/EditStopForm.js                             │
│    Lines: 183-184 - onClick={handleReview}                          │
│                                                                      │
│    handleReview() function (lines 57-107):                          │
│    - Compares form data with previous config                        │
│    - Tracks changes for origin/destination                          │
│    - Calls onReview({ stopIndex, formData, changes })               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. REVIEW POPUP DISPLAYS                                            │
│    File: src/components/ReviewPopup.js                              │
│    Lines: 275-289 - ReviewPopup component renders                   │
│                                                                      │
│    Shows changes summary before submission                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. USER CLICKS "SUBMIT" BUTTON                                      │
│    File: src/components/ReviewPopup.js                              │
│    Lines: 37-38 - onClick={onSubmit}                                │
│                                                                      │
│    Calls: onSubmit() callback                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. SUBMIT HANDLER IN TransitDisplay                                 │
│    File: src/TransitDisplay.js                                      │
│    Lines: 279-286 - onSubmit callback                               │
│                                                                      │
│    Calls: onUpdateStop(reviewData.stopIndex, reviewData.formData)   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 7. UPDATE HANDLER IN App.js                                         │
│    File: src/App.js                                                 │
│    Lines: 154-177 - handleUpdateStop() function                     │
│                                                                      │
│    Calls: updateStop() from utils/stopUpdater.js                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 8. MAIN UPDATE LOGIC                                                │
│    File: src/utils/stopUpdater.js                                   │
│    Lines: 27-227 - updateStop() function                            │
│                                                                      │
│    Steps:                                                           │
│    a) Validates API key (lines 51-54)                               │
│    b) Validates origin/destination (lines 75-80)                    │
│    c) Sets mode for drive/walk/bike (lines 82-92)                   │
│    d) Builds API params (lines 94-99)                               │
│    e) Makes API call (line 124)                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 9. GOOGLE MAPS API REQUEST                                          │
│    URL: https://maps.googleapis.com/maps/api/directions/json        │
│    Method: GET                                                      │
│    Params:                                                          │
│      - origin: user's origin address                                │
│      - destination: user's destination address                      │
│      - mode: "driving"                                              │
│      - key: API key                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 10. API RESPONSE PROCESSING                                         │
│     File: src/utils/stopUpdater.js                                  │
│     Lines: 126-180                                                  │
│                                                                      │
│     Steps:                                                          │
│     a) Check response.status === "OK" (line 126)                    │
│     b) Get destination name if changed (lines 129-136)              │
│     c) Build updated config (lines 146-159)                         │
│     d) Process response with driveService (lines 169-170)           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 11. RESPONSE PROCESSING SERVICE                                     │
│     File: src/services/driveService.js                              │
│     Lines: 43-91 - processDriveResponse() function                  │
│                                                                      │
│     Extracts:                                                       │
│     - Duration from route.legs[0].duration.value                    │
│     - Converts to minutes                                           │
│     - Returns: { estimatedTime: "X min" }                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 12. UPDATE STATE AND UI                                             │
│     File: src/utils/stopUpdater.js                                  │
│     Lines: 182-192                                                  │
│                                                                      │
│     Steps:                                                          │
│     a) Updates stops array with new data (lines 182-184)            │
│     b) Closes edit modal (lines 185-186)                            │
│     c) Refetches all transit times (line 189)                       │
│     d) Reloads page to show new data (line 192)                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 13. ERROR HANDLING (if API call fails)                              │
│     File: src/utils/stopUpdater.js                                  │
│     Lines: 208-226                                                  │
│                                                                      │
│     Uses: src/utils/helpers.js - parseApiError() (lines 149-198)    │
│                                                                      │
│     Handles:                                                        │
│     - Network errors                                                │
│     - API errors (ZERO_RESULTS, NOT_FOUND, etc.)                    │
│     - HTTP errors (403, 404, 500+)                                  │
│     - Shows user-friendly alert                                     │
│     - Reverts to previous configuration                             │
└─────────────────────────────────────────────────────────────────────┘
```

## File Summary

### 1. **src/TransitDisplay.js**

- **Role**: Main display component, renders drive box
- **Key Functions**:
  - Line 187: Opens edit form on click
  - Lines 253-262: Renders EditStopForm
  - Lines 275-289: Renders ReviewPopup
  - Lines 279-286: Handles submit callback

### 2. **src/components/EditStopForm.js**

- **Role**: Form for editing stop addresses
- **Key Functions**:
  - Lines 157-176: Origin/Destination input fields
  - Lines 57-107: handleReview() - validates changes
  - Line 183: Review button handler

### 3. **src/components/ReviewPopup.js**

- **Role**: Shows changes summary before submission
- **Key Functions**:
  - Lines 17-31: Displays changes
  - Line 37: Submit button handler

### 4. **src/App.js**

- **Role**: Main app component, state management
- **Key Functions**:
  - Lines 154-177: handleUpdateStop() wrapper

### 5. **src/utils/stopUpdater.js**

- **Role**: Core update logic, API call orchestration
- **Key Functions**:
  - Lines 27-227: updateStop() - main update function
  - Lines 73-99: Validation and API params setup
  - Line 124: Makes API call via axios
  - Lines 126-180: Processes successful response
  - Lines 208-226: Error handling

### 6. **src/services/driveService.js**

- **Role**: Processes Google Maps API response for driving
- **Key Functions**:
  - Lines 43-91: processDriveResponse() - extracts ETA
  - Lines 66-73: Converts duration to minutes

### 7. **src/utils/helpers.js**

- **Role**: Utility functions for error handling
- **Key Functions**:
  - Lines 149-198: parseApiError() - converts errors to user messages
  - Lines 45-139: getDestinationName() - gets friendly destination name

## Data Flow

```
User Input (Origin/Destination)
    ↓
EditStopForm State (formData)
    ↓
Review Data ({ stopIndex, formData, changes })
    ↓
API Params ({ origin, destination, mode: "driving", key })
    ↓
Google Maps API Response (routes[0].legs[0].duration)
    ↓
Processed Stop ({ estimatedTime: "X min", ... })
    ↓
State Update (setStops)
    ↓
UI Re-render (TransitDisplay shows new ETA)
```

## Key Validation Points

1. **Before API Call** (stopUpdater.js:75-80):

   - Origin address is required and not empty
   - Destination address is required and not empty

2. **Before API Call** (stopUpdater.js:51-54):

   - API key is configured

3. **After API Call** (stopUpdater.js:126):

   - Response status must be "OK"

4. **Error Handling** (stopUpdater.js:208-226):
   - Network errors caught and displayed
   - API errors parsed and shown to user
   - State reverted on error

## API Request Example

```javascript
GET https://maps.googleapis.com/maps/api/directions/json
  ?origin=123 Main St, Austin, TX
  &destination=456 Oak Ave, Austin, TX
  &mode=driving
  &key=YOUR_API_KEY
```

## Response Processing

The API response contains:

```json
{
  "status": "OK",
  "routes": [
    {
      "legs": [
        {
          "duration": {
            "value": 900 // seconds
          }
        }
      ]
    }
  ]
}
```

This gets converted to: `estimatedTime: "15 min"`
