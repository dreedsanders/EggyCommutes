class CreateStops < ActiveRecord::Migration[7.1]
  def change
    create_table :stops do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name
      t.string :destination, null: false
      t.string :transit_type, null: false
      t.string :origin
      t.boolean :arrival, default: false
      t.boolean :departure, default: false
      t.boolean :favorite, default: false
      t.integer :position
      t.string :route_filter
      t.string :stop_filter
      t.string :ferry_direction
      t.string :location
      t.boolean :hidden, default: false

      t.timestamps
    end

    # Add unique index handling NULL origin values
    # Using a partial index approach for SQLite compatibility
    add_index :stops, [:user_id, :destination, :transit_type, :origin], 
              unique: true, 
              name: 'index_stops_on_user_destination_transit_origin'
  end
end
