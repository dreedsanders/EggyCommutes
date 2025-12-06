module Api
  module V1
    class TransitDataController < BaseController
      # Endpoint to fetch transit data
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
    end
  end
end

