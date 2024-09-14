autowatch = 1
inlets = 1
outlets = 2

sketch.default2d();
sketch.glloadidentity();
sketch.glortho(-1, 1, -1, 1, -1, 1);

//const debugLog = true
const debugLog = false

setinletassist(0, '<Bang> to initialize, <Float> to fade.')
const MAX_PARAMS = 32
const OUTLET_VAL = 0
const OUTLET_IDS = 1
setoutletassist(OUTLET_VAL, '<chain idx, val> Volume value for given chain.')
setoutletassist(
  OUTLET_IDS,
  '<chain idx, id, param_id> messages to map live.remote to device id param_id.'
)

function debug(_: any) {
  if (debugLog) {
    post(
      debug.caller ? debug.caller.name : 'ROOT',
      Array.prototype.slice.call(arguments).join(' '),
      '\n'
    )
  }
}

function parseColor(colorNum: number) {
  // jsui: draw  COLORS: 16725558, 10208397, 16725558   
  return {
    r: ((colorNum >> 16) & 255) / 255.0,
    g: ((colorNum >> 8) & 255) / 255.0,
    b: (colorNum & 255) / 255.0,
  }
}

function dequote(str: string) {
  //debug(str, typeof str)
  return str.toString().replace(/^"|"$/g, '')
}

function adjustDeg(deg: number) {
  return 450 - deg
}

function polarToXY(deg: number, len: number) {
  const ret = { x: 0, y: 0 }
  const rads = adjustDeg(deg) * (Math.PI / 180);
  ret.y = Math.sin(rads) * len
  ret.x = Math.cos(rads) * len
  return ret
}

debug('reloaded')

var state = {
  children: [] as number[],
  colorObjs: [] as LiveAPI[],
  colors: [] as number[],
  curve: 1,
  maxVol: 1,
  minVol: 0,
  numChains: 0,
  parentObj: null as LiveAPI,
  pos: 0,
  status: "",
  type: "" as ("rack" | "group"),
  width: 90,
}

function bang() {
  //debug('INIT')
  setStatus('Initializing...')
  initialize()
}

const ARROW_LEN = 0.75
const BALL_DIST = 0.75
const BALL_RADIUS = 0.15

function draw() {
  sketch.glclearcolor(max.getcolor('live_lcd_bg'))
  sketch.glclear();

  let pos = { x: 0, y: 0 }

  // background circle
  //sketch.moveto(0, 0, 0)
  //sketch.glcolor(max.getcolor('live_lcd_frame'))
  //sketch.gllinewidth(10)
  //sketch.circle(BALL_DIST, 0, 360)

  // width arc
  const halfW = state.width / 2.0
  sketch.moveto(0, 0, 0)
  const arcColor = max.getcolor('live_control_selection')
  arcColor[3] = 0.1 / state.curve
  sketch.glcolor(arcColor)
  let startDeg = adjustDeg(state.pos - halfW)
  let endDeg = adjustDeg(state.pos + halfW)
  sketch.circle(ARROW_LEN, startDeg, endDeg)

  // position line
  sketch.glcolor(max.getcolor('live_lcd_title'))
  sketch.moveto(0, 0, 0)
  pos = polarToXY(state.pos, ARROW_LEN)
  sketch.gllinewidth(2)
  sketch.line(pos.x, pos.y, 0)

  // center circle
  sketch.moveto(0, 0, 0)
  sketch.glcolor(max.getcolor('live_lcd_frame'))
  sketch.circle(0.1, 0, 360)

  // balls
  //debug('DRAW BALLS')
  //debug('COLORS: ' + state.colors.join(', '))
  const ballIncr = 360.0 / state.numChains
  for (let i = 0; i < state.numChains; i++) {
    //debug('BALL ' + i + ': ' + ballIncr * i)
    const color = parseColor(state.colors[i])
    //debug('COLOR: ' + JSON.stringify(color))
    sketch.glcolor(color.r, color.g, color.b, 1)
    pos = polarToXY(ballIncr * i, BALL_DIST)
    sketch.moveto(pos.x, pos.y, 0)
    sketch.circle(BALL_RADIUS, 0, 360)
  }

  // status
  sketch.moveto(0, -0.95, 0)
  sketch.fontsize(8)
  sketch.textalign("center", "bottom")
  sketch.glcolor(max.getcolor('live_lcd_title'))
  sketch.text(state.status)

  refresh()
}

function setStatus(status: string) {
  state.status = status
  draw()
}

function pos(val: number) {
  //debug('FLOAT: ' + val)
  state.pos = val
  draw()
  updateVolumes()
}

function minVol(val: number) {
  //debug('FLOAT: ' + val)
  state.minVol = val / 100
  draw()
  updateVolumes()
}

function maxVol(val: number) {
  //debug('FLOAT: ' + val)
  state.maxVol = val / 100
  draw()
  updateVolumes()
}

function width(val: number) {
  //debug('WIDTH: ' + val)
  state.width = val
  draw()
  updateVolumes()
}

function curve(val: number) {
  state.curve = val
  draw()
  updateVolumes()
}

function lerp(val: number, min: number, max: number, curve: number) {
  const ret = Math.min(min, max) + (Math.abs(max - min) * (val ** curve))
  //debug('VAL=' + val + ' CURVE=' + curve + ' VALC=' + (val ** curve) + ' MIN=' + min + ' MAX=' + max + ' RET=' + ret)
  return ret
}

function updateVolumes() {
  const halfW = state.width / 2.0
  const ballIncr = 360.0 / state.numChains
  for (var i = 0; i < state.numChains; i++) {
    const ballPos = ballIncr * i
    let delta = Math.abs(state.pos - ballPos)
    if (delta > 180) {
      delta = 360 - delta
    }
    let volume = Math.max(1 - (delta / halfW), 0)

    // min/max
    volume = lerp(volume, state.minVol, state.maxVol, state.curve)

    //debug('VOLUME: ' + volume)
    outlet(OUTLET_VAL, [i + 1, volume * 0.85])
  }
}

function trackColorCallback(slot: number, iargs: IArguments) {
  //debug('TRACK COLOR CALLBACK')
  const args = arrayfromargs(iargs)
  //debug('TRACKCOLOR', args)
  if (args[0] === 'color') {
    state.colors[slot] = args[1]
    draw()
  }
}

function getChainIdsOf(rackObj: LiveAPI) {
  //debug('NUMCHAINS: ' + prevDevice.get('chains').length)
  return rackObj.get('chains').filter((e: any) => e !== 'id')
}

function getRackDevicePaths(thisDevice: LiveAPI, volumeDevicePaths: string[]) {
  var thisDevicePathTokens = thisDevice.unquotedpath.split(' ')
  var tokenLen = thisDevicePathTokens.length
  var thisDeviceNum = parseInt(thisDevicePathTokens[tokenLen - 1])

  if (isNaN(thisDeviceNum)) {
    setStatus('ERROR: NaN device num :(')
    return
  }
  if (thisDeviceNum === 0) {
    // will not be first device if following a rack
    return
  }

  //debug('DEVICENUM = ' + thisDeviceNum)

  var prevDevicePath =
    thisDevicePathTokens.slice(0, tokenLen - 1).join(' ') +
    ' ' +
    (thisDeviceNum - 1)
  //debug('PREVDEVICEPATH=' + prevDevicePath)

  var prevDevice = new LiveAPI(() => { }, prevDevicePath)
  if (!prevDevice.get('can_have_chains')) {
    // prev device needs to support chains
    return
  }
  const chains = prevDevice.get('chains')
  if (!chains) {
    // no chains
    return
  }

  //debug('NUMCHAINS: ' + prevDevice.get('chains').length)
  state.parentObj = prevDevice
  const chainIds = getChainIdsOf(prevDevice)
  state.children = chainIds

  //debug('CHAINIDS: ' + chainIds.join(', '))

  for (let i = 0; i < chainIds.length; i++) {
    const chainId = chainIds[i]
    const chainObj = new LiveAPI((iargs: IArguments) => trackColorCallback(i, iargs), "id " + chainId)
    chainObj.property = 'color'
    var currChainPath =
      dequote(chainObj.path) + ' mixer_device volume'
    //debug('CURR_CHAIN_PATH=' + currChainPath)

    state.colorObjs.push(chainObj)
    state.colors.push(chainObj.get('color'))
    // jsui: initialize  PATHS: "" mixer_device volume, "live_set tracks 6 devices 0 chains 1" mixer_device volume, "live_set tracks 6 devices 0 chains 2" mixer_device volume   
    volumeDevicePaths.push(currChainPath)
  }
}

function getChildTracksOf(parentTrack: LiveAPI) {
  const parentId = parentTrack.id.toString()
  const api = new LiveAPI(() => { }, "live_set")
  const trackCount = api.getcount('tracks')
  //debug('TRACK COUNT: ' + trackCount)
  const childIds: number[] = []

  for (var index = 0; index < trackCount; index++) {
    api.path = 'live_set tracks ' + index
    // debug('GROUP TRACK: ' + api.get('group_track'))
    if (parseInt(api.get('group_track')[1]) === parseInt(parentId)) {
      childIds.push(api.id)
      //debug('FOUND CHILD: ' + api.id + ' = ' + api.unquotedpath + ' mixer_device volume')
    }
  }

  return childIds
}

// called periodically to monitor changes in child tracks/chains
function checkChildren() {
  if (!state.parentObj) {
    return
  }
  let currChildren = null as number[]

  if (state.type === 'group') {
    currChildren = getChildTracksOf(state.parentObj)
  } else if (state.type === 'rack') {
    currChildren = getChainIdsOf(state.parentObj)
  }
  if (!currChildren) {
    return
  }
  if (state.children.length === currChildren.length && state.children.every(function (value, index) { return value === currChildren[index] })) {
    // no change, arrays are the same
    return
  }
  // change in group track population
  //debug("Change in children detected; Initializing...")
  initialize()
}


function getGroupTrackPaths(thisDevice: LiveAPI, volumeDevicePaths: string[]) {
  //debug('GET GROUP TRACK PATHS')
  const thisTrack = new LiveAPI(() => { }, thisDevice.get('canonical_parent'))

  //debug('THIS TRACK: ' + thisTrack.id + ' ' + thisTrack.get("name"))
  if (thisTrack.get('is_foldable')) {
    // THIS IS A GROUP TRACK
    //debug('GROUP TRACK')
    state.parentObj = thisTrack
    state.children = getChildTracksOf(thisTrack)
    //debug('CHILDREN: ' + state.children)
    for (let i = 0; i < state.children.length; i++) {
      const childTrackId = state.children[i]
      const childTrack = new LiveAPI((iargs: IArguments) => trackColorCallback(i, iargs), "id " + childTrackId)
      //debug('GROUP TRACK: ' + childTrack.get('group_track'))
      volumeDevicePaths.push(childTrack.unquotedpath + ' mixer_device volume')
      state.colors.push(childTrack.get('color'))
      childTrack.property = 'color'
      state.colorObjs.push(childTrack)
      //debug('FOUND CHILD: ' + api.id + ' = ' + api.unquotedpath + ' mixer_device volume')
    }
  }
}

function initialize() {
  //debug('INITIALIZE')
  var thisDevice = new LiveAPI(() => { }, 'live_set this_device')
  state.parentObj = null
  state.numChains = 0
  state.colors = []
  state.colorObjs = []
  //debug('THIS DEVICE: ' + thisDevice.id)

  // populate volumeDevicePaths either from a rack device (instrument or effect)
  // or as the parent of a track group
  var volumeDevicePaths: string[] = []
  state.type = "rack"
  getRackDevicePaths(thisDevice, volumeDevicePaths)
  if (volumeDevicePaths.length === 0) {
    getGroupTrackPaths(thisDevice, volumeDevicePaths)
    state.type = "group"
  }

  //debug('PATHS: ' + volumeDevicePaths.join(', '))

  // properly let go of devices for existing live.remote~ objects
  for (var i = 0; i < MAX_PARAMS; i++) {
    outlet(OUTLET_IDS, [i + 1, 'id', 0])
    //debug('REMOVED ' + (i + 1))
  }

  const lookupApi = new LiveAPI(() => { }, "live_set")
  let currChain
  for (currChain = 0; currChain < volumeDevicePaths.length; currChain++) {
    var currChainPath = volumeDevicePaths[currChain]
    lookupApi.path = currChainPath
    if (!lookupApi.path) {
      //debug('last one okay!')
      break
    }
    const deviceParamId = lookupApi.id
    //debug('PARAM_ID: ' + deviceParamId)
    outlet(OUTLET_IDS, [currChain + 1, 'id', deviceParamId])
  }

  if (currChain > 0) {
    setStatus('')
  } else {
    setStatus('ERR: Put me after a rack or in a group.')
  }
  state.numChains = currChain
  //debug('CHAINS: ' + state.numChains)
  updateVolumes()
  draw()
}
