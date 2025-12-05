module Authenticatable
  extend ActiveSupport::Concern

  private

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
  def render_validation_errors(user)
    render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
  end
end

