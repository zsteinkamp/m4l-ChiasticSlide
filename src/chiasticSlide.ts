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
  pos: 0,
  width: 90,
  curve: 0,
  minVol: 0,
  maxVol: 1,
  numChains: 0,
  colors: [] as number[]
}

function bang() {
  //debug('INIT')
  sendStatus('Initializing...')
  initialize()
}

const ARROW_LEN = 0.50
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

  // width arc
  const halfW = state.width / 2.0
  sketch.glcolor(max.getcolor('live_control_selection'))
  sketch.moveto(0, 0, 0)
  sketch.gllinewidth(2)
  let startDeg = adjustDeg(state.pos - halfW)
  let endDeg = adjustDeg(state.pos + halfW)
  //debug('START: ' + startDeg + ' END: ' + endDeg)
  sketch.framecircle(ARROW_LEN, startDeg, endDeg)

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

  refresh()
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

function lerp(val: number, min: number, max: number) {
  const ret = Math.min(min, max) + (Math.abs(max - min) * val)
  //debug('VAL=' + val + ' MIN=' + min + ' MAX=' + max + ' RET=' + ret)
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
    volume = lerp(volume, state.minVol, state.maxVol)

    //debug('VOLUME: ' + volume)
    outlet(OUTLET_VAL, [i + 1, volume * 0.85])
  }
}

function sendStatus(str: string) {
  // TODO do this in JS
  //outlet(OUTLET_STATUS, str)
  debug('STATUS: ' + str)
}

function getRackDevicePaths(thisDevice: LiveAPI, volumeDevicePaths: string[]) {
  var thisDevicePathTokens = thisDevice.unquotedpath.split(' ')
  var tokenLen = thisDevicePathTokens.length
  var thisDeviceNum = parseInt(thisDevicePathTokens[tokenLen - 1])

  if (isNaN(thisDeviceNum)) {
    sendStatus('ERROR: NaN device num :(')
    return
  }
  if (thisDeviceNum === 0) {
    sendStatus('ERROR: cannot be first device')
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
    sendStatus('ERROR: no chains allowed in prev device')
    return
  }

  //debug('NUMCHAINS: ' + prevDevice.get('chains').length)
  const chainIds = prevDevice.get('chains').filter((e: any) => e !== 'id')


  //debug('CHAINIDS: ' + chainIds.join(', '))

  for (const chainId of chainIds) {
    const chainObj = new LiveAPI(() => { }, "id " + chainId)
    var currChainPath =
      dequote(chainObj.path) + ' mixer_device volume'
    //debug('CURR_CHAIN_PATH=' + currChainPath)

    state.colors.push(chainObj.get('color'))
    // jsui: initialize  PATHS: "" mixer_device volume, "live_set tracks 6 devices 0 chains 1" mixer_device volume, "live_set tracks 6 devices 0 chains 2" mixer_device volume   

    volumeDevicePaths.push(currChainPath)
  }
}

function getGroupTrackPaths(thisDevice: LiveAPI, volumeDevicePaths: string[]) {
  //debug('GET GROUP TRACK PATHS')
  var thisTrack = new LiveAPI(() => { }, thisDevice.get('canonical_parent'))
  //debug('THIS TRACK: ' + thisTrack.id + ' ' + thisTrack.get("name"))
  if (thisTrack.get('is_foldable')) {
    // THIS IS A GROUP TRACK
    //debug('GROUP TRACK')
    var api = new LiveAPI(() => { }, "live_set")
    var trackCount = api.getcount('tracks')
    //debug('TRACK COUNT: ' + trackCount)

    for (var index = 0; index < trackCount; index++) {
      api.path = 'live_set tracks ' + index
      // debug('GROUP TRACK: ' + api.get('group_track'))
      if (parseInt(api.get('group_track')[1]) === parseInt(thisTrack.id.toString())) {
        volumeDevicePaths.push(api.unquotedpath + ' mixer_device volume')
        state.colors.push(api.get('color'))
        //debug('FOUND CHILD: ' + api.id + ' = ' + api.unquotedpath + ' mixer_device volume')
      }
    }
  }
}

function initialize() {
  //debug('INITIALIZE')
  var thisDevice = new LiveAPI(() => { }, 'live_set this_device')
  state.numChains = 0
  state.colors = []
  //debug('THIS DEVICE: ' + thisDevice.id)

  // populate volumeDevicePaths either from a rack device (instrument or effect)
  // or as the parent of a track group
  var volumeDevicePaths: string[] = []
  getRackDevicePaths(thisDevice, volumeDevicePaths)
  if (volumeDevicePaths.length === 0) {
    getGroupTrackPaths(thisDevice, volumeDevicePaths)
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
    sendStatus('OK - Set up ' + currChain + ' chains.')
  } else {
    sendStatus('ERROR: Cannot handle it.')
  }
  state.numChains = currChain
  //debug('CHAINS: ' + state.numChains)
  updateVolumes()
  draw()
}
