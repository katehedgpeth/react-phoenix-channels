'use strict';

var Native = require('phoenix');
var uuid = require('uuid');
var react = require('react');
var jsxRuntime = require('react/jsx-runtime');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var Native__namespace = /*#__PURE__*/_interopNamespaceDefault(Native);

var PushEvents;
(function (PushEvents) {
    PushEvents["Send"] = "PUSH_SEND";
    PushEvents["Success"] = "PUSH_SUCCESS";
    PushEvents["Timeout"] = "PUSH_TIMEOUT";
    PushEvents["Error"] = "PUSH_ERROR";
})(PushEvents || (PushEvents = {}));
var HeartbeatEvents;
(function (HeartbeatEvents) {
    HeartbeatEvents["Send"] = "HEARTBEAT_SEND";
    HeartbeatEvents["Reply"] = "HEARTBEAT_REPLY";
})(HeartbeatEvents || (HeartbeatEvents = {}));
var JoinEvents;
(function (JoinEvents) {
    JoinEvents["Start"] = "JOIN_START";
    JoinEvents["Success"] = "JOIN_SUCCESS";
    JoinEvents["Error"] = "JOIN_ERROR";
    JoinEvents["Timeout"] = "JOIN_TIMEOUT";
})(JoinEvents || (JoinEvents = {}));
var MessageEvents;
(function (MessageEvents) {
    MessageEvents["Receive"] = "MESSAGE_RECEIVE";
})(MessageEvents || (MessageEvents = {}));

var Reasons;
(function (Reasons) {
    Reasons["UnmatchedTopic"] = "unmatched topic";
})(Reasons || (Reasons = {}));

var SocketMessages;
(function (SocketMessages) {
    SocketMessages["Join"] = "phx_join";
    SocketMessages["Error"] = "phx_error";
    SocketMessages["Reply"] = "phx_reply";
    SocketMessages["Close"] = "phx_close";
    SocketMessages["Leave"] = "phx_leave";
    SocketMessages["Heartbeat"] = "heartbeat";
})(SocketMessages || (SocketMessages = {}));
var SocketStatus$1;
(function (SocketStatus) {
    SocketStatus["Connecting"] = "connecting";
    SocketStatus["Open"] = "open";
    SocketStatus["Closing"] = "closing";
    SocketStatus["Closed"] = "closed";
})(SocketStatus$1 || (SocketStatus$1 = {}));

var ChannelState;
(function (ChannelState) {
    ChannelState["Closed"] = "closed";
    ChannelState["Errored"] = "errored";
    ChannelState["Joined"] = "joined";
    ChannelState["Joining"] = "joining";
    ChannelState["Leaving"] = "leaving";
})(ChannelState || (ChannelState = {}));

var Statuses;
(function (Statuses) {
    Statuses["Ok"] = "ok";
    Statuses["Error"] = "error";
    Statuses["Timeout"] = "timeout";
})(Statuses || (Statuses = {}));

class Push {
    constructor(push, channel) {
        this.push = push;
        this.channel = channel;
        this.reply = null;
        this.__send = () => {
            throw new Error("__send not initialized");
        };
        this.ref = push.ref;
        this.refEvent = push.refEvent;
        this.topic = channel.topic;
        this.message = push.event;
        this.__send = this.push.send.bind(this.push);
        this.push.send = this.send.bind(this);
        this.push
            .receive("ok", (response) => this.dispatch(PushEvents.Success, response))
            .receive("error", (error) => this.dispatch(PushEvents.Error, error))
            .receive("timeout", (error) => this.dispatch(PushEvents.Timeout, error));
    }
    send() {
        this.__send();
        this.dispatch(PushEvents.Send, this.push.payload);
    }
    dispatch(type, payload) {
        const event = this.parseEvent(type, payload);
        this.channel.dispatch(event);
    }
    isJoinPush() {
        return this.message === SocketMessages.Join;
    }
    parseEvent(type, payload) {
        return {
            topic: this.topic,
            message: this.message,
            payload,
            type: this.parseEventType(type),
        };
    }
    parseEventType(type) {
        if (this.isJoinPush()) {
            switch (type) {
                case PushEvents.Send:
                    return JoinEvents.Start;
                case PushEvents.Success:
                    return JoinEvents.Success;
                case PushEvents.Error:
                    return JoinEvents.Error;
                case PushEvents.Timeout:
                    return JoinEvents.Timeout;
                default:
                    throw new Error(`Unknown join event type: ${type}`);
            }
        }
        return type;
    }
}

var JoinErrorReason;
(function (JoinErrorReason) {
    JoinErrorReason["UnmatchedTopic"] = "unmatched topic";
    JoinErrorReason["Unauthorized"] = "unauthorized";
})(JoinErrorReason || (JoinErrorReason = {}));
var ChannelStatus;
(function (ChannelStatus) {
    ChannelStatus["NotInitialized"] = "NOT_INITIALIZED";
    ChannelStatus["Joining"] = "JOINING";
    ChannelStatus["Joined"] = "JOINED";
    ChannelStatus["JoinError"] = "JOIN_ERROR";
    ChannelStatus["Leaving"] = "LEAVING";
    ChannelStatus["Closed"] = "CLOSED";
    ChannelStatus["SocketError"] = "SOCKET_ERROR";
})(ChannelStatus || (ChannelStatus = {}));
var SubscriberStatus;
(function (SubscriberStatus) {
    SubscriberStatus["Subscribed"] = "SUBSCRIBED";
    SubscriberStatus["Unsubscribed"] = "UNSUBSCRIBED";
})(SubscriberStatus || (SubscriberStatus = {}));
class Channel {
    constructor(channel, socket) {
        this.channel = channel;
        this.socket = socket;
        this.pushes = new Map();
        this.subscribers = new Map();
        this.events = [];
        this.status = ChannelStatus.NotInitialized;
        this.joinPush = null;
        this.lastSnapshot = null;
        this.id = uuid.v4();
        this.topic = this.channel.topic;
        this.channel.join = this.__join.bind(this);
        this.socket.subscribe(this.id, (ev) => this.handleSocketEvent(ev));
    }
    subscribe(subscriberRef, callback) {
        this.subscribers.set(subscriberRef, callback);
        return () => this.subscribers.delete(subscriberRef);
    }
    unsubscribe(subscriberId) {
        this.subscribers.delete(subscriberId);
    }
    snapshot(subscriberId) {
        this.lastSnapshot = {
            channelStatus: this.status,
            hasSubscribers: this.subscribers.size > 0,
            events: [...this.events],
            pushes: Array.from(this.pushes.values()),
            isSubscribed: this.subscribers.has(subscriberId),
            socketSnapshot: this.socket.snapshot(this.id),
        };
        return this.lastSnapshot;
    }
    subscriberStatus(subscriberId) {
        return this.subscribers.has(subscriberId)
            ? SubscriberStatus.Subscribed
            : SubscriberStatus.Unsubscribed;
    }
    leave() {
        this.channel.leave();
    }
    dispatch(event) {
        switch (event.type) {
            case JoinEvents.Error:
            case JoinEvents.Start:
            case JoinEvents.Success:
            case JoinEvents.Timeout:
                this.handleJoinEvent(event);
                break;
            case PushEvents.Send:
            case PushEvents.Error:
            case PushEvents.Success:
            case PushEvents.Timeout:
                this.handlePushEvent(event);
                break;
        }
        this.subscribers.values().forEach((dispatch) => dispatch(event));
    }
    handleSocketConnectError() { }
    handleSocketEvent({ event, payload }) {
        switch (event) {
            case SocketEvents.AbnormalClose:
            case SocketEvents.NormalClose:
            case SocketEvents.Error:
                this.status = ChannelStatus.Closed;
                break;
            case SocketEvents.Connecting:
            case SocketEvents.Open:
            case SocketEvents.Closing:
            case HeartbeatEvents.Send:
            case HeartbeatEvents.Reply:
                break;
        }
        this.dispatch({
            type: event,
            topic: this.topic,
            message: event,
            payload,
        });
    }
    handleJoinEvent(event) {
        const joinStatuses = {
            [JoinEvents.Start]: ChannelStatus.Joining,
            [JoinEvents.Success]: ChannelStatus.Joined,
            [JoinEvents.Timeout]: ChannelStatus.JoinError,
            [JoinEvents.Error]: ChannelStatus.JoinError,
        };
        this.status = joinStatuses[event.type];
        switch (event.type) {
            case JoinEvents.Error:
                return this.handleJoinError(event);
            case JoinEvents.Timeout:
                return this.handleJoinTimeout(event);
            default:
                return;
        }
    }
    handlePushEvent(event) {
        switch (event.type) {
            case PushEvents.Send:
                return;
            case PushEvents.Error:
                return;
            case PushEvents.Success:
                return;
            case PushEvents.Timeout:
                return;
        }
    }
    handleJoinError(event) {
        console.error(event.payload.reason, event);
        if (event.payload.reason === JoinErrorReason.UnmatchedTopic) {
            this.leave();
        }
    }
    handleJoinTimeout(event) {
        console.error("Join Timeout", event);
    }
    joinOnce(timeout) {
        if (this.joinPush) {
            return this.joinPush;
        }
        return this.join(timeout);
    }
    join(timeout) {
        const phoenixPush = Native__namespace.Channel.prototype.join.bind(this.channel)(timeout);
        this.joinPush = this.handlePush(phoenixPush);
        return this.joinPush;
    }
    __join(timeout) {
        return this.join(timeout).push;
    }
    push(event, payload, timeout) {
        const phoenixPush = Native__namespace.Channel.prototype.push.bind(this.channel)(event, payload, timeout);
        const push = this.handlePush(phoenixPush);
        return push;
    }
    __push(event, payload, timeout) {
        return this.push(event, payload, timeout).push;
    }
    handlePush(phoenixPush) {
        const push = new Push(phoenixPush, this);
        this.pushes.set(push.ref, push);
        this.dispatch({
            type: PushEvents.Send,
            topic: this.topic,
            message: push.message,
            payload: push.push.payload,
        });
        return push;
    }
}

var SocketStatus;
(function (SocketStatus) {
    SocketStatus["NotInitialized"] = "NOT_INITIALIZED";
    SocketStatus["Connecting"] = "CONNECTING";
    SocketStatus["Open"] = "OPEN";
    SocketStatus["Closing"] = "CLOSING";
    SocketStatus["Closed"] = "CLOSED";
    SocketStatus["ConnectionLost"] = "CONNECTION_LOST";
})(SocketStatus || (SocketStatus = {}));
var SocketEvents;
(function (SocketEvents) {
    SocketEvents["Connecting"] = "SOCKET_CONNECTING";
    SocketEvents["Open"] = "SOCKET_OPEN";
    SocketEvents["Closing"] = "SOCKET_CLOSING";
    SocketEvents["NormalClose"] = "SOCKET_NORMAL_CLOSE";
    SocketEvents["AbnormalClose"] = "SOCKET_ABNORMAL_CLOSE";
    SocketEvents["Error"] = "SOCKET_ERROR";
})(SocketEvents || (SocketEvents = {}));
var SocketCloseCodes;
(function (SocketCloseCodes) {
    SocketCloseCodes[SocketCloseCodes["Normal"] = 1000] = "Normal";
    SocketCloseCodes[SocketCloseCodes["GoingAway"] = 1001] = "GoingAway";
    SocketCloseCodes[SocketCloseCodes["ProtocolError"] = 1002] = "ProtocolError";
    SocketCloseCodes[SocketCloseCodes["UnsupportedData"] = 1003] = "UnsupportedData";
    SocketCloseCodes[SocketCloseCodes["NoStatus"] = 1005] = "NoStatus";
    SocketCloseCodes[SocketCloseCodes["Abnormal"] = 1006] = "Abnormal";
    SocketCloseCodes[SocketCloseCodes["InvalidData"] = 1007] = "InvalidData";
    SocketCloseCodes[SocketCloseCodes["PolicyViolation"] = 1008] = "PolicyViolation";
    SocketCloseCodes[SocketCloseCodes["TooBig"] = 1009] = "TooBig";
    SocketCloseCodes[SocketCloseCodes["MandatoryExtension"] = 1010] = "MandatoryExtension";
    SocketCloseCodes[SocketCloseCodes["ServerError"] = 1011] = "ServerError";
    SocketCloseCodes[SocketCloseCodes["ServiceRestart"] = 1012] = "ServiceRestart";
    SocketCloseCodes[SocketCloseCodes["TryAgainLater"] = 1013] = "TryAgainLater";
    SocketCloseCodes[SocketCloseCodes["BadGateway"] = 1014] = "BadGateway";
    SocketCloseCodes[SocketCloseCodes["TLSHandshake"] = 1015] = "TLSHandshake";
    SocketCloseCodes[SocketCloseCodes["Unknown"] = -1] = "Unknown";
})(SocketCloseCodes || (SocketCloseCodes = {}));
class Socket {
    constructor(url, options) {
        this.url = url;
        this.options = options;
        this.subscribers = new Map();
        this.changeSubscribers = new Map();
        this.channels = new Map();
        this.connectionStatus = SocketStatus.NotInitialized;
        this.errors = [];
        this.pushes = new Map();
        this.conn = null;
        this.id = uuid.v4();
        this.socket = new Native__namespace.Socket(url, options);
        this.socket.push = this.push.bind(this);
        this.socket.onClose((ev) => this.onClose(ev));
        this.socket.onError((ev, transport, establishedConnections) => this.onError(ev, transport, establishedConnections));
        this.socket.onMessage((msg) => this.onMessage(msg));
        this.socket.onOpen(() => this.onOpen());
        this.socket.channel = this.channelListener.bind(this);
        this.socket.transportConnect = this.transportConnect.bind(this);
    }
    connect() {
        if (this.connectionStatus === SocketStatus.NotInitialized) {
            this.socket.connect();
        }
        return () => {
            this.disconnect();
        };
    }
    disconnect() {
        this.updateConnectionStatus(SocketStatus.Closing, {
            event: SocketEvents.Closing,
            payload: undefined,
        });
        this.socket.disconnect();
    }
    channelListener(topic, params) {
        const channel = this.getOrCreateChannel(topic, params);
        return channel.channel;
    }
    getOrCreateChannel(topic, params) {
        const existing = this.channels.get(topic);
        if (existing) {
            return existing;
        }
        const phxChannel = Native__namespace.Socket.prototype.channel.bind(this.socket)(topic, params);
        const channel = new Channel(phxChannel, this);
        this.channels.set(topic, channel);
        return channel;
    }
    leaveChannel(topic) {
        // TODO: do we need to force all subscribers to unsubscribe from the channel?
        this.channels.delete(topic);
    }
    subscribe(subscriberId, dispatch) {
        this.subscribers.set(subscriberId, dispatch);
        return () => this.subscribers.delete(subscriberId);
    }
    currentSnapshot(subscriberId) {
        return {
            connectionStatus: this.connectionStatus,
            channels: Array.from(this.channels.values()),
            hasErrors: this.errors.length > 0,
            hasSubscribers: this.subscribers.size > 0,
            isSubscribed: this.subscribers.has(subscriberId),
        };
    }
    static snapshotHasChanged(prev, current) {
        return Object.keys(current).some((k) => {
            const key = k;
            switch (key) {
                case "connectionStatus":
                case "hasErrors":
                case "hasSubscribers":
                case "isSubscribed":
                    return current[key] !== prev[key];
                case "channels":
                    return Socket.haveChannelsChanged(prev.channels, current.channels);
            }
        });
    }
    snapshot(subscriberId, prev) {
        const current = this.currentSnapshot(subscriberId);
        if (!prev) {
            return current;
        }
        return Socket.snapshotHasChanged(prev, current) ? current : prev;
    }
    push(event) {
        Native__namespace.Socket.prototype.push.bind(this.socket)(event);
        this.handlePush(event);
    }
    handlePush(event) {
        const topicPushes = this.pushes.get(event.topic) || new Map();
        topicPushes.set(event.ref, event);
        this.pushes.set(event.topic, topicPushes);
    }
    static haveChannelsChanged(prevChannels, currentChannels) {
        if (prevChannels.length !== currentChannels.length) {
            return true;
        }
        const prevSet = new Set(prevChannels.map((c) => c.id));
        const currentSet = new Set(currentChannels.map((c) => c.id));
        return prevSet.difference(currentSet).size > 0;
    }
    onOpen() {
        this.updateConnectionStatus(SocketStatus.Open, {
            event: SocketEvents.Open,
            payload: undefined,
        });
    }
    onClose(closeEvent) {
        const [status, ev] = this.closedStatus(closeEvent.code);
        const event = {
            event: ev,
            payload: {
                event: closeEvent,
                reason: (SocketCloseCodes[closeEvent.code] ||
                    SocketCloseCodes.Unknown),
                code: closeEvent.code,
            },
        };
        if (event.event === SocketEvents.AbnormalClose) {
            this.errors.push(event);
        }
        this.updateConnectionStatus(status, event);
    }
    closedStatus(code) {
        if (code === SocketCloseCodes.Normal) {
            return [SocketStatus.Closed, SocketEvents.NormalClose];
        }
        return [SocketStatus.ConnectionLost, SocketEvents.AbnormalClose];
    }
    onError(error, transport, establishedConnections) {
        const event = {
            event: SocketEvents.Error,
            payload: {
                error,
                transport,
                establishedConnections,
            },
        };
        this.errors.push(event);
        this.subscribers.forEach((dispatch) => dispatch(event));
    }
    onMessage(msg) {
        if (msg.ref) {
            const topicPushes = this.pushes.get(msg.topic);
            if (topicPushes) {
                const push = topicPushes.get(msg.ref);
                if (push) {
                    topicPushes.delete(msg.ref);
                    if (push.topic === "phoenix" && push.event === "heartbeat") {
                        this.subscribers.forEach((dispatch) => {
                            dispatch({
                                event: HeartbeatEvents.Reply,
                                payload: msg.payload,
                            });
                        });
                    }
                }
                if (topicPushes.size === 0) {
                    this.pushes.delete(msg.topic);
                }
            }
        }
    }
    transportConnect() {
        this.errors = [];
        this.updateConnectionStatus(SocketStatus.Connecting, {
            event: SocketEvents.Connecting,
            payload: undefined,
        });
        // @ts-expect-error transportConnect does exist on the socket class
        Native__namespace.Socket.prototype.transportConnect.bind(this.socket)();
        this.conn = this.socket.conn;
        this.conn.addEventListener("error", (ev) => {
            console.error("WEBSOCKET_ERROR_EVENT", ev, this.socket);
        });
    }
    updateConnectionStatus(status, event) {
        if (status !== this.connectionStatus) {
            this.connectionStatus = status;
            this.subscribers.forEach((dispatch) => {
                dispatch(event);
            });
        }
    }
}

const SocketContext = react.createContext({
    connectionStatus: SocketStatus.NotInitialized,
    getOrCreateChannel: (_topic, _params) => {
        throw new Error("SocketProvider not initialized!");
    },
});
function parseSocketError({ event, payload }) {
    switch (event) {
        case SocketEvents.Error:
        case SocketEvents.AbnormalClose:
            return payload;
        default:
            return null;
    }
}
function reducer(state, { event, payload }, socket) {
    return {
        ...state,
        connectionStatus: socket.connectionStatus,
        error: parseSocketError({ event, payload })
    };
}
const SocketProvider = react.memo(function SocketProvider({ children, url, options }) {
    const socket = react.useRef(new Socket(url, options));
    const subscriberRef = react.useRef(window.crypto.randomUUID());
    const [state, dispatch] = react.useReducer((state, event) => reducer(state, event, socket.current), { connectionStatus: socket.current.connectionStatus, error: null });
    socket.current.subscribe(subscriberRef.current, dispatch);
    react.useEffect(() => {
        if (socket.current.connectionStatus !== SocketStatus.NotInitialized) {
            throw new Error("Socket already initialized!");
        }
        const disconnect = socket.current.connect();
        return () => {
            console.error("SocketProvider unmounted. Disconnecting socket.");
            disconnect();
        };
    }, []);
    react.useEffect(() => {
        if (url !== socket.current.url) {
            console.error(`
        Socket URL changed from ${socket.current.url} to ${url}.
        ReactPhoenixChannels expects the socket URL not to change.
        This change will be ignored and the socket will continue to
        use the URL passed at initialization. (${socket.current.url})
        `);
        }
    }, [url]);
    react.useEffect(() => {
        const hasChanged = Object.keys(options).some((key) => {
            return options[key] !== socket.current.options[key];
        });
        if (hasChanged) {
            console.error(`
        Ignoring unexpected Socket options change:
        initial: ${JSON.stringify(socket.current.options)}
        updated options: ${JSON.stringify(options)}.

        ReactPhoenixChannels expects the socket options to be memoized.
        This change will be ignored and the socket will continue to
        use the options passed at initialization.
        `);
        }
    }, [options]);
    const context = react.useMemo(() => {
        return {
            ...state,
            getOrCreateChannel: (topic, params) => {
                if (!socket.current) {
                    throw new Error("socket not initialized!");
                }
                return socket.current.getOrCreateChannel(topic, params);
            },
        };
    }, [state]);
    return (jsxRuntime.jsx(SocketContext.Provider, { value: context, children: children }));
});

function useChannel({ topic, onEvent, initialState, ...options }) {
    const socket = react.useContext(SocketContext);
    const channel = react.useRef(socket.getOrCreateChannel(topic, options));
    const subscriberId = react.useRef(window.crypto.randomUUID());
    const topicRef = react.useRef(topic);
    topicRef.current = topic;
    const [state, dispatch] = react.useReducer(onEvent, initialState);
    react.useEffect(() => {
        var _a, _b;
        const unsubscribe = (_a = channel.current) === null || _a === undefined ? undefined : _a.subscribe(subscriberId.current, dispatch);
        if (((_b = channel.current) === null || _b === undefined ? undefined : _b.status) === ChannelStatus.NotInitialized) {
            channel.current.joinOnce(5000);
        }
        return () => {
            unsubscribe === null || unsubscribe === undefined ? undefined : unsubscribe();
        };
    }, []);
    return react.useMemo(() => {
        return {
            state,
            push: (message, payload) => {
                if (!channel.current) {
                    throw new Error(`${topicRef.current} channel is not initialized!`);
                }
                channel.current.push(message, payload);
            },
            unsubscribe: () => {
                var _a;
                (_a = channel.current) === null || _a === undefined ? undefined : _a.unsubscribe(subscriberId.current);
            },
            socketStatus: () => {
                return socket.connectionStatus;
            },
            channelStatus: () => {
                return channel.current.status;
            },
            subscriptionStatus: () => {
                return channel.current
                    ? channel.current.subscriberStatus(subscriberId.current)
                    : SubscriberStatus.Unsubscribed;
            },
        };
    }, [state, socket]);
}

exports.Channel = Channel;
exports.Socket = Socket;
exports.SocketContext = SocketContext;
exports.SocketProvider = SocketProvider;
exports.useChannel = useChannel;
//# sourceMappingURL=index.js.map
