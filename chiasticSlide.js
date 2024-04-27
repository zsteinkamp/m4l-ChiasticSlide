autowatch = 1
var MAX_PARAMS = 32
inlets = 1
outlets = 4

var debugLog = false

setinletassist(0, '<Bang> to initialize, <Float> to fade.')
OUTLET_STATUS = 0
OUTLET_VAL = 1
OUTLET_IDS = 2
OUTLET_NUM = 3
setoutletassist(OUTLET_STATUS, '<String> Status message to display.')
setoutletassist(OUTLET_VAL, '<chain idx, val> Volume value for given chain.')
setoutletassist(
  OUTLET_IDS,
  '<chain idx, id, param_id> messages to map live.remote to device id param_id.'
)
setoutletassist(OUTLET_NUM, '<num_chains> number of chains mapped.')

function debug() {
  if (debugLog) {
    post(
      debug.caller ? debug.caller.name : 'ROOT',
      Array.prototype.slice.call(arguments).join(' '),
      '\n'
    )
  }
}

debug('reloaded')

var state = {
  width: 1,
  val: 0,
  width: 2,
  numChains: 0,
  chains: [],
}

function bang() {
  //debug('INIT')
  sendStatus('Initializing...')
  initialize()
}

function fader(val) {
  //debug('FLOAT: ' + val)
  state.val = val
  updateVolumes()
}

function width(val) {
  //debug('WIDTH: ' + val)
  state.width = val
  updateVolumes()
}

function updateVolumes() {
  var chainTurf = 1 / (state.numChains - 1)
  for (var i = 0; i < state.numChains; i++) {
    var myPerfectNumber = i * chainTurf
    var distanceToNumber = Math.abs(state.val - myPerfectNumber)
    var tolerance = chainTurf * state.width
    if (distanceToNumber > tolerance) {
      //debug('VOLVAL ' + i + ' ZERO')
      outlet(OUTLET_VAL, [i + 1, 0.0])
    } else {
      var newVol = (1.0 - distanceToNumber / tolerance) * 0.85
      //debug('VOLVAL ' + i + ' ' + newVol)
      outlet(OUTLET_VAL, [i + 1, newVol])
    }
  }
}

function sendStatus(str) {
  outlet(OUTLET_STATUS, str)
}

function getRackDevicePaths(thisDevice, volumeDevicePaths) {
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

  var prevDevice = new LiveAPI(prevDevicePath)
  if (!prevDevice.get('can_have_chains')) {
    sendStatus('ERROR: no chains allowed in prev device')
    return
  }

  var liveApi = new LiveAPI()
  var currChain
  for (currChain = 0; currChain < MAX_PARAMS; currChain++) {
    var currChainPath =
      prevDevicePath + ' chains ' + currChain + ' mixer_device volume'
    //debug('CURR_CHAIN_PATH=' + currChainPath)

    liveApi.path = currChainPath
    if (!liveApi.path) {
      //debug('last one okay!')
      return
    }
    volumeDevicePaths.push(currChainPath)
  }
}

function getGroupTrackPaths(thisDevice, volumeDevicePaths) {
  var thisTrack = new LiveAPI(thisDevice.get('canonical_parent'))
  if (thisTrack.get('is_foldable')) {
    // THIS IS A GROUP TRACK
    //debug('GROUP TRACK')
    var api = new LiveAPI(this.patcher, 'live_set')
    var trackCount = api.getcount('tracks')
    //debug('THIS TRACK', thisTrack.id)

    for (var index = 0; index < trackCount; index++) {
      api.path = 'live_set tracks ' + index
      //debug(api.path)
      if (parseInt(api.get('group_track')[1]) === parseInt(thisTrack.id)) {
        volumeDevicePaths.push(api.unquotedpath + ' mixer_device volume')
        //debug('FOUND CHILD', api.id, api.unquotedpath + ' mixer_device volume')
      }
    }
  }
}

function initialize() {
  debug('INITIALIZE')
  var thisDevice = new LiveAPI('live_set this_device')

  // populate volumeDevicePaths either from a rack device (instrument or effect)
  // or as the parent of a track group
  var volumeDevicePaths = []
  getRackDevicePaths(thisDevice, volumeDevicePaths)
  if (volumeDevicePaths.length === 0) {
    getGroupTrackPaths(thisDevice, volumeDevicePaths)
  }

  // properly let go of devices for existing live.remote~ objects
  for (var i = 0; i < MAX_PARAMS; i++) {
    outlet(OUTLET_IDS, [i + 1, 'id', 0])
    //debug('REMOVED ' + (i + 1))
  }

  var lookupApi = new LiveAPI()
  var currChain
  for (currChain = 0; currChain < volumeDevicePaths.length; currChain++) {
    var currChainPath = volumeDevicePaths[currChain]
    lookupApi.path = currChainPath
    if (!lookupApi.path) {
      debug('last one okay!')
      break
    }
    var deviceParamId = parseInt(lookupApi.id)
    debug('PARAM_ID: ' + deviceParamId)
    outlet(OUTLET_IDS, [currChain + 1, 'id', deviceParamId])
  }

  if (currChain > 0) {
    sendStatus('OK - Set up ' + currChain + ' chains.')
    outlet(OUTLET_NUM, currChain)
  } else {
    sendStatus('ERROR: Cannot handle it.')
  }
  state.numChains = currChain
  updateVolumes()
}
