export class WebsocketSpy extends WebSocket {
  public send: WebSocket["send"] = WebSocket.prototype.send

  constructor(public url: string, public protocols?: string | string[]) {
    super(url, protocols)
  }
}
