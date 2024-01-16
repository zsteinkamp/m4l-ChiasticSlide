autowatch = 1
inlets = 1
outlets = 1

setinletassist(0, '<Bang> to initialize, <Float> to fade.')
setoutletassist(0, '<String> Status message to display.')
OUTLET_STATUS = 0

var debugLog = true

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
  chains: [],
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
  var chainTurf = 1 / (state.chains.length - 1)
  state.chains.map(function (c, i) {
    var myPerfectNumber = i * chainTurf
    var distanceToNumber = Math.abs(state.val - myPerfectNumber)
    var tolerance = chainTurf * state.width
    if (distanceToNumber > tolerance) {
      //debug('VOLVAL ' + i + ' ZERO')
      c.maxObj.message('float', 0.0)
      //c.param.set('value', 0)
    } else {
      var newVol = (1.0 - distanceToNumber / tolerance) * 0.85
      //debug('VOLVAL ' + i + ' ' + newVol)
      c.maxObj.message('float', newVol)
      //c.param.set('value', newVol)
    }
  })
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

  // properly dispose of created live.remote~ objects
  for (var i = 0; i < state.chains.length; i++) {
    state.chains[i].maxObj.message('id', 0)
    this.patcher.remove(state.chains[i].maxObj)
    debug('REMOVED ' + i)
  }
  state.chains = []

  var currChain = 0
  while (currChain < 100) {
    var currChainPath =
      prevDevicePath + ' chains ' + currChain + ' mixer_device volume'
    //debug('CURR_CHAIN_PATH=' + currChainPath)

    var chainDeviceVolumeParam = new LiveAPI(currChainPath)
    if (!chainDeviceVolumeParam.path) {
      //debug('last one okay!')
      break
    }
    var scriptingName = 'remote' + currChain.toString()
    var maxObj = this.patcher.newdefault(
      0,
      500 + currChain * 25,
      'live.remote~'
    )
    maxObj.setattr('varname', scriptingName)
    var deviceParamId = parseInt(chainDeviceVolumeParam.id)
    debug('PARAM_ID: ' + deviceParamId + ' ' + scriptingName)
    debug(chainDeviceVolumeParam.get('value'))
    var named = this.patcher.message(scriptingName)
    maxObj.message('id', deviceParamId)
    state.chains.push({
      maxObj: named,
      param: chainDeviceVolumeParam,
    })
    currChain += 1
  }

  if (state.chains.length > 0) {
    sendStatus('OK - Set up ' + state.chains.length + ' chains.')
  } else {
    sendStatus('ERROR: Not a rack to my left.')
  }
}
