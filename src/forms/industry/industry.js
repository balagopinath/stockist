import AppSync from "../../AppSync";
import Dialog from "../../dialog";
import Form from "../form";
import FormField from "../formField";

const { v4: uuidv4 } = require('uuid');

class Industry extends Dialog {
    #industries = [];

    constructor(props) {
        super();

        this.state = {
            id: '',
            mode: '',
            name: '',
            industries: undefined,
            parentIndustryId: undefined,
        }
        if(props.dataContext !== undefined) {
            this.state.mode = "Edit";
            this.state.id =  props.dataContext.Id;
            this.state.name = props.dataContext.name;
            this.state.parentIndustryId = props.dataContext.parentIndustryId;
        }
        else
            this.state.mode = "Add";

        this.onAction = this.onAction.bind(this);
        this.setName = this.setName.bind(this);
        this.setIndustry = this.setIndustry.bind(this);

        this.state.industries = new Promise((resolve, reject) => {
                    AppSync.getIndustries()
                    .then(data => {
                        var  res = undefined;
                        if(props.dataContext != undefined)
                            res = data.filter(item => item.Id !== props.dataContext.Id)
                        else
                            res = data;
                        resolve(res)
                    }).catch(err => {
                        reject(err)
                    });
                }) 
    }

    async onAction(actionName) {
        if(actionName === "Save") {
            var data;
            if(this.state.mode === "Add") {
                data = {Id: uuidv4(), name: this.state.name, parentIndustryId: this.state.parentIndustryId}
                AppSync.addIndustry(data).then(res => {
                    super.hide();
                }).catch(err => {
                    super.hide();
                });
            } else {
                const res = await AppSync.getIndustry(this.state.id)
                data = res
                data.Id = this.state.id
                data.name = this.state.name
                data.parentIndustryId = this.state.parentIndustryId
                AppSync.editIndustry(data, data.Id).then(res => {
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
        this.state.parentIndustryId = event.target.value;
        this.setState(this.state)
    }    

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="IndustrySector" formActions={["Save", "Cancel"]} onAction={this.onAction} width='400' height='400' lableSize="100">
                <FormField name="Name" type="Text" value={this.state.name} onChange={this.setName} />
                <FormField name="Parent Industry Sector" type="Combo" value={this.state.parentIndustryId} options={this.state.industries} onChange={this.setIndustry} />
            </Form>
        );
    }
    
}

export default Industry;