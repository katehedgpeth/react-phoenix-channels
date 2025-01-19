defmodule DebugBackend.Repo do
  use Ecto.Repo,
    otp_app: :debug_backend,
    adapter: Ecto.Adapters.Postgres
end
