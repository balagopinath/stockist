import Dialog from "../../dialog";
import DataMModel from "../../DataMadel";
import "./progressBar.css";

export class ProgressModel extends DataMModel 
{
    #maxValue = 100;
    #value = 0;
    #caption = "";

    get maxValue() {
        return this.#maxValue;
    }

    set maxValue(newValue) {
        this.#maxValue = newValue
    }

    get value() {
        return this.#value;
    }

    set value(newValue) {
        this.#value = newValue;
        super.onValueChanged("value");
    }

    get caption() {
        return this.#caption;
    }
    set caption(newValue) {
        this.#caption  = newValue;
    }
}

class ProgressBar extends Dialog {
    constructor(props) {
        super(props)
        this.state = {
            maxValue: props.dataContext.maxValue,
            value: props.dataContext.value,
            caption: "",
        };
    }

    componentDidMount() {
        this.props.dataContext.on("ValueChanged", data => {
            this.setState({value: this.props.dataContext.value});
            if(this.props.dataContext.value >= this.state.maxValue) {
                setTimeout(() => {
                    super.hide();
                }, 1000);
            }
        });        
    }

    renderDialog() {
        return (<div className="container">
            <progress value={this.state.value} maxvalue={this.state.maxValue} />
        </div>)
    }
}

export default ProgressBar;