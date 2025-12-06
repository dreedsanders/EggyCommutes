module Api
  module V1
    class StopsController < BaseController
      before_action :set_stop, only: [:show, :update, :hide, :reorder]

      # GET /api/v1/stops
      def index
        @stops = current_user.stops.visible.ordered
        render json: @stops.map { |stop| stop_json(stop) }
      end

      # GET /api/v1/stops/:id
      def show
        render json: stop_json(@stop)
      end

      # POST /api/v1/stops
      def create
        @stop = current_user.stops.build(stop_params)
        @stop.position = current_user.stops.count + 1

        if @stop.save
          render json: stop_json(@stop), status: :created
        else
          render_validation_errors(@stop)
        end
      end

      # PATCH /api/v1/stops/:id
      def update
        if @stop.update(stop_params)
          render json: stop_json(@stop)
        else
          render_validation_errors(@stop)
        end
      end

      # PATCH /api/v1/stops/:id/hide
      def hide
        if @stop.update(hidden: true)
          render json: { message: "Stop hidden successfully" }
        else
          render_validation_errors(@stop)
        end
      end

      # PATCH /api/v1/stops/:id/reorder
      def reorder
        if @stop.update(position: params[:position])
          render json: stop_json(@stop)
        else
          render_validation_errors(@stop)
        end
      end

      private

      def set_stop
        @stop = current_user.stops.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Stop not found", status: :not_found)
      end

      def stop_params
        params.require(:stop).permit(
          :name,
          :destination,
          :origin,
          :transit_type,
          :arrival,
          :departure,
          :favorite,
          :route_filter,
          :stop_filter,
          :ferry_direction,
          :location
        )
      end

      def stop_json(stop)
        stop.as_json(except: [:created_at, :updated_at])
      end
    end
  end
end

