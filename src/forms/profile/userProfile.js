import './userProfile.css'
import Form from '../form';
import FormField from '../formField'
import Dialog from '../../dialog';
import Environment from '../../Environment';
import AppSync from '../../AppSync';

class UserProfile extends Dialog {
    
    constructor() {
        super();

        this.state = {
            userName: ''
        }
        this.state.userName = Environment.getUserProfile().userName;

        this.onAction = this.onAction.bind(this);
        this.setUserName = this.setUserName.bind(this);
    }

    onAction(actionName) {
        if(actionName == "Save") {
            var up = Environment.getUserProfile();
            up.userName = this.state.userName;
            AppSync.updateUserProfile(up).then(res => {
                super.hide();
            }).catch(err => {
                super.hide();
            });
        } else {
            super.hide();
        }
    }

    setUserName(event) {
        this.setState({userName: event.target.value})
    }

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="User Profile" formActions={["Save", "Cancel"]} onAction={this.onAction} width='400' height='400' lableSize="100">
                <FormField name="User Name" type="Text" value={this.state.userName} onChange={this.setUserName} />
            </Form>
        );
    }
    
}

export default UserProfile;
