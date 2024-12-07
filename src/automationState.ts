autowatch = 1
inlets = 1
outlets = 1

import { logFactory } from './utils'

const debugLog = true
const log = logFactory({ outputLogs: debugLog })
let directionParamObj: LiveAPI = null

function checkAutomationState(iargs: IArguments) {
  const args = arrayfromargs(iargs)
  //log("CHECK AUTOMATION STATE " + args[1])
  if (args[0] === 'automation_state' && args[1] === 1) {
    return outlet(0, 0) // indicates direction is automated, so emit a 0 to close the gate
  }
  return outlet(0, 1) // not automated, so open the gate with 1
}

function bang() {
  const api = new LiveAPI(() => { }, "this_device")
  const paramCount = api.getcount("parameters")
  for (let i = 0; i < paramCount; i++) {
    api.goto("this_device parameters " + i)
    if (api.get("name").toString() === "Direction") {
      directionParamObj = new LiveAPI(checkAutomationState, "this_device parameters " + i)
      //log('FOUND IT')
      directionParamObj.property = "automation_state"
      return
    }
  }
  log('Error: Could not find Direction param')
}

// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
const module = {}
export = {}