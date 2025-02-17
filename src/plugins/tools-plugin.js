import hotkeys from 'hotkeys-js';

import BrushTool from "../components/Toolbar/BrushTool";
import EraserTool from "../components/Toolbar/EraserTool";
import InspectTool from "../components/Toolbar/InspectTool";
import PanTool from "../components/Toolbar/PanTool";
// import LandmarkTool from "../components/Toolbar/LandmarkTool";
import Brush from "../map/Brush";
import CommunityBrush from "../map/CommunityBrush";
import { HoverWithRadius } from "../map/Hover";
import NumberMarkers from "../map/NumberMarkers";
import ContiguityChecker from "../map/contiguity";
import VRAEffectiveness from "../map/vra_effectiveness"
import { renderVRAAboutModal, renderAboutModal, renderSaveModal } from "../components/Modal";
import { navigateTo, savePlanToStorage, savePlanToDB } from "../routes";
import { download, spatial_abilities } from "../utils";

export default function ToolsPlugin(editor) {
    const { state, toolbar } = editor;
    const showVRA = (state.plan.problem.type !== "community") && (spatial_abilities(state.place.id).vra_effectiveness);
    const brush = (state.problem.type === 'community')
        ? new CommunityBrush(state.units, 20, 0)
        : new Brush(state.units, 20, 0);
    brush.on("colorfeature", state.update);
    brush.on("colorend", state.render);
    brush.on("colorend", toolbar.unsave);

    let brushOptions = {
        community: (state.problem.type === "community"),
        county_brush: ((spatial_abilities(state.place.id).county_brush)
            ? new HoverWithRadius(state.counties, 20)
            : null),
        alt_counties: (state.place.id === "louisiana") ? "parishes" : null,
    };

    let vraEffectiveness = showVRA ? VRAEffectiveness(state, brush, toolbar) : null;

    window.planNumbers = NumberMarkers(state, brush);
    const c_checker = (spatial_abilities(state.place.id).contiguity && state.problem.type !== "community")
        ? ContiguityChecker(state, brush)
        : null;
    brush.on("colorop", (isUndoRedo, colorsAffected) => {
        savePlanToStorage(state.serialize());
        if (c_checker) {
            c_checker(state, colorsAffected);
        }

        if (vraEffectiveness) {
            vraEffectiveness(state, colorsAffected);
        }

        if (window.planNumbers && document.querySelector("#toggle-district-numbers") && document.querySelector("#toggle-district-numbers").checked) {
            window.planNumbers.update(state, colorsAffected);
        }
    });

    let tools = [
        new PanTool(),
        new BrushTool(brush, state.parts, brushOptions),
        new EraserTool(brush),
        new InspectTool(
            state.units,
            state.columnSets,
            state.nameColumn,
            state.unitsRecord,
            state.parts
        )
    ];

    for (let tool of tools) {
        if (tool) {
            toolbar.addTool(tool);
        }
    }
    toolbar.selectTool("pan");
    toolbar.setMenuItems(getMenuItems(editor.state));
    toolbar.setState(state);

    hotkeys.filter = ({ target }) => {
        return (
            !["INPUT", "TEXTAREA"].includes(target.tagName) ||
            (target.tagName === "INPUT" && target.type.toLowerCase() !== "text")
        );
    };
    hotkeys("h", (evt, handler) => {
        evt.preventDefault();
        toolbar.selectTool("pan");
    });
    hotkeys("p", (evt, handler) => {
        evt.preventDefault();
        toolbar.selectTool("brush");
    });
    hotkeys("e", (evt, handler) => {
        evt.preventDefault();
        toolbar.selectTool("eraser");
    });
    hotkeys("i", (evt, handler) => {
        evt.preventDefault();
        toolbar.selectTool("inspect");
    });

    // show about modal on startup by default

    // exceptions if you last were on this map, or set 'dev' in URL
    // try {
    //     if ((window.location.href.indexOf("dev") === -1) &&
    //         (!localStorage || localStorage.getItem("lastVisit") !== state.place.id)
    //     ) {
    //         renderAboutModal(editor.state);
    //         localStorage.setItem("lastVisit", state.place.id);
    //     }
    // } catch(e) {
    //     // likely no About page exists - silently fail to console
    //     console.error(e);
    // }
}

function exportPlanAsJSON(state) {
    const serialized = state.serialize();
    const text = JSON.stringify(serialized);
    download(`districtr-plan-${serialized.id}.json`, text);
}
function exportPlanAsSHP(state) {
    const serialized = state.serialize();
    Object.keys(serialized.assignment).forEach((assign) => {
        if (typeof serialized.assignment[assign] === 'number') {
            serialized.assignment[assign] = [serialized.assignment[assign]];
        }
    });
    fetch("//mggg.pythonanywhere.com/shp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serialized),
    })
    .then((res) => res.arrayBuffer())
    .catch((e) => console.error(e))
    .then((data) => {
        download(`districtr-plan-${serialized.id}.shp.zip`, data, true);
    });
}

function exportPlanAsAssignmentFile(state, delimiter = ",", extension = "csv") {
    if (state.place.id === "louisiana") {
        delimiter = ";";
    }
    let srl = (assignment) => typeof assignment === "object" ? assignment.join("_") : assignment;
    let text = `"id-${state.place.id}-${state.units.id}-${state.problem.numberOfParts}`;
    text += `-${state.problem.pluralNoun.replace(/\s+/g, "")}"`;
    text += `${delimiter}assignment\n`;
    text += Object.keys(state.plan.assignment)
        .map(unitId => `${unitId}${delimiter}${srl(state.plan.assignment[unitId])}`)
        .join("\n");
    download(`assignment-${state.plan.id}.${extension}`, text);
}

function scrollToSection(state, section) {
    return () => {
        let url = "/" + state.place.state.replace(/,/g, "").replace(/\s+/g, '-'),
            adjacent = window.open(url);
    
        // Attach a listener to the adjacent Window so that, when the
        // page-load-complete event fires, it's caught and the page is
        // scrolled to the correct location.
        adjacent.addEventListener("page-load-complete", e => {
            let adjacent = e.target,
                anchorElement = adjacent.document.getElementById(section);
        
            // Scrolls the desired anchor element to the top of the page, should
            // it exist.
            if (anchorElement) anchorElement.scrollIntoView(true);
        });
    };
}

function getMenuItems(state) {
    const showVRA = (state.plan.problem.type !== "community") && (spatial_abilities(state.place.id).vra_effectiveness);
    let items = [
        {
            name: "About redistricting",
            onClick: scrollToSection(state, "why?")
        },
        {
            name: "About the data",
            onClick: scrollToSection(state, "data")
        },
        {
            name: "Districtr homepage",
            onClick: () => {
                if (window.confirm("Would you like to return to the Districtr homepage?")) {
                    window.location.href = "/";
                }
            }
        },
        {
            name: "New plan",
            onClick: () => navigateTo("/new")
        },
        {
            name: "Print / PDF",
            onClick: () => window.print()
        },
        {
            name: `Export${state.problem.type === "community" ? " COI " : " "}plan as JSON`,
            onClick: () => exportPlanAsJSON(state)
        },
        (spatial_abilities(state.place.id).shapefile ?  {
            name: `Export${state.problem.type === "community" ? " COI " : " "}plan as SHP`,
            onClick: () => exportPlanAsSHP(state)
        } : null),
        {
            name: "Export assignment as CSV",
            onClick: () => exportPlanAsAssignmentFile(state)
        },
        {
            id: "mobile-upload",
            name: "Share plan",
            onClick: () => renderSaveModal(state, savePlanToDB)
        },
        {
            name: "About import/export options",
            onClick: () => window.open("/import-export", "_blank")
        }
    ];
    return items;
}
