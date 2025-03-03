import React from "react";
import ControlBase from './controlBase';
import './fieldControl.css';

class FieldControl extends ControlBase {
    #fieldCaption = "";
    #onChangeHandler;
    #lableStyle = {}
    #inputStyle = {}
    #type = "Text"

    constructor(props) {
        super();
        this.state = {
            fieldValue: props.value,
            optionsPromise: props.options,
            options: null,
        }
        this.#fieldCaption = props.caption;
        this.#onChangeHandler = props.onChange;
        this.#type = props.type;
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

        if(this.#type == "Combo" && this.state.options == null) {
            props.options.then(res => {
                this.setState({
                    fieldValue: this.state.fieldValue,
                    optionsPromise: this.state.optionsPromise,
                    options: res.map(item => item.name),
                });
                if(res.length > 0) {
                    if(this.state.fieldValue != undefined) {
                        this.onValueChange({target: this.state.fieldValue});
                    } else {
                        this.onValueChange({target: {value: res[0].name}});
                    }
                }
            }).catch(err => {
                console.log(err);
            });
            this.state.options = [props.value]
        }
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
                            {(() => {
                                switch (this.#type) {
                                case "Combo":
                                    return (
                                        <select
                                            style={{ width: "100%" }}
                                            value={this.state.fieldValue}
                                            onChange={this.onValueChange}
                                        >
                                            {this.state.options.map((item, index) => (
                                                <option key={index} value={item}>
                                                {item}
                                                </option>
                                            ))}
                                        </select>
                                        );
                                    break;
                                default:
                                    return (
                                    <input
                                        type="text"
                                        style={{ width: "100%" }}
                                        value={this.state.fieldValue}
                                        onChange={this.onValueChange}
                                    />
                                    );
                                }
                            })()}
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