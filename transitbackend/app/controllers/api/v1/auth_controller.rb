module Api
  module V1
    class AuthController < BaseController
      def login
        @user = User.find_by(email: params[:email])
        
        if @user && @user.authenticate(params[:password])
          token = JwtService.encode({ user_id: @user.id })
          render json: {
            user: @user.as_json(except: [:password_digest]),
            token: token
          }, status: :ok
        elsif @user.nil?
          render json: { error: "Email not found" }, status: :unauthorized
        else
          render json: { error: "Password does not match" }, status: :unauthorized
        end
      end
    end
  end
end

