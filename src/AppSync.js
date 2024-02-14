import { API, graphqlOperation } from 'aws-amplify';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';

const { v4: uuidv4 } = require('uuid');

class AppSync {
    static #getUPQueries = {}
    static #createUPCommands = {}
    static #deleteUPCommands = {}
    static #updateUPCommands = {}

    static getUserProfile(userId) {
        var prom = null;

        if(userId in AppSync.#getUPQueries) {
            prom = AppSync.#getUPQueries[userId];
        } else {
            prom = new Promise((resolve, reject) => {
                API.graphql( graphqlOperation(queries.listUserProfiles, {
                    filter: {
                        userId: {
                            eq: userId
                        }
                    }}))
                .then(data => {
                    var uP = null;
                    if(data.data.listUserProfiles.items.length > 0)
                        uP = data.data.listUserProfiles.items[0];
                    resolve(uP);
                }).catch(err => {
                    reject(err);
                });
            });
            AppSync.#getUPQueries[userId] = prom; 
        }
        return prom;
    }
    static createUserProfile(name, userId) {
        var prom = null;
        
        if(userId in  AppSync.createUPCommands) {
            prom = AppSync.createUPCommands[userId]
        } else {
            prom = new Promise((resolve, reject) => {
                var id = uuidv4();
                    API.graphql( graphqlOperation(mutations.createUserProfile, {
                        input: {
                            Id: id,
                            userName: name,
                            userId: userId
                        }}))
                    .then(data => {
                        resolve(data.data.createUserProfile);
                    }).catch(err => {
                        reject(err);
                    });
                });
            AppSync.createUPCommands[userId] = prom; 
        }
        return prom;
    }
    static deleteUserProfile(userProfile) {
        var prom = null;
        
        if(userProfile.Id in  AppSync.deleteUPCommands) {
            prom = AppSync.deleteUPCommands[userProfile.Id]
        } else {
            prom = new Promise((resolve, reject) => {
                
                    API.graphql( graphqlOperation(mutations.deleteUserProfile, 
                        { id: userProfile.Id } ))
                    .then(data => {
                        var uP = null;
                        if(data.data.listUserProfiles.items.length > 0)
                            uP = data.data.listUserProfiles.items[0];
                        resolve(uP);
                    }).catch(err => {
                        reject(err);
                    });
                });
            AppSync.deleteUPCommands[userProfile.Id] = prom; 
        }
        return prom;
    }
    static updateUserProfile(userProfile) {
        var prom = null;
        
        if(userProfile.Id in  AppSync.#updateUPCommands) {
            prom = AppSync.#updateUPCommands[userProfile.Id]
        } else {
            prom = new Promise((resolve, reject) => {
                API.graphql( graphqlOperation(mutations.updateUserProfile, {
                    input: {
                        Id: userProfile.Id,
                        userName: userProfile.userName,
                        userId: userProfile.userId
                    }}))
                .then(data => {
                    resolve(data.data.createUserProfile);
                }).catch(err => {
                    reject(err);
                });
            });
            AppSync.#updateUPCommands[userProfile.Id] = prom; 
        }
        return prom;
    }
}

export default AppSync;