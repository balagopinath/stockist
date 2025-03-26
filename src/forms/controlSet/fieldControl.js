import React from "react";
import ControlBase from './controlBase';
import './fieldControl.css';
import editIcon from "../../Images/editIcon.jpg";
import deleteIcon from "../../Images/deleteIcon.png";

class FieldControl extends ControlBase {
    #fieldCaption = "";
    #onChangeHandler;
    #onAddHandler;
    #onEditHandler;
    #onDeleteHandler;
    #lableStyle = {}
    #inputStyle = {}
    #type = "Text"
    #columns = []
    #isCompMounted = false

    

    constructor(props) {
        super();
        this.state = {
            fieldValue: props.value,
            optionsPromise: props.options,
            options: null,
        }
        this.#fieldCaption = props.caption;
        this.#onChangeHandler = props.onChange;
        this.#onAddHandler = props.onAddClicked;
        this.#onEditHandler = props.onEditClicked;
        this.#onDeleteHandler = props.onDeleteClicked;
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
        this.onAdd = this.onAdd.bind(this);
        this.onEdit = this.onEdit.bind(this);
        this.onDelete = this.onDelete.bind(this);

        this.state.options = [{ Id: props.value, name: '' }]

        if(this.#type === "Grid") {
            this.#columns = props.columns;
            this.state.dataRows = [];
            this.state.fieldValue.then(res => {
                this.state.dataRows = res;
                if(this.#isCompMounted)
                    this.setState(this.state)
            })
        }
    }

    componentDidUpdate(prevProps) {
        if(this.#type === "Grid") {
            var changedProps = [];

            Object.keys(this.props).forEach((propName) => {
                if (prevProps[propName] !== this.props[propName]) {
                    changedProps.push(propName);
                }
            });


            if(prevProps.value !== this.props.value) {
                this.state.fieldValue = this.props.value;
                this.setState(this.state);
                this.state.fieldValue.then(res => {
                    this.state.dataRows = res;
                    if(this.#isCompMounted)
                        this.setState(this.state)
                })
            }
        }
    }

    componentDidMount() {
        if(this.#type === "Combo") {
            this.props.options.then(res => {
                this.onOptionsReceived(res);
            }).catch(err => {
                console.log(err);
            });

        }
        this.#isCompMounted = true;
    }

    onOptionsReceived(res) {
        this.setState({
            optionsPromise: this.state.optionsPromise,
            options: res.map(item => (
                { Id: item.Id, name: item.name }
            )),
        });
        if(res.length > 0) {
            if(this.props.value !== undefined) {
                this.#onChangeHandler({target: {value: this.props.value}});
            } else {
                this.#onChangeHandler({target: {value: res[0].Id}});
            }
        }
    }

    onAdd() {
        this.#onAddHandler();
    }

    onEdit(Id) {
        this.props.onEditClicked(Id);
    }

    onDelete(Id) {
        this.#onDeleteHandler(Id);
    }

    onValueChange(event) {
        this.state.fieldValue = event.target.value;
        this.setState(this.state);
        this.#onChangeHandler(event);
    }

    renderDialog(contentElement) {
        switch(this.#type) {
            case "Grid":
                return (
                    <div className="fieldContainer flex">
                        <div className="dataGridField">
                            <div className="dataGridHeader">
                                <span className="dataGridCaption">{this.props.caption}</span>
                                <button className="gridOps" onClick={this.onAdd}>+</button>
                            </div>
                            <table cellSpacing="0" cellPadding="0px" style={{width: "100%", height: "calc(100% - 25px)"}}>
                                <tbody style={{height:"100%", display: "flex", flexDirection: "column"}}>
                                    <tr style={{flex: "1", display: "flex"}}>
                                        <td style={{flex: "1"}}>
                                            <table style={{width: "100%", border: "0px"}} >
                                                <thead>
                                                    <tr>
                                                    <th></th>
                                                    {
                                                        this.#columns.map((col, index) => (
                                                            <th key={index}
                                                            className={
                                                                col.props.size === "Auto"
                                                                    ? "dataGridColumAuto dataGridColHeader"
                                                                    : col.props.size === "Flex"
                                                                    ? "dataGridColumFlex dataGridColHeader"
                                                                    : "dataGridColHeader"
                                                                }
                                                                style={
                                                                    col.props.size !== "Auto" && col.props.size !== "Flex"
                                                                        ? { width:  col.props.size }
                                                                        : null
                                                                    }
                                                            >{col.props.header}  </th>  
                                                    ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {
                                                        this.state.dataRows.map((row, rowIdx) => (
                                                            <tr key={rowIdx} className="dataGridRow">
                                                                <td>
                                                                    <button className="action-btn" onClick={() => this.onEdit(row.Id)}>
                                                                        <img src={editIcon} alt="e" width="8" height="8"></img>
                                                                    </button>
                                                                    <button className="action-btn" onClick={() => this.onDelete(row.Id)}>
                                                                        <img src={deleteIcon} alt="Delete" width="8" height="8"></img>
                                                                    </button>
                                                                </td>
                                                                {
                                                                    this.#columns.map((col, colIdx) => (
                                                                        <td key={colIdx}>
                                                                            {row[col.props.value]}
                                                                        </td>
                                                                    ))
                                                                }
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr style={{height: "30px"}}/>
                                </tbody>
                            </table>
                        </div>
                    </div>    
                )
            default:
                return (
                    <div className="fieldContainer">
                        <div className="scalarField">
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
                    </div>
                )
        }
    }
    render() {
        return this.renderDialog(null)
    }
}

export default FieldControl;