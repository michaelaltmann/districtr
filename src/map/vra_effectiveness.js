// import Tabs from "../components/Tabs";
// import {DistrictResults} from "../components/Charts/VRAResultsSection"
import { render } from "lit-html";

export default function VRAEffectiveness(state, brush, toolbar) {
    let place = state.place.id,
      extra_source = (state.units.sourceId === "ma_precincts_02_10") ? "ma_02" : 0;
  if (state.units.sourceId === "ma_towns") {
      extra_source = "ma_towns";
  }
  const placeID = extra_source || place;
  const sep = (state.place.id === "louisiana") ? ";" : ",";

  const groups = state.place.id === "tx_vra" ? ["Hispanic", "Black"] : ["Black"];

//   console.log(state);
  if (!state.vra_effectiveness) {
    state.vra_effectiveness = Object.fromEntries(groups.map(g => [g, null]));
  }
  if (!state.waiting) {
      state.waiting = false;
  }

  let awaiting_response = false;
  let cur_request_id = 0;
  let newer_changes = false;

  const vraupdater = (state) => {
    // console.log("hello");
    // Object.keys(state.plan.assignment).map((k, i) => {
    //     state.plan.assignment[k] = Array.isArray(state.plan.assignment[k]) ? state.plan.assignment[k][0] : state.plan.assignment[k]
    // })
    let assign = Object.fromEntries(Object.entries(state.plan.assignment).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
    // console.log(assign);
    // console.log(state);
    // console.log(assign);
    // let saveplan = state.serialize();
    // console.log(JSON.stringify(saveplan));
    const GERRYCHAIN_URL = "//mggg.pythonanywhere.com";
    
    if (!awaiting_response && Object.entries(assign).length > 0) {
        state.waiting = true;
        cur_request_id += 1;
        awaiting_response = true;

        // signal awaiting refreshed data
        const target = document.getElementById("toolbar");
        if (target !== null && toolbar.tools.length > 0) {
            render(toolbar.render(), target);
        }
        

        fetch(GERRYCHAIN_URL + "/vra", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "assignment": assign,
                "placeId": state.place.id,
                "groups": groups,
                "seq_id": cur_request_id
            }),
          })
            .then((res) => res.json())
            .catch((e) => console.error(e))
            .then((data) => {
                if (data["seq_id"] === cur_request_id) {
                    awaiting_response = false;
                    state.waiting = false;
                    state.vra_effectiveness = data["data"];
                    // console.log(data);
                    const target = document.getElementById("toolbar");
                    if (target === null) {
                        return;
                    }
                    render(toolbar.render(), target);
              }
              if (newer_changes) {
                  newer_changes = false;
                  vraupdater(state);
              }
        });
    }
    else {
        newer_changes = true;
    }
  };
  vraupdater(state);
  return vraupdater;
}