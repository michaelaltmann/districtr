import { interpolateRdBu } from "d3-scale-chromatic";
import { html } from "lit-html";
import { roundToDecimal } from "../../utils";
import DataTable from "./DataTable";
import { getPartyRGBColors } from "../../layers/color-rules"

/**
 * Get the style property for a cell in the ElectionResults table,
 * based on which party's vote percentage is written in it and
 * what that percentage is.
 *
 * @todo Generalize this for when the parties are not just
 *  "Republican" and "Democratic"
 *
 * @param {number} percent
 * @param {Subgroup} party
 */
function getCellStyle(percent, party) {
    if ((party.name === "Democratic" || party.name.includes("(Dem)")) && percent > 0.5) {
        return `background: ${interpolateRdBu(percent)}`;
    } else if ((party.name === "Republican" || party.name.includes("(Rep)")) && percent > 0.5) {
        return `background: ${interpolateRdBu(1 - percent)}`;
    }
    return `background: #f9f9f9`;
}

function getCell(party, part) {
    let percent;
    if (part !== undefined && part !== null) {
        percent = party.getFractionInPart(part.id);
    } else {
        percent = party.getOverallFraction();
    }
    return {
        content: `${roundToDecimal(percent * 100, 2)}%`,
        style: getCellStyle(percent, party)
    };
}

export default function ElectionResults(election, parts) {
    const headers = election.parties.map(party => {
                        const rgb = getPartyRGBColors(party.name + party.key);
                        return html`<div style="color: rgb(${rgb[0]},${rgb[1]},${rgb[2]})">${party.name}</div>`});
    let rows = parts.map(part => ({
        label: part.renderLabel(),
        entries: election.parties.map(party => getCell(party, part))
    }));
    rows.push({
        label: "Overall",
        entries: election.parties.map(party => getCell(party, null))
    });
    return html`
        ${election.parties.length === 2 ? html`<strong>two-way vote share</strong>` : ""}
        ${DataTable(headers, rows)}
    `;
}
