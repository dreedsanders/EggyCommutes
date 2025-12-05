module Api
  module V1
    class UsersController < BaseController
      before_action :set_user, only: [:show, :update, :destroy]

      # GET /api/v1/users
      def index
        @users = User.all
        render json: @users.map { |user| user_json(user) }
      end

      # GET /api/v1/users/:id
      def show
        render json: user_json(@user)
      end

      # POST /api/v1/users
      def create
        @user = User.new(user_params)
        
        if @user.save
          render_user_with_token(@user, status: :created)
        else
          render_validation_errors(@user)
        end
      end

      # PATCH /api/v1/users/:id
      def update
        if @user.update(user_params)
          render json: user_json(@user)
        else
          render_validation_errors(@user)
        end
      end

      # DELETE /api/v1/users/:id
      def destroy
        @user.destroy
        head :no_content
      end

      private

      def set_user
        @user = User.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("User not found", status: :not_found)
      end

      def user_params
        params.require(:user).permit(:name, :email, :password, :password_confirmation)
      end
    end
  end
end

