module Api
  module V1
    class AuthController < BaseController
      def login
        @user = User.find_by(email: params[:email])
        
        if @user && @user.authenticate(params[:password])
          render_user_with_token(@user, status: :ok)
        elsif @user.nil?
          render_error("Email not found", status: :unauthorized)
        else
          render_error("Password does not match", status: :unauthorized)
        end
      end
    end
  end
end

