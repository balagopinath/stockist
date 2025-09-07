import AppSync from "../../AppSync";
import Dialog from "../../dialog";
import Form from "../form";
import FormField from "../formField";

const { v4: uuidv4 } = require('uuid');

class Script extends Dialog {
    #exchanges = [];
    #companyId = undefined;

    constructor(props) {
        super();

        this.state = {
            id: '',
            code: '',
            exchangeId: undefined,
            companyId: '',
            exchanges: undefined
        }
        if(props.dataContext !== undefined && props.dataContext.Id !== undefined) {
            this.state.mode = "Edit";
            this.state.id =  props.dataContext.Id;
            this.state.code = props.dataContext.code;
            this.state.exchangeId = props.dataContext.exchangeId;
            this.#companyId = props.dataContext.companyId;
        }
        else {
            this.state.mode = "Add";
            this.#companyId = props.dataContext.companyId;
        }
        this.onAction = this.onAction.bind(this);
        this.setCode = this.setCode.bind(this);
        this.setExchange = this.setExchange.bind(this);

        this.state.exchanges = AppSync.getExchanges();
        this.state.exchanges.then((res) => {
            this.#exchanges = res;
        });

    }

    async onAction(actionName) {
        if(actionName === "Save") {
            var data;
            if(this.state.mode === "Add") {
                data = {Id: uuidv4(), code: this.state.code, exchangeId: this.state.exchangeId, companyId: this.#companyId}
                AppSync.addScript(data).then(res => {
                    super.hide();
                }).catch(err => {
                    super.hide();
                });
            } else {
                const res = await AppSync.getScript(this.state.id)
                data = res
                data.Id = this.state.id
                data.code = this.state.code
                data.exchangeId = this.state.exchangeId

                AppSync.editScript(data, data.Id).then(res => {
                    super.hide();
                }).catch(err => {
                    super.hide();
                });
            }
        } else {
            super.hide();
        }
    }

    setCode(event) {
        this.state.code = event.target.value;
        this.setState(this.state)
    }

    setExchange(event) {
        this.state.exchangeId = event.target.value;
        this.setState(this.state)
    }

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="Stock" formActions={["Save", "Cancel"]} onAction={this.onAction} width='500' height='300' lableSize="100">
                <FormField name="Code" type="Text" value={this.state.code} onChange={this.setCode} />
                <FormField name="Exchange" type="Combo" value={this.state.exchangeId} options={this.state.exchanges} onChange={this.setExchange} />
            </Form>
        );
    }
    
}

export default Script;