import { API } from 'aws-amplify';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';


class AppSync {
    static getUserProfile(userId) {
        var prom = new Promise((resolve, reject) => {
            API.graphql({query: queries.listUserProfiles, variables: {filter: {userId: userId}}})
            .then(data => {
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        });
        return prom;
    }
    static async createUserProfile(name, userId) {
        return await API.graphql({ query: mutations.createUserProfile, variables: {input: {name: name, userId: userId}}})
    }
}

export default AppSync;