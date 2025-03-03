import AppSync from "../../AppSync";
import Dialog from "../../dialog";
import Form from "../form";
import FormField from "../formField";

const { v4: uuidv4 } = require('uuid');

class Company extends Dialog {
    #industries = [];
    constructor(props) {
        super();

        this.state = {
            id: '',
            mode: '',
            name: '',
            industry: undefined,
            industries: undefined,
        }
        if(props.dataContext !== undefined) {
            this.state.mode = "Edit";
            this.state.id =  props.dataContext.Id;
            this.state.name = props.dataContext.name;
            this.state.industry = props.dataContext.industry;
        }
        else
            this.state.mode = "Add";

        this.onAction = this.onAction.bind(this);
        this.setName = this.setName.bind(this);
        this.setIndustry = this.setIndustry.bind(this);

        this.state.industries = AppSync.getIndustrySectors();
        this.state.industries.then((res) => {
            this.#industries = res;
        });

    }

    async onAction(actionName) {
        if(actionName === "Save") {
            var data;
            if(this.state.mode === "Add") {
                data = {Id: uuidv4(), name: this.state.name, industry: this.state.industry}
                AppSync.addCompany(data).then(res => {
                    super.hide();
                }).catch(err => {
                    super.hide();
                });
            } else {
                const res = await AppSync.getCompany(this.state.id)
                data = res[0]
                data.Id = this.state.id
                data.name = this.state.name
                data.industry = this.state.industry

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
        this.state.industry = this.#industries.find(item => item.name === event.target.value);
        this.setState(this.state)
    }

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="Company" formActions={["Save", "Cancel"]} onAction={this.onAction} width='400' height='400' lableSize="100">
                <FormField name="Name" type="Text" value={this.state.name} onChange={this.setName} />
                <FormField name="Industry" type="Combo" value={this.state.industry} options={this.state.industries} onChange={this.setIndustry} />
            </Form>
        );
    }
    
}

export default Company;