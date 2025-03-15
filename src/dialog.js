import React, {createRef } from "react";
import './dialog.css';

export default class Dialog extends React.Component  {
    static dialogHOC = null; 
    static async showDialog(diagComp, dataContext) {
        var dialogIns = React.createElement(diagComp, {dataContext: dataContext});
        return this.dialogHOC.showDialog(dialogIns);
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

class DialogHost extends React.Component {
    dialogOps = {showDialog: this.showDialog, hideDialog: this.hideDialog }
    constructor() {
        super();
        this.state = {
            dialogs: [],
            resolvers: [],
            rejectors: []
        }
        Dialog.setDialogHost(this);
    }

    showDialog(dialog) {
        var promResolver = undefined;
        var promRejector = undefined;
        var prom = new Promise((resolve, reject) => {
            promResolver = resolve;
            promRejector = reject; 
        })
        this.setState(prevStatue => (
            {
                dialogs: [...prevStatue.dialogs, dialog],
                resolvers: [...prevStatue.resolvers, promResolver],
                rejectors: [...prevStatue.rejectors, promRejector]
            }
        ))
        return prom;
    }

    hideDialog() {
        var resolver =  this.state.resolvers[this.state.resolvers.length - 1];
        var rejector = this.state.rejectors[this.state.rejectors.length - 1];
        setTimeout(1000, resolver());
        this.setState(prevStatue => (
            {
                dialogs: prevStatue.dialogs.slice(0, prevStatue.dialogs.length - 1),
                resolvers: prevStatue.resolvers.slice(0, prevStatue.resolvers.length - 1),
                rejectors: prevStatue.rejectors.slice(0, prevStatue.rejectors.length - 1)
            }
        ))
    }
    render() {
        return (
                this.state.dialogs.map((dialog, index) => 
                <div key={index}  className='dialogContainer'>
                    {
                        dialog
                    }
                </div>
                )
            )
    }
}


export function withDialog(Comp) {
    return class extends React.Component {
        render() {
            return (
                    <div className="dialogHost">
                        <Comp {...this.props} />
                        <DialogHost />
                    </div>
                )
        }
    }    
}