import React  from "react";
import Page from "./page";
import './settings.css'
import AppSync from "../AppSync";
import Dialog from "../dialog";
import Exchange from "../forms/exchange/exchange";


class Setting extends React.Component {
    loadData() {
        
    }
    getColumnNames() {

    }
    constructor(props) {
        super()
        this.state = {
            data: null,
            selectedItem: null
        }
        this.addItem = this.addItem.bind(this);
        this.editItem = this.editItem.bind(this);
        this.deleteItem = this.deleteItem.bind(this);
    }

    componentDidMount() {
        this.loadData();
    }

    setData(data) {
        const updatedData = data.map(item => {
            return {
                ...item,
                isSelected: false, // Set isSelected to false for each item
            };
        });
    
        this.setState({ data: updatedData });

    }
    addItem() {

    }
    editItem() {

    }
    deleteItem() {

    }
    setSelected(selectedItem) {
        selectedItem.isSelected = true;
        this.setState({data: this.state.data, selectedItem: selectedItem})
    }
    renderSetting(settingElem) {
        const colNames = this.getColumnNames()
        return (
            <div className="settingContainer">
                <div className="settingHeader">
                    <h4>{this.props.Name}</h4>
                    {this.state.selectedItem && <button onClick={this.deleteItem}>-</button>}
                    {this.state.selectedItem != null && <button onClick={this.editItem}>Edit</button>}
                    {this.props.IsAdd && <button onClick={this.addItem}>+</button>}
                </div>
                <div className="settingGridContainer" >
                    <table className="settingGrid">
                        <thead>
                            <tr>
                                <th className="gridHeader" style={{width: '30px'}}>

                                </th>
                                {colNames.map((item, index) => (
                                <th
                                    key={index}
                                    className={
                                    item.size === "Auto"
                                        ? "gridColumnSizeAuto gridHeader"
                                        : item.size === "Flex"
                                        ? "gridColumnSizeFlex gridHeader"
                                        : "gridHeader"
                                    }
                                    style={
                                    item.size !== "Auto" && item.size !== "Flex"
                                        ? { width: item.size }
                                        : null
                                    }
                                >
                                    {item.name}
                                </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {this.state.data != null && this.state.data.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td>
                                        <input type="radio" name={this.props.Name} value={row.isSelected} onChange={() => this.setSelected(row)} />
                                    </td>
                                    {colNames.map((col, colIndex) => (
                                        <td
                                            key={colIndex}
                                            className={
                                                col.size === "Auto"
                                                    ? "gridColumnSizeAuto"
                                                    : col.size === "Flex"
                                                    ? "gridColumnSizeFlex"
                                                    : null
                                            }
                                            style={
                                                col.size !== "Auto" && col.size !== "Flex"
                                                    ? { width: col.size }
                                                    : null
                                            }
                                        >
                                            {row[col.name]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        )
    }

    render() {
        return this.renderSetting(null)
    }
}

class ExchangeSetting extends Setting {
    
    loadData() {
        AppSync.getExchanges().then(data => {
            super.setData(data);
        }).catch(err => {
            console.log(err);
        })
    }
    getColumnNames() {
        return [{name: "Id", size: "350px"}, {name: "name", size:"Flex"}, {name: "code", size:"100px"}]
    }
    addItem() {
        Dialog.showDialog(Exchange, null)
    }
    editItem() {
        Dialog.showDialog(Exchange, this.state.selectedItem)
    }
    deleteItem() {
        AppSync.deleteExchange(this.state.selectedItem);
    }

}

export default class Settings extends Page {

    constructor(props) {
        super();
    }
    renderPage(contentElem) {
        return super.renderPage(
            <div className="spContainer">
                <ExchangeSetting Name="Exchange" IsAdd={true} />
            </div>
        )
    }
}
