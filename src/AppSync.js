import { API, graphqlOperation } from 'aws-amplify';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';

const { v4: uuidv4 } = require('uuid');

class AppSync {
    static #getUPQueries = {}
    static #createUPCommands = {}
    static #deleteUPCommands = {}
    static #updateUPCommands = {}
    static #getExchangesQuery = null

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
        
        if(userId in  AppSync.#createUPCommands) {
            prom = AppSync.#createUPCommands[userId]
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
            AppSync.#createUPCommands[userId] = prom; 
        }
        return prom;
    }
    static deleteUserProfile(userProfile) {
        var prom = null;
        
        if(userProfile.Id in  AppSync.#deleteUPCommands) {
            prom = AppSync.#deleteUPCommands[userProfile.Id]
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
            AppSync.#deleteUPCommands[userProfile.Id] = prom; 
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
    
    static getExchanges() {
        if(AppSync.#getExchangesQuery == null) {
            AppSync.#getExchangesQuery = new Promise((resolve, reject) => {
                API.graphql(graphqlOperation(queries.listExchanges))
                .then(data => {
                    resolve(data.data.listExchanges.items)
                }).catch(err => {
                    reject(err)
                });
            })
        }
        return AppSync.#getExchangesQuery;
    }
    static getExchange(Id) {
        return new Promise((resolve, reject) => {
            API.graphql(graphqlOperation(queries.getExchange(Id)))
            .then(data => {
                resolve(data.data.listExchanges.items)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static addExchange(data) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
                name: data.name,
                code: data.code
            };
            API.graphql(graphqlOperation(mutations.createExchange,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static editExchange(data, Id) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
                name: data.name,
                code: data.code
            };
            API.graphql(graphqlOperation(mutations.updateExchange,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static deleteExchange(data) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
  
            };
            API.graphql(graphqlOperation(mutations.deleteExchange,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }


    static getIndustrySectors() {

        return new Promise((resolve, reject) => {
            API.graphql(graphqlOperation(queries.listIndustrySectors))
            .then(data => {
                resolve(data.data.listIndustrySectors.items)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static getIndustrySector(Id) {
        return new Promise((resolve, reject) => {
            API.graphql(graphqlOperation(queries.getIndustrySector(Id)))
            .then(data => {
                resolve(data.data.listIndustrySectors.items)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static addIndustrySector(data) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
                name: data.name
            };
            API.graphql(graphqlOperation(mutations.createIndustrySector,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static editIndustrySector(data, Id) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
                name: data.name
            };
            API.graphql(graphqlOperation(mutations.updateIndustrySector,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static deleteIndustrySector(data) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
  
            };
            API.graphql(graphqlOperation(mutations.deleteIndustrySector,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }


    static getCompanies() {

        return new Promise((resolve, reject) => {
            API.graphql(graphqlOperation(queries.listCompanies))
            .then(data => {
                resolve(data.data.listCompanies.items)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static getCompany(Id) {
        return new Promise((resolve, reject) => {
            API.graphql(graphqlOperation(queries.getCompany(Id)))
            .then(data => {
                resolve(data.data.listCompanies.items)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static addCompany(data) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
                name: data.name,
                industry: data.industry
            };
            API.graphql(graphqlOperation(mutations.createCompany,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static editCompany(data, Id) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
                name: data.name,
                industry: data.industry
            };
            API.graphql(graphqlOperation(mutations.updateCompany,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }
    static deleteCompany(data) {
        return new Promise((resolve, reject) => {
            const input = {
                Id: data.Id,
              };
            API.graphql(graphqlOperation(mutations.deleteCompany,  { input }))
            .then(data => {
                resolve(data)
            }).catch(err => {
                reject(err)
            });
        })
    }
}

export default AppSync;