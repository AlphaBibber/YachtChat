import React, {Component} from 'react';
import './App.scss';
import Playground from "./components/Playground";
import {RootState} from "./store/store";
import {connect} from "react-redux";
import StatusComponent from "./components/Status";
import "webrtc-adapter";
import Spaces from './components/Spaces';
import {BrowserRouter as Router, Redirect, Route, Switch} from 'react-router-dom';
import {checkAuth} from "./store/authSlice";
import PrivateRoute from "./components/PrivateRoute";
import Settings from './components/Settings';
import {Loading} from "./components/Wrapper";
import {IoCogOutline} from "react-icons/all";

interface Props {
    loggedIn: boolean
    authFlowReady: boolean
    joinedRoom: boolean
    connected: boolean
    checkAuth: (token?: string) => void
}

interface State {
}

export class App extends Component<Props, State> {

    componentDidMount() {
        const search = window.location.search;
        const id_token = new URLSearchParams(search).get('id_token');
        this.props.checkAuth((id_token) ? id_token : undefined)
    }

    render() {
        return (
            <Router>
                <div className={"App"}>
                    {/*{!this.props.joinedRoom && !this.props.loggedIn &&*/}
                    {/*<Login/>*/}
                    {/*}*/}
                    <Switch>
                        <PrivateRoute path='/spaces/:spaceID' exact={false} component={Playground}/>
                        <PrivateRoute exact path='/spaces' component={Spaces}/>
                        <PrivateRoute exact path='/settings' component={Settings}/>
                        <Route path='/'>
                            {(this.props.authFlowReady) ?
                                ((this.props.loggedIn) ?
                                    <Redirect to={"/spaces"}/> :
                                    <Loading loadingText="Loading" icon={<IoCogOutline/>}/>)
                                : <div/>}
                        </Route>
                        <Route path="*">
                            <Redirect to={"/"}/>
                        </Route>
                    </Switch>
                    <StatusComponent/>
                </div>
            </Router>
        );
    }

}

const mapStateToProps = (state: RootState) => ({
    loggedIn: state.auth.loggedIn,
    joinedRoom: state.webSocket.joinedRoom,
    connected: state.webSocket.connected,
    authFlowReady: state.auth.authFlow
})

const mapDispatchToProps = (dispatch: any) => ({
    checkAuth: (token?: string) => dispatch(checkAuth(token))
})

export default connect(mapStateToProps, mapDispatchToProps)(App);
