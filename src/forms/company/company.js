import AppSync from "../../AppSync";
import Dialog from "../../dialog";
import Form from "../form";
import FormField, { GridColumnField } from "../formField";
import Stock from "../Stock/stock";

const { v4: uuidv4 } = require('uuid');

class Company extends Dialog {
    #industries = [];
    #stocks = [];

    #setStocks(stocks) {
        this.#stocks = stocks;
    }

    #reloadStocks() {
        this.setState({stocks: this.#loadStocks()});
    }

    #loadStocks() {
        return new Promise((resolve, reject) => {
            AppSync.getStocksByCompany(this.state.id).then(res => {
                this.#setStocks(res);
                resolve(res.map(x => ({...x, exchangeName: x.exchange.name })));
            })
        });
    }

    constructor(props) {
        super();

        this.state = {
            id: '',
            mode: '',
            name: '',
            industry: undefined,
            industries: undefined,
            stocks: undefined,
        }
        if(props.dataContext !== undefined) {
            this.state.mode = "Edit";
            this.state.id =  props.dataContext.Id;
            this.state.name = props.dataContext.name;
            this.state.industry = props.dataContext.industryId;
            this.state.stocks = this.#loadStocks();
        }
        else
            this.state.mode = "Add";

        this.onAction = this.onAction.bind(this);
        this.setName = this.setName.bind(this);
        this.setIndustry = this.setIndustry.bind(this);
        this.onStockAddClicked = this.onStockAddClicked.bind(this);
        this.onStockEditClicked = this.onStockEditClicked.bind(this);
        this.onStockDeleteClicked = this.onStockDeleteClicked.bind(this);

        this.state.industries = AppSync.getIndustrySectors();
        this.state.industries.then((res) => {
            this.#industries = res;
        });
    }

    async onAction(actionName) {
        if(actionName === "Save") {
            var data;
            if(this.state.mode === "Add") {
                data = {Id: uuidv4(), name: this.state.name, industryId: this.state.industry}
                AppSync.addCompany(data).then(res => {
                    super.hide();
                }).catch(err => {
                    super.hide();
                });
            } else {
                const res = await AppSync.getCompany(this.state.id)
                data = res
                data.Id = this.state.id
                data.name = this.state.name
                data.industryId = this.state.industry

                AppSync.editCompany(data, data.Id).then(res => {
                    super.hide();
                }).catch(err => {
                    super.hide();
                });
            }
            

        } else {
            super.hide();
        }
    }

    setName(event) {
        this.state.name = event.target.value;
        this.setState(this.state)
    }

    setIndustry(event) {
        this.state.industry = event.target.value;
        this.setState(this.state)
    }


    onStockAddClicked() {
        if(this.state.id !== undefined)
            Dialog.showDialog(Stock, {companyId: this.state.id}).then(res => {
            this.#reloadStocks();
        })
    }
    onStockEditClicked(Id) {
        var stock = this.#stocks.find(item => item.Id === Id);
        if(stock !== undefined) {
            Dialog.showDialog(Stock, stock).then(res => {
                this.#reloadStocks();
            })
        }

    }
    onStockDeleteClicked(Id) {
        AppSync.deleteStock({Id: Id}).then(res => {
            this.#reloadStocks();
        })
    }

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="Company" formActions={["Save", "Cancel"]} onAction={this.onAction} width='400' height='400' lableSize="100">
                <FormField name="Name" type="Text" value={this.state.name} onChange={this.setName} />
                <FormField name="Industry" type="Combo" value={this.state.industry} options={this.state.industries} onChange={this.setIndustry} />
                <FormField name="Indexes" type="Grid" onAddClicked={this.onStockAddClicked} onEditClicked={this.onStockEditClicked} onDeleteClicked={this.onStockDeleteClicked} value={this.state.stocks}>
                    <GridColumnField header="Exchange" size="Flex" value="exchangeName" />
                    <GridColumnField header="Script" size="75px" value="code" />
                </FormField>
            </Form>
        );
    }
    
}

export default Company;