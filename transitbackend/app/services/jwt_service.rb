class JwtService
  SECRET_KEY = Rails.application.secret_key_base || Rails.application.credentials&.secret_key_base || 'your-secret-key-change-in-production'
  EXPIRATION_TIME = 24.hours.from_now

  def self.encode(payload)
    payload[:exp] = EXPIRATION_TIME.to_i
    JWT.encode(payload, SECRET_KEY, 'HS256')
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY, true, { algorithm: 'HS256' })[0]
    HashWithIndifferentAccess.new(decoded)
  rescue JWT::DecodeError => e
    nil
  end
end

