import React from "react";
import './menuItem.css'

class MenuItem extends React.Component {
    constructor(props) {
        super()
    }

    render() {
        return (<div className="menuItem" onClick={this.props.onClick}>
            <span>{this.props.name}</span>
        </div>)
    }
}

export default MenuItem;