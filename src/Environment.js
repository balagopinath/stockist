import { AWSCloudWatchProvider } from "aws-amplify";
import AppSync from "./AppSync";
import Log from "./Log"
import React from "react";

class Environment {
    static authUser = null;
    static userProfile = null;
    static dialogHost = null;

    static async setAuthenticatedUser(user) {
        this.authUser = user;
        if(user != null) {
            try {
                this.userProfile = await AppSync.getUserProfile(user.username);
                if(this.userProfile == null) {
                    this.userProfile = await AppSync.createUserProfile("Guest", user.username);
                }
            } catch(ex) {
                Log.Write(ex.message);
            } 
        } else {
            this.userProfile = null;
        }
    }

    static getAuthenticatedUser() {
        return this.authUser;
    }

    static showDialog(dialog) {
        this.dialogHost.showDialog(React.createElement(dialog, {hideDialog: this.dialogHost.hideDialog }));
    }
}

export default Environment;