import AppSync from "./AppSync";
import Log from "./Log"

class Environment {
    static #authUser = null;
    static #userProfile = null;

    static async setAuthenticatedUser(user) {
        this.authUser = user;
        if(user != null) {
            try {
                Environment.#userProfile = await AppSync.getUserProfile(user.username);
                if(Environment.#userProfile == null) {
                    Environment.#userProfile = await AppSync.createUserProfile("Guest", user.username);
                }
            } catch(ex) {
                if(ex.errors !== undefined)
                    Log.Write(ex.errors[0].message);
                else
                    Log.Write(ex.message);
            } 
        } else {
            Environment.#userProfile = null;
        }
    }

    static getAuthenticatedUser() {
        return Environment.#authUser;
    }
    static getUserProfile() {
        return Environment.#userProfile;
    }
}

export default Environment;