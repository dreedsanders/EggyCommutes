module Api
  module V1
    class UsersController < BaseController
      before_action :set_user, only: [:show, :update, :destroy]

      # GET /api/v1/users
      def index
        @users = User.all
        render json: @users, except: [:password_digest]
      end

      # GET /api/v1/users/:id
      def show
        render json: @user, except: [:password_digest]
      end

      # POST /api/v1/users
      def create
        @user = User.new(user_params)
        
        if @user.save
          token = JwtService.encode({ user_id: @user.id })
          render json: {
            user: @user.as_json(except: [:password_digest]),
            token: token
          }, status: :created
        else
          render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/users/:id
      def update
        if @user.update(user_params)
          render json: @user, except: [:password_digest]
        else
          render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
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
        render json: { error: "User not found" }, status: :not_found
      end

      def user_params
        params.require(:user).permit(:name, :email, :password, :password_confirmation)
      end
    end
  end
end

