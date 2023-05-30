import React from "react";
import './form.css';
import Dialog from "../dialog";

class FormBase extends Dialog {
    getFormName() {
        return "";
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

            </div>
        </div>)
    }
}

export default FormBase;