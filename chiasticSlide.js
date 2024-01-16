autowatch = 1
var MAX_PARAMS = 32
inlets = 1
outlets = MAX_PARAMS + 1

setinletassist(0, '<Bang> to initialize, <Float> to fade.')
setoutletassist(0, '<String> Status message to display.')
OUTLET_STATUS = 0

var debugLog = false

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
  //chains: [],
}

function bang() {
  //debug('INIT')
  sendStatus('Initializing...')
  initialize()
}

function fader(val) {
  val = val / 100.0
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
      outlet(i + 1, 0.0)
    } else {
      var newVol = (1.0 - distanceToNumber / tolerance) * 0.85
      //debug('VOLVAL ' + i + ' ' + newVol)
      outlet(i + 1, newVol)
    }
  }
}

function sendStatus(str) {
  outlet(OUTLET_STATUS, str)
}

function initialize() {
  debug('INITIALIZE')
  var thisDevice = new LiveAPI('live_set this_device')
  var thisDevicePathTokens = thisDevice.unquotedpath.split(' ')
  if (thisDevicePathTokens.length != 5) {
    sendStatus('ERROR: invalid path ' + thisDevicePathTokens.join(','))
    return
  }
  var thisDeviceNum = parseInt(thisDevicePathTokens[4])

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
    thisDevicePathTokens.slice(0, 4).join(' ') + ' ' + (thisDeviceNum - 1)
  //debug('PREVDEVICEPATH=' + prevDevicePath)

  var prevDevice = new LiveAPI(prevDevicePath)
  if (!prevDevice.get('can_have_chains')) {
    sendStatus('ERROR: no chains allowed in prev device')
    return
  }

  var jsObj = this.patcher.getnamed('jsObj')

  // properly let go of devices for existing live.remote~ objects
  for (var i = 0; i < MAX_PARAMS; i++) {
    outlet(i + 1, ['id', 0])
    //debug('REMOVED ' + (i + 1))
  }

  var currChain = 0
  while (currChain < MAX_PARAMS) {
    var currChainPath =
      prevDevicePath + ' chains ' + currChain + ' mixer_device volume'
    //debug('CURR_CHAIN_PATH=' + currChainPath)

    var chainDeviceVolumeParam = new LiveAPI(currChainPath)
    if (!chainDeviceVolumeParam.path) {
      //debug('last one okay!')
      break
    }
    var deviceParamId = parseInt(chainDeviceVolumeParam.id)
    debug('PARAM_ID: ' + deviceParamId)
    outlet(currChain + 1, ['id', deviceParamId])
    currChain += 1
  }

  if (currChain > 0) {
    sendStatus('OK - Set up ' + currChain + ' chains.')
  } else {
    sendStatus('ERROR: Not a rack to my left.')
  }
  state.numChains = currChain
  updateVolumes()
}
