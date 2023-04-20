import React from "react";
import './dialog.css';

export default class Dialog extends React.Component {
    show() {

    }
    hide() {

    }
    render() {
        return <div className="dialog">

        </div>
    }
}


export function withDialog(Comp) {
    return class extends React.Component {
        constructor() {
            super();
            this.state = {
                dialogs: []
            }
        }

        showDialog(dialog) {
            this.setState(prevStatue => (
                {
                    dialogs: [...prevStatue.dialogs, dialog]
                }
            ))
        }

        hideDialog() {
            this.setState(prevStatue => (
                {
                    dialogs: prevStatue.dialogs.slice(0, prevStatue.dialogs.length - 1)
                }
            ))
        }
        
        render() {
            return (
                    <div className="dialogHost">
                        <Comp {...this.props} />
                        {
                            this.state.dialogs.map((dialog, index) => 
                            <div key={index}  className='dialogContainer'>
                                {
                                    dialog
                                }
                            </div>
                            )
                        }
                    </div>
                )
        }
    }    
}