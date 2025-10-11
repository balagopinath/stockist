import EventEmitter from "events";

class DataModel extends EventEmitter {
    constructor() {
        super()
        this.onValueChanged = this.onValueChanged.bind();
    }
    
    onValueChanged(propertyName) {
        super.emit("ValueChanged", { property: propertyName});
    }

}
export default DataModel;