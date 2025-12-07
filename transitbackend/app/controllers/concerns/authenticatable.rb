module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_user!
  end

  private

  # Get current user from JWT token
  def current_user
    @current_user ||= begin
      token = extract_token_from_header
      return nil unless token

      decoded = JwtService.decode(token)
      return nil unless decoded

      User.find_by(id: decoded[:user_id])
    end
  end

  # Authenticate user before action
  def authenticate_user!
    unless current_user
      render_error("Unauthorized", status: :unauthorized)
    end
  end

  # Extract token from Authorization header
  def extract_token_from_header
    auth_header = request.headers['Authorization']
    return nil unless auth_header

    # Extract token from "Bearer <token>" format
    auth_header.split(' ').last if auth_header.start_with?('Bearer ')
  end

  # Generate JWT token for user
  def generate_token_for_user(user)
    JwtService.encode({ user_id: user.id })
  end

  # Render user with token
  def render_user_with_token(user, status: :ok)
    render json: {
      user: user_json(user),
      token: generate_token_for_user(user)
    }, status: status
  end

  # Serialize user without password_digest
  def user_json(user)
    user.as_json(except: [:password_digest])
  end

  # Render error response
  def render_error(message, status: :unprocessable_entity)
    render json: { error: message }, status: status
  end

  # Render validation errors
  def render_validation_errors(record)
    render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
  end
end

