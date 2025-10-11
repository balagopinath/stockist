import React, { createRef }  from "react";
import Page from "./page";
import './settings.css'
import AppSync from "../AppSync";
import Dialog from "../dialog";
import Exchange from "../forms/exchange/exchange";
import Company from "../forms/company/company";
import Industry from "../forms/industry/industry";
import CSVParser from "../utilities/CSVParser";
import FileStorage from "../utilities/fileStorage";


class Setting extends React.Component {
    #height = "300px";

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
        this.importItems = this.importItems.bind(this);
        this.onCSVFileSelected = this.onCSVFileSelected.bind(this);

        this.#height = props.height;
        this.csvFileInput = createRef();
    }

    componentDidMount() {
        this.loadData();
    }

    setData(data) {
        var selectedItem = null;
        const updatedData = data.map(item => {
            return {
                ...item,
                isSelected: false, // Set isSelected to false for each item
            };
        });
        
        if(this.state.selectedItem != null) {
           selectedItem = updatedData.find(item =>  item.Id === this.state.selectedItem.Id); 
            if(selectedItem)
                selectedItem.isSelected = true;
        }
        this.setState({ data: updatedData, selectedItem: selectedItem });

    }
    addItem() {

    }
    editItem() {

    }
    deleteItem() {

    }
    importItems() {
        this.csvFileInput.current.click();
    }
    onCSVFileSelected(event) {
        const file = event.target.files[0];
        event.target.value = null;
        CSVParser.parseCSV(file).then(async res =>  {
            await FileStorage.push(file);
        }).catch(err => {

        });
    }

    setSelected(selectedItem) {
        selectedItem.isSelected = true;
        this.setState({data: this.state.data, selectedItem: selectedItem})
    }
    renderSetting(settingElem) {
        const colNames = this.getColumnNames()
        return (
            <div style={{height: this.#height}} className="settingContainer" >
                <input type="file" ref={this.csvFileInput} style={{ display: "none" }} onChange={this.onCSVFileSelected} accept=".csv,text/csv" />
                <div className="settingHeader">
                    <h4>{this.props.Name}</h4>
                    {this.props.canImport && <button onClick={this.importItems}>Import</button>}
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
                                        <input type="radio" name={this.props.Name} checked={row.isSelected} onChange={() => this.setSelected(row)} />
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
       Dialog.showDialog(Exchange).then(() => {
            this.loadData();
       })
    }
    editItem() {
        Dialog.showDialog(Exchange, this.state.selectedItem).then(() => {
            this.loadData()
        })
    }
    deleteItem() {
        AppSync.deleteExchange(this.state.selectedItem);
    }

}

class IndustrySetting extends Setting {
    
    loadData() {
        AppSync.getIndustries().then(data => {
            super.setData(data.map(x => ({...x, parentIndustryName: (x.parentIndustry !== null ? x.parentIndustry.name : "") }) ));
        }).catch(err => {
            console.log(err);
        })
    }
    getColumnNames() {
        return [{name: "Id", size: "350px"}, {name: "name", size:"Flex"}, {name: "parentIndustryName", size:"Flex"}]
    }
    addItem() {
        Dialog.showDialog(Industry).then(() => {
            this.loadData();
       })
    }
    editItem() {
        Dialog.showDialog(Industry, this.state.selectedItem).then(() => {
            this.loadData();
       })
        
    }
    deleteItem() {
        AppSync.deleteIndustry(this.state.selectedItem);
    }

}

class CompanySetting extends Setting {
    
    loadData() {
        AppSync.getCompanies().then(data => {
            super.setData(data.map(x => ({...x, industryName: (x.industry !== undefined ? x.industry.name : "") }) ));
        }).catch(err => {
            console.log(err);
        })
    }
    getColumnNames() {
        return [{name: "Id", size: "350px"}, {name: "name", size:"Flex"}, {name: "industryName", size:"Flex"}]
    }
    addItem() {
        Dialog.showDialog(Company).then(() => {
            this.loadData();
       })
    }
    editItem() {
        Dialog.showDialog(Company, this.state.selectedItem).then(() => {
            this.loadData();
       })
    }
    deleteItem() {
        AppSync.deleteCompany(this.state.selectedItem);
    }

}

export default class Settings extends Page {

    constructor(props) {
        super();
    }
    renderPage(contentElem) {
        return super.renderPage(
            <div className="spContainer">
                <IndustrySetting Name="Industry Sectors" IsAdd={true} height="300px" />
                <ExchangeSetting Name="Exchanges" IsAdd={true} height="300px" />
                <CompanySetting Name="Companies" canImport={true} IsAdd={true} height="300px" />
            </div>
        )
    }
}
