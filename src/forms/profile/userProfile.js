import React from 'react';
import './userProfile.css'
import FormBase from '../form';

class UserProfile extends FormBase {
    constructor() {
        super()
        this.hideDialog = this.hideDialog.bind(this);
    }

    getFormName() {
        return "User profile";
    }

    hideDialog() {
        this.props.hideDialog();
    }

    renderForm(contentElem) {
        return super.renderForm(
            <div className='userProfileContainer' onClick={this.hideDialog}>

            </div>
        );
    }
    
}

export default UserProfile;
