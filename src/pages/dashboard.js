import React from "react";
import './dashboard.css'
import Page from "./page";

export default class Dashboard extends Page {

    constructor(props) {
        super();
    }
    renderPage(contentElem) {
        return super.renderPage(
            <div className="dashboardContainer">
            
            </div>
        )
    }
}
