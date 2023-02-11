import { API } from 'aws-amplify';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';


class AppSync {
    static async getUserProfile(userId) {
        return await API.graphql({query: queries.getUserProfile, variables: {filter: {userId: userId}}});
    }
    static async createUserProfile(name, userId) {
        return await API.graphql({ query: mutations.addUserProfile, variables: {input: {name: "Guest", userId: userId}}})
    }
}

export default AppSync;