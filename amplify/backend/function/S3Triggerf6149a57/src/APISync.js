import { getCompaniesByISIN, getExchangesByCode, getExchanges, getIndustries } from './queries.js';
import { createIndustry, createExchange } from './mutations.js'
import { v4 as uuidv4 } from 'uuid';

const endpoint = process.env.API_STOCKIST_GRAPHQLAPIENDPOINTOUTPUT;
const apiKey = process.env.API_STOCKIST_GRAPHQLAPIKEYOUTPUT;

async function get(query, variables) {

    return new Promise((resolve, reject) => {
        fetch(endpoint, {
            method: "POST",
            headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, variables }),
        }).then(async data => {
            resolve(await data.json())
        }).catch(err => {
            reject(err);
        });
    });
}



export async function getCompanyByISIN(ISIN) {

    return new Promise((response, reject) => {
        get(getCompaniesByISIN, {ISIN: ISIN}).then(data => {
            console.log("Companies :- " + JSON.stringify(data))
            response(data.data.listCompanies.items[0]);
        }).catch(err => {
            reject(err);
        });

    });
}

export async function getIndustryByName(name) {

    return new Promise((response, reject) => {
        get(getIndustriesByName, {name}).then(data => {
            response(data.data.listIndustries.items[0]);
        }).catch(err => {
            console.log(err);
            reject(err);
        });

    });
}

export async function getIndustriesWithNames(names) {

    return new Promise((response, reject) => {
        get(getIndustries, {}).then(data => {
            response(data.data.listIndustries.items.filter(x => names.includes(x.name)));
        }).catch(err => {
            reject(err);
        });

    });
}

export async function addIndustry(industry) {
    return new Promise((response, reject) => {
        industry.Id = uuidv4();
        get(createIndustry, {input: industry}).then(data => {
            response(data);
        }).catch(err => {
            reject(err);
        });
    });
}

export async function getExchangeByCode(code) {

    return new Promise((response, reject) => {
        get(getExchangesByCode, {code}).then(data => {
            response(data.data.listExchanges.items[0]);
        }).catch(err => {
            console.log(err);
            reject(err);
        });
    });
}

export async function getExchangesWithCodes(codes) {

    return new Promise((response, reject) => {
        get(getExchanges, {}).then(data => {
            response(data.data.listExchanges.items.filter(x => codes.includes(x.code)));
        }).catch(err => {
            console.log(err);
            reject(err);
        });
    });
}


export async function addExchange(exchange) {
    return new Promise((response, reject) => {
        exchange.Id = uuidv4();
        get(createExchange, {input: exchange}).then(data => {
            response(data);
        }).catch(err => {
            reject(err);
        });
    });
}