# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_12_06_153826) do
  create_table "stops", force: :cascade do |t|
    t.integer "user_id", null: false
    t.string "name"
    t.string "destination", null: false
    t.string "transit_type", null: false
    t.string "origin"
    t.boolean "arrival", default: false
    t.boolean "departure", default: false
    t.boolean "favorite", default: false
    t.integer "position"
    t.string "route_filter"
    t.string "stop_filter"
    t.string "ferry_direction"
    t.string "location"
    t.boolean "hidden", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "destination", "transit_type", "origin"], name: "index_stops_on_user_destination_transit_origin", unique: true
    t.index ["user_id"], name: "index_stops_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "stops", "users"
end
