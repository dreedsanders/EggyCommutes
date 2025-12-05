#!/bin/bash

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    # Kill Rails server and its children
    if [ ! -z "$RAILS_PID" ]; then
        kill $RAILS_PID 2>/dev/null
        pkill -P $RAILS_PID 2>/dev/null
    fi
    # Kill React app and its children (npm spawns node processes)
    if [ ! -z "$REACT_PID" ]; then
        kill $REACT_PID 2>/dev/null
        pkill -P $REACT_PID 2>/dev/null
    fi
    # Also kill any processes on the ports as a fallback
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "Servers stopped."
    exit
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

# Start Rails server on port 3001 in the background
echo "Starting Rails server on port 3001..."
cd transitbackend
rails server -p 3001 &
RAILS_PID=$!
cd ..

# Wait a moment for Rails to start
sleep 3

# Start React app on port 3000
echo "Starting React app on port 3000..."
cd transitschedule
npm start &
REACT_PID=$!
cd ..

echo ""
echo "Both servers are running. Press Ctrl+C to stop both."
echo ""

# Wait for both processes
wait $RAILS_PID $REACT_PID

