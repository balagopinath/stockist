import AppSync from "../../AppSync";
import Dialog from "../../dialog";
import Form from "../form";
import FormField, { GridColumnField } from "../formField";
import Stock from "../Script/script";

const { v4: uuidv4 } = require('uuid');

class Company extends Dialog {
    #industries = [];
    #scripts = [];

    #setScripts(scripts) {
        this.#scripts = scripts;
    }

    #reloadScripts() {
        this.setState({scripts: this.#loadScripts()});
    }

    #loadScripts() {
        return new Promise((resolve, reject) => {
            AppSync.getScriptsByCompany(this.state.id).then(res => {
                this.#setScripts(res);
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
            scripts: undefined,
        }
        if(props.dataContext !== undefined) {
            this.state.mode = "Edit";
            this.state.id =  props.dataContext.Id;
            this.state.name = props.dataContext.name;
            this.state.industry = props.dataContext.industryId;
            this.state.scripts = this.#loadScripts();
        }
        else {
            this.state.mode = "Add";
            this.state.scripts = this.#loadScripts();
        }
        this.onAction = this.onAction.bind(this);
        this.setName = this.setName.bind(this);
        this.setIndustry = this.setIndustry.bind(this);
        this.onScriptAddClicked = this.onScriptAddClicked.bind(this);
        this.onScriptEditClicked = this.onScriptEditClicked.bind(this);
        this.onScriptDeleteClicked = this.onScriptDeleteClicked.bind(this);

        this.state.industries = AppSync.getIndustries();
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


    onScriptAddClicked() {
        if(this.state.id !== undefined)
            Dialog.showDialog(Stock, {companyId: this.state.id}).then(res => {
            this.#reloadScripts();
        })
    }
    onScriptEditClicked(Id) {
        var stock = this.#scripts.find(item => item.Id === Id);
        if(stock !== undefined) {
            Dialog.showDialog(Stock, stock).then(res => {
                this.#reloadScripts();
            })
        }

    }
    onScriptDeleteClicked(Id) {
        AppSync.deleteScript({Id: Id}).then(res => {
            this.#reloadScripts();
        })
    }

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="Company" formActions={["Save", "Cancel"]} onAction={this.onAction} width='400' height='400' lableSize="100">
                <FormField name="Name" type="Text" value={this.state.name} onChange={this.setName} />
                <FormField name="Industry" type="Combo" value={this.state.industry} options={this.state.industries} onChange={this.setIndustry} />
                <FormField name="Indexes" type="Grid" onAddClicked={this.onScriptAddClicked} onEditClicked={this.onScriptEditClicked} onDeleteClicked={this.onScriptDeleteClicked} value={this.state.scripts}>
                    <GridColumnField header="Exchange" size="Flex" value="exchangeName" />
                    <GridColumnField header="Script" size="75px" value="code" />
                </FormField>
            </Form>
        );
    }
    
}

export default Company;