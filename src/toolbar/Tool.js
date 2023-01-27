import React from 'react';
import PropTypes from 'prop-types';
import './tool.css';

/**
 * @param {name: string, align: string}
 */
class Tool extends React.Component {
    constructor() {
        super();
    }
    handleClick() {

    }
    render() {
        if(this.props && this.props.onClick) {
            this.clickHandle = this.props.onClick;
        } else {
            this.clickHandle = this.handleClick;
        } 

        return (
            <div className='tool' onClick={this.clickHandle}>
                {this.props.name}
            </div>
        )
    }
}

Tool.propTypes = {
    align: PropTypes.oneOf(['Left', 'Right'])
} 
Tool.defaultProps = {
    align: 'Left'
}

export default Tool;