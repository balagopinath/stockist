class FormField {
    #name = '';

    constructor(props) {
        this.name = props.name;
    }
    getName() {
        return this.#name;
    }
}

export default FormField;