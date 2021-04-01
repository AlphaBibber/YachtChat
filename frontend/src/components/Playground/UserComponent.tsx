import React, {Component} from "react";
import {PlaygroundOffset, User} from "../../store/models";
import {RootState} from "../../store/store";
import {connect} from "react-redux";
import {getCamera, getSpeaker, getStream} from "../../store/rtcSlice";
import {userProportion} from "../../store/userSlice";

interface Props {
    user: User
    selected: boolean
    isActiveUser: boolean
    playgroundOffset: PlaygroundOffset
    muted: boolean
    speaker: string
    camera: string
    mediaChangeOngoing: boolean
}

export class UserComponent extends Component<Props> {

    private myName: React.RefObject<HTMLMediaElement>;

    constructor(props: Props) {
        super(props);

        this.myName = React.createRef();
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
        let userOpacity = ((!!user.inProximity && !this.props.muted) || this.props.selected) ? 1 : 0.5
        let userScale = (!!user.inProximity && !this.props.muted) ? "scale(1)" : "scale(0.8)"
        if (this.props.selected) {
            userScale = "scale(1.2)"
        }

        let nameWidth = 0
        let nameHeight = 0
        let nameOpacity = 0.7

        if (this.myName.current) {
            nameWidth = this.myName.current.getBoundingClientRect().width
            nameHeight = this.myName.current.getBoundingClientRect().height
        }

        let userNamePosX = x - nameWidth / 2 - offsetX
        let userNamePosY = y + userSize / 2 - offsetY + 15

        if (userNamePosX < 0) {
            userNamePosX = 15 + nameWidth
            nameOpacity = 0
        }
        if (userNamePosX > window.innerWidth) {
            userNamePosX = window.innerWidth - (15 - nameWidth)
            nameOpacity = 0
        }

        if (userNamePosY < 0) {
            userNamePosY = 15 + nameWidth
            nameOpacity = 0
        }
        if (userNamePosY > window.innerHeight) {
            userNamePosY = window.innerHeight - (15 - nameHeight)
            nameOpacity = 0
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
            left: userNamePosX,
            top: userNamePosY,
            transform: (!!user.inProximity && !this.props.muted) ? "scale(1)" : "scale(0.8)",
            opacity: nameOpacity
        }

        return (
            <div className={(this.props.isActiveUser) ? "activeUser" : ""}>
                <div data-id={(this.props.isActiveUser) ? "activeUser" : ""} className="User" style={userStyle}>
                    {!!this.props.user.userStream &&
                    <video key={this.props.camera} autoPlay muted={this.props.isActiveUser} ref={ref => {
                        if (ref && !this.props.mediaChangeOngoing) {
                            ref.srcObject = getStream(this.props.user.id)
                            // @ts-ignore
                            if (ref.setSinkId) {
                                //@ts-ignore
                                ref.setSinkId(this.props.speaker)
                            }
                        }
                    }}/>
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
    muted: state.rtc.muted,
    speaker: getSpeaker(state),
    camera: getCamera(state),
    mediaChangeOngoing: state.rtc.mediaChangeOngoing
})

export default connect(mapStateToProps)(UserComponent)