defmodule DebugBackendWeb.RoomChannel do
  use DebugBackendWeb, :channel

  @impl true
  def join("room:" <> id, payload, socket) do
    if authorized?(payload) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("ping", %{"message" => "Hello"}, socket) do
    :timer.sleep(500)
    {:reply, {:ok, %{"message" => "Hello from the server"}}, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (room:lobby).
  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(payload) do
    Map.get(payload, "unauthorized") !== "true"
  end
end
