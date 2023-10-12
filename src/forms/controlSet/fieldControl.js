import React from "react";
import ControlBase from './controlBase';

class FieldControl extends ControlBase {
    fieldCaption = "";
    fieldValueBinding;

    constructor(props) {
        super();
        this.fieldCaption = props.caption;
        this.fieldValueBinding = props.value;
    }

    renderDialog(contentElement) {
        return <div className="field">
            { contentElement }
        </div>
    }
    render() {
        return this.renderDialog(null)
    }
}

export default ControlBase;