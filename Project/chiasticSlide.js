autowatch = 1;
inlets = 1;
outlets = 2;
sketch.default2d();
sketch.glloadidentity();
sketch.glortho(-1, 1, -1, 1, -1, 1);
//const debugLog = true
var debugLog = false;
setinletassist(0, '<Bang> to initialize, <Float> to fade.');
var MAX_PARAMS = 32;
var OUTLET_VAL = 0;
var OUTLET_IDS = 1;
setoutletassist(OUTLET_VAL, '<chain idx, val> Volume value for given chain.');
setoutletassist(OUTLET_IDS, '<chain idx, id, param_id> messages to map live.remote to device id param_id.');
function debug(_) {
    if (debugLog) {
        post(debug.caller ? debug.caller.name : 'ROOT', Array.prototype.slice.call(arguments).join(' '), '\n');
    }
}
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
debug('reloaded');
var state = {
    children: [],
    colorObjs: [],
    colors: [],
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
    //debug('INIT')
    setStatus('Initializing...');
    initialize();
}
var ARROW_LEN = 0.75;
var BALL_DIST = 0.75;
var BALL_RADIUS = 0.15;
function draw() {
    sketch.glclearcolor(max.getcolor('live_lcd_bg'));
    sketch.glclear();
    var pos = { x: 0, y: 0 };
    // background circle
    //sketch.moveto(0, 0, 0)
    //sketch.glcolor(max.getcolor('live_lcd_frame'))
    //sketch.gllinewidth(10)
    //sketch.circle(BALL_DIST, 0, 360)
    // width arc
    var halfW = state.width / 2.0;
    sketch.moveto(0, 0, 0);
    var arcColor = max.getcolor('live_control_selection');
    arcColor[3] = 0.1 / state.curve;
    sketch.glcolor(arcColor);
    var startDeg = adjustDeg(state.pos - halfW);
    var endDeg = adjustDeg(state.pos + halfW);
    sketch.circle(ARROW_LEN, startDeg, endDeg);
    // position line
    sketch.glcolor(max.getcolor('live_lcd_title'));
    sketch.moveto(0, 0, 0);
    pos = polarToXY(state.pos, ARROW_LEN);
    sketch.gllinewidth(2);
    sketch.line(pos.x, pos.y, 0);
    // center circle
    sketch.moveto(0, 0, 0);
    sketch.glcolor(max.getcolor('live_lcd_frame'));
    sketch.circle(0.1, 0, 360);
    // balls
    //debug('DRAW BALLS')
    //debug('COLORS: ' + state.colors.join(', '))
    var ballIncr = 360.0 / state.numChains;
    for (var i = 0; i < state.numChains; i++) {
        //debug('BALL ' + i + ': ' + ballIncr * i)
        var color = parseColor(state.colors[i]);
        //debug('COLOR: ' + JSON.stringify(color))
        sketch.glcolor(color.r, color.g, color.b, 1);
        pos = polarToXY(ballIncr * i, BALL_DIST);
        sketch.moveto(pos.x, pos.y, 0);
        sketch.circle(BALL_RADIUS, 0, 360);
    }
    // status
    sketch.moveto(0, -0.95, 0);
    sketch.fontsize(8);
    sketch.textalign("center", "bottom");
    sketch.glcolor(max.getcolor('live_lcd_title'));
    sketch.text(state.status);
    refresh();
}
function setStatus(status) {
    state.status = status;
    draw();
}
function pos(val) {
    //debug('FLOAT: ' + val)
    state.pos = val;
    draw();
    updateVolumes();
}
function minVol(val) {
    //debug('FLOAT: ' + val)
    state.minVol = val / 100;
    draw();
    updateVolumes();
}
function maxVol(val) {
    //debug('FLOAT: ' + val)
    state.maxVol = val / 100;
    draw();
    updateVolumes();
}
function width(val) {
    //debug('WIDTH: ' + val)
    state.width = val;
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
    //debug('VAL=' + val + ' CURVE=' + curve + ' VALC=' + (val ** curve) + ' MIN=' + min + ' MAX=' + max + ' RET=' + ret)
    return ret;
}
function updateVolumes() {
    var halfW = state.width / 2.0;
    var ballIncr = 360.0 / state.numChains;
    for (var i = 0; i < state.numChains; i++) {
        var ballPos = ballIncr * i;
        var delta = Math.abs(state.pos - ballPos);
        if (delta > 180) {
            delta = 360 - delta;
        }
        var volume = Math.max(1 - (delta / halfW), 0);
        // min/max
        volume = lerp(volume, state.minVol, state.maxVol, state.curve);
        //debug('VOLUME: ' + volume)
        outlet(OUTLET_VAL, [i + 1, volume * 0.85]);
    }
}
function trackColorCallback(slot, iargs) {
    //debug('TRACK COLOR CALLBACK')
    var args = arrayfromargs(iargs);
    //debug('TRACKCOLOR', args)
    if (args[0] === 'color') {
        state.colors[slot] = args[1];
        draw();
    }
}
function getChainIdsOf(rackObj) {
    //debug('NUMCHAINS: ' + prevDevice.get('chains').length)
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
    //debug('DEVICENUM = ' + thisDeviceNum)
    var prevDevicePath = thisDevicePathTokens.slice(0, tokenLen - 1).join(' ') +
        ' ' +
        (thisDeviceNum - 1);
    //debug('PREVDEVICEPATH=' + prevDevicePath)
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
    //debug('NUMCHAINS: ' + prevDevice.get('chains').length)
    state.parentObj = prevDevice;
    var chainIds = getChainIdsOf(prevDevice);
    state.children = chainIds;
    var _loop_1 = function (i) {
        var chainId = chainIds[i];
        var chainObj = new LiveAPI(function (iargs) { return trackColorCallback(i, iargs); }, "id " + chainId);
        chainObj.property = 'color';
        currChainPath = chainObj.unquotedpath + ' mixer_device volume';
        //debug('CURR_CHAIN_PATH=' + currChainPath)
        state.colorObjs.push(chainObj);
        state.colors.push(chainObj.get('color'));
        // jsui: initialize  PATHS: "" mixer_device volume, "live_set tracks 6 devices 0 chains 1" mixer_device volume, "live_set tracks 6 devices 0 chains 2" mixer_device volume   
        volumeDevicePaths.push(currChainPath);
    };
    var currChainPath;
    //debug('CHAINIDS: ' + chainIds.join(', '))
    for (var i = 0; i < chainIds.length; i++) {
        _loop_1(i);
    }
}
function getChildTracksOf(parentTrack) {
    var parentId = parentTrack.id.toString();
    var api = new LiveAPI(function () { }, "live_set");
    var trackCount = api.getcount('tracks');
    //debug('TRACK COUNT: ' + trackCount)
    var childIds = [];
    for (var index = 0; index < trackCount; index++) {
        api.path = 'live_set tracks ' + index;
        // debug('GROUP TRACK: ' + api.get('group_track'))
        if (parseInt(api.get('group_track')[1]) === parseInt(parentId)) {
            childIds.push(api.id);
            //debug('FOUND CHILD: ' + api.id + ' = ' + api.unquotedpath + ' mixer_device volume')
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
    //debug("Change in children detected; Initializing...")
    initialize();
}
function getGroupTrackPaths(thisDevice, volumeDevicePaths) {
    //debug('GET GROUP TRACK PATHS')
    var thisTrack = new LiveAPI(function () { }, thisDevice.get('canonical_parent'));
    //debug('THIS TRACK: ' + thisTrack.id + ' ' + thisTrack.get("name"))
    if (thisTrack.get('is_foldable')) {
        // THIS IS A GROUP TRACK
        //debug('GROUP TRACK')
        state.parentObj = thisTrack;
        state.children = getChildTracksOf(thisTrack);
        var _loop_2 = function (i) {
            var childTrackId = state.children[i];
            var childTrack = new LiveAPI(function (iargs) { return trackColorCallback(i, iargs); }, "id " + childTrackId);
            //debug('GROUP TRACK: ' + childTrack.get('group_track'))
            volumeDevicePaths.push(childTrack.unquotedpath + ' mixer_device volume');
            state.colors.push(childTrack.get('color'));
            childTrack.property = 'color';
            state.colorObjs.push(childTrack);
        };
        //debug('CHILDREN: ' + state.children)
        for (var i = 0; i < state.children.length; i++) {
            _loop_2(i);
        }
    }
}
function initialize() {
    //debug('INITIALIZE')
    var thisDevice = new LiveAPI(function () { }, 'live_set this_device');
    state.parentObj = null;
    state.numChains = 0;
    state.colors = [];
    state.colorObjs = [];
    //debug('THIS DEVICE: ' + thisDevice.id)
    // populate volumeDevicePaths either from a rack device (instrument or effect)
    // or as the parent of a track group
    var volumeDevicePaths = [];
    state.type = "rack";
    getRackDevicePaths(thisDevice, volumeDevicePaths);
    if (volumeDevicePaths.length === 0) {
        getGroupTrackPaths(thisDevice, volumeDevicePaths);
        state.type = "group";
    }
    //debug('PATHS: ' + volumeDevicePaths.join(', '))
    // properly let go of devices for existing live.remote~ objects
    for (var i = 0; i < MAX_PARAMS; i++) {
        outlet(OUTLET_IDS, [i + 1, 'id', 0]);
        //debug('REMOVED ' + (i + 1))
    }
    var lookupApi = new LiveAPI(function () { }, "live_set");
    var currChain;
    for (currChain = 0; currChain < volumeDevicePaths.length; currChain++) {
        var currChainPath = volumeDevicePaths[currChain];
        lookupApi.path = currChainPath;
        if (!lookupApi.path) {
            //debug('last one okay!')
            break;
        }
        var deviceParamId = lookupApi.id;
        //debug('PARAM_ID: ' + deviceParamId)
        outlet(OUTLET_IDS, [currChain + 1, 'id', deviceParamId]);
    }
    if (currChain > 0) {
        setStatus('');
    }
    else {
        setStatus('ERR: Put me after a rack or in a group.');
    }
    state.numChains = currChain;
    //debug('CHAINS: ' + state.numChains)
    updateVolumes();
    draw();
}
