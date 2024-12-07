"use strict";
autowatch = 1;
inlets = 1;
outlets = 2;
var utils_1 = require("./utils");
mgraphics.init();
mgraphics.relative_coords = 1;
var debugLog = true;
var log = (0, utils_1.logFactory)({ outputLogs: debugLog });
setinletassist(0, '<Bang> to initialize, <Float> to fade.');
var MAX_PARAMS = 32;
var OUTLET_VAL = 0;
var OUTLET_IDS = 1;
setoutletassist(OUTLET_VAL, '<chain idx, val> Volume value for given chain.');
setoutletassist(OUTLET_IDS, '<chain idx, id, param_id> messages to map live.remote to device id param_id.');
function parseColor(colorNum) {
    // jsui: draw  COLORS: 16725558, 10208397, 16725558   
    return {
        r: ((colorNum >> 16) & 255) / 255.0,
        g: ((colorNum >> 8) & 255) / 255.0,
        b: (colorNum & 255) / 255.0,
    };
}
function adjustDeg(deg) {
    return 450 - deg;
}
function polarToXY(deg, len) {
    var ret = { x: 0, y: 0 };
    var rads = adjustDeg(deg) * (Math.PI / 180);
    ret.y = Math.sin(rads) * len;
    ret.x = Math.cos(rads) * len;
    return ret;
}
log('reloaded');
var state = {
    children: [],
    colorObjs: [],
    colors: [],
    constantPower: 0,
    curve: 1,
    maxVol: 1,
    minVol: 0,
    numChains: 0,
    parentObj: null,
    pos: 0,
    status: "",
    type: "",
    width: 90,
};
function bang() {
    //log('INIT')
    setStatus('Initializing...');
    initialize();
}
function draw() {
    mgraphics.redraw();
}
var CANVAS_W = 169;
var CANVAS_H = 169;
var TAU = 2 * Math.PI;
function deg2rad(deg) {
    return deg * Math.PI / 180;
}
function paint() {
    // background
    mgraphics.set_source_rgb(max.getcolor('live_lcd_bg'));
    mgraphics.rectangle(-1.0, 1, 2, 2);
    mgraphics.fill();
    var DIAL_WIDTH = 0.65;
    var halfW = state.width / 2.0;
    var adjPos = (270 + state.pos) % 360;
    var adjRad = deg2rad(adjPos);
    var startPos = adjPos - halfW;
    var endPos = adjPos + halfW;
    var startRad = deg2rad(startPos);
    var endRad = deg2rad(endPos);
    // nubbin
    var NUBBIN_DIA = 0.15;
    mgraphics.set_source_rgb(max.getcolor('live_lcd_control_fg_alt'));
    var adjX = 0.85 * DIAL_WIDTH * Math.cos(adjRad);
    var adjY = 0.85 * DIAL_WIDTH * Math.sin(-adjRad);
    mgraphics.arc(adjX, adjY, NUBBIN_DIA, 0, TAU);
    mgraphics.fill();
    // outer arc
    mgraphics.set_source_rgb(max.getcolor('live_lcd_control_fg_alt'));
    mgraphics.arc(0, 0, DIAL_WIDTH, startRad, endRad);
    mgraphics.stroke();
    // width arc
    mgraphics.set_source_rgb(max.getcolor('live_lcd_control_fg'));
    mgraphics.arc(0, 0, DIAL_WIDTH, startRad, endRad);
    var sampleStartPos = state.pos - halfW;
    var sampleEndPos = state.pos + halfW;
    var distance = Math.abs(sampleStartPos - sampleEndPos);
    var STEPS = 80;
    for (var samplePos = sampleEndPos; samplePos >= sampleStartPos; samplePos -= distance / STEPS) {
        var sampleRad = deg2rad((270 + samplePos) % 360); // need to adjust for plotted points
        var volume = calcVolumeAt(samplePos); // un-adjusted for volume calc
        //log('VOLUME: ' + volume + ' POS: ' + samplePos)
        var sampleX = DIAL_WIDTH * (1 - volume) * Math.cos(sampleRad);
        var sampleY = DIAL_WIDTH * (1 - volume) * Math.sin(-sampleRad);
        mgraphics.line_to(sampleX, sampleY);
    }
    var startX = DIAL_WIDTH * Math.cos(startRad);
    var startY = DIAL_WIDTH * Math.sin(-startRad);
    mgraphics.line_to(startX, startY);
    mgraphics.fill();
    // center circle
    mgraphics.set_source_rgb(max.getcolor('live_lcd_frame'));
    mgraphics.arc(0, 0, 0.1, 0, TAU);
    mgraphics.fill();
    // balls
    var BALL_DIST = 0.85;
    var BALL_RADIUS = 0.10;
    var ballIncr = 360.0 / state.numChains;
    for (var i = 0; i < state.numChains; i++) {
        //log('BALL ' + i + ': ' + ballIncr * i)
        var color = parseColor(state.colors[i]);
        //log('COLOR: ' + JSON.stringify(color))
        mgraphics.set_source_rgb(color.r, color.g, color.b);
        var pos_1 = polarToXY(ballIncr * i, BALL_DIST);
        mgraphics.arc(pos_1.x, pos_1.y, BALL_RADIUS, 0, TAU);
        mgraphics.fill();
    }
    mgraphics.set_source_rgb(max.getcolor('live_lcd_title'));
    mgraphics.move_to(-0.95, -0.95);
    mgraphics.set_font_size(8);
    mgraphics.text_path(state.status);
    mgraphics.fill();
}
function setStatus(status) {
    state.status = status;
    draw();
}
function pos(val) {
    //log('FLOAT: ' + val)
    state.pos = val;
    draw();
    updateVolumes();
}
function minVol(val) {
    //log('FLOAT: ' + val)
    state.minVol = val / 100;
    draw();
    updateVolumes();
}
function maxVol(val) {
    //log('FLOAT: ' + val)
    state.maxVol = val / 100;
    draw();
    updateVolumes();
}
function width(val) {
    //log('WIDTH: ' + val)
    state.width = val;
    draw();
    updateVolumes();
}
function constantPower(val) {
    state.constantPower = val;
    draw();
    updateVolumes();
}
function curve(val) {
    state.curve = val;
    draw();
    updateVolumes();
}
function lerp(val, min, max, curve) {
    var ret = Math.min(min, max) + (Math.abs(max - min) * (Math.pow(val, curve)));
    //log('VAL=' + val + ' CURVE=' + curve + ' VALC=' + (val ** curve) + ' MIN=' + min + ' MAX=' + max + ' RET=' + ret)
    return ret;
}
function calcVolumeAt(inPos) {
    var halfW = state.width / 2.0;
    var delta = Math.abs(state.pos - inPos);
    if (delta > 180) {
        delta = 360 - delta;
    }
    var volume = Math.max(1 - (delta / halfW), 0);
    volume = lerp(volume, state.minVol, state.maxVol, state.curve);
    // constant power volume adjustment
    if (state.constantPower) {
        volume = Math.sin(volume * Math.PI / 2);
    }
    return volume;
}
function updateVolumes() {
    var halfW = state.width / 2.0;
    var ballIncr = 360.0 / state.numChains;
    for (var i = 0; i < state.numChains; i++) {
        var ballPos = ballIncr * i;
        var volume = calcVolumeAt(ballPos);
        //log('VOLUME: ' + volume)
        outlet(OUTLET_VAL, [i + 1, volume * 0.85]);
    }
}
function trackColorCallback(slot, iargs) {
    //log('TRACK COLOR CALLBACK')
    var args = arrayfromargs(iargs);
    //log('TRACKCOLOR', args)
    if (args[0] === 'color') {
        state.colors[slot] = args[1];
        draw();
    }
}
function getChainIdsOf(rackObj) {
    //log('NUMCHAINS: ' + prevDevice.get('chains').length)
    return rackObj.get('chains').filter(function (e) { return e !== 'id'; });
}
function getRackDevicePaths(thisDevice, volumeDevicePaths) {
    var thisDevicePathTokens = thisDevice.unquotedpath.split(' ');
    var tokenLen = thisDevicePathTokens.length;
    var thisDeviceNum = parseInt(thisDevicePathTokens[tokenLen - 1]);
    if (isNaN(thisDeviceNum)) {
        setStatus('ERROR: NaN device num :(');
        return;
    }
    if (thisDeviceNum === 0) {
        // will not be first device if following a rack
        return;
    }
    //log('DEVICENUM = ' + thisDeviceNum)
    var prevDevicePath = thisDevicePathTokens.slice(0, tokenLen - 1).join(' ') +
        ' ' +
        (thisDeviceNum - 1);
    //log('PREVDEVICEPATH=' + prevDevicePath)
    var prevDevice = new LiveAPI(function () { }, prevDevicePath);
    if (!prevDevice.get('can_have_chains')) {
        // prev device needs to support chains
        return;
    }
    var chains = prevDevice.get('chains');
    if (!chains) {
        // no chains
        return;
    }
    //log('NUMCHAINS: ' + prevDevice.get('chains').length)
    state.parentObj = prevDevice;
    var chainIds = getChainIdsOf(prevDevice);
    state.children = chainIds;
    var _loop_1 = function (i) {
        var chainId = chainIds[i];
        var chainObj = new LiveAPI(function (iargs) { return trackColorCallback(i, iargs); }, "id " + chainId);
        chainObj.property = 'color';
        currChainPath = chainObj.unquotedpath + ' mixer_device volume';
        //log('CURR_CHAIN_PATH=' + currChainPath)
        state.colorObjs.push(chainObj);
        state.colors.push(chainObj.get('color'));
        // jsui: initialize  PATHS: "" mixer_device volume, "live_set tracks 6 devices 0 chains 1" mixer_device volume, "live_set tracks 6 devices 0 chains 2" mixer_device volume   
        volumeDevicePaths.push(currChainPath);
    };
    var currChainPath;
    //log('CHAINIDS: ' + chainIds.join(', '))
    for (var i = 0; i < chainIds.length; i++) {
        _loop_1(i);
    }
}
function getChildTracksOf(parentTrack) {
    var parentId = parentTrack.id.toString();
    var api = new LiveAPI(function () { }, "live_set");
    var trackCount = api.getcount('tracks');
    //log('TRACK COUNT: ' + trackCount)
    var childIds = [];
    for (var index = 0; index < trackCount; index++) {
        api.path = 'live_set tracks ' + index;
        // log('GROUP TRACK: ' + api.get('group_track'))
        if (parseInt(api.get('group_track')[1]) === parseInt(parentId)) {
            childIds.push(api.id);
            //log('FOUND CHILD: ' + api.id + ' = ' + api.unquotedpath + ' mixer_device volume')
        }
    }
    return childIds;
}
// called periodically to monitor changes in child tracks/chains
function checkChildren() {
    if (!state.parentObj) {
        return;
    }
    var currChildren = null;
    if (state.type === 'group') {
        currChildren = getChildTracksOf(state.parentObj);
    }
    else if (state.type === 'rack') {
        currChildren = getChainIdsOf(state.parentObj);
    }
    if (!currChildren) {
        return;
    }
    if (state.children.length === currChildren.length && state.children.every(function (value, index) { return value === currChildren[index]; })) {
        // no change, arrays are the same
        return;
    }
    // change in group track population
    //log("Change in children detected; Initializing...")
    initialize();
}
function getGroupTrackPaths(thisDevice, volumeDevicePaths) {
    //log('GET GROUP TRACK PATHS')
    var thisTrack = new LiveAPI(function () { }, thisDevice.get('canonical_parent'));
    //log('THIS TRACK: ' + thisTrack.id + ' ' + thisTrack.get("name"))
    if (thisTrack.get('is_foldable')) {
        // THIS IS A GROUP TRACK
        //log('GROUP TRACK')
        state.parentObj = thisTrack;
        state.children = getChildTracksOf(thisTrack);
        var _loop_2 = function (i) {
            var childTrackId = state.children[i];
            var childTrack = new LiveAPI(function (iargs) { return trackColorCallback(i, iargs); }, "id " + childTrackId);
            //log('GROUP TRACK: ' + childTrack.get('group_track'))
            volumeDevicePaths.push(childTrack.unquotedpath + ' mixer_device volume');
            state.colors.push(childTrack.get('color'));
            childTrack.property = 'color';
            state.colorObjs.push(childTrack);
        };
        //log('CHILDREN: ' + state.children)
        for (var i = 0; i < state.children.length; i++) {
            _loop_2(i);
        }
    }
}
function initialize() {
    //log('INITIALIZE')
    var thisDevice = new LiveAPI(function () { }, 'live_set this_device');
    state.parentObj = null;
    state.numChains = 0;
    state.colors = [];
    state.colorObjs = [];
    //log('THIS DEVICE: ' + thisDevice.id)
    // populate volumeDevicePaths either from a rack device (instrument or effect)
    // or as the parent of a track group
    var volumeDevicePaths = [];
    state.type = "rack";
    getRackDevicePaths(thisDevice, volumeDevicePaths);
    if (volumeDevicePaths.length === 0) {
        getGroupTrackPaths(thisDevice, volumeDevicePaths);
        state.type = "group";
    }
    //log('PATHS: ' + volumeDevicePaths.join(', '))
    // properly let go of devices for existing live.remote~ objects
    for (var i = 0; i < MAX_PARAMS; i++) {
        outlet(OUTLET_IDS, [i + 1, 'id', 0]);
        //log('REMOVED ' + (i + 1))
    }
    var lookupApi = new LiveAPI(function () { }, "live_set");
    var currChain;
    for (currChain = 0; currChain < volumeDevicePaths.length; currChain++) {
        var currChainPath = volumeDevicePaths[currChain];
        lookupApi.path = currChainPath;
        if (!lookupApi.path) {
            //log('last one okay!')
            break;
        }
        var deviceParamId = lookupApi.id;
        //log('PARAM_ID: ' + deviceParamId)
        outlet(OUTLET_IDS, [currChain + 1, 'id', deviceParamId]);
    }
    if (currChain > 0) {
        setStatus('');
    }
    else {
        setStatus('ERR: Put me after a rack or in a group.');
    }
    state.numChains = currChain;
    //log('CHAINS: ' + state.numChains)
    updateVolumes();
    draw();
}
// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
var module = {};
module.exports = {};
