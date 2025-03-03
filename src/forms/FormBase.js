import React from "react";
import './FormBase.css';
import FieldControl from "./controlSet/fieldControl";

class FormBase extends React.Component {
    #submitActions = [];
    #fields = []
    #name = '';
    #formStyle = {}
    #columns = 1
    #lableSize = 100;

    constructor(props) {
        super();
        props.formActions.map((item, index) => {
            this.#submitActions.push(item);
            return index;
        })
        this.onSubmitAction = this.#onSubmitAction.bind(this);
        this.state = {
            context: props.dataContext,
        }
        if(Array.isArray(props.children)) {
            props.children.forEach(item => {
                this.#fields.push(item);
            });
        } else {
            this.#fields.push(props.children);
        }

        this.#name = props.name;
        if(props.columns !== undefined && props.columns != null && props.columns.trim() !== '' && Number.isInteger(props.columns)) {
            this.#columns = props.columns;
        }
        if(props.lableSize !== undefined && props.lableSize != null && props.lableSize.trim() !== '' && !Number.isNaN(props.lableSize)) {
            this.#lableSize = Number(props.lableSize);
        }

        if(props.width !== undefined && props.width != null && props.width.trim() !== '') {
            if(!isNaN(props.width)) {
                this.#formStyle.width = props.width + "px"
            } else {
                this.#formStyle.width = props.width
            }
        }
        if(props.height !== undefined && props.height != null && props.height.trim() !== '') {
            if(props.height) {
                this.#formStyle.height = props.height + "px"
            } else {
                this.#formStyle.height = props.height
            }
        }

    }

    #onAction(action) {
        if(this.props.onAction !== undefined) {
            this.props.onAction(action);
        }
    }

    #onSubmitAction(actionName) {
        if(this.#onProcessSubmitAction(actionName))
            this.#onAction(actionName);
    }

    #onProcessSubmitAction(actionName) {
        return true;
    }



    render() {
        return (<div className="formContainer" style={this.#formStyle}>
            <div className="formHeader">
                <p>{this.#name}</p>
            </div>
            <div className="formBody">
                {
                    this.#fields.map((item, index) => {
                        var retValue = null;

                        retValue = (<FieldControl key={index} caption={item.props.name} type={item.props.type} lableSize={this.#lableSize} inputSize={item.props.width} value={item.props.value} onChange={item.props.onChange} 
                            {...(item.props.type === "Combo" ? { options: item.props.options } : {})} > </FieldControl>)


                        return retValue;
                    })
                }
            </div>
            <div className="formFooter">
                {
                    this.#submitActions.map((item, index) => {
                        return (
                            <button key={index} className="submitAction" onClick={e => { this.#onSubmitAction(item) }}>{item}</button>
                        )
                    })
                }
            </div>
        </div>)
    }
}

export default FormBase;