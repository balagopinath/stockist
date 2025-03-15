import React from "react";
import './page.css'

export default class Page extends React.Component {

    constructor(props) {
        super();
    }
    renderPage(contentElem) {
        return (<div className="pageContainer">
            { contentElem }
        </div>)
    }
    render() {
        return this.renderPage(null);
    }
}


