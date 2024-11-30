autowatch = 1
inlets = 1
outlets = 2

mgraphics.init()
mgraphics.relative_coords = 1

const debugLog = true
//const debugLog = false

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

const state = {
  children: [] as number[],
  colorObjs: [] as LiveAPI[],
  colors: [] as number[],
  constantPower: 0,
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

function draw() {
  mgraphics.redraw()
}

const CANVAS_W = 169
const CANVAS_H = 169
const TAU = 2 * Math.PI

function deg2rad(deg: number) {
  return deg * Math.PI / 180
}

function paint() {
  // background
  mgraphics.set_source_rgb(max.getcolor('live_lcd_bg'))
  mgraphics.rectangle(-1.0, 1, 2, 2);
  mgraphics.fill();

  const DIAL_WIDTH = 0.65
  const halfW = state.width / 2.0
  const adjPos = (270 + state.pos) % 360
  const adjRad = deg2rad(adjPos)
  const startPos = adjPos - halfW
  const endPos = adjPos + halfW
  const startRad = deg2rad(startPos)
  const endRad = deg2rad(endPos)

  // nubbin
  const NUBBIN_DIA = 0.15
  mgraphics.set_source_rgb(max.getcolor('live_lcd_control_fg_alt'))
  const adjX = 0.85 * DIAL_WIDTH * Math.cos(adjRad)
  const adjY = 0.85 * DIAL_WIDTH * Math.sin(-adjRad)
  mgraphics.arc(adjX, adjY, NUBBIN_DIA, 0, TAU)
  mgraphics.fill()

  // outer arc
  mgraphics.set_source_rgb(max.getcolor('live_lcd_control_fg_alt'))
  mgraphics.arc(0, 0, DIAL_WIDTH, startRad, endRad)
  mgraphics.stroke()

  // width arc
  mgraphics.set_source_rgb(max.getcolor('live_lcd_control_fg'))
  mgraphics.arc(0, 0, DIAL_WIDTH, startRad, endRad)

  const sampleStartPos = state.pos - halfW
  const sampleEndPos = state.pos + halfW

  const distance = Math.abs(sampleStartPos - sampleEndPos)
  const STEPS = 80
  for (let samplePos = sampleEndPos; samplePos >= sampleStartPos; samplePos -= distance / STEPS) {
    const sampleRad = deg2rad((270 + samplePos) % 360) // need to adjust for plotted points
    const volume = calcVolumeAt(samplePos) // un-adjusted for volume calc
    //debug('VOLUME: ' + volume + ' POS: ' + samplePos)
    const sampleX = DIAL_WIDTH * (1 - volume) * Math.cos(sampleRad)
    const sampleY = DIAL_WIDTH * (1 - volume) * Math.sin(-sampleRad)
    mgraphics.line_to(sampleX, sampleY)
  }
  const startX = DIAL_WIDTH * Math.cos(startRad)
  const startY = DIAL_WIDTH * Math.sin(-startRad)
  mgraphics.line_to(startX, startY)
  mgraphics.fill()

  // center circle
  mgraphics.set_source_rgb(max.getcolor('live_lcd_frame'))
  mgraphics.arc(0, 0, 0.1, 0, TAU)
  mgraphics.fill();

  // balls
  const BALL_DIST = 0.85
  const BALL_RADIUS = 0.10
  const ballIncr = 360.0 / state.numChains
  for (let i = 0; i < state.numChains; i++) {
    //debug('BALL ' + i + ': ' + ballIncr * i)
    const color = parseColor(state.colors[i])
    //debug('COLOR: ' + JSON.stringify(color))
    mgraphics.set_source_rgb(color.r, color.g, color.b)
    const pos = polarToXY(ballIncr * i, BALL_DIST)
    mgraphics.arc(pos.x, pos.y, BALL_RADIUS, 0, TAU)
    mgraphics.fill();
  }

  mgraphics.set_source_rgb(max.getcolor('live_lcd_title'))
  mgraphics.move_to(-0.95, -0.95)
  mgraphics.set_font_size(8)
  mgraphics.text_path(state.status)
  mgraphics.fill()
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

function constantPower(val: number) {
  state.constantPower = val
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

function calcVolumeAt(inPos: number) {
  const halfW = state.width / 2.0
  let delta = Math.abs(state.pos - inPos)
  if (delta > 180) {
    delta = 360 - delta
  }
  let volume = Math.max(1 - (delta / halfW), 0)

  volume = lerp(volume, state.minVol, state.maxVol, state.curve)
  // constant power volume adjustment
  if (state.constantPower) {
    volume = Math.sin(volume * Math.PI / 2)
  }

  return volume
}

function updateVolumes() {
  const halfW = state.width / 2.0
  const ballIncr = 360.0 / state.numChains
  for (var i = 0; i < state.numChains; i++) {
    const ballPos = ballIncr * i
    const volume = calcVolumeAt(ballPos)
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
    var currChainPath = chainObj.unquotedpath + ' mixer_device volume'
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
