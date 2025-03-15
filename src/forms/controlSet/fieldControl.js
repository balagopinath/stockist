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
        this.onOptionsReceived = this.onOptionsReceived.bind(this);

        this.state.options = [{ Id: props.value, name: '' }]
    }

    componentDidMount() {
        if(this.#type == "Combo") {
            this.props.options.then(res => {
                this.onOptionsReceived(res);
            }).catch(err => {
                console.log(err);
            });

        }
    }

    onOptionsReceived(res) {
        this.setState({
            optionsPromise: this.state.optionsPromise,
            options: res.map(item => (
                { Id: item.Id, name: item.name }
            )),
        });
        if(res.length > 0) {
            if(this.props.value != undefined) {
                this.#onChangeHandler({target: {value: this.props.value}});
            } else {
                this.#onChangeHandler({target: {value: res[0].Id}});
            }
        }
    }

    onValueChange(event) {
        this.state.fieldValue = event.target.value;
        this.setState(this.state);
        this.#onChangeHandler(event);
    }

    renderDialog(contentElement) {
        return <div className="fieldContainer">
            <table style={{width: "100%"}}>
                <tbody>
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
                                                onChange={this.onValueChange}
                                                value={this.state.fieldValue}
                                            >
                                                {this.state.options.map((item, index) => (
                                                    <option key={index} value={item.Id}>
                                                    {item.name}
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
                </tbody>
            </table>
            

        </div>
    }
    render() {
        return this.renderDialog(null)
    }
}

export default FieldControl;