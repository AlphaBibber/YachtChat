import React, {Component} from "react";
import './style.scss';
import {connect} from "react-redux";
import {RootState} from "../../store/store";
import {setName} from "../../store/userSlice";
import googleButton from "../../rsc/google_button.svg";
import appleLogo from "../../rsc/apple.svg";
import github from "../../rsc/github.svg";
import {loginService} from "../../store/config";
import Wrapper from "../Wrapper";
import {setLogin} from "../../store/authSlice";

interface Props {
    setName: (name: string) => void
    login: () => void
}

interface State {
    value: string
}

export class Login extends Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            value: ""
        }
    }

    handleChange(event: any) {
        this.setState({value: event.target.value});
    }

    handleSubmit(event: any) {
        event.preventDefault();
        this.props.setName(this.state.value)
        this.props.login()
    }

    handleKeySubmit(event: React.KeyboardEvent) {
        if (event.key === "13") {
            this.props.setName(this.state.value)
            this.props.login()
        }
    }

    render() {
        return (
            <Wrapper className="login-box">
                <div className={"signin"}>
                    <h2>AlphaBibber Chat</h2>
                    <h3>Sign in</h3>
                    <div className="login-buttons">

                        <div style={{background: "black"}} className={"logoImage"}>
                            <a href={loginService.concat("/oauth_login/?method=apple")}>
                                <img alt={"Sign in with Apple"} src={appleLogo}/>
                            </a>
                        </div>

                        <div style={{background: "white"}} className={"logoImage"}>
                            <a href={loginService.concat("/oauth_login/?method=google")}>
                                <img alt={"Sign in with Google"} src={googleButton}/>
                            </a>
                        </div>

                        <div id={"github"} className={"logoImage"}>
                            <a href={loginService.concat("/oauth_login/?method=github")}>
                                <img alt={"Sign in with Github"} src={github}/>
                            </a>
                        </div>
                    </div>
                </div>

                <form>
                    <div className="user-box">
                        <h3>Or join public space</h3>
                        <div className="inputPair">
                            <label>Username</label>
                            <input type="text" value={this.state.value}
                                   onKeyDown={this.handleKeySubmit.bind(this)}
                                   onChange={this.handleChange.bind(this)} autoFocus/>
                        </div>
                        <div className="inputPair">
                            <label>Password</label>
                            <input type="password" value={this.state.value}
                                   onKeyDown={this.handleKeySubmit.bind(this)}
                                   onChange={this.handleChange.bind(this)} autoFocus/>
                        </div>

                        <button onClick={this.handleSubmit.bind(this)}>
                            Join
                        </button>
                    </div>
                </form>
            </Wrapper>
        )
    }

}

const mapStateToProps = (state: RootState) => ({
})

const mapDispatchToProps = (dispatch: any) => ({
    setName: (name: string) => dispatch(setName(name)),
    login: () => dispatch(setLogin(true)),
})

export default connect(mapStateToProps, mapDispatchToProps)(Login)