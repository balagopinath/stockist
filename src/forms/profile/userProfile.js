import React from 'react';
import './userProfile.css'
import FormBase from '../form';

class UserProfile extends FormBase {
    getFormName() {
        return "User profile";
    }

    renderDialog(contentElem) {
        return super.renderDialog(
            <div className='userProfileContainer' onClick={this.hide}>

            </div>
        );
    }
    
}

export default UserProfile;
