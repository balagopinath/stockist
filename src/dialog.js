import React from "react";
import './dialog.css';

export default class Dialog extends React.Component {
    static dialogHOC = null; 
    static async showDialog(diagComp) {
        var dialogIns = React.createElement(diagComp, {});
        this.dialogHOC.showDialog(dialogIns);
    }

    static setDialogHost(dialogHost) {
        this.dialogHOC = dialogHost;
    }

    hide() {
        Dialog.dialogHOC.hideDialog();
    }

    renderDialog(contentElement) {
        return <div className="dialog">
            {contentElement}
        </div>
    }

    render() {
        return this.renderDialog(null);
    }
}


export function withDialog(Comp) {
    return class extends React.Component {
        dialogOps = {showDialog: this.showDialog, hideDialog: this.hideDialog }
        constructor() {
            super();
            this.state = {
                dialogs: []
            }
            Dialog.setDialogHost(this);
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