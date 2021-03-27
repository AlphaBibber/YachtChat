import React, {Component} from "react";
import {PlaygroundOffset, User} from "../../store/models";
import {RootState} from "../../store/store";
import {connect} from "react-redux";
import {getStream} from "../../store/rtcSlice";
import {userProportion} from "../../store/userSlice";

interface Props {
    user: User
    selected: boolean
    isActiveUser: boolean
    playgroundOffset: PlaygroundOffset
    muted: boolean
}

export class UserComponent extends Component<Props> {

    private myRef: React.RefObject<HTMLVideoElement>;
    private myName: React.RefObject<HTMLSpanElement>;

    constructor(props: Props) {
        super(props);

        this.myRef = React.createRef();
        this.myName = React.createRef();
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {
        if (this.props.user.userStream && this.myRef.current && !this.myRef.current.srcObject) {
            this.myRef.current.srcObject = getStream(this.props.user.id)
        }
    }

    render() {
        const scale = this.props.playgroundOffset.scale
        if (this.props.user.name === null)
            return (<div/>);
        const user = this.props.user
        const userSize = userProportion * scale
        const x = user.position.x * scale
        const y = user.position.y * scale
        const offsetX = this.props.playgroundOffset.x * scale
        const offsetY = this.props.playgroundOffset.y * scale
        const userOpacity = ((!!user.inProximity && !this.props.muted) || this.props.selected) ? 1 : 0.5
        let userScale = (!!user.inProximity && !this.props.muted) ? "scale(1)" : "scale(0.8)"
        if (this.props.selected) {
            userScale = "scale(1.2)"
        }

        let nameWidth = 0
        if (this.myName.current) {
            nameWidth = this.myName.current.getBoundingClientRect().width
        }

        const userStyle = {
            width: userSize,
            height: userSize,
            left: x - userSize / 2 - offsetX,
            top: y - userSize / 2 - offsetY,
            opacity: userOpacity,
            transform: userScale,
            boxShadow: (this.props.selected) ? "0 0 20px rgba(0,0,0,0.5)" : "none",
        }

        const userNameStyle = {
            left: x - offsetX - nameWidth / 2,
            top: y + userSize / 2 - offsetY + 15,
            transform: (!!user.inProximity && !this.props.muted) ? "scale(1)" : "scale(0.8)"
        }

        return (
            <div className={(this.props.isActiveUser) ? "activeUser" : ""}>
                <div id={(this.props.isActiveUser) ? "activeUser" : ""} className="User" style={userStyle}>
                    {!!this.props.user.userStream &&
                    <video autoPlay muted={this.props.isActiveUser} ref={this.myRef}/>
                    }
                </div>
                <span ref={this.myName} className={"userName"}
                      style={userNameStyle}>{(this.props.isActiveUser) ? "You" : user.name}</span>
            </div>
        )
    }
}

const mapStateToProps = (state: RootState) => ({
    playgroundOffset: state.playground.offset,
    muted: state.rtc.muted
})

export default connect(mapStateToProps)(UserComponent)