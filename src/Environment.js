import { AWSCloudWatchProvider } from "aws-amplify";
import AppSync from "./AppSync";


class Environment {
    static authUser = null;
    static userProfile = null;

    static async setAuthenticatedUser(user) {
        this.authUser = user;
        if(user != null) {
            this.userProfile = await AppSync.getUserProfile(user.username);
            if(this.userProfile == null) {
                this.userProfile = await AppSync.createUserProfile("Guest", user.username);
            } 
        } else {
            this.userProfile = null;
        }
    }

    static getAuthenticatedUser() {
        return this.authUser;
    }
}

export default Environment;