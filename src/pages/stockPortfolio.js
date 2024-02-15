import React from "react";
import './stockPortfolio.css'
import Page from "./page";

export default class StockPortfolio extends Page {

    constructor(props) {
        super();
    }
    renderPage(contentElem) {
        return super.renderPage(
            <div className="spContainer">
            
            </div>
        )
    }
}
