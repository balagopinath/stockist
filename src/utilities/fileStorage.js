import { Storage } from "aws-amplify";
import Dialog from "../dialog";
import ProgressBar, { ProgressModel } from "../popups/progressBar/progressBar";


export default class FileStorage {

    static async push(file) {
        return  new Promise((Response, reject) => {
            try {
                const prog = new ProgressModel();
                prog.caption = "Uploading....";
                prog.maxValue = 100;
                Dialog.showDialog(ProgressBar, prog);
                Storage.put(file.name, file, {
                    contentType: file.type,
                    progressCallback: (progress) => {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        prog.value  = percent;
                        console.log(percent);
                    },
                }).then(res => {
                    Response(res);
                }).catch(err => {
                    reject(err);
                });
            }
            catch(e) {
                reject(e);
            }

        });
    }
}