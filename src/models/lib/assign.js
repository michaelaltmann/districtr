/**
 * Assigns units to their districts while the Mapbox tiles are still
 * loading.
 *
 * @param {State} state The State object.
 * @param {Object} assignment The assignment we want to set.
 * @param {Function} readyCallback Called after all the units' assignments
 *  are set.
 */
export function assignUnitsAsTheyLoad(state, assignment, readyCallback) {
    let assignmentLength = Object.keys(assignment).filter(
        key => assignment[key] !== undefined && assignment[key] !== null
    ).length;
    let numberAssigned = 0;
    let assigned = {};
    state.units.untilSourceLoaded(done => {
        const { successes, failures } = assignFeatures(
            state,
            assignment,
            assigned
        );
        numberAssigned += successes;
        if (numberAssigned === assignmentLength && failures === 0) {
            done();
        } else {
            // console.error([numberAssigned, assignmentLength]);
            // console.error(failures + " failures");
        }
        readyCallback();
        state.render();
    });
}

export function getAssignedUnitIds(assignment) {
    return Object.keys(assignment).filter(
        x =>
            x !== undefined &&
            x !== null &&
            assignment[x] !== null &&
            assignment[x] !== undefined
    );
}

function assign(state, feature, partId) {
    if (typeof partId === 'number') {
        partId = [partId];
    }
    state.update(feature, partId);
    partId.forEach((p) => {
        if (state.parts[p]) {
            state.parts[p].visible = true;
        } else {
            console.error("Off by one? No matching district number for: " + p);
        }
    });
    state.units.setAssignment(feature, partId);
}

function assignFeatures(state, assignment, assigned) {
    const features = state.units.querySourceFeatures();
    let failures = 0;
    let successes = 0;
    while (features.length > 0) {
        let feature = features.pop();
        if (true) { //state.hasExpectedData(feature)) {
            let unitId = state.idColumn.getValue(feature);
            if (
                assigned[unitId] !== true &&
                assignment.hasOwnProperty(unitId) &&
                assignment[unitId] !== null &&
                assignment[unitId] !== undefined
            ) {
                assign(state, feature, assignment[unitId]);
                assigned[unitId] = true;
                successes += 1;
            }
        } else {
            failures += 1;
        }
    }
    return { failures, successes };
}
