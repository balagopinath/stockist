import React from 'react';
import './toolbar.css';

class Toolbar extends React.Component {
    toolName = "";
    tools;
    constructor(props) {
        super()
        this.toolName = props.name;
        this.tools = props.children;
    } 
    render() {
      return (
        <div className='toolbar'> 
            <div className='leftControls'>
                {this.tools.filter(e => e.props.align === "Left")} 
            </div>
            <div className='rightControls'>
                {this.tools.filter(e => e.props.align === "Right")}
            </div>
        </div>
      )
    }
}

export default  Toolbar;