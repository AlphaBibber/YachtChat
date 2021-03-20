import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {AppThunk, RootState} from './store';
import {User, UserCoordinates} from "./models";
import {addUser, gotRemoteStream, handlePositionUpdate, removeUser, setUserId, setUsers} from "./userSlice";

interface WebSocketState {
    id: number
    connected: boolean
    loggedIn: boolean
}

let socket: WebSocket | null = null;

let rtcConnections: { [key: number]: RTCPeerConnection } = {};
const streams: { [key: string]: MediaStream } = {};

const offerOptions = {
    offerToReceiveVideo: true,
    offerToReceiveAudio: true
};

const rtcConfiguration = {
    "iceServers": [{"urls": "stun:stun2.1.google.com:19302"}]
}

const mediaConstrains = {
    video: true,
    audio: true
}

const initialState: WebSocketState = {
    id: -1,
    connected: false,
    loggedIn: false
};

export const webSocketSlice = createSlice({
    name: 'webSocket',
    initialState,
    reducers: {
        connect: (state) => {
            state.connected = true
        },
        login: (state) => {
            state.loggedIn = true
        },
        logout: (state) => {
            state.loggedIn = false
        },
        disconnect: (state) => {
            state.connected = false
        },
        saveID: (state, action: PayloadAction<number>) => {
            state.id = action.payload
        }
    },
});

export const {connect, disconnect, login, logout, saveID} = webSocketSlice.actions;

export const connectToServer = (): AppThunk => (dispatch, getState) => {
    //socket = new WebSocket('wss://call.tristanratz.com:9090');
    socket = new WebSocket('wss://www.alphabibber.com:6503', 'json');

    socket.onopen = () => {
        console.log("Connected to the signaling server");
        dispatch(connect())
    };

    socket.onerror = (err) => {
        console.log("Got error", err);
        dispatch(disconnect())
    };

    socket.onmessage = function (msg) {
        var data = JSON.parse(msg.data);
        //if (data.type !== "position_change")
        //    console.log("Got message", msg.data);
        const loggedIn = getState().webSocket.loggedIn

        switch (data.type) {
            case "id":
                dispatch(saveID(data.id))
                break;
            case "login":
                dispatch(handleLogin(data.success));
                break;
            case "join":
                dispatch(setUsers(data.users));
                const count = Object.keys(getState().userState.otherUsers).length + 1;
                console.log(`Case: new_user, Count: ${count}`);
                dispatch(handleRTCEvents(getState().userState.activeUser.id, count));
                break;
            case "new_user":
                if (loggedIn) {
                    dispatch(addUser(data.user));
                    const count = Object.keys(getState().userState.otherUsers).length + 1;
                    console.log(`Case: new_user, Count: ${count}`);
                    dispatch(handleRTCEvents(data.user.id, count));
                }
                break;
            case "user_left":
                if (loggedIn)
                    dispatch(removeUser(data.id))
                break;
            case "position_change":
                if (loggedIn)
                    dispatch(handlePositionUpdate(data));
                break;
            case "signaling":
                if (!loggedIn)
                    break;
                const fromId: number = data.source;
                if (fromId !== getState().webSocket.id) {
                    console.log(data.signal_type)
                    switch (data.signal_type) {
                        case "candidate":
                            dispatch(handleCandidate(data.candidate, fromId))
                            break;
                        case "sdp":
                            dispatch(handleSdp(data.description, fromId));
                            break;
                        default:
                            dispatch(handleError("Unknown signaling type."))
                    }
                }
                break;
        }
    };

};

export const handleError = (error: string): AppThunk => (dispatch, getState) => {

}

export const handleRTCEvents = (joinedUserId: number, count: number):AppThunk => (dispatch, getState) => {
    // get client ids
    const clients = Object.keys(getState().userState.otherUsers).map(k => Number(k))
    const localClient: number = getState().webSocket.id
    clients.push(localClient)

    if (Array.isArray(clients) && clients.length > 0) {
        clients.forEach((userId) => {
            if (!rtcConnections[userId]) {
                rtcConnections[userId] = new RTCPeerConnection(rtcConfiguration);
                rtcConnections[userId].onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log(localClient, ' Send candidate to ', userId);
                        dispatch(send({
                            type: "signaling",
                            target: userId,
                            signal_type: 'candidate',
                            candidate: event.candidate
                        }));
                    }
                };
                // @ts-ignore
                rtcConnections[userId].onaddstream = (event: any) => {
                    streams[userId] = event.stream
                    dispatch(gotRemoteStream(userId));
                    console.log("I HAVE A STREAM")
                };
                // @ts-ignore
                rtcConnections[userId].addStream(streams[localClient]);
            }
        });

        if (count >= 2) {
            rtcConnections[joinedUserId].createOffer(offerOptions).then((description) => {
                rtcConnections[joinedUserId].setLocalDescription(description).then(() => {
                    console.log(localClient, ' Send offer to ', joinedUserId);
                    dispatch(send({
                        type:'signaling',
                        target: joinedUserId,
                        description: rtcConnections[joinedUserId].localDescription,
                        signal_type: 'sdp'
                    }));
                }).catch(handleError);
            });
        }
    }
}

export const send = (message: { [key: string]: any }, target?: User): AppThunk => (dispatch, getState) => {
    //attach the other peer username to our messages
    const msgObj = {
        ...message,
        id: getState().webSocket.id,
    }

    if (socket !== null)
        socket.send(JSON.stringify(msgObj));
}

export const requestLogin = (name: string): AppThunk => (dispatch) => {
    if (name.length > 0) {
        dispatch(send({
            type: "login",
            name: name,
        }));
    }
}

export const sendPosition = (position: UserCoordinates): AppThunk => (dispatch) => {
    dispatch(send({
        type: "position_change",
        position,
    }));
}

export const handleCandidate = (candidate: any, fromId: number): AppThunk => (dispatch: any, getState: any) => {
    rtcConnections[fromId].addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e.stack));
}

export const handleSdp = (description: any, fromId: number): AppThunk => (dispatch: any, getState: any) => {
    console.log("Start handleSdp with description:");
    console.dir(description);
    if (!!description) {
        const clientId: number = getState().webSocket.id;

        console.log(clientId, ' Receive sdp from ', fromId);
        rtcConnections[fromId].setRemoteDescription(new RTCSessionDescription(description))
            .then(() => {
                if (description.type === 'offer') {
                    rtcConnections[fromId].createAnswer()
                        .then((desc) => {
                            rtcConnections[fromId].setLocalDescription(desc).then(() => {
                                console.log(clientId, ' Send answer to ', fromId);

                                // This replaces the socket.emit function
                                dispatch(send({
                                    type: "signaling",
                                    signal_type: "sdp",
                                    target: fromId,
                                    description: rtcConnections[fromId].localDescription
                                }));
                            });
                        })
                    // .catch(handleError);
                }
            })
        // .catch(handleError);
    } else {
        console.error("Description was not set")
    }
}


export const handleLogin = (success: boolean): AppThunk => (dispatch, getState) => {
    if (!success) {
        dispatch(handleError("Login failed. Try different user name."))
        alert("Ooops...try a different username");
    } else {
        //**********************
        //Starting a peer connection
        //**********************

        dispatch(login())
        dispatch(setUserId(getState().webSocket.id))
        dispatch(requestUserMediaAndJoin())
    }
}

export const sendUsername = (name: string): AppThunk => dispatch => {
    dispatch(send({type: "login", name: name}))
}

export const leaveChat = (): AppThunk => dispatch => {
    dispatch(logout())
    dispatch(send({type: "leave"}))
    // TODO: close connections
    // rtcConnection?.close()
}

export const requestUserMediaAndJoin = (): AppThunk => (dispatch,getState) => {
    navigator.mediaDevices.getUserMedia(mediaConstrains).then((e) => {
        const localClient = getState().webSocket.id
        streams[localClient] = e
        dispatch(gotRemoteStream(localClient))
    }).then(() =>
        dispatch(send({
            type: "join"
        }))
    )
}

export const getRtcConnection = (state: RootState, id: number) => {
    return rtcConnections[id];
}
export const getStream = (id: number) => streams[id]

export default webSocketSlice.reducer;
