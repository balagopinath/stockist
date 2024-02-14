import React from "react";
import ControlBase from './controlBase';
import './fieldControl.css';

class FieldControl extends ControlBase {
    #fieldCaption = "";
    #onChangeHandler;
    #lableStyle = {}
    #inputStyle = {}

    constructor(props) {
        super();
        this.state = {
            fieldValue: props.value,
        }
        this.#fieldCaption = props.caption;
        this.#onChangeHandler = props.onChange;

        this.#lableStyle.width = props.lableSize;

        if(props.inputSize !== undefined && props.inputSize != null && props.inputSize.trim() !== '') {
            if(!isNaN(props.inputSize)) {
                this.#inputStyle.width = Number(props.inputSize) + "px";
            } else {
                this.#inputStyle.width = props.inputSize
            }
        } else {
            this.#inputStyle.width = "100%"
        }

        this.renderDialog = this.renderDialog.bind(this);
        this.onValueChange = this.onValueChange.bind(this);
    }

    onValueChange(event) {
        this.setState({fieldValue: event.target.value})
        this.#onChangeHandler(event);
    }

    renderDialog(contentElement) {
        return <div className="fieldContainer">
            <table style={{width: "100%"}}>
                <tr style={{height: "30px"}}>
                    <td style={this.#lableStyle}>
                        <span style={this.#lableStyle}>{this.#fieldCaption}</span>
                    </td>
                    <td>
                        <div style={this.#inputStyle}>
                            <input type="text" style={{width: "100%"}} value={this.state.fieldValue} onChange={this.onValueChange} ></input>
                        </div>
                    </td>
                </tr>
                <tr />
            </table>
            

        </div>
    }
    render() {
        return this.renderDialog(null)
    }
}

export default FieldControl;