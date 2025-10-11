import Papa from "papaparse";

export default class CSVParser {

    static parseCSV(file) {
        return  new Promise((resolve, reject) => {
                                                    Papa.parse(file, {
                                                            header: true,
                                                            skipEmptyLines: true,
                                                            complete: (results) => {
                                                                resolve({
                                                                    data: results.data,
                                                                    fields: results.meta.fields,
                                                                });
                                                            },
                                                            error: (err) => {
                                                                reject(err);
                                                            },
                                                    });
                                                });        
    }
}