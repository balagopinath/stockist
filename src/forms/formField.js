class FormField {
    #name = '';
    #type = '';
    #width = 50;
    #isMust = false;
    #gridCols = [];


    constructor(props) {
        this.name = props.name;
        this.type = props.type;
        if(props.inputSize !== undefined && props.inputSize != null && props.inputSize.trim() !== '' && !Number.isNaN(props.inputSize)) {
            this.#width = Number(props.inputSize);
        }
        this.#isMust = props.isMust;

        switch(this.type) {
            case "Grid":
                if(Array.isArray(props.children)) {
                    props.children.forEach(item => {
                        this.#gridCols.push(item);
                    });
                } else {
                    this.#gridCols.push(props.children);
                }
                break;
        }
    }
    getName() {
        return this.#name;
    }
    getType() {
        return this.#type;
    }
    getWidth() {
        return this.#width;
    }
}

export class GridColumnField {

}


export default FormField;