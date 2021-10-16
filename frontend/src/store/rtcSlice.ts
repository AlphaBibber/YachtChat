import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {AppThunk, RootState} from './store';
import {connectToServer, send} from "./webSocketSlice";
import {rtcConfiguration} from "./config";
import {
    forgetUsers,
    getOnlineUsers,
    getUser,
    getUserID,
    gotRemoteStream,
    handlePositionUpdate,
    setMedia,
    setUserOffline
} from "./userSlice";
import {resetPlayground} from "./playgroundSlice";
import {returnHome} from "./spaceSlice";
import {handleError} from "./statusSlice";
import {MediaType} from "./models";

interface RTCState {
    muted: boolean
    video: boolean
    cameras: string[]
    microphones: string[]
    speakers: string[]
    selected: {
        camera?: string,
        speaker?: string,
        microphone?: string
    }
    screen: boolean
    mediaChangeOngoing: boolean
    userMedia: boolean
}

const initialState: RTCState = {
    muted: false,
    video: true,
    screen: false,
    cameras: [],
    microphones: [],
    speakers: [],
    selected: {},
    mediaChangeOngoing: false,
    userMedia: false
};

let rtcConnections: { [key: string]: RTCPeerConnection } = {};
let rtpSender: { [key: string]: { [key: string]: RTCRtpSender } } = {};
let localStream: MediaStream | undefined = undefined
let screenStream: MediaStream | undefined = undefined
let streams: { [key: string]: MediaStream } = {};
let mediaDevices: { [key: string]: MediaDeviceInfo } = {};

const offerOptions = {
    offerToReceiveVideo: true,
    offerToReceiveAudio: true
};

export const rtcSlice = createSlice({
    name: 'rtc',
    initialState,
    reducers: {
        initAllMediaDevices: (state, action: PayloadAction<any>) => {
            state.cameras = action.payload.cameras
            state.microphones = action.payload.microphones
            state.speakers = action.payload.speakers
        },
        toggleMute: (state) => {
            state.muted = !state.muted
        },
        toggleVideo: (state) => {
            state.video = !state.video
        },
        toggleScreen: (state) => {
            state.screen = !state.screen
        },
        setMediaChangeOngoing: (state, action: PayloadAction<boolean>) => {
            state.mediaChangeOngoing = action.payload
        },
        setCamera: (state, action: PayloadAction<string>) => {
            state.selected.camera = action.payload
        },
        setMicrophone: (state, action: PayloadAction<string>) => {
            state.selected.microphone = action.payload

        },
        setSpeaker: (state, action: PayloadAction<string>) => {
            state.selected.speaker = action.payload

        },
        setUserMedia: (state, action: PayloadAction<boolean>) => {
            state.userMedia = action.payload
        },
        turnOnVideo: (state ) => {
            state.video = true
        },
        setScreen: (state, action: PayloadAction<boolean>) => {
            state.screen = action.payload
        },
    },
});

export const {
    initAllMediaDevices,
    toggleVideo,
    toggleMute,
    toggleScreen,
    setCamera,
    setMicrophone,
    setSpeaker,
    setMediaChangeOngoing,
    setUserMedia,
    turnOnVideo,
    setScreen
} = rtcSlice.actions;

export const loadAllMediaDevices = (callback?: () => void): AppThunk => (dispatch) => {

    navigator.mediaDevices.enumerateDevices().then(md => {
        const cameras: string[] = []
        const microphones: string[] = []
        const speakers: string[] = []
        md.forEach(d => {
            if (d.deviceId !== "")
                if (d.kind === "audioinput") {
                    microphones.push(d.deviceId)
                    mediaDevices[d.deviceId] = d
                } else if (d.kind === "audiooutput") {
                    speakers.push(d.deviceId)
                    mediaDevices[d.deviceId] = d
                } else if (d.kind === "videoinput") {
                    cameras.push(d.deviceId)
                    mediaDevices[d.deviceId] = d
                }
        })
        dispatch(initAllMediaDevices({
            cameras,
            microphones,
            speakers
        }))
    }).then(callback)

}

export const requestUserMediaAndJoin = (spaceID: string): AppThunk => (dispatch, getState) => {
    navigator.mediaDevices.getUserMedia(getMediaConstrains(getState())).then((e) => {
        const localClient = getUserID(getState())
        localStream = e

        dispatch(gotRemoteStream(localClient))
        dispatch(loadAllMediaDevices())
        dispatch(setUserMedia(true))
    }).then(() =>
        dispatch(connectToServer(spaceID))
    ).catch(() => {
        dispatch(handleError("Unable to get media."))
        dispatch(setUserMedia(false))
    })
}

export const mute = (): AppThunk => (dispatch, getState) => {
    dispatch(toggleMute())

    if (!localStream)
        return

    getStream(getState(), getUserID(getState()))!.getAudioTracks()[0].enabled = !getState().rtc.muted
    getOnlineUsers(getState()).forEach(u => {
        Object.keys(rtpSender[u.id]).forEach(k => {
            const rtp = rtpSender[u.id][k]
            if (rtp.track && rtp.track.kind === 'audio') {
                rtp.track.enabled = (!getState().rtc.muted && !!u.inProximity)
            }
        })
    })
}

export const displayVideo = (): AppThunk => (dispatch, getState) => {
    dispatch(toggleVideo())

    const state = getState()
    const userID = getUserID(state)
    //state.rtc.video = false

    if (!getStream(state, userID)) {
        dispatch(send({'type': 'media', 'id': userID, 'media': 'image', 'event': false}))
        return
    }


    getStream(state, userID)!.getVideoTracks()[0].enabled = state.rtc.video

    dispatch(send({'type': 'media', 'media': 'image', 'event': state.rtc.video}))
    dispatch(setMedia({id: userID, type: MediaType.VIDEO, state: state.rtc.video}))
    getOnlineUsers(state).forEach(u => {
        Object.keys(rtpSender[u.id]).forEach(k => {
            const rtp = rtpSender[u.id][k]
            if (rtp.track && rtp.track.kind === 'video') {
                rtp.track.enabled = state.rtc.video
            }
        })
    })
}

export const shareScreen = (): AppThunk => (dispatch, getState) => {
    dispatch(setMediaChangeOngoing(true))
    const state = getState()
    const userID = getUserID(state)
    const users = getOnlineUsers(state)

    // If not enabled yet try to enable the screen sharing
    if (!state.rtc.screen) {
        navigator.mediaDevices.getDisplayMedia().then((stream) => {
            dispatch(toggleScreen())
            // make sure that the stream is ended when the user f.e. closes the window
            stream!.getTracks().forEach(t => t.onended = () => {
                dispatch(unshareScreen())
            })

            screenStream = stream

            // iterate over all user and replace my video stream with the stream of my screen.
            users.forEach(u => {
                if (u.id === userID) return
                rtpSender[u.id]["video"].replaceTrack(stream!.getTracks()[0]);
            })
            dispatch(setMediaChangeOngoing(false))
        }).catch((e) => {
            dispatch(handleError("Unable to share the screen", e))
        })
    } else {
        dispatch(unshareScreen())
    }
}

export const unshareScreen = (): AppThunk => (dispatch, getState) => {
    // share the normal video again with each user
    dispatch(handleInputChange())

    // end all streams
    screenStream?.getTracks().forEach(t => t.stop())
    screenStream = undefined

    dispatch(setScreen(false))
}

export const sendAudio = (id: string): AppThunk => (dispatch, getState) => {
    if (getState().rtc.muted)
        return
    const rtp = rtpSender[id]["audio"]
    //console.log("Trying to enable audio to ", id)
    if (rtp.track && rtp.track.kind === 'audio') {
        //console.log("Enabled audio")
        rtp.track.enabled = true
    }
    //console.log(getUserID(getState()), " has changed", rtp.track!.kind, "track to", id, "to", rtp.track!.enabled )
}

export const unsendAudio = (id: string): AppThunk => (dispatch, getState) => {
    const rtp = rtpSender[id]["audio"]
    console.log("Trying not to enable audio to ", id)
    if (rtp.track && rtp.track.kind === 'audio') {
        console.log("Disabled audio")
        rtp.track.enabled = false
    }
    //console.log(getUserID(getState()), " has changed", rtp.track!.kind, "track to", id, "to", rtp.track!.enabled)
}

export const handleRTCEvents = (joinedUserId: string): AppThunk => (dispatch, getState) => {
    // get client ids
    const clients = getOnlineUsers(getState()).map(k => k.id)
    const localClient: string = getUserID(getState())
    clients.push(localClient)

    if (Array.isArray(clients) && clients.length > 0) {
        clients.forEach((userId) => {
            // no connection to yourself
            if (localClient === userId) return;
            // no connection to usr that are already connected
            if (!rtcConnections[userId]) {
                // TODO isn't here a connection created from user a to user a
                rtcConnections[userId] = new RTCPeerConnection(rtcConfiguration);
                // TODO what about
                // oniceconnectionstatechange
                // onsignalingstatechange
                // onnegotiationneeded

                rtcConnections[userId].onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log(localClient, 'send candidate to ', userId);
                        dispatch(send({
                            type: "signal",
                            target_id: userId,
                            content: {
                                signal_type: 'candidate',
                                candidate: event.candidate
                            }
                        }));
                    }
                };

                rtcConnections[userId].ontrack = (event: RTCTrackEvent) => {
                    console.log(`On track event handler of ${localClient} triggered with streams:`);
                    console.dir(event.streams);
                    streams[userId] = event.streams[0]
                    dispatch(gotRemoteStream(userId));
                    console.log("I HAVE A TRACK");
                }

                rtcConnections[userId].onicegatheringstatechange = (event) => {
                    console.log(event)
                }

                // this event should get triggered after the tracks are added to the local stream and the client
                // is ready to start sending the sdp offer
                // on negotionneeded should only be part of the caller??
                if (localClient === joinedUserId) {
                    rtcConnections[userId].onnegotiationneeded = (event) => {
                        console.log(userId)
                        rtcConnections[userId].createOffer(offerOptions).then((description) => {
                            rtcConnections[userId].setLocalDescription(description).then(() => {
                                console.log(localClient, ' Send offer to ', userId);
                                dispatch(send({
                                    type: 'signal',
                                    target_id: userId,
                                    content: {
                                        signal_type: 'sdp',
                                        // TODO shouldn't this here be the localClient
                                        description: rtcConnections[userId].localDescription,
                                    }
                                }));
                            }).catch(e => dispatch(handleError(e.toString())));
                        });
                    };

                }
                rtpSender[userId] = {}

                if (!getStream(getState(), localClient)) {
                    dispatch(handleError("Could not access media."))
                    return
                }
                // todo maybe do not send the stream until the connection is established
                getStream(getState(), localClient)!.getTracks().forEach(track => {
                    rtpSender[userId][track.kind] = rtcConnections[userId].addTrack(track.clone(), getStream(getState(), localClient)!)
                })
            }
        });
        dispatch(handlePositionUpdate({id: joinedUserId, position: getUser(getState()).position!}))
    }
}

export const handleCandidate = (candidate: any, fromId: string): AppThunk => (dispatch: any, getState: any) => {
    rtcConnections[fromId].addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e.stack));
}

export const handleSdp = (description: any, fromId: string): AppThunk => (dispatch: any, getState: any) => {
    console.log("Start handleSdp with description:");
    console.dir(description);
    if (!!description) {
        const clientId: string = getUserID(getState());

        console.log(clientId, ' Receive sdp from ', fromId);
        // TODO this should happen in the first place
        if (clientId === fromId)
            return
        // TODO why is this existing here already?
        // here we get the description from the caller and set them to our remoteDescription
        // maybe here not create the RTCSesseionDescription with the whole description but just with description.sdp
        // TODO: Should we not already set out track to the connection here
        rtcConnections[fromId].setRemoteDescription(new RTCSessionDescription(description))
            .then(() => {
                 // TODO why description type offer here?
                if (description.type === 'offer') {
                    rtcConnections[fromId].createAnswer()
                        .then((desc) => {
                            rtcConnections[fromId].setLocalDescription(desc).then(() => {
                                console.log(clientId, ' Send answer to ', fromId);
                                // This replaces the socket.emit function
                                dispatch(send({
                                    type: "signal",
                                    target_id: fromId,
                                    content: {
                                        signal_type: "sdp",
                                        description: rtcConnections[fromId].localDescription
                                    }
                                }));
                            });
                        })
                        .catch(
                            (error) => {
                            console.log(error)
                            dispatch(handleError("RTC Answer could not be created."))
                        }
                        //     dispatch(handleError("RTC Answer could not be created."))
                        );
                }
            })
            .catch(
                    (error) => {
                    console.log(error)
                    dispatch(handleError("RTC remote description could not be set."))
                }
                // dispatch(handleError("RTC remote description could not be set."))
            );
    } else {
        dispatch(handleError("RTC Description was not set"))
    }
}

export const disconnectUser = (id: string): AppThunk => (dispatch, getState) => {
    Object.keys(rtpSender[id]).forEach(k => rtpSender[id][k].track?.stop())
    delete rtpSender[id]
    rtcConnections[id].close()
    delete rtcConnections[id]
    dispatch(setUserOffline(id))
}

export const destroySession = (): AppThunk => (dispatch, getState) => {
    localStream?.getTracks().forEach(t => t.stop())

    screenStream?.getTracks().forEach(t => t.stop())
    dispatch(setScreen(false))

    Object.keys(streams).forEach(k => {
        getStream(getState(), k)!.getTracks().forEach(t => {
            t.enabled = false
            getStream(getState(), k)!.removeTrack(t)
        })
    })


    getOnlineUsers(getState()).forEach(u => {
        rtcConnections[u.id].close()
        Object.keys(rtpSender[u.id]).forEach(k => rtpSender[u.id][k].track?.stop())
    })
    streams = {}
    rtcConnections = {}
    rtpSender = {}

    dispatch(turnOnVideo())
    dispatch(forgetUsers())
    dispatch(resetPlayground())

    dispatch(returnHome())
}

export const changeVideoInput = (camera: string): AppThunk => (dispatch, getState) => {
    dispatch(setMediaChangeOngoing(true))
    dispatch(setCamera(camera))
    dispatch(handleInputChange())
}

export const changeAudioInput = (microphone: string): AppThunk => (dispatch, getState) => {
    dispatch(setMediaChangeOngoing(true))
    dispatch(setMicrophone(microphone))
    dispatch(handleInputChange())

}

export const handleInputChange = (): AppThunk => (dispatch, getState) => {
    const localClient = getUserID(getState())
    const oldStream = getStream(getState(), localClient)
    navigator.mediaDevices.getUserMedia(getMediaConstrains(getState())).then((e) => {
        localStream = e
        dispatch(setMediaChangeOngoing(false))
        getStream(getState(), localClient)!.getTracks().forEach(s => {
            getOnlineUsers(getState()).forEach(u => {
                Object.keys(rtpSender[u.id]).forEach(k => {
                    const rs = rtpSender[u.id][k]
                    if (rs.track && rs.track.kind === s.kind)
                        rs.replaceTrack(s.clone())
                })
            })
        })
        oldStream!.getTracks().forEach(t => t.stop())
        dispatch(setUserMedia(true))
    }).catch(() => {
        dispatch(setUserMedia(false))
        dispatch(handleError("Cannot get user media"))
    })

}

export const changeAudioOutput = (speaker: string): AppThunk => (dispatch, getState) => {
    dispatch(setSpeaker(speaker))
}

export const getRtcConnection = (state: RootState, id: number) => rtcConnections[id];
export const getMediaConstrains = (state: RootState) => {
    return {
        video: {
            width: 320,
            height: 320,
            facingMode: "user",
            deviceId: getCamera(state)
        },
        audio: {
            deviceId: getMicrophone(state),
            echoCancellation: true
        }
    }
}
export const getMicrophone = (state: RootState): string => {
    const sel = state.rtc.selected.microphone
    if (sel && state.rtc.microphones.find(c => c === sel))
        return sel
    if (state.rtc.cameras[0])
        return state.rtc.microphones[0]
    return ""
}
export const getCamera = (state: RootState): string => {
    const sel = state.rtc.selected.camera
    if (sel && state.rtc.cameras.find(c => c === sel))
        return sel
    if (state.rtc.cameras[0])
        return state.rtc.cameras[0]
    return ""
}
export const getSpeaker = (state: RootState): string => {
    // get selected speaker if available
    // otherwise get first available
    return (state.rtc.speakers[0]) ? state.rtc.speakers[0] : ""
}
export const getStream = (state: RootState, id: string) => {
    if (streams[id])
        return streams[id]
    if (state.userState.activeUser.id === id)
        return localStream
}

export const getScreenStream = (state: RootState, id: string) => {
    //if (screenStream[id])
    //    return screenStream[id]
    if (state.userState.activeUser.id === id)
        return screenStream
}

export const getMediaDevices = () => mediaDevices
export default rtcSlice.reducer;
