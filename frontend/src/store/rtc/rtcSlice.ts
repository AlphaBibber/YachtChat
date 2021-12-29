import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {AppThunk, RootState} from '../store';
import {connectToServer, send, triggerReconnection} from "../webSocketSlice";
import {rtcConfiguration} from "../config";
import {
    forgetUsers,
    getOnlineUsers,
    getUser,
    getUserById,
    getUserID,
    gotRemoteStream,
    handlePositionUpdate,
    setMedia,
    setUserOffline
} from "../userSlice";
import {resetPlayground} from "../playgroundSlice";
import {requestSpaces, returnHome} from "../spaceSlice";
import {handleError} from "../statusSlice";
import {MediaType} from "../models";
import {applyVirtualBackground, stopAllVideoEffects} from "../utils";
import CameraProcessor from "camera-processor";

interface RTCState {
    muted: boolean
    video: boolean
    previousVideo: boolean
    cameras: string[]
    microphones: string[]
    speakers: string[]
    selected: {
        camera?: string,
        speaker?: string,
        microphone?: string,
        virtualBackground?: string
    }
    screen: boolean
    mediaChangeOngoing: boolean
    userMedia: boolean
}

const initialState: RTCState = {
    muted: false,
    video: true,
    screen: false,
    previousVideo: true,
    cameras: [],
    microphones: [],
    speakers: [],
    mediaChangeOngoing: false,
    userMedia: false,
    selected: {
        camera: (!!localStorage.getItem("camera")) ? localStorage.getItem("camera")! : undefined,
        microphone: (!!localStorage.getItem("microphone")) ? localStorage.getItem("microphone")! : undefined,
        speaker: (!!localStorage.getItem("speaker")) ? localStorage.getItem("speaker")! : undefined,
        virtualBackground: (!!localStorage.getItem("virtualBackground")) ? localStorage.getItem("virtualBackground")! : "none",
    }
};

let rtcConnections: { [key: string]: RTCPeerConnection } = {}; // the connection to handle the connection to the other peer
let rtpSender: { [key: string]: { [key: string]: RTCRtpSender } } = {}; // rtc object that handles stream transmission
let localStream: MediaStream | undefined = undefined // local video and audio
let camera_processor: CameraProcessor | undefined = undefined // if virtual background is applied
let screenStream: MediaStream | undefined = undefined // stream of the display video when shared
let streams: { [key: string]: MediaStream } = {}; // incoming streams of the other users
let mediaDevices: { [key: string]: MediaDeviceInfo } = {}; // media devices
let connectionTimer: { [key: string]: number } = {}; // Connection retry timer
let bytesReceived: { [key: string]: number } = {}; // Stores bytes received per user

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
        setPreviousVideo: (state, action: PayloadAction<boolean>) => {
            state.previousVideo = action.payload
        },
        toggleScreen: (state) => {
            state.screen = !state.screen
        },
        setMediaChangeOngoing: (state, action: PayloadAction<boolean>) => {
            state.mediaChangeOngoing = action.payload
        },
        setCamera: (state, action: PayloadAction<string>) => {
            state.selected.camera = action.payload
            localStorage.setItem("camera", action.payload)
        },
        setMicrophone: (state, action: PayloadAction<string>) => {
            state.selected.microphone = action.payload
            localStorage.setItem("microphone", action.payload)

        },
        setSpeaker: (state, action: PayloadAction<string>) => {
            state.selected.speaker = action.payload
            localStorage.setItem("speaker", action.payload)

        },
        setVirtualBackground: (state, action: PayloadAction<string | undefined>) => {
            state.selected.virtualBackground = action.payload

            if (!!action.payload)
                localStorage.setItem("virtualBackground", action.payload)
            else
                localStorage.removeItem("virtualBackground")
        },
        setUserMedia: (state, action: PayloadAction<boolean>) => {
            state.userMedia = action.payload
        },
        turnOnVideo: (state) => {
            state.video = true
        },
        turnOnAudio: (state) => {
            state.muted = false
        },
        setScreen: (state, action: PayloadAction<boolean>) => {
            state.screen = action.payload
        },
    },
});

export const {
    initAllMediaDevices,
    toggleVideo,
    setPreviousVideo,
    toggleMute,
    toggleScreen,
    setCamera,
    setMicrophone,
    setSpeaker,
    setVirtualBackground,
    setMediaChangeOngoing,
    setUserMedia,
    turnOnVideo,
    turnOnAudio,
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

export const joinWithOnlyMicrophone = (spaceID: string): AppThunk => (dispatch, getState) => {
    navigator.mediaDevices.getUserMedia(getMediaConstrainsAudioOnly(getState())).then((e) => {
        const localClient = getUserID(getState())
        localStream = e

        dispatch(gotRemoteStream(localClient))
        dispatch(loadAllMediaDevices())
        dispatch(setUserMedia(false))
        // todo video for user is set twice -> update this
        dispatch(setMedia({id: getUserID(getState()), type: MediaType.VIDEO, state: false}))
        // video is initialized to true, but we want to set it to false here
        dispatch(toggleVideo())
    }).then(() =>
        dispatch(connectToServer(spaceID))
    ).catch(() => {
        dispatch(handleError("Unable to get media."))
        dispatch(setUserMedia(false))
    })
}

export const requestUserMediaAndJoin = (spaceID: string): AppThunk => (dispatch, getState) => {
    navigator.mediaDevices.getUserMedia(getMediaConstrains(getState())).then((e) => {
        const localClient = getUserID(getState())
        const [ls, cp] = applyVirtualBackground(e, getState().rtc.selected.virtualBackground, camera_processor)
        localStream = ls
        camera_processor = cp

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

    const state = getState()
    const userID = getUserID(state)
    const audio = !state.rtc.muted

    if (!getStream(state, userID)) {
        //dispatch(send({'type': 'media', 'id': userID, 'media': 'audio', 'event': false}))
        return
    }

    // If audio re-enabled
    if (audio) {
        // Replace audio tracks
        dispatch(setMediaChangeOngoing(true))
        dispatch(handleInputChange('audio'))
        //dispatch(send({'type': 'media', 'id': userID, 'media': 'audio', 'event': false}))
    } else {
        // If disabled, stop all audio tracks
        if (getStream(state, getUserID(state))?.getAudioTracks()[0])
            getStream(state, getUserID(state))?.getAudioTracks()[0].stop()
        //dispatch(send({'type': 'media', 'id': userID, 'media': 'audio', 'event': false}))

        getOnlineUsers(state).forEach(u => {
            Object.keys(rtpSender[u.id]).forEach(k => {
                const rtp = rtpSender[u.id][k]
                if (rtp.track && rtp.track.kind === 'audio') {
                    rtp.track.stop()
                }
            })
        })
    }
}

export const toggleUserVideo = (): AppThunk => (dispatch, getState) => {
    // get state screen state
    const screen:boolean = getState().rtc.screen
    if (screen){
        // if the screen was on till now let unshareScreen handle it
        dispatch(unshareScreen(true))
    } else{
        dispatch(toggleVideo())

        // TODO this call should later be deleted because video state is redundant
        dispatch(setMedia({id: getUserID(getState()), type: MediaType.VIDEO, state: getState().rtc.video}))

        // handle video changes
        if (getState().rtc.video){
            dispatch(setMediaChangeOngoing(true))
            dispatch(handleInputChange())
        }else{
            dispatch(stopVideo())
        }
    }
}

// stop but do not set state
export const stopVideo = (): AppThunk => (dispatch, getState) => {
    const state = getState()
    const userID = getUserID(state)

    // Stop all video effects (otherwise camera will remain active)
    stopAllVideoEffects(camera_processor)

    // disable streams if video disabled
    getStream(state, userID)?.getVideoTracks()[0].stop()

    // only kill remote streams if no screen is beeing shared
    if (!state.rtc.screen) {
        // Disable streams for every one (if nothing is shared)
        getOnlineUsers(state).forEach(u => {
            Object.keys(rtpSender[u.id]).forEach(k => {
                const rtp = rtpSender[u.id][k]
                if (rtp.track && rtp.track.kind === 'video') {
                    rtp.track.stop()
                }
            })
        })
    }
}

export const toggleUserScreen = (): AppThunk => (dispatch, getState) => {
    dispatch(setMediaChangeOngoing(true))
    if (!getState().rtc.screen) {
        // If not enabled yet try to enable the screen sharing
        dispatch(shareScreen())
    } else {
        // If enabled, disable screen sharing
        dispatch(unshareScreen(false))
    }
}
export const shareScreen = (): AppThunk => (dispatch, getState) => {
    // remember the current video state to know wheter to turn on camer or not when sreensharing is turned off
    dispatch(setPreviousVideo(getState().rtc.video))
    navigator.mediaDevices.getDisplayMedia(getScreenSharingConstraints()).then((stream) => {

        // Should the websocket be updated?
        let isChanged:boolean = true

        // if the video was turned on until now turn it off
        if (getState().rtc.video) {
            dispatch(toggleVideo())
            dispatch(stopVideo())
            // TODO this call should later be deleted because video state is redundant
            dispatch(setMedia({id: getUserID(getState()), type: MediaType.VIDEO, state: false}))
            isChanged = false
        }
        // change the screen state
        dispatch(setScreen(true))

        // set stream to class wide variable
        screenStream = stream

        // If screen stream ends stop screen sharing
        stream.getTracks().forEach(t => t.onended = () => {
            dispatch(unshareScreen(false))
        })

        // iterate over all user and replace my video stream with the stream of my screen
        getOnlineUsers(getState()).forEach(u => {
            if (u.id === getUserID(getState())) return
            rtpSender[u.id]["video"].replaceTrack(stream!.getVideoTracks()[0].clone());
        })

        // tell the weboscket that the screen is now shared
        dispatch(send({'type': 'media', 'id': getUserID(getState()), 'media': 'screen', 'event': true}));

    }).catch((e) => {
        dispatch(handleError("Unable to share the screen", e))
    }).finally(() => {
        dispatch(setMediaChangeOngoing(false))
        }
    )
}


// unshares the screen and turns the video on or not depending on the previous camera state and whether the call came from
// the camera button
export const unshareScreen = (isFromCamera:boolean): AppThunk => (dispatch, getState) => {
    // change the screen state
    dispatch(setScreen(false))

    // change the class wide variable of the stream
    screenStream?.getTracks().forEach(t => t.stop())
    screenStream = undefined

    // depending on the previousVideo and whether the call came from the camera button start the video or not
    if(getState().rtc.previousVideo || isFromCamera) {
        dispatch(toggleVideo())
        dispatch(setMedia({id: getUserID(getState()), type: MediaType.VIDEO, state: true}))
        dispatch(setMediaChangeOngoing(true))
        dispatch(handleInputChange('video'))
        dispatch(send({'type': 'media', 'id': getUserID(getState()), 'media': 'screen', 'event': false, 'changeToVideo': true}));
    }else{
        // tell the websocket that the screen is stopped
        dispatch(send({'type': 'media', 'id': getUserID(getState()), 'media': 'screen', 'event': false, 'changeToVideo': false}));
        dispatch(setMedia({id: getUserID(getState()), type: MediaType.VIDEO, state: false}))
    }
}

// Function that will enable spatial audio to a given user
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

// Function that will disnable spatial audio to a given user
export const unsendAudio = (id: string): AppThunk => (dispatch, getState) => {
    const rtp = rtpSender[id]["audio"]
    console.log("Trying not to enable audio to ", id)
    if (rtp.track && rtp.track.kind === 'audio') {
        console.log("Disabled audio")
        rtp.track.enabled = false
    }
    //console.log(getUserID(getState()), " has changed", rtp.track!.kind, "track to", id, "to", rtp.track!.enabled)
}

// User is still in space when his rtcConnection element exist and if he is still online
// this function should be called before every rtcConnection eventlistener to make sure we don't trigger connection when
// the user is not longer in the space
function isUserInSpace(state: RootState, id: string){
    const user = getUserById(state, id)
    if (!user) return false
    return !!rtcConnections[id] && user.online
}

export const handleRTCEventsNew = (joinedUserId: string, isCaller?: boolean): AppThunk => (dispatch, getState) => {
    const listOfClientIds = getOnlineUsers(getState()).map(k => k.id)
    const givenUserId: string = getUserID(getState())

    listOfClientIds.forEach(userId =>{

    })
}

/**
 * Called when either the current user joins or another user
 * @param joinedUserId: id of the given user
 * @param isCaller: boolean that is true if the given user should be the initiator of the rtp call
 */
export const handleRTCEvents = (joinedUserId: string, isCaller?: boolean): AppThunk => (dispatch, getState) => {

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
                    if (!isUserInSpace(getState(), userId)) return
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
                    if (!isUserInSpace(getState(), userId)) return
                    streams[userId] = event.streams[0]
                    dispatch(gotRemoteStream(userId));
                }

                rtcConnections[userId].onicegatheringstatechange = (event) => {
                }

                // onnegotiationneeded is called when a track is added to the RTPConncetion.
                // Only the caller needs this eventlistener to send the offer
                // the caller is either the user who recently joined the space or if this is a reconnection try, the user
                // that was the previous caller.
                if (localClient === joinedUserId || isCaller) {
                    rtcConnections[userId].onnegotiationneeded = (event) => {
                        if (!isUserInSpace(getState(), userId)) return
                        rtcConnections[userId].createOffer(offerOptions).then((description) => {
                            rtcConnections[userId].setLocalDescription(description).then(() => {
                                console.log(localClient, ' Send offer to ', userId);
                                dispatch(send({
                                    type: 'signal',
                                    target_id: userId,
                                    content: {
                                        signal_type: 'sdp',
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

                let mediaStream = getStream(getState(), localClient)!

                // if screen is beeing shared
                if (getState().rtc.screen && screenStream) {
                    mediaStream = new MediaStream([
                        localStream!.getAudioTracks()[0],
                        screenStream!.getVideoTracks()[0]
                    ])
                }

                // todo maybe do not send the stream until the connection is established
                mediaStream.getTracks().forEach(track => {
                    // todo check what happens when the user only joins with microphone
                    rtpSender[userId][track.kind] = rtcConnections[userId].addTrack(track.clone(), getStream(getState(), localClient)!)
                })

                dispatch(setupReconnectionLoop(userId, !!(localClient === joinedUserId || isCaller)))
            }
        });
        dispatch(handlePositionUpdate({id: joinedUserId, position: getUser(getState()).position!}))
    }
}

export const setupReconnectionLoop = (userId: string, isCaller: boolean): AppThunk => (dispatch: any, getState: any) => {
// Reconnection functionality
    if (isCaller) {
        connectionTimer[userId] = setTimeout(() => {
            // delete old reference to timer
            delete connectionTimer[userId];
            // if the connection was not established in time, try to reconnect
            if (!getUserById(getState(), userId).userStream) {
                // This if statement only yields true if the peer is still in the space and I am still in the Space.
                // if this is true we want to try a reconnection.
                if (getUserById(getState(), userId) !== undefined) {
                    // dispatch(handleError(`Reconnecting to ${getUserById(getState(), userId).firstName}`));
                    dispatch(triggerReconnection(userId));
                }
            } else {
                // Setup reconnection loop after first connection establishment
                // Check every 7sec if stream still streaming
                const interval = setInterval(() => {
                    if (!rtcConnections[userId]) {
                        clearInterval(interval)
                        return
                    }

                    rtcConnections[userId].getStats().then(
                        (report: RTCStatsReport) => {
                            const br = bytesReceived[userId]
                            const user = getUserById(getState(), userId)
                            report.forEach(k => {
                                if (k.type === "inbound-rtp" && k.kind === "video") {
                                    if (br === k.bytesReceived && user.video) {
                                        console.log(`${user.firstName} does not send any data.`)
                                        clearInterval(interval)
                                        // dispatch(handleError(`Reconnecting to ${getUserById(getState(), userId).firstName}`));
                                        dispatch(triggerReconnection(userId));
                                    }
                                    bytesReceived[userId] = k.bytesReceived
                                }
                            })
                        }
                    )
                }, 7000)
            }
        }, 3000);
    }
}

export const handleCandidate = (candidate: any, fromId: string): AppThunk => (dispatch: any, getState: any) => {
    if (!isUserInSpace(getState(), fromId)) return
    rtcConnections[fromId].addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e.stack));
    let connection_type = new RTCIceCandidate(candidate)
    if (connection_type.type !== null) {
        switch (connection_type.type) {
            case "relay":
                //console.log(connection_type.address + " uses TURN")
                break

            case "srflx":
                //console.log(connection_type.address + " uses STUN")
                break

            default:
                console.log("NO TURN SERVER USED by: " + connection_type.address + " as " + connection_type.type)
                break

        }
    }
}

export const handleSdp = (description: any, fromId: string): AppThunk => (dispatch: any, getState: any) => {
    if(!isUserInSpace(getState(), fromId)) return
    if (!!description) {
        const clientId: string = getUserID(getState());
        if (clientId === fromId)
            return

        rtcConnections[fromId].setRemoteDescription(new RTCSessionDescription(description))
            .then(() => {
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
                            });
                }
            })
            .catch(
                (error) => {
                    console.log(error)
                    dispatch(handleError("RTC remote description could not be set."))
                });
    } else {
        dispatch(handleError("RTC Description was not set"))
    }
}

export const disconnectUser = (id: string): AppThunk => (dispatch, getState) => {
    if (!isUserInSpace(getState(), id)) return
    rtcConnections[id].close()
    delete rtcConnections[id]
    dispatch(setUserOffline(id))
    // clear potential timer which was set up for the user that just left
    if (connectionTimer[id]){
        clearTimeout(connectionTimer[id]);
        delete connectionTimer[id];
    }
    if (!rtpSender[id]) return
    Object.keys(rtpSender[id]).forEach(k => rtpSender[id][k].track?.stop())
    delete rtpSender[id]
}

export const destroySession = (): AppThunk => (dispatch, getState) => {
    localStream?.getTracks().forEach(t => t.stop())
    stopAllVideoEffects(camera_processor)
    screenStream?.getTracks().forEach(t => t.stop())

    localStream = undefined
    camera_processor = undefined
    screenStream = undefined

    dispatch(setScreen(false))
    // dispatch(setUser({...getUser(getState()), online: false}))

    // clear all timer when we are leaving the space
    Object.keys(connectionTimer).forEach(userId => {
        clearTimeout(connectionTimer[userId]);
    });
    connectionTimer = {};

    Object.keys(streams).forEach(k => {
        getStream(getState(), k)!.getTracks().forEach(t => {
            t.stop()
            t.enabled = false
            getStream(getState(), k)!.removeTrack(t)
        })
    })


    getOnlineUsers(getState()).forEach(u => {
        Object.keys(rtpSender[u.id]).forEach(k => rtpSender[u.id][k].track?.stop())
        rtcConnections[u.id].close()
    })
    streams = {}
    rtcConnections = {}
    rtpSender = {}

    dispatch(turnOnVideo())
    dispatch(turnOnAudio())
    dispatch(forgetUsers())
    dispatch(resetPlayground())
    dispatch(requestSpaces())

    dispatch(returnHome())
}

export const changeVideoInput = (camera: string): AppThunk => (dispatch, getState) => {
    dispatch(setMediaChangeOngoing(true))
    dispatch(setCamera(camera))
    dispatch(handleInputChange("video"))
}

export const changeAudioInput = (microphone: string): AppThunk => (dispatch, getState) => {
    dispatch(setMediaChangeOngoing(true))
    dispatch(setMicrophone(microphone))
    dispatch(handleInputChange("audio"))

}

export const changeVirtualBackground = (background: string): AppThunk => (dispatch, getState) => {
    dispatch(setMediaChangeOngoing(true))
    dispatch(setVirtualBackground(background))
    dispatch(handleInputChange("video"))
}



export const handleInputChange = (type?: string): AppThunk => (dispatch, getState) => {
    const state = getState()
    const localClient = getUserID(state)

    // If true all tracks have to be replaced otherwise just of type
    const replaceAllTracks = state.rtc.video && !state.rtc.muted

    navigator.mediaDevices.getUserMedia(getMediaConstrains(state, (replaceAllTracks) ? undefined : type)).then((e) => {
        // If type is not set or no localStream available reset the whole stream object
        const [ls, cp] = applyVirtualBackground(e, getState().rtc.selected.virtualBackground, camera_processor)
        camera_processor = cp

        dispatch(gotRemoteStream(localClient))
        dispatch(loadAllMediaDevices())
        dispatch(setMediaChangeOngoing(false))

        ls.getTracks().forEach(track => {
            // change the local stream
            const trackIndexToChange = localStream?.getTracks().findIndex(localStream => localStream.kind === track.kind)
            if (trackIndexToChange != -1){
                // localStream?.getTracks()[trackIndexToChange].stop()
                localStream?.removeTrack(localStream?.getTracks()[trackIndexToChange!])
                localStream?.addTrack(track.clone())
            }else{
                localStream?.addTrack(track.clone())
            }

            getOnlineUsers(state).forEach(user => {
                let trackUpdated = false
                Object.keys(rtpSender[user.id]).forEach(currentType => {
                    if(track.kind == currentType){
                        if (track.kind === "audio"){
                            track.enabled = user.inProximity!
                        }
                        const clone = track.clone()
                        rtpSender[user.id][currentType].track?.stop()
                        rtpSender[user.id][currentType].replaceTrack(clone)
                        trackUpdated = true
                        // remove the old track and repleace it with the new one
                    }
                })
                if (!trackUpdated){
                    // if some track was not added before (probably the video track) we want to add the new track to the
                    // connection but also to the oldStream
                    rtpSender[user.id][track.kind] = rtcConnections[user.id].addTrack(track.clone(), localStream!)
                }
            })
        })
        dispatch(setUserMedia(true))
    }).catch((e) => {
        dispatch(setUserMedia(false))
        dispatch(handleError("Cannot get user media"))
    }).then(()=>{// tell websocket about video changes

        dispatch(send({'type': 'media', 'id': getUserID(getState()), 'media': 'video', 'event': getState().rtc.video}))
    })

}

export const changeAudioOutput = (speaker: string): AppThunk => (dispatch, getState) => {
    dispatch(setSpeaker(speaker))
}

export const getRtcConnection = (state: RootState, id: number) => rtcConnections[id];
export const getMediaConstrains = (state: RootState, type?: string) => {
    return {
        video: (type !== 'audio') ? {
            width: 320,
            height: 320,
            facingMode: "user",
            frameRate: { max: 10 },
            deviceId: getCamera(state)
        } : undefined,
        audio: (type !== 'video') ? {
            deviceId: getMicrophone(state),
            echoCancellation: true
        } : undefined
    }
}

export const getMediaConstrainsAudioOnly = (state: RootState, type?: string) => {
    return {
        audio: (type !== 'video') ? {
            deviceId: getMicrophone(state),
            echoCancellation: true
        } : undefined
    }
}


export const getScreenSharingConstraints = () => {
    return {
        video: {
            width: { ideal: 4096 },
            height: { ideal: 2160 },
            frameRate: { max: 5 },
            mediaSource: 'screen',
        },
        audio: false
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

export const getFreshMediaStream = (state: RootState): Promise<MediaStream> =>
    navigator.mediaDevices.getUserMedia(getMediaConstrains(state))
export const getMediaDevices = () => mediaDevices
export default rtcSlice.reducer;