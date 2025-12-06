module Api
  module V1
    class TransitDataController < BaseController
      require 'net/http'
      require 'uri'
      require 'json'

      # Skip authentication for live_transit endpoint (public transit data)
      # Override the authenticate_user! method for this action
      before_action :authenticate_user!, except: [:live_transit]

      # Endpoint to fetch transit data (runs script to update JSON files)
      def fetch
        begin
          # Get the path to the Node.js script
          # Rails.root is transitbackend, so go up one level to get to googlemaps, then into transitschedule
          script_path = Rails.root.join('..', 'transitschedule', 'fetch-transit-data.js').expand_path
          
          # Check if script exists
          unless File.exist?(script_path)
            Rails.logger.error("Script not found at: #{script_path}")
            render_error("Transit data script not found at #{script_path}", status: :not_found)
            return
          end

          # Get the directory containing the script
          script_dir = File.dirname(script_path)
          script_name = File.basename(script_path)
          
          Rails.logger.info("Running transit data script: #{script_path}")
          
          # Run the Node.js script and capture output
          # Use Open3 to capture both stdout and stderr
          require 'open3'
          stdout, stderr, status = Open3.capture3("cd #{script_dir} && node #{script_name}")
          
          if status.success?
            Rails.logger.info("Transit data fetched successfully: #{stdout}")
            render json: { message: "Transit data fetched successfully", status: "success", output: stdout }
          else
            Rails.logger.error("Failed to fetch transit data: #{stderr}")
            render_error("Failed to fetch transit data: #{stderr}", status: :internal_server_error)
          end
        rescue => e
          Rails.logger.error("Error fetching transit data: #{e.message}\n#{e.backtrace.join("\n")}")
          render_error("Error fetching transit data: #{e.message}", status: :internal_server_error)
        end
      end

      # Proxy endpoint to fetch live transit data from Google Maps API
      def live_transit
        begin
          origin = params[:origin]
          destination = params[:destination]
          transit_mode = params[:transit_mode] || 'bus'
          route_filter = params[:route_filter]

          unless origin && destination
            render_error("Origin and destination are required", status: :bad_request)
            return
          end

          # Get API key from environment or Rails credentials
          # Try multiple possible environment variable names
          api_key = ENV['REACT_APP_GOOGLE_MAPS_API_KEY'] || 
                   ENV['GOOGLE_MAPS_API_KEY'] ||
                   Rails.application.credentials.dig(:google_maps, :api_key)
          
          unless api_key && api_key != 'YOUR_API_KEY_HERE'
            Rails.logger.error("Google Maps API key not configured")
            render_error("Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY environment variable.", status: :internal_server_error)
            return
          end

          # Build Google Maps API URL
          base_url = "https://maps.googleapis.com/maps/api/directions/json"
          uri = URI(base_url)
          params_hash = {
            origin: origin,
            destination: destination,
            mode: 'transit',
            transit_mode: transit_mode,
            departure_time: 'now',
            alternatives: true,
            key: api_key
          }
          uri.query = URI.encode_www_form(params_hash)

          Rails.logger.info("Fetching live transit data: #{uri}")

          # Make request to Google Maps API
          http = Net::HTTP.new(uri.host, uri.port)
          http.use_ssl = true
          request = Net::HTTP::Get.new(uri.request_uri)
          response = http.request(request)

          if response.code == '200'
            data = JSON.parse(response.body)
            Rails.logger.info("Live transit data fetched successfully")
            render json: data
          else
            Rails.logger.error("Google Maps API error: #{response.code} - #{response.body}")
            render_error("Failed to fetch transit data from Google Maps API: #{response.code}", status: :bad_gateway)
          end
        rescue => e
          Rails.logger.error("Error fetching live transit data: #{e.message}\n#{e.backtrace.join("\n")}")
          render_error("Error fetching live transit data: #{e.message}", status: :internal_server_error)
        end
      end
    end
  end
end

