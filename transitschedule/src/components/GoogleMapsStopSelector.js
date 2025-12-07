import React, { useState, useEffect, useRef, useCallback } from "react";
import { formatStopName } from "../utils/stopFormHelpers";
import "./GoogleMapsStopSelector.css";

/**
 * GoogleMapsStopSelector Component
 *
 * Interactive Google Maps interface for adding/editing stops.
 * Users can search for places, click on locations, and get directions
 * to automatically populate stop data with ETAs.
 */
const GoogleMapsStopSelector = ({
  stop, // For editing existing stop
  stopType, // For adding new stop (bike, walk, drive, bus, train, ferry)
  homeAddress,
  apiKey,
  onClose,
  onSubmit,
}) => {
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const autocompleteInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stopName, setStopName] = useState("");
  const [ferryDirection, setFerryDirection] = useState("anacortes");

  // Determine the stop type (from prop or existing stop)
  const currentStopType = stop?.type || stopType || "drive";

  // Initialize origin based on stop type
  useEffect(() => {
    if (stop) {
      // Editing existing stop
      setOrigin(stop.origin || homeAddress || "");
      setDestination(stop.destination || "");
      setStopName(stop.name || "");
      if (stop.type === "ferry") {
        setFerryDirection(stop.ferryDirection || "anacortes");
      }
    } else {
      // Adding new stop
      if (currentStopType === "bike" || currentStopType === "walk" || currentStopType === "drive") {
        setOrigin(homeAddress || "");
      } else if (currentStopType === "bus" || currentStopType === "train") {
        setOrigin("");
      }
    }
  }, [stop, stopType, homeAddress, currentStopType]);

  // Handle place selection (shared function for both autocomplete and map clicks)
  const handlePlaceSelection = useCallback((place) => {
    console.log("handlePlaceSelection called with place:", place);
    
    if (!place.geometry) {
      console.warn("Place has no geometry:", place);
      setError("No details available for the selected place");
      return;
    }

    console.log("Setting selectedPlace state");
    setSelectedPlace(place);
    const dest = place.formatted_address || place.name;
    // Prefer place name over address for stop name, but use address if name is generic
    let name = place.name || place.formatted_address;
    // If the name looks like an address (starts with number), prefer a shorter version
    if (name && /^\d+\s+/.test(name) && place.formatted_address) {
      // Try to extract a better name - use the place name if it's different from address
      name = place.name && place.name !== place.formatted_address 
        ? place.name 
        : place.formatted_address;
    }
    console.log("Setting destination:", dest);
    console.log("Setting stopName:", name);
    setDestination(dest);
    setStopName(name);
    setError(""); // Clear any previous errors

    // Clear previous marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Add marker for selected place
    if (mapInstanceRef.current) {
      const marker = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: place.geometry.location,
        title: place.name || place.formatted_address,
      });

      markerRef.current = marker;

      // Center map on selected place
      mapInstanceRef.current.setCenter(place.geometry.location);
      mapInstanceRef.current.setZoom(15);
    }

    // Clear previous route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
    setEta(null);
  }, []);

  // Handle map click with reverse geocoding (fallback when no place found)
  const handleMapClickGeocode = useCallback((latLng) => {
    console.log("=== Reverse geocoding ===");
    console.log("Location:", latLng.lat(), latLng.lng());
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      console.log("Geocoding status:", status);
      console.log("Geocoding results:", results);
      if (status === "OK" && results && results.length > 0) {
        const result = results[0];
        // Create a place-like object from geocoding result
        const place = {
          geometry: {
            location: latLng,
          },
          name: result.formatted_address,
          formatted_address: result.formatted_address,
        };
        console.log("Created place from geocoding:", place);
        handlePlaceSelection(place);
      } else {
        console.error("Geocoding failed:", status);
        setError("Could not find place details for this location");
      }
    });
  }, [handlePlaceSelection]);

  // Load Google Maps API dynamically
  useEffect(() => {
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      setError("Google Maps API key is not configured");
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          setGoogleMapsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Load Google Maps API script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleMapsLoaded(true);
    };
    script.onerror = () => {
      setError("Failed to load Google Maps API");
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: don't remove script as it might be used by other components
    };
  }, [apiKey]);

  // Initialize map when Google Maps is loaded (skip for ferry)
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current || currentStopType === "ferry") return;

    const initializeMap = () => {
      try {
        // Default center (Austin, TX) or use home address
        const defaultCenter = { lat: 30.2672, lng: -97.7431 };
        let center = defaultCenter;

        // Try to geocode home address for center
        if (homeAddress) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: homeAddress }, (results, status) => {
            if (status === "OK" && results[0]) {
              center = results[0].geometry.location;
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setCenter(center);
              }
            }
          });
        }

        // Initialize map
        const map = new window.google.maps.Map(mapRef.current, {
          center: center,
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;

        // Add click listener to map to select places
        map.addListener("click", (event) => {
          console.log("=== Map clicked ===");
          console.log("Click location:", event.latLng.lat(), event.latLng.lng());
          
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          
          // First, try to find a place at this exact location using textSearch
          const placesService = new window.google.maps.places.PlacesService(map);
          
          // Try nearbySearch first with a larger radius
          const nearbyRequest = {
            location: event.latLng,
            radius: 100, // Search within 100 meters
            type: ['establishment', 'point_of_interest', 'store', 'restaurant', 'gas_station'],
          };

          console.log("Searching for nearby places with request:", nearbyRequest);
          
          // Set a timeout to fallback to geocoding if nearbySearch takes too long
          let searchCompleted = false;
          const searchTimeout = setTimeout(() => {
            if (!searchCompleted) {
              console.log("nearbySearch timed out, using reverse geocoding");
              searchCompleted = true;
              handleMapClickGeocode(event.latLng);
            }
          }, 3000);
          
          placesService.nearbySearch(nearbyRequest, (results, status) => {
            if (searchCompleted) {
              console.log("nearbySearch completed but already used fallback");
              return;
            }
            searchCompleted = true;
            clearTimeout(searchTimeout);
            
            console.log("=== nearbySearch callback ===");
            console.log("nearbySearch status:", status);
            console.log("nearbySearch status constant:", window.google.maps.places.PlacesServiceStatus[status]);
            console.log("nearbySearch results count:", results ? results.length : 0);
            console.log("nearbySearch results:", results);
            
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              console.log("Found places, processing...");
              // Find the closest result
              let closestPlace = results[0];
              let minDistance = Infinity;
              
              // Use geometry library if available, otherwise just use first result
              if (window.google.maps.geometry && window.google.maps.geometry.spherical) {
                results.forEach((place) => {
                  if (place.geometry && place.geometry.location) {
                    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
                      event.latLng,
                      place.geometry.location
                    );
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestPlace = place;
                    }
                  }
                });
                console.log("Closest place found:", closestPlace.name, "distance:", minDistance, "meters");
              } else {
                console.log("Using first result:", closestPlace.name);
              }
              
              // Get full place details
              console.log("Getting place details for place_id:", closestPlace.place_id);
              placesService.getDetails(
                {
                  placeId: closestPlace.place_id,
                  fields: ['place_id', 'geometry', 'name', 'formatted_address', 'formatted_phone_number', 'rating'],
                },
                (placeDetails, detailsStatus) => {
                  console.log("=== getDetails callback ===");
                  console.log("getDetails status:", detailsStatus);
                  console.log("getDetails status constant:", window.google.maps.places.PlacesServiceStatus[detailsStatus]);
                  console.log("placeDetails:", placeDetails);
                  if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                    console.log("Calling handlePlaceSelection from map click");
                    handlePlaceSelection(placeDetails);
                  } else {
                    console.log("getDetails failed, trying reverse geocoding");
                    // Fallback to reverse geocoding
                    handleMapClickGeocode(event.latLng);
                  }
                }
              );
            } else {
              console.log("=== No nearby places found ===");
              console.log("Status was:", status);
              console.log("Status constant:", window.google.maps.places.PlacesServiceStatus[status]);
              console.log("Results:", results);
              console.log("Trying reverse geocoding as fallback...");
              // No nearby place found, use reverse geocoding
              handleMapClickGeocode(event.latLng);
            }
          });
        });

        // Initialize Directions Service and Renderer
        directionsServiceRef.current = new window.google.maps.DirectionsService();
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: false,
        });
      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Error initializing Google Maps: " + err.message);
      }
    };

    initializeMap();
  }, [googleMapsLoaded, homeAddress, currentStopType, handlePlaceSelection, handleMapClickGeocode]);

  // Initialize Places Autocomplete separately to ensure input element exists
  useEffect(() => {
    if (!googleMapsLoaded || !autocompleteRef.current || currentStopType === "ferry") return;
    if (autocompleteInstanceRef.current) {
      // Clean up existing autocomplete
      window.google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
      autocompleteInstanceRef.current = null;
    }

    let enterKeyHandlerCleanup = null;
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!autocompleteRef.current) return;

      try {
        // Initialize Places Autocomplete
        const autocomplete = new window.google.maps.places.Autocomplete(
          autocompleteRef.current,
          {
            types: ["establishment", "geocode"],
            fields: ["place_id", "geometry", "name", "formatted_address"],
          }
        );

        autocompleteInstanceRef.current = autocomplete;

        // Bind autocomplete to the map to get place predictions (if map exists)
        if (mapInstanceRef.current) {
          autocomplete.bindTo("bounds", mapInstanceRef.current);
        }

        // When place is selected from dropdown
        autocomplete.addListener("place_changed", () => {
          console.log("=== place_changed event fired ===");
          const place = autocomplete.getPlace();
          console.log("Raw place object:", place);
          console.log("Place place_id:", place?.place_id);
          console.log("Place geometry:", place?.geometry);
          console.log("Place name:", place?.name);
          console.log("Place formatted_address:", place?.formatted_address);
          
          // Always try to get full place details using place_id if available
          // This ensures we have complete place data including geometry
          if (place && place.place_id && mapInstanceRef.current) {
            console.log("Fetching full place details for place_id:", place.place_id);
            const placesService = new window.google.maps.places.PlacesService(mapInstanceRef.current);
            placesService.getDetails(
              {
                placeId: place.place_id,
                fields: ['place_id', 'geometry', 'name', 'formatted_address', 'types'],
              },
              (placeDetails, status) => {
                console.log("getDetails callback - status:", status);
                console.log("placeDetails:", placeDetails);
                if (status === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                  console.log("Successfully got place details, calling handlePlaceSelection");
                  handlePlaceSelection(placeDetails);
                } else {
                  console.error("Failed to get place details, status:", status);
                  // Fallback: try to use the place object as-is if it has geometry
                  if (place.geometry) {
                    console.log("Falling back to place object with geometry");
                    handlePlaceSelection(place);
                  } else {
                    setError("Could not get details for selected place. Please try again or use the Search button.");
                  }
                }
              }
            );
          } else if (place && place.geometry) {
            // If we have geometry, use it directly
            console.log("Place has geometry, using directly");
            handlePlaceSelection(place);
          } else {
            console.warn("Place object is invalid or missing required data:", place);
            setError("Could not get place details. Please try using the Search button or clicking on the map.");
          }
        });
        
        // Also listen for clicks on the autocomplete dropdown items directly
        // This is a workaround for when place_changed doesn't fire immediately
        const setupPacClickListener = () => {
          const pacContainer = document.querySelector('.pac-container');
          if (pacContainer) {
            // Remove any existing listener
            const newPacContainer = pacContainer.cloneNode(true);
            pacContainer.parentNode.replaceChild(newPacContainer, pacContainer);
            
            newPacContainer.addEventListener('click', (e) => {
              console.log("Pac-container item clicked");
              // Wait for autocomplete to process, then check for place
              setTimeout(() => {
                const place = autocomplete.getPlace();
                console.log("Place from autocomplete after click:", place);
                if (place && place.place_id) {
                  if (place.geometry) {
                    console.log("Place has geometry, calling handlePlaceSelection");
                    handlePlaceSelection(place);
                  } else if (mapInstanceRef.current) {
                    console.log("Place missing geometry, fetching details");
                    const placesService = new window.google.maps.places.PlacesService(mapInstanceRef.current);
                    placesService.getDetails(
                      {
                        placeId: place.place_id,
                        fields: ['place_id', 'geometry', 'name', 'formatted_address'],
                      },
                      (placeDetails, status) => {
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                          console.log("Got place details from click, calling handlePlaceSelection");
                          handlePlaceSelection(placeDetails);
                        } else {
                          console.error("Failed to get place details from click:", status);
                        }
                      }
                    );
                  }
                } else {
                  console.warn("No place found after pac-container click");
                }
              }, 200);
            }, true);
          }
        };
        
        // Set up listener when dropdown appears
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              const pacContainer = document.querySelector('.pac-container');
              if (pacContainer && !pacContainer.dataset.listenerAttached) {
                pacContainer.dataset.listenerAttached = 'true';
                setupPacClickListener();
              }
            }
          });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Also try to set up immediately
        setTimeout(setupPacClickListener, 500);

        // Also listen for Enter key press on the input
        const inputElement = autocompleteRef.current;
        const enterKeyHandler = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const place = autocomplete.getPlace();
            console.log("Enter pressed, current place:", place);
            if (place && place.place_id) {
              if (place.geometry) {
                handlePlaceSelection(place);
              } else if (mapInstanceRef.current) {
                // Get place details
                const placesService = new window.google.maps.places.PlacesService(mapInstanceRef.current);
                placesService.getDetails(
                  {
                    placeId: place.place_id,
                    fields: ['place_id', 'geometry', 'name', 'formatted_address'],
                  },
                  (placeDetails, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                      handlePlaceSelection(placeDetails);
                    } else {
                      console.error("Failed to get place details on Enter:", status);
                    }
                  }
                );
              }
            } else {
              console.warn("No place selected when Enter was pressed");
            }
          }
        };
        inputElement.addEventListener("keydown", enterKeyHandler);
        
        // Store cleanup function
        enterKeyHandlerCleanup = () => {
          inputElement.removeEventListener("keydown", enterKeyHandler);
        };

        console.log("Places Autocomplete initialized successfully");
      } catch (err) {
        console.error("Error initializing autocomplete:", err);
        setError("Error initializing Places Autocomplete: " + err.message);
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (enterKeyHandlerCleanup) {
        enterKeyHandlerCleanup();
      }
      if (autocompleteInstanceRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
        autocompleteInstanceRef.current = null;
      }
    };
  }, [googleMapsLoaded, currentStopType, handlePlaceSelection]);

  // Handle Get Directions button click
  const handleGetDirections = async () => {
    if (!selectedPlace || !origin || !destination) {
      setError("Please select a destination and ensure origin is set");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Determine travel mode based on stop type
      let travelMode = window.google.maps.TravelMode.DRIVING;
      if (currentStopType === "walk") {
        travelMode = window.google.maps.TravelMode.WALKING;
      } else if (currentStopType === "bike") {
        travelMode = window.google.maps.TravelMode.BICYCLING;
      } else if (currentStopType === "bus" || currentStopType === "train") {
        travelMode = window.google.maps.TravelMode.TRANSIT;
      }

      // Request directions
      directionsServiceRef.current.route(
        {
          origin: origin,
          destination: destination,
          travelMode: travelMode,
        },
        (result, status) => {
          setLoading(false);

          if (status === window.google.maps.DirectionsStatus.OK) {
            // Display route on map
            directionsRendererRef.current.setDirections(result);

            // Extract ETA from response
            const route = result.routes[0];
            const leg = route.legs[0];
            const durationInSeconds = leg.duration.value;
            const durationInMinutes = Math.round(durationInSeconds / 60);
            const durationText = leg.duration.text;

            setEta({
              minutes: durationInMinutes,
              text: durationText,
              distance: leg.distance.text,
            });

            // Update origin/destination with formatted addresses from directions
            setOrigin(leg.start_address);
            setDestination(leg.end_address);
          } else {
            setError("Could not calculate directions: " + status);
          }
        }
      );
    } catch (err) {
      setLoading(false);
      setError("Error calculating directions: " + err.message);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!origin || !destination) {
      setError("Origin and destination are required");
      return;
    }

    // For drive/walk/bike, we need ETA
    if ((currentStopType === "drive" || currentStopType === "walk" || currentStopType === "bike") && !eta) {
      setError("Please get directions first to calculate ETA");
      return;
    }

    // For ferry, we need direction
    if (currentStopType === "ferry") {
      // Ferry doesn't need directions, just direction selection
      const stopData = {
        name: stopName || "Ferry",
        origin: null,
        destination: null,
        transit_type: currentStopType,
        route_filter: null,
        stop_filter: null,
        ferry_direction: ferryDirection,
        location: null,
        arrival: false,
        departure: false,
      };

      if (onSubmit) {
        try {
          await onSubmit(stopData);
        } catch (err) {
          setError(err.message || "Error submitting stop");
        }
      }
      return;
    }

    // Format stop name properly using formatStopName utility
    // Prefer selectedPlace name, then stopName, then format from origin/destination
    let formattedStopName = selectedPlace?.name || stopName || destination;
    
    try {
      if (origin && destination && apiKey && apiKey !== "YOUR_API_KEY_HERE") {
        console.log("Formatting stop name from origin and destination");
        console.log("Origin:", origin);
        console.log("Destination:", destination);
        console.log("Current stopName:", stopName);
        console.log("Selected place name:", selectedPlace?.name);
        
        const formattedName = await formatStopName(origin, destination, apiKey);
        console.log("Formatted stop name result:", formattedName);
        
        // Use formatted name if it's better than what we have
        if (formattedName && formattedName !== destination) {
          formattedStopName = formattedName;
        }
      }
    } catch (err) {
      console.warn("Error formatting stop name, using fallback:", err);
      // Use fallback name - prefer selectedPlace name, then stopName, then destination
      formattedStopName = selectedPlace?.name || stopName || destination;
    }

    // Ensure we have a name
    if (!formattedStopName || formattedStopName.trim() === "") {
      formattedStopName = selectedPlace?.name || stopName || destination || "Untitled Stop";
    }

    console.log("Final formatted stop name:", formattedStopName);

    // Prepare stop data
    const stopData = {
      name: formattedStopName.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      transit_type: currentStopType,
      route_filter: stop?.routeFilter || null,
      stop_filter: stop?.stopFilter || null,
      ferry_direction: null,
      location: null,
      arrival: false,
      departure: false,
    };

    console.log("Submitting stop data:", JSON.stringify(stopData, null, 2));

    // Call onSubmit callback
    if (onSubmit) {
      try {
        await onSubmit(stopData);
      } catch (err) {
        setError(err.message || "Error submitting stop");
      }
    }
  };

  // Prevent clicks on autocomplete dropdown from closing modal
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if click is on the autocomplete dropdown
      const pacContainer = e.target.closest('.pac-container');
      if (pacContainer) {
        e.stopPropagation();
        // Don't prevent default - allow the click to work on the dropdown items
        return;
      }
      
      // Also check if clicking on a pac-item (dropdown suggestion)
      if (e.target.closest('.pac-item')) {
        e.stopPropagation();
        // The autocomplete should handle this, but we prevent modal close
        return;
      }
    };

    // Use capture phase to intercept before modal overlay handler
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  if (!googleMapsLoaded) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="maps-selector-modal" onClick={(e) => e.stopPropagation()}>
          <div className="maps-loading">Loading Google Maps...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="maps-selector-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="maps-selector-title">
          {stop ? "Edit Stop" : "Add Stop"} - {currentStopType.toUpperCase()}
        </h2>

        {error && <div className="maps-selector-error">{error}</div>}

        {/* Search Box - Hide for ferry */}
        {currentStopType !== "ferry" && (
          <div className="maps-search-container">
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                ref={autocompleteRef}
                type="text"
                placeholder="Search for a place and select from dropdown..."
                className="maps-search-input"
                id="places-autocomplete-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={() => {
                  // Manual search fallback
                  const inputValue = autocompleteRef.current?.value;
                  if (!inputValue || !mapInstanceRef.current) return;
                  
                  const placesService = new window.google.maps.places.PlacesService(mapInstanceRef.current);
                  const request = {
                    query: inputValue,
                    fields: ['place_id', 'geometry', 'name', 'formatted_address'],
                  };
                  
                  placesService.findPlaceFromQuery(request, (results, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                      const place = results[0];
                      placesService.getDetails(
                        {
                          placeId: place.place_id,
                          fields: ['place_id', 'geometry', 'name', 'formatted_address'],
                        },
                        (placeDetails, detailsStatus) => {
                          if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                            handlePlaceSelection(placeDetails);
                          }
                        }
                      );
                    } else {
                      setError("Could not find place. Please try clicking on the map or selecting from the dropdown.");
                    }
                  });
                }}
                className="maps-button maps-button-primary"
                style={{ fontSize: '10px', padding: '8px 15px' }}
              >
                Search
              </button>
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
              Type a place name and click on a suggestion from the dropdown, use the Search button, or click directly on the map
            </div>
          </div>
        )}

        {/* Origin Input (for bus/train or when editing) */}
        {(currentStopType === "bus" || currentStopType === "train" || stop) && (
          <div className="maps-input-container">
            <label>Origin:</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder={
                currentStopType === "bus"
                  ? "Enter bus stop or address"
                  : currentStopType === "train"
                  ? "Enter train station or address"
                  : "Enter origin address"
              }
              className="maps-input"
            />
          </div>
        )}

        {/* Ferry Direction Selector */}
        {currentStopType === "ferry" && (
          <div className="maps-input-container">
            <label>Ferry Direction:</label>
            <select
              value={ferryDirection}
              onChange={(e) => setFerryDirection(e.target.value)}
              className="maps-input"
            >
              <option value="anacortes">Anacortes to Orcas Island</option>
              <option value="orcas">Orcas Island to Anacortes</option>
            </select>
          </div>
        )}

        {/* Map Container - Hide for ferry */}
        {currentStopType !== "ferry" && (
          <div ref={mapRef} className="maps-container" />
        )}

        {/* Selected Place Info */}
        {selectedPlace && (
          <div className="maps-place-info">
            <strong>Selected:</strong> {selectedPlace.name || selectedPlace.formatted_address}
          </div>
        )}

        {/* ETA Display */}
        {eta && (
          <div className="maps-eta-display">
            <div>
              <strong>Estimated Time:</strong> {eta.text}
            </div>
            <div>
              <strong>Distance:</strong> {eta.distance}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="maps-actions">
          {currentStopType !== "ferry" && selectedPlace && !eta && (
            <button
              onClick={handleGetDirections}
              disabled={loading || !origin || !destination}
              className="maps-button maps-button-primary"
              title={
                !origin 
                  ? "Please set origin address" 
                  : !destination 
                  ? "Please select a destination" 
                  : "Click to calculate directions and ETA"
              }
            >
              {loading ? "Calculating..." : "Get Directions"}
            </button>
          )}
          {currentStopType === "ferry" && (
            <button onClick={handleSubmit} className="maps-button maps-button-submit">
              {stop ? "Update Stop" : "Add Stop"}
            </button>
          )}
          {eta && currentStopType !== "ferry" && (
            <button onClick={handleSubmit} className="maps-button maps-button-submit">
              {stop ? "Update Stop" : "Add Stop"}
            </button>
          )}
          <button onClick={onClose} className="maps-button maps-button-cancel">
            Cancel
          </button>
        </div>
        
        {/* Show message if place is selected but button requirements not met */}
        {currentStopType !== "ferry" && selectedPlace && !eta && (!origin || !destination) && (
          <div style={{ 
            fontSize: '12px', 
            color: '#ff4444', 
            marginTop: '10px', 
            padding: '10px', 
            background: '#ffe0e0', 
            borderRadius: '5px' 
          }}>
            {!origin ? "⚠️ Origin address is required. For drive/walk/bike stops, this should be your home address." : ""}
            {!destination ? "⚠️ Please select a destination place." : ""}
          </div>
        )}
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ fontSize: '10px', color: '#666', marginTop: '10px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
            <strong>Debug Info:</strong><br/>
            selectedPlace: {selectedPlace ? `Yes (${selectedPlace.name || selectedPlace.formatted_address})` : 'No'}<br/>
            origin: {origin || 'empty'}<br/>
            destination: {destination || 'empty'}<br/>
            eta: {eta ? `Yes (${eta.text})` : 'No'}<br/>
            currentStopType: {currentStopType}<br/>
            homeAddress: {homeAddress || 'not set'}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleMapsStopSelector;

