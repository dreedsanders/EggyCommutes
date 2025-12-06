Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # API routes with versioning
  namespace :api do
    namespace :v1 do
      post "auth/login", to: "auth#login"
      post "transit_data/fetch", to: "transit_data#fetch"
      resources :users
      resources :stops do
        member do
          patch 'hide'
          patch 'reorder'
        end
      end
    end
  end
end
