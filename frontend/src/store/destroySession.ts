import {AppThunk} from "./store";
import {resetMediaSlice} from "./mediaSlice";
import {resetUsers} from "./userSlice";
import {resetPlayground} from "./playgroundSlice";
import {requestSpaces, returnHome} from "./spaceSlice";
import {resetWebsocket} from "./webSocketSlice";


export const destroySession = (returnToRoot?: boolean): AppThunk => dispatch => {

    dispatch(resetMediaSlice())
    dispatch(resetUsers())
    dispatch(resetPlayground())
    dispatch(resetWebsocket())

    dispatch(requestSpaces())

    if (returnToRoot)
        dispatch(returnHome())
}