import React, {Component} from "react";
import Wrapper from "../Wrapper";
import {Link} from "react-router-dom";
import {FaChevronLeft} from "react-icons/fa";
import {connect} from "react-redux";
import {createSpace} from "../../store/spaceSlice";
import {handleError} from "../../store/statusSlice";
import {Steps} from "./Steps";
import {LARGE_SPACE_LIMIT} from "../../store/utils/config";

interface Props {
    createSpace: (name: string, isLargeSpace: boolean) => void
    error: (s: string) => void
}

interface State {
    spaceName: string
    largeSpace: boolean
    tooLong: boolean
}

export class CreateSpace extends Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            spaceName: "",
            tooLong: false,
            largeSpace: false
        }
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
        if (this.state.spaceName.length > 40 && !this.state.tooLong) {
            this.props.error("The name is too long")
            this.setState({tooLong: true})
        } else if (this.state.spaceName.length <= 40 && this.state.tooLong) {
            this.setState({tooLong: false})
        }
    }

    render() {
        return (
            <Wrapper className={"create spaces"}>
                <div className={"headlineBox"}>
                    <Link to={"/spaces"}>
                        <button className={"outlined"}><FaChevronLeft/> back to spaces</button>
                    </Link>
                    <h1>
                        Create a space
                    </h1>
                    A space is a private location where you can meet with every member of a space.
                </div>
                <form className={"spacesWrapper"} onSubmit={e => {
                        e.preventDefault()
                        if (this.state.spaceName.trim() === "") {
                            this.props.error("The name is not valid")
                            return
                        }

                        if (this.state.spaceName.length > 40) {
                            this.props.error("The name is too long")
                            return
                        }

                        this.props.createSpace(this.state.spaceName.trim(), this.state.largeSpace)
                }}>
                    <Steps active={0} />
                    <input value={this.state.spaceName}
                           placeholder={"space name"}
                           onChange={({target: {value}}) => this.setState({spaceName: value})} type={"text"}/>
                    <label>
                        <input

                            onChange={({target: {checked}}) => this.setState({largeSpace: checked})}
                            type={"checkbox"}
                            value={"largeSpace"}
                        />
                        Large Space ({LARGE_SPACE_LIMIT} people)
                    </label>

                    <input type={"submit"} value={"Create Space"} />
                </form>
            </Wrapper>
        );
    }
}

const mapStateToProps = () => ({})

const mapDispatchToProps = (dispatch: any) => ({
    createSpace: (name: string, isLargeSpace: boolean) => dispatch(createSpace(name, isLargeSpace)),
    error: (s: string) => dispatch(handleError(s))
})

export default connect(mapStateToProps, mapDispatchToProps)(CreateSpace)