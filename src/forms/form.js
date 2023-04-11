import React from "react";
import './form.css';

class FormBase extends React.Component {
    constructor() {
        super()
        this.renderForm = this.renderForm.bind(this);
    }

    getFormName() {
        return "";
    }

    renderForm(contentElem) {
        return (<div className="formContainer">
            <div className="formHeader">
                <p>{this.getFormName()}</p>
            </div>
            <div className="formBody">
                {contentElem}
            </div>
            <div className="formFooter">

            </div>
        </div>)
    }

    render() {
        return this.renderForm(null);
    }
}

export default FormBase;