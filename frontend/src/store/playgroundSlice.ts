import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {PlaygroundOffset} from "./models";
import {AppThunk} from "./store";
import {requestSpaces} from "./spaceSlice";

interface SpaceState {
    offset: PlaygroundOffset
}

const initScale = (1.0 / 1080) * ((window.innerWidth > window.innerHeight) ? window.innerWidth : window.innerHeight)
let prevHeight = window.innerHeight;
let prevWidth = window.innerWidth;

const initialState: SpaceState = {
    offset: {
        x: -window.innerWidth / 2 * (1 / initScale),
        y: -window.innerHeight / 2 * (1 / initScale),
        // The scale is normed to 1080 pixels, but will increase when the screen is bigger
        scale: initScale,
        trueScale: 1.0
    }
}

export const spaceSlice = createSlice({
    name: "playground",
    initialState,
    reducers: {
        movePlayground: (state, action: PayloadAction<PlaygroundOffset>) => {
            // The scale is normed to 1080 pixels, but will increase when the screen is bigger
            const ub = 4.0 / 1080 * ((window.innerWidth > window.innerHeight) ? window.innerWidth : window.innerHeight)
            // The scale is normed to 1080 pixels, but will increase when the screen is bigger
            const lb = 0.5 / 1080 * ((window.innerWidth > window.innerHeight) ? window.innerWidth : window.innerHeight)

            if (action.payload.scale <= ub && action.payload.scale >= lb)
                state.offset = action.payload
        },
        scalePlayground: (state, action: PayloadAction<number>) => {
            state.offset.scale = action.payload
        },
        resetPlayground: (state) => {
            state.offset = initialState.offset
        }
    }
});

export const {
    movePlayground,
    scalePlayground,
    resetPlayground
} = spaceSlice.actions;

export const initPlayground = (): AppThunk => (dispatch, getState) => {
    window.addEventListener("resize", (): void => {
        const newScale = (getState().playground.offset.trueScale / 1080) * ((window.innerWidth > window.innerHeight) ? window.innerWidth : window.innerHeight)
        const offset = getState().playground.offset

        // change the scale
        dispatch(scalePlayground(
            newScale
        ))

        // delta (change in width)
        const d = {
            x: (window.innerWidth - prevWidth),
            y: (window.innerHeight - prevHeight)
        }

        // old scale
        const d_os = {x: d.x / offset.scale, y: d.y / offset.scale }
        // new scale
        const d_ns = {x: d.x / offset.scale, y: d.y / offset.scale }
        // d delta (change in position --> delta on old scale substracted by delta of new scale = total change)
        const d_d = {x: d_os.x - d_ns.x, y: d_os.y - d_ns.y}

        dispatch(movePlayground({
            ...getState().playground.offset,
            x: offset.x - d_d.x / 2,
            y: offset.y - d_d.y / 2
        }))

        prevHeight = window.innerHeight
        prevWidth = window.innerWidth
    })
    dispatch(requestSpaces())
}

export const centerUser = (): AppThunk => (dispatch, getState) => {
    const userPos = getState().userState.activeUser.position!
    const offset = getState().playground.offset
    dispatch(movePlayground({
        ...offset,
        x: userPos.x - window.innerWidth / offset.scale / 2,
        y: userPos.y - window.innerHeight / offset.scale / 2
    }))
}

export const handleZoom = (z: number, cx?: number, cy?: number): AppThunk => (dispatch, getState) => {
    const state = getState()
    const scale = state.playground.offset.scale
    const scaledZoom = state.playground.offset.scale + (z / 1080 * ((window.innerWidth > window.innerHeight) ? window.innerWidth : window.innerHeight))
    const userPos = state.userState.activeUser.position!
    const offX = state.playground.offset.x
    const offY = state.playground.offset.y

    // center of zoom
    const centerX = cx ? cx / getState().playground.offset.scale : (userPos.x - offX)
    const centerY = cy ? cy / getState().playground.offset.scale : (userPos.y - offY)

    const x = offX + ((centerX) * (scaledZoom) - (centerX) * scale) / (scaledZoom)
    const y = offY + ((centerY) * (scaledZoom) - (centerY) * scale) / (scaledZoom)


    dispatch(movePlayground({
        x,
        y,
        scale: scaledZoom,
        trueScale: state.playground.offset.trueScale + z
    }))
}

export const setScale = (z: number, cx?: number, cy?: number): AppThunk => (dispatch, getState) => {
    const state = getState()
    const scale = state.playground.offset.scale
    const scaledZoom = (z / 1080 * ((window.innerWidth > window.innerHeight) ? window.innerWidth : window.innerHeight))
    const userPos = state.userState.activeUser.position!
    const offX = state.playground.offset.x
    const offY = state.playground.offset.y

    // center of zoom
    const centerX = cx ? cx : (userPos.x - offX)
    const centerY = cy ? cy : (userPos.y - offY)

    const x = offX + ((centerX) * (scaledZoom) - (centerX) * scale) / (scaledZoom)
    const y = offY + ((centerY) * (scaledZoom) - (centerY) * scale) / (scaledZoom)


    dispatch(movePlayground({
        x,
        y,
        scale: scaledZoom,
        trueScale: z
    }))
}

export default spaceSlice.reducer;