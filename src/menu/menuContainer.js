import React from "react";
import './menuContainer.css'

export class MenuContainer extends React.Component {

    constructor(props) {
        super();
    }
    render() {
        return (<div className="menuContainer">
            {this.props.children}
        </div>)
    }
}
