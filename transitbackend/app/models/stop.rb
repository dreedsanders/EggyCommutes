class Stop < ApplicationRecord
  belongs_to :user

  # Validations
  validates :destination, presence: true
  validates :transit_type, presence: true, inclusion: { in: %w[bus train ferry bike walk drive] }
  validates :arrival, exclusion: { in: [true] }, if: :departure?
  validates :departure, exclusion: { in: [true] }, if: :arrival?
  validate :unique_stop_per_user

  # Scopes
  scope :by_transit_type, ->(type) { where(transit_type: type) }
  scope :favorites, -> { where(favorite: true) }
  scope :ordered, -> { order(position: :asc, created_at: :asc) }
  scope :visible, -> { where(hidden: false) }

  # Defaults
  after_initialize :set_defaults

  private

  def set_defaults
    self.hidden ||= false
    self.favorite ||= false
    self.arrival ||= false
    self.departure ||= false
  end

  def unique_stop_per_user
    existing = Stop.where(user_id: user_id)
                   .where(destination: destination)
                   .where(transit_type: transit_type)
    
    # Handle NULL origin values
    if origin.present?
      existing = existing.where(origin: origin)
    else
      existing = existing.where(origin: nil)
    end
    
    # Exclude current record if updating
    existing = existing.where.not(id: id) if persisted?
    
    if existing.exists?
      errors.add(:base, "Stop with this origin, destination, and transit type already exists")
    end
  end
end

