import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {AppThunk, RootState} from './store';
import {User, UserCoordinates} from "./models";
import {sendPosition} from "./connectionSlice";

interface UserState {
    activeUser: User
    otherUsers: { [key: number]: User }
    scalingFactor: number
}

const initialState: UserState = {
    activeUser: {id: -1, name: "name", position: {x: 200, y: 200, range: 0.3}},
    otherUsers: {},
    scalingFactor: 1.0
};

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        move: (state, action: PayloadAction<UserCoordinates>) => {
            state.activeUser.position.x = action.payload.x;
            state.activeUser.position.y = action.payload.y;
        },
        changeRadius: (state, action: PayloadAction<number>) => {
            state.activeUser.position.range = action.payload;
        },
        gotRemoteStream: (state, action: PayloadAction<number>) => {
            if (state.activeUser.id === action.payload)
                state.activeUser.userStream = true
            else
                state.otherUsers[action.payload].userStream = true
        },
        setUserId: (state, action: PayloadAction<number>) => {
            state.activeUser.id = action.payload
        },
        setName: (state, action: PayloadAction<any>) => {
            if (action.payload.id)
            state.activeUser.name = action.payload.name
        },
        addUser: (state, action: PayloadAction<User>) => {
            state.otherUsers[action.payload.id] = action.payload
        },
        removeUser: (state, action: PayloadAction<number>) => {
            delete state.otherUsers[action.payload]
        },
        handlePositionUpdate: (state, action: PayloadAction<any>) => {
            if (!state.otherUsers[action.payload.id])
                return
            state.otherUsers[action.payload.id].position = action.payload.position
        },
        setUsers: (state, action: PayloadAction<{ [key: number]: User }>) => {
            const otherUsers: { [key: number]: User } = {}

            Object.keys(action.payload).forEach(k => {
                const id = Number(k)
                if (id === state.activeUser.id) {
                    state.activeUser.position = action.payload[id].position
                } else if (action.payload[id].name && action.payload[id].position) {
                    otherUsers[id] = action.payload[id]
                }
            })
            state.otherUsers = otherUsers
            // action.payload.filter(u => u.id !== state.activeUser.id && u.name !== null).forEach(u => {
            //     state.otherUsers[u.id] = u
            // })
        },
        changeScaling: (state, action: PayloadAction<number>) => {
            state.scalingFactor = action.payload
        }
    },
});

export const {
    move,
    changeRadius,
    gotRemoteStream,
    addUser,
    setName,
    handlePositionUpdate,
    setUsers,
    removeUser,
    setUserId,
    changeScaling
} = userSlice.actions;

export const submitMovement = (coordinates: UserCoordinates): AppThunk => (dispatch, getState) => {
    if (getState().userState.activeUser.position !== coordinates) {
        dispatch(sendPosition(coordinates))
        dispatch(move(coordinates))
    }
};

export const submitRadius = (radius: number): AppThunk => (dispatch, getState) => {
    dispatch(changeRadius(radius))
    dispatch(sendPosition(getState().userState.activeUser.position))
};


export const submitNameChange = (name: string): AppThunk => dispatch => {
    dispatch(setName(name))
};

export const getUser = (state: RootState) => state.userState.activeUser;
export const getUserById = (state: RootState, id: number) => state.userState.otherUsers[id];
export const getUsers = (state: RootState) => Object.keys(state.userState.otherUsers).map(
    id => state.userState.otherUsers[Number(id)]
);

export default userSlice.reducer;
