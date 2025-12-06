# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Default home address
DEFAULT_HOME_ADDRESS = "2215 post rd austin tx 78704"

# Create seed user
user = User.find_or_create_by(email: "d@d.com") do |u|
  u.name = "Donovan"
  u.password = "1234"
end

# Create 4 stops for each user (walk, bus, drive, bike)
# All stops use valid addresses that will return successful API responses

# Walk stop - within 2 miles of home
Stop.find_or_create_by(
  user: user,
  destination: "2400 S. CONGRESS AVE. AUSTIN, TX 78704",
  transit_type: "walk",
  origin: DEFAULT_HOME_ADDRESS
) do |stop|
  stop.name = "To HEB"
  stop.position = user.stops.count + 1
end

# Bus stop - valid Cap Metro stop
Stop.find_or_create_by(
  user: user,
  destination: "Lamar and Oltorf, Austin, TX",
  transit_type: "bus",
  origin: nil
) do |stop|
  stop.name = "Lamar and Oltorf"
  stop.route_filter = "801"
  stop.position = user.stops.count + 1
end

# Drive stop - within 2 miles of home
Stop.find_or_create_by(
  user: user,
  destination: "4477 S Lamar Blvd, Austin, TX 78745",
  transit_type: "drive",
  origin: DEFAULT_HOME_ADDRESS
) do |stop|
  stop.name = "Central Market"
  stop.position = user.stops.count + 1
end

# Bike stop - within 2 miles of home
Stop.find_or_create_by(
  user: user,
  destination: "Barton Springs Pool, Austin, TX",
  transit_type: "bike",
  origin: DEFAULT_HOME_ADDRESS
) do |stop|
  stop.name = "To Springs"
  stop.position = user.stops.count + 1
end

# Create stops for any other users in the database
User.where.not(email: "d@d.com").find_each do |u|
  # Walk stop
  Stop.find_or_create_by(
    user: u,
    destination: "2400 S. CONGRESS AVE. AUSTIN, TX 78704",
    transit_type: "walk",
    origin: DEFAULT_HOME_ADDRESS
  ) do |stop|
    stop.name = "To HEB"
    stop.position = u.stops.count + 1
  end

  # Bus stop
  Stop.find_or_create_by(
    user: u,
    destination: "Lamar and Oltorf, Austin, TX",
    transit_type: "bus",
    origin: nil
  ) do |stop|
    stop.name = "Lamar and Oltorf"
    stop.route_filter = "801"
    stop.position = u.stops.count + 1
  end

  # Drive stop
  Stop.find_or_create_by(
    user: u,
    destination: "4477 S Lamar Blvd, Austin, TX 78745",
    transit_type: "drive",
    origin: DEFAULT_HOME_ADDRESS
  ) do |stop|
    stop.name = "Central Market"
    stop.position = u.stops.count + 1
  end

  # Bike stop
  Stop.find_or_create_by(
    user: u,
    destination: "Barton Springs Pool, Austin, TX",
    transit_type: "bike",
    origin: DEFAULT_HOME_ADDRESS
  ) do |stop|
    stop.name = "To Springs"
    stop.position = u.stops.count + 1
  end
end
