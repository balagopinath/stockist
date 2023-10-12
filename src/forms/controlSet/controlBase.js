import React from "react";

class ControlBase extends React.Component {
    form = null;
   
    getForm() {
        return this.form;
    }

    componentDidMount() {
        
    }


    renderDialog(contentElement) {
        return <div className="control">
            { contentElement }
        </div>
    }
    render() {
        return this.renderDialog(null)
    }
}

export default ControlBase;