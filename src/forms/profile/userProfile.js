import React from 'react';
import './userProfile.css'
import Form from '../form';
import FormField from '../formField'
import Dialog from '../../dialog';

class UserProfile extends Dialog {

    onAction(actionName) {
        super.hide();
    }

    renderDialog(contentElem) {
        return super.renderDialog(
            <Form name="User Profile" formActions={["Save", "Cancel"]} onAction={this.onAction} width='400' height='400'>
                <FormField name="User Name" />
                <FormField name="Email Id" />
            </Form>
        );
    }
    
}

export default UserProfile;
