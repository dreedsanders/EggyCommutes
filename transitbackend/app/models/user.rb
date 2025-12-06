class User < ApplicationRecord
  has_secure_password
  has_many :stops, dependent: :destroy
  
  validates :email, presence: true, uniqueness: true
  validates :password, presence: true
  validates :name, presence: true
end
