import * as Phoenix from 'phoenix';
import { Context as Context$2, FC, PropsWithChildren } from 'react';

declare enum PushEvents {
    Send = "PUSH_SEND",
    Success = "PUSH_SUCCESS",
    Timeout = "PUSH_TIMEOUT",
    Error = "PUSH_ERROR"
}
declare enum HeartbeatEvents {
    Send = "HEARTBEAT_SEND",
    Reply = "HEARTBEAT_REPLY"
}
declare enum JoinEvents {
    Start = "JOIN_START",
    Success = "JOIN_SUCCESS",
    Error = "JOIN_ERROR",
    Timeout = "JOIN_TIMEOUT"
}
interface Event {
    type: string;
    topic: string;
    message: string;
    payload: object | undefined;
}
type Topic$1 = string;
interface PushSend extends Event {
    type: PushEvents.Send;
    payload: object;
}
interface PushReply extends Event {
    type: PushEvents.Success | PushEvents.Error | PushEvents.Timeout;
}
type PushEvent = PushSend | PushReply;
interface JoinStart extends Event {
    type: JoinEvents.Start;
}
interface JoinError extends Event {
    type: JoinEvents.Error;
    payload: {
        reason: string;
    };
}
interface JoinSuccess extends Event {
    type: JoinEvents.Success;
}
interface JoinTimeout extends Event {
    type: JoinEvents.Timeout;
}
interface SocketConnectionEvent extends Event {
    type: SocketEvents;
}
type HeartbeatEvent = {
    type: HeartbeatEvents.Send;
    topic: string;
    message: undefined;
    payload: undefined;
} | {
    type: HeartbeatEvents.Reply;
    topic: string;
    message: undefined;
    payload: {
        status: "ok" | "error";
    };
};
type JoinEvent = JoinStart | JoinSuccess | JoinError | JoinTimeout;
type ChannelEvent = JoinEvent | PushEvent | SocketConnectionEvent | HeartbeatEvent;

type Topic = string;
declare enum SocketStatus$1 {
    Connecting = "connecting",
    Open = "open",
    Closing = "closing",
    Closed = "closed"
}
interface Socket$1 extends Phoenix.Socket {
    conn: WebSocket | Phoenix.LongPoll | null;
    channels: Phoenix.Channel[];
    channel(topic: Topic, params?: object, timeout?: number): Phoenix.Channel;
    connectionState(): SocketStatus$1;
    transportConnect(): void;
}
type WebSocketError = ErrorEvent;
type LongPollError = Response["status"] | "timeout";
type SocketError = WebSocketError | LongPollError;
interface SocketConnectOption extends Phoenix.SocketConnectOption {
    logger(kind: string, msg: string, data: object): void;
}

declare enum ChannelState {
    Closed = "closed",
    Errored = "errored",
    Joined = "joined",
    Joining = "joining",
    Leaving = "leaving"
}
interface Channel$1 extends Phoenix.Channel {
    joinPush: Phoenix.Push;
    state: ChannelState;
}

interface Push$1 extends Phoenix.Push {
    ref: EventRef;
    event: string;
    refEvent: string;
    payload: object;
    sent: boolean;
}

type EventRef = string;

declare class Push {
    push: Push$1;
    channel: Channel;
    ref: string;
    message: string;
    refEvent: string;
    reply: object | null;
    topic: string;
    private __send;
    constructor(push: Push$1, channel: Channel);
    send(): void;
    private dispatch;
    private isJoinPush;
    private parseEvent;
    private parseEventType;
}

type Subscriber<Ev = unknown, State = unknown> = (event: Ev) => State;
interface Snapshot$1 {
    channelStatus: ChannelStatus;
    isSubscribed: boolean;
    hasSubscribers: boolean;
    events: ChannelEvent[];
    pushes: Push[];
    socketSnapshot: Snapshot;
}
declare enum ChannelStatus {
    NotInitialized = "NOT_INITIALIZED",
    Joining = "JOINING",
    Joined = "JOINED",
    JoinError = "JOIN_ERROR",
    Leaving = "LEAVING",
    Closed = "CLOSED",
    SocketError = "SOCKET_ERROR"
}
declare enum SubscriberStatus {
    Subscribed = "SUBSCRIBED",
    Unsubscribed = "UNSUBSCRIBED"
}
type SubscriberRef = string;
declare class Channel {
    channel: Channel$1;
    socket: Socket;
    id: string;
    topic: Topic$1;
    pushes: Map<EventRef, Push>;
    subscribers: Map<SubscriberRef, Subscriber>;
    events: ChannelEvent[];
    status: ChannelStatus;
    private joinPush;
    constructor(channel: Channel$1, socket: Socket);
    subscribe<Events>(subscriberRef: SubscriberRef, callback: Subscriber<Events>): () => void;
    unsubscribe(subscriberId: SubscriberRef): void;
    private lastSnapshot;
    snapshot(subscriberId: SubscriberRef): Snapshot$1;
    subscriberStatus(subscriberId: SubscriberRef): SubscriberStatus;
    leave(): void;
    dispatch(event: ChannelEvent): void;
    private handleSocketConnectError;
    private handleSocketEvent;
    handleJoinEvent(event: JoinEvent): void;
    private handlePushEvent;
    private handleJoinError;
    private handleJoinTimeout;
    joinOnce(timeout?: number): Push;
    private join;
    __join(timeout?: number): Push$1;
    push(event: string, payload: object, timeout?: number): Push;
    __push(event: string, payload: object, timeout?: number): Push$1;
    private handlePush;
}

type Options = Partial<SocketConnectOption>;
declare enum SocketStatus {
    NotInitialized = "NOT_INITIALIZED",
    Connecting = "CONNECTING",
    Open = "OPEN",
    Closing = "CLOSING",
    Closed = "CLOSED",
    ConnectionLost = "CONNECTION_LOST"
}
declare enum SocketEvents {
    Connecting = "SOCKET_CONNECTING",
    Open = "SOCKET_OPEN",
    Closing = "SOCKET_CLOSING",
    NormalClose = "SOCKET_NORMAL_CLOSE",
    AbnormalClose = "SOCKET_ABNORMAL_CLOSE",
    Error = "SOCKET_ERROR"
}
declare enum SocketCloseCodes {
    Normal = 1000,
    GoingAway = 1001,
    ProtocolError = 1002,
    UnsupportedData = 1003,
    NoStatus = 1005,
    Abnormal = 1006,
    InvalidData = 1007,
    PolicyViolation = 1008,
    TooBig = 1009,
    MandatoryExtension = 1010,
    ServerError = 1011,
    ServiceRestart = 1012,
    TryAgainLater = 1013,
    BadGateway = 1014,
    TLSHandshake = 1015,
    Unknown = -1
}
interface SocketNormalCloseEvent {
    event: SocketEvents.NormalClose;
    payload: {
        event: CloseEvent;
        reason: SocketCloseCodes;
        code: number;
    };
}
interface SocketAbnormalCloseEvent {
    event: SocketEvents.AbnormalClose;
    payload: {
        event: CloseEvent;
        reason: SocketCloseCodes;
        code: number;
    };
}
interface SocketErrorEvent {
    event: SocketEvents.Error;
    payload: {
        error: SocketError;
        transport: WebSocket["constructor"] | Phoenix.LongPoll["constructor"];
        establishedConnections: number;
    };
}
interface SocketConnectingEvent {
    event: SocketEvents.Connecting;
    payload: undefined;
}
interface SocketClosingEvent {
    event: SocketEvents.Closing;
    payload: undefined;
}
interface SocketOpenEvent {
    event: SocketEvents.Open;
    payload: undefined;
}
interface Snapshot {
    connectionStatus: SocketStatus;
    hasErrors: boolean;
    hasSubscribers: boolean;
    channels: Channel[];
    isSubscribed: boolean;
}
interface HeartbeatSendEvent {
    event: HeartbeatEvents.Send;
    payload: undefined;
}
interface HeartbeatReplyEvent {
    event: HeartbeatEvents.Reply;
    payload: {
        status: "ok" | "error";
    };
}
type SocketEvent = SocketConnectingEvent | SocketOpenEvent | SocketClosingEvent | SocketNormalCloseEvent | SocketAbnormalCloseEvent | SocketErrorEvent | HeartbeatSendEvent | HeartbeatReplyEvent;
type SubscriberId = string;
type Dispatch = (event: SocketEvent) => void;
declare class Socket {
    url: string;
    options: Options;
    subscribers: Map<SubscriberId, Dispatch>;
    private changeSubscribers;
    socket: Socket$1;
    channels: Map<Topic$1, Channel>;
    id: string;
    connectionStatus: SocketStatus;
    errors: Array<SocketErrorEvent | SocketAbnormalCloseEvent>;
    private pushes;
    private conn;
    constructor(url: string, options: Options);
    connect(): () => void;
    disconnect(): void;
    channelListener(topic: Topic$1, params: object): Channel$1;
    getOrCreateChannel(topic: Topic$1, params: object): Channel;
    leaveChannel(topic: Topic$1): void;
    subscribe(subscriberId: SubscriberId, dispatch: Dispatch): () => void;
    private currentSnapshot;
    static snapshotHasChanged(prev: Snapshot, current: Snapshot): boolean;
    snapshot(subscriberId: SubscriberId, prev?: Snapshot): Snapshot;
    private push;
    private handlePush;
    private static haveChannelsChanged;
    private onOpen;
    private onClose;
    private closedStatus;
    private onError;
    private onMessage;
    private transportConnect;
    private updateConnectionStatus;
}

interface Props$1<Events, State> {
    topic: string;
    onEvent: (prevState: State, event: Events) => State;
    initialState: State;
}
interface Context$1<State> {
    state: State;
    push: (message: string, payload: object) => void;
    channelStatus: () => ChannelStatus;
    socketStatus: () => SocketStatus;
}
declare function useChannel<Events, State>({ topic, onEvent, initialState, ...options }: Props$1<Events, State>): Context$1<State>;

interface Context {
    connectionStatus: Socket["connectionStatus"];
    getOrCreateChannel: Socket["getOrCreateChannel"];
}
declare const SocketContext: Context$2<Context>;
type Props = PropsWithChildren<{
    url: string;
    options: Options;
}>;
declare const SocketProvider: FC<Props>;

export { Channel, type Event, Socket, SocketContext, type SocketEvent, SocketProvider, useChannel };
