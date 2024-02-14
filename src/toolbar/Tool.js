import React from 'react';
import PropTypes from 'prop-types';
import './tool.css';

/**
 * @param {name: string, align: string}
 */

export class Tool extends React.Component {
    constructor(props) {
        super()
        this.isAlignRight = props.align === "Right" ? true : false;
        this.handleClick = this.handleClick.bind(this);
        debugger;
        if(props !== undefined && props.children !== undefined) {
            React.Children.map(props.children, item => {
                if(item.type.name === 'MenuContainer') {
                    this.menuContainer = item;
                }
            });

        }
    }
    componentDidMount() {
        
    }
    
    componentWillUnmount() {
        
    }
    handleClick() {
        if(this.props.onClick !== undefined) {
            this.props.onClick();
        }
    }
    render() {
        return (
            <div className={'toolContainer' + (this.isAlignRight ? ' dropMenuRightAligned' : ' dropMenuLeftAligned')}>
                <div className='tool' onClick={this.handleClick}>
                    {
                        this.props.icon !== undefined ?
                            <img src={this.props.icon} alt={this.props.name} />
                        :
                            this.props.name
                    }
                </div>
                {
                    this.menuContainer !== undefined ?
                        <div id={this.props.name} className='dropDownMenuContainer'>
                            {this.menuContainer}
                        </div>
                    : null
                }
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

