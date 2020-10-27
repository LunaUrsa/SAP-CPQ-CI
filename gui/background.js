/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// This file takes messages from main.js and runs python functions.

log.debug('background.js start!')

// Determines if we're in development mode
const isDev = require('electron-is-dev')
// log.log("background - log")
// log.verbose("background - verbose")
// log.debug("background - debug")
// log.warn("background - warn")
// log.error("background - error")

const PY_DIST_FOLDER = 'dist'
const PY_FOLDER = 'engine'
var swal = require('sweetalert2')

const getScriptPath = (PY_MODULE) => {
  log.verbose('getScriptPath - start!')
  // This is where we determine if we should run the exe or .py file
  // Depending on if this has been packaged or not
  try {
    log.verbose('getScriptPath - isDev: ' + isDev.toString())
    if (isDev) {
      log.verbose('getScriptPath - generating python uri')
      return path.join(__dirname, '/../', PY_FOLDER, PY_MODULE + '.py')
    }
    if (process.platform === 'win32') {
      log.verbose('getScriptPath - generating exe uri')
      return path.join(__dirname, '../', PY_DIST_FOLDER, PY_MODULE, PY_MODULE + '.exe')
    }
  } catch (err) {
    log.error('Error!' + err)
  }
}

const createPyProc = (PY_MODULE, args) => {
  log.verbose('createPyProc - start!')
  try {
    const script = getScriptPath(PY_MODULE)
    log.debug('createPyProc - Script Path: ' + script)
    log.debug('createPyProc - Args: ' + args)

    if (isDev) {
      // If the program is NOT packaged then we'll "spawn script"
      pyProc = require('child_process').spawn('python', ['-u', script, args])
      log.verbose('createPyProc - Spawned Script')
    } else {
      // If the program is packaged then we'll "execute file"
      pyProc = require('child_process').execFile(script, [args])
      log.verbose('createPyProc - Executed file')
    }
    if (pyProc != null) {
      log.verbose('createPyProc - child process success!')
    }
  } catch (err) {
    ipcRenderer.send('MESSAGE_FROM_BACKGROUND', {
      message: 'Error: ' + 'createPyProc - ' + err
    })
  }

  var swalMessage = ''

  pyProc.stdout.on('data', (data) => {
    // After the python is running, this will listen for print statements.
    let printStr = data.toString()
    var mainFinished = printStr.indexOf('**MainProcessFinished**')
    var errorIndex = printStr.indexOf('There was an error')
    var loginFinished = printStr.indexOf('ICANSEEYOU')
    var update = printStr.indexOf('swal:')
    var scriptMessage = ''
    var formattedIndicationString = 'FORMATTED CODE PLEASE LET PAST'

    // Depending on what the response it, we do different things.
    var alertObject
    if (errorIndex >= 0) {
      if (printStr.indexOf('Script could not be found') >= 0) {
        scriptMessage = "Your script: '" + args[3] + "' could not be found.\n\n"
        scriptMessage += 'Double check that a script with that name in exists in CPQ with the following code:\n\n'
        scriptMessage += 'ApiResponse = ApiResponseFactory.JsonResponse(SqlHelper.GetList(Param.SQL))'
        sendError(scriptMessage)
        return
      }
      if (printStr.indexOf('Login information rejected') >= 0) {
        scriptMessage = 'Your username and password were not accepted by the site.\n\n'
        scriptMessage += 'Please double check your login information, including domain.'
        sendError(scriptMessage)
        return
      }
      sendError(printStr)
    } else if (mainFinished >= 0) {
      swalMessage = swalMessage + 'Files have been extracted!' + '\n'
      ipcRenderer.send('MESSAGE_FROM_BACKGROUND', {
        message: 'Finished message: ' + swalMessage
      })
    } else if (loginFinished >= 0) {
      var loginObject = {
        title: 'Congratulations!',
        text: 'You were able to login!',
        icon: '',
        showConfirmButton: true,
        allowOutsideClick: true
      }
      ipcRenderer.send('ALERT', {
        message: loginObject
      })
    } else if (update >= 0) {
      var text = printStr.slice(update + 6)
      swalMessage = swalMessage + text + '\n'
      alertObject = {
        title: 'Working...',
        text: swalMessage,
        icon: './images/wait.gif',
        showConfirmButton: false,
        allowOutsideClick: false
      }
      ipcRenderer.send('ALERT', {
        message: alertObject
      })
    } else if (printStr.includes(formattedIndicationString)) {
      printStr = printStr.slice(1)
      printStr = printStr.replace("'", '')
      printStr = printStr.replace("', '" + formattedIndicationString + "']", '')
      printStr = printStr.replace(/', '/g, '')
      printStr = printStr.replace(/~~~/g, '\t')
      printStr = printStr.replace(/@@@/g, '\n')
      document.getElementById('formattedCode').value = printStr
      ipcRenderer.send('MESSAGE_FROM_BACKGROUND', {
        message: 'FORMATTED CODE!'
      })
    } else if (printStr.indexOf('ALERT') >= 0) {
      alertObject = {
        title: PY_MODULE,
        text: printStr.slice(8),
        icon: '',
        showConfirmButton: true,
        allowOutsideClick: true
      }
      ipcRenderer.send('ALERT', {
        message: alertObject
      })
    } else {
      ipcRenderer.send('MESSAGE_FROM_BACKGROUND', {
        message: printStr
      })
    }
  })

  pyProc.stderr.on('data', (data) => {
    log.error(data)
    ipcRenderer.send('MESSAGE_FROM_BACKGROUND', {
      message: 'ERROR - ' + data
    })
  })
}

const exitPyProc = () => {
  pyProc.kill()
  pyProc = null
  pyPort = null
}

/*
*  here we listen to messages from the main process.
*/
ipcRenderer.on('START_PROCESSING', (event, args) => {
  // When told to start from the main process, convert parameters
  // into a function that runs.
  log.verbose('START_PROCESSING - Start')

  const { data } = args
  log.debug('data: ' + data)

  const PY_MODULE = data[0] // without .py suffix
  log.debug('PY_MODULE: ' + PY_MODULE)

  const vals = data[1]
  log.debug('vals: ' + vals)

  createPyProc(PY_MODULE, vals)
  log.verbose('START_PROCESSING - End')
})

ipcRenderer.on('MESSAGE_FROM_BACKGROUND_VIA_MAIN', (event, args) => {
  // When you send "MESSAGE_FROM_BACKGROUND" it gets redirected here.
  // Yeah it's a bit loopy. Not sure if that's necessary of it went a bit overboard.
  log.log('Background: ' + args)
})

ipcRenderer.on('MESSAGE_FROM_RENDERER_VIA_MAIN', (event, args) => {
  // This will display messages from the renderer process
  log.log('Renderer: ' + args)
})

ipcRenderer.on('MESSAGE_FROM_CI_VIA_MAIN', (event, args) => {
  // This will display messages from the renderer process
  log.log('CI: ' + args)
})

ipcRenderer.on('MESSAGE_FROM_MAIN', (event, args) => {
  // This will display messages from the main.js
  log.log('Main: ' + args)
})

ipcRenderer.on('ALERT', (event, args) => {
  // When alerts come from background processes, then sent to main.js
  // They end up here. This included renderer alerts.
  swal.fire(args)
})

log.debug('background.js - end!')
