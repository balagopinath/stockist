import AppSync from "../../AppSync";
import Dialog from "../../dialog";
import Form from "../form";
import FormField from "../formField";

const { v4: uuidv4 } = require('uuid');

class Exchange extends Dialog {
    
    constructor(props) {
        super();

        this.state = {
            id: '',
            mode: '',
            name: '',
            code: ''
        }
        if(props.dataContext !== undefined) {
            this.state.mode = "Edit";
            this.state.id =  props.dataContext.Id;
            this.state.name = props.dataContext.name;
            this.state.code = props.dataContext.code;
        }
        else
            this.state.mode = "Add";

        this.onAction = this.onAction.bind(this);
        this.setName = this.setName.bind(this);
        this.setCode = this.setCode.bind(this);
    }

    async onAction(actionName) {
        if(actionName === "Save") {
            var data;
            if(this.state.mode === "Add") {
                data = {Id: uuidv4(), name: this.state.name, code: this.state.code}
                AppSync.addExchange(data).then(res => {
                    super.hide();
                }).catch(err => {
                    super.hide();
                });
            } else {
                const res = await AppSync.getExchange(this.state.id)
                data = res
                data.Id = this.state.id
                data.name = this.state.name
                data.code = this.state.code

                AppSync.editExchange(data, data.Id).then(res => {
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
    setCode(event) {
        this.state.code = event.target.value;
        this.setState(this.state)
    }

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="Exchange" formActions={["Save", "Cancel"]} onAction={this.onAction} width='400' height='400' lableSize="100">
                <FormField name="Name" type="Text" value={this.state.name} onChange={this.setName} />
                <FormField name="code" type="Text" value={this.state.code} onChange={this.setCode} />
            </Form>
        );
    }
    
}

export default Exchange;