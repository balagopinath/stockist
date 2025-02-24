import AppSync from "../../AppSync";
import Dialog from "../../dialog";
import Form from "../form";
import FormField from "../formField";

const { v4: uuidv4 } = require('uuid');

class IndustrySector extends Dialog {
    
    constructor(props) {
        super();

        this.state = {
            id: '',
            mode: '',
            name: '',
        }
        if(props.dataContext !== undefined) {
            this.state.mode = "Edit";
            this.state.id =  props.dataContext.Id;
            this.state.name = props.dataContext.name;
        }
        else
            this.state.mode = "Add";

        this.onAction = this.onAction.bind(this);
        this.setName = this.setName.bind(this);
    }

    async onAction(actionName) {
        if(actionName === "Save") {
            var data;
            if(this.state.mode === "Add") {
                data = {Id: uuidv4(), name: this.state.name}
                AppSync.addIndustrySector(data).then(res => {
                    super.hide();
                }).catch(err => {
                    super.hide();
                });
            } else {
                const res = await AppSync.getIndustrySector(this.state.id)
                data = res[0]
                data.Id = this.state.id
                data.name = this.state.name

                AppSync.editIndustrySector(data, data.Id).then(res => {
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

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="Exchange" formActions={["Save", "Cancel"]} onAction={this.onAction} width='400' height='400' lableSize="100">
                <FormField name="Name" type="Text" value={this.state.name} onChange={this.setName} />
            </Form>
        );
    }
    
}

export default IndustrySector;