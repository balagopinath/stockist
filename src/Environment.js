import AppSync from "./AppSync";


class Environment {
    static authUser = null;
    static userProfile = null;

    static async setAuthenticatedUser(user) {
        this.authUser = user;
        this.userProfile = await AppSync.getUserProfile(user.username);
        if(this.userProfile == null) {
            this.userProfile = await AppSync.createUserProfile("Guest", user.username);
        }
    }

    static getAuthenticatedUser() {
        return this.authUser;
    }
}

export default Environment;