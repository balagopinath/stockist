import React from "react";
import './form.css';
import Dialog from "../dialog";

class FormBase extends Dialog {
    #submitActions = [];

    constructor() {
        super();
        this.getSubmitActions().map((item, index) => {
            this.#submitActions.push(item);
            return index;
        })
        this.onSubmitAction = this.onSubmitAction.bind(this);
    }

    getFormName() {
        return "";
    }

    getSubmitActions() {

    }

    onSubmitAction(actionName) {
        if(this.onProcessSubmitAction(actionName))
            this.hide();
    }

    onProcessSubmitAction(actionName) {
        return true;
    }

    renderDialog(contentElem) {
        return (<div className="formContainer">
            <div className="formHeader">
                <p>{this.getFormName()}</p>
            </div>
            <div className="formBody">
                {contentElem}
            </div>
            <div className="formFooter">
                {
                    this.#submitActions.map((item, index) => {
                        return (
                            <button key={index} className="submitAction" onClick={e => { this.onSubmitAction(item) }}>{item}</button>
                        )
                    })
                }
            </div>
        </div>)
    }
}

export default FormBase;