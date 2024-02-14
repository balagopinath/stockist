class FormField {
    #name = '';
    #type = '';
    #width = 50;
    #isMust = false;


    constructor(props) {
        this.name = props.name;
        this.type = props.type;
        if(props.inputSize !== undefined && props.inputSize != null && props.inputSize.trim() !== '' && !Number.isNaN(props.inputSize)) {
            this.#width = Number(props.inputSize);
        }
        this.#isMust = props.isMust;
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

export default FormField;