/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// The IPC communication tool
const { ipcRenderer } = require('electron')
// How we can talk to the main electron process
const { remote } = require('electron')
// Your "CTRL+V" clipboard
const { clipboard } = require('electron')
const { api } = require('electron-util')
// Utilities for working with file and directory paths
const path = require('path')
// The 'electron-settings' module allows us to read-write to a settings file
// We call it via "remote" so it does not conflict with the settings on the homepage
const settings = require('electron-settings')
const log = require('electron-log')

// The HTML DIV tag ID's for each page we have access to.
const pages = ['home_html', 'weather_html', 'parser_html', 'exporter_html', 'app_html', 'team_html', 'report_error_html']
// A dictionary linking the ID of the menu button with the DIV ID of the html page.
const pageDict = {
  go_home: 'home_html',
  go_weather: 'weather_html',
  go_parser: 'parser_html',
  go_exporter: 'exporter_html',
  go_weather_card: 'weather_html',
  go_parser_card: 'parser_html',
  go_exporter_card: 'exporter_html',
  go_app: 'app_html',
  go_team: 'team_html',
  go_debug: 'report_error_html'
}

module.exports = {
  getCurrentWindow,
  openMenu,
  minimizeWindow,
  maximizeWindow,
  unmaximizeWindow,
  maxUnmaxWindow,
  isWindowMaximized,
  closeWindow
}

log.debug('renderer - start!')

function getCurrentWindow () {
  return remote.getCurrentWindow()
}

/*
 *  Add events to system buttons
 */
function openMenu (x, y) {
  ipcRenderer.send('display-app-menu', { x, y })
}

function minimizeWindow (browserWindow = getCurrentWindow()) {
  if (browserWindow.isMinimizable()) {
    // browserWindow.minimizable for new electron versions
    browserWindow.minimize()
  }
}

function maximizeWindow (browserWindow = getCurrentWindow()) {
  if (browserWindow.isMaximizable()) {
    // browserWindow.maximizable for new electron versions
    browserWindow.maximize()
  }
}

function unmaximizeWindow (browserWindow = getCurrentWindow()) {
  browserWindow.unmaximize()
}

function maxUnmaxWindow (browserWindow = getCurrentWindow()) {
  if (browserWindow.isMaximized()) {
    browserWindow.unmaximize()
  } else {
    browserWindow.maximize()
  }
}

function closeWindow (browserWindow = getCurrentWindow()) {
  browserWindow.close()
}

function isWindowMaximized (browserWindow = getCurrentWindow()) {
  return browserWindow.isMaximized()
}

/*
 *  Index.HTML navigation/manupulation
 */
function home () {
  // When loading the window immediately hide all but the home page.
  const homePage = document.getElementById('home_html')
  homePage.style.display = 'block'
  homePage.onClick = show('home_html')
};

function show (e) {
  // For each of the pages defined above
  for (var i = 0; i < pages.length; i++) {
    // If the page is /not/ the one we want to show
    if (pages[i] !== e) {
      // Set the display to "none"
      var section = document.getElementById(pages[i])
      section.style.display = 'none'
    }
  }
}

function hideId (name) {
  // Use the ID of the element clicked to get the div ID from the above dictionary.
  var pageName = pageDict[name]
  const pageElement = document.getElementById(pageName)
  pageElement.style.display = 'block'
  pageElement.onClick = show(pageName)
}

function showText (x) {
  const passwordsDict = {
    // dictionary for password UI element IDs
    password_hide: 'password',
    username_hide: 'username'
  }

  var textId = passwordsDict[x]
  var checkId = document.getElementById(x)
  if (checkId.checked === true) {
    document.getElementById(textId).type = 'text'
  } else {
    document.getElementById(textId).type = 'password'
    checkId.checked = true
  }
}

/*
 *  Index.HTML navigation/manupulation
 */

function errorLog (error) {
  ipcRenderer.send('MESSAGE_FROM_RENDERER', {
    message: 'errorLog - start!'
  })
  // var just_error = error.slice(error_index + 7)
  var errorString = ''
  try {
    errorString = error.replace(/%/g, '\n')
  } catch (error2) {
    errorString = error.stack
  }

  var alertObject = {
    title: 'Oops',
    text: errorString,
    icon: 'error',
    showConfirmButton: true,
    allowOutsideClick: true
  }

  ipcRenderer.send('ALERT', {
    message: alertObject
  })

  ipcRenderer.send('ALERT', {
    message: errorString
  })

  ipcRenderer.send('MESSAGE_FROM_RENDERER', {
    message: 'errorLog - finished!'
  })
}

function hideWeather () {
  document.getElementById('go_weather').style.display = 'none'
  document.getElementById('go_weather_card').style.display = 'none'
}

function setVersion () {
  // Display the current version
  const version = api.app.getVersion()
  var footerText = document.getElementById('footer_id').innerHTML + ' - ' + version
  document.getElementById('footer_id').innerHTML = footerText
}

window.addEventListener('DOMContentLoaded', () => {
  // When the page is loaded, add events to the following 'buttons'
  setVersion()
  home()
  if (!isDev) {
    hideWeather()
  }
  getDefaults()

  //    /*
  //    * BUTTON TEMPLATE - PASTE TO BOTTOM, ORDER IS IMPORTANT
  //    */
  //    const newButton = document.getElementById("new")
  //    newButton.addEventListener("click", e => {
  //        ipcRenderer.send('MESSAGE_FROM_RENDERER', {
  //            message: "New button clicked!"
  //        });
  //        var value = document.getElementById("ID").value;
  //        ipcRenderer.send('ACTION', {
  //            message: value
  //        });
  //    });

  const usernameHide = document.getElementById('username_hide')
  usernameHide.addEventListener('click', e => {
    showText('username_hide')
  })
  const passwordHide = document.getElementById('password_hide')
  passwordHide.addEventListener('click', e => {
    showText('password_hide')
  })

  const goExporter = document.getElementById('go_exporter')
  goExporter.addEventListener('click', e => {
    hideId('go_exporter')
  })
  const goExporterCard = document.getElementById('go_exporter_card')
  goExporterCard.addEventListener('click', e => {
    hideId('go_exporter_card')
  })
  const goParser = document.getElementById('go_parser')
  goParser.addEventListener('click', e => {
    hideId('go_parser')
  })
  const goParserCard = document.getElementById('go_parser_card')
  goParserCard.addEventListener('click', e => {
    hideId('go_parser_card')
  })
  const goWeather = document.getElementById('go_weather')
  goWeather.addEventListener('click', e => {
    hideId('go_weather')
  })
  const goWeatherCard = document.getElementById('go_weather_card')
  goWeatherCard.addEventListener('click', e => {
    hideId('go_weather_card')
  })
  const goApp = document.getElementById('go_app')
  goApp.addEventListener('click', e => {
    hideId('go_app')
  })
  const goTeam = document.getElementById('go_team')
  goTeam.addEventListener('click', e => {
    hideId('go_team')
  })
  const goDebug = document.getElementById('go_debug')
  goDebug.addEventListener('click', e => {
    hideId('go_debug')
  })
  const goHome = document.getElementById('go_home')
  goHome.addEventListener('click', e => {
    hideId('go_home')
  })

  /*
         * CLOSE "X" BUTTON
         * This goes first so that you can always close the program,
         * in case one of the below buttons error out.
         */
  const closeButton = document.getElementById('close-btn')
  closeButton.addEventListener('click', e => {
    window.closeWindow()
  })

  /*
         * DEV MENU
         */
  const menuButton = document.getElementById('go_home')
  // Right click on the logo to get the dev stuff
  menuButton.addEventListener('contextmenu', e => {
    // Listen for a right-click and then open the rick-click menu at that location
    window.openMenu(e.x, e.y)
  })

  /*
         * MINIMIZE BUTTON
         */
  const minimizeButton = document.getElementById('minimize-btn')
  minimizeButton.addEventListener('click', e => {
    window.minimizeWindow()
  })

  /*
         * FULLSCREEN/WINDOW BUTTON
         */
  const maxUnmaxButton = document.getElementById('max-unmax-btn')
  maxUnmaxButton.addEventListener('click', e => {
    const icon = maxUnmaxButton.querySelector('i.far')

    window.maxUnmaxWindow()

    // Change the middle maximize-unmaximize icons.
    if (window.isWindowMaximized()) {
      icon.classList.remove('fa-square')
      icon.classList.add('fa-clone')
    } else {
      icon.classList.add('fa-square')
      icon.classList.remove('fa-clone')
    }
  })

  const watcherButton = document.getElementById('watcher')
  watcherButton.addEventListener('click', e => {
    initWatcher()
    // var watcherButtonValue = watcherButton.checked
    // if (watcherButtonValue) {
    //   initWatcher()
    // } else {
    //   deactivateWatcher()
    // }
  })

  /*
  * REPORT BUTTON
  */
  const reportButton = document.getElementById('reportButton')
  reportButton.addEventListener('click', e => {
    userSubmittedreport()
  })

  /*
         * WEATHER BUTTON
         */
  const weatherButton = document.getElementById('weatherButton')
  weatherButton.addEventListener('click', e => {
    var city = document.getElementById('city').value
    ipcRenderer.send('MESSAGE_FROM_RENDERER', {
      message: 'Starting weather for: ' + city
    })
    ipcRenderer.send('WEATHER', {
      message: city
    })
  })

  /*
         * CLEAR TEXT AREA BUTTON
         */
  const clearTextAreaButton = document.getElementById('clearTextArea')
  clearTextAreaButton.addEventListener('click', e => {
    try {
      var textareas = document.getElementsByClassName('p_textarea')
      for (i = 0; i < textareas.length; i++) {
        document.getElementById(textareas[i].getAttribute('id')).value = ''
        ipcRenderer.send('MESSAGE_FROM_RENDERER', {
          message: 'Successfully cleared the text area: ' + textareas[i].getAttribute('id')
        })
      }
    } catch (err) {
      ipcRenderer.send('MESSAGE_FROM_RENDERER', {
        message: 'Error when clearing the text areas'
      })
    }
  })

  /*
         * FORMAT CODE BUTTON
         */
  const formatCodeButton = document.getElementById('formatCode')
  formatCodeButton.addEventListener('click', e => {
    var rawCode = document.getElementById('rawCode').value

    ipcRenderer.send('MESSAGE_FROM_RENDERER', {
      message: 'rawCode: ' + rawCode
    })
    ipcRenderer.send('FORMAT', {
      message: rawCode
    })
  })

  /*
         * REVERT CODE BUTTON
         */
  const revertCodeButton = document.getElementById('revertCode')
  revertCodeButton.addEventListener('click', e => {
    var formattedCode = document.getElementById('formattedCode').value
    rawCode = formattedCode.replace(/\n/g, '')
    rawCode = rawCode.replace(/\t/g, '')
    rawCode = rawCode.replace(/\r/g, '')
    document.getElementById('rawCode').value = rawCode
    ipcRenderer.send('MESSAGE_FROM_RENDERER', {
      message: 'rawCode: ' + rawCode
    })
  })

  /*
         * COPY RAW CODE BUTTON
         */
  const copyRawCodeButton = document.getElementById('copyRawCode')
  copyRawCodeButton.addEventListener('click', e => {
    document.getElementById('rawCode').select()
    document.execCommand('copy')
    document.getSelection().removeAllRanges()
  })

  /*
         * COPY FORMATTED CODE BUTTON
         */
  const copyFormattedCodeButton = document.getElementById('copyFormattedCode')
  copyFormattedCodeButton.addEventListener('click', e => {
    document.getElementById('formattedCode').select()
    document.execCommand('copy')
    document.getSelection().removeAllRanges()
  })

  /*
         * SUPER REVERT CODE BUTTON
         */
  const superRevertCodeButton = document.getElementById('superRevertCode')
  superRevertCodeButton.addEventListener('click', e => {
    var clipdata = clipboard.readText()
    document.getElementById('formattedCode').value = clipdata
    var formattedCode = clipdata
    rawCode = formattedCode.replace(/\n/g, '')
    rawCode = rawCode.replace(/\t/g, '')
    rawCode = rawCode.replace(/\r/g, '')
    document.getElementById('rawCode').value = rawCode
    ipcRenderer.send('MESSAGE_FROM_RENDERER', {
      message: 'rawCodeS: ' + rawCode
    })
  })

  /*
         * SUPER FORMAT CODE BUTTON
         */
  const superFormatCodeButton = document.getElementById('superFormatCode')
  superFormatCodeButton.addEventListener('click', e => {
    var clipdata = clipboard.readText()
    document.getElementById('rawCode').value = clipdata
    var rawCode = clipdata
    ipcRenderer.send('MESSAGE_FROM_RENDERER', {
      message: 'rawCode: ' + rawCode
    })
    ipcRenderer.send('FORMAT', {
      message: rawCode
    })
  })

  /*
    * SELECT FOLDER BUTTON
    */
  const { dialog } = require('electron').remote
  const selectFolderButton = document.getElementById('select-file')
  selectFolderButton.addEventListener('click', e => {
    ipcRenderer.send('MESSAGE_FROM_RENDERER', {
      message: 'select_folder - Start'
    })
    const options = {
      // See place holder 1 in above image
      title: 'Pick a folder!',

      // See place holder 3 in above image
      buttonLabel: 'Put code here!',

      // Allows the user to select a folder.
      properties: ['openDirectory']
    }
    var folderPath = dialog.showOpenDialogSync(options, (dir) => {
      ipcRenderer.send('MESSAGE_FROM_RENDERER', {
        message: 'test'
      })
    })
    // folderPaths is an array that contains all the selected paths
    if (typeof folderPath === 'undefined') {
      ipcRenderer.send('MESSAGE_FROM_RENDERER', {
        message: 'No destination folder selected'
      })
    } else {
      ipcRenderer.send('MESSAGE_FROM_RENDERER', {
        message: folderPath[0]
      })
      document.getElementById('actual-file').value = folderPath[0]
    }
  })

  /*
    * START BUTTON
    */
  const startButton = document.getElementById('startExtraction')
  startButton.addEventListener('click', e => {
    startExtraction()
  })

  /*
    * SAVE BUTTON
    */
  const saveButton = document.getElementById('save(true)')
  saveButton.addEventListener('click', e => {
    save(true)
  })

  /*
    * RESET BUTTON
    */
  // const resetButton = document.getElementById('reset')
  // resetButton.addEventListener('click', e => {
  //   try {
  //     // This will grab the values from memory and replace those on the page.
  //     // EG: the user changes the password but didn't want to do that
  //     ipcRenderer.send('MESSAGE_FROM_RENDERER', {
  //       message: 'reset - Start!'
  //     })
  //     // Simply run the getDefaults function again.
  //     // Usually this function runs when you open the page
  //     // You could just go "back" and then re-load the page, but now it's a button!
  //     getDefaults()
  //     // Alert the user
  //     var alertObject = {
  //       title: 'Exporter',
  //       text: 'Settings have been reset!',
  //       icon: '',
  //       showConfirmButton: true,
  //       allowOutsideClick: true
  //     }

  //     ipcRenderer.send('ALERT', {
  //       message: alertObject
  //     })

  //     ipcRenderer.send('MESSAGE_FROM_RENDERER', {
  //       message: 'reset - Finished!'
  //     })
  //   } catch (error) {
  //     ipcRenderer.send('ALERT', {
  //       message: error
  //     })
  //   }
  // })

  /*
  * TEST LOGIN BUTTON
  */
  // const testLoginButton = document.getElementById('testLogin')
  // testLoginButton.addEventListener('click', e => {
  //   testLogin()
  // })

  /*
  * TEST LOGIN BUTTON
  */
  const testLoginButton = document.getElementById('openFolder')
  testLoginButton.addEventListener('click', e => {
    openFolder()
  })

  /*
  * SELECT DOMAIN LIST
  */
  const selectList = document.getElementById('domainSelector')
  selectList.addEventListener('change', function () {
    var siteKey = selectList.selectedOptions[0].value
    var domainSettings = settings.get(siteKey)
    document.getElementById('domain').value = domainSettings.domain
    document.getElementById('url').value = domainSettings.url
    document.getElementById('username').value = domainSettings.username
    document.getElementById('password').value = domainSettings.password
    document.getElementById('actual-file').value = domainSettings.folder
  })

  /*
  * DELETE DOMAIN BUTTON
  */
  const deleteDomainButton = document.getElementById('deleteConfig')
  deleteDomainButton.addEventListener('click', e => {
    var domainSelector = document.getElementById('domainSelector')
    var selectedDomain = domainSelector.selectedOptions[0].value
    settings.delete(selectedDomain)
    for (var i = 0; i < domainSelector.length; i++) {
      if (domainSelector.options[i].value === selectedDomain) {
        domainSelector.remove(i)
      }
    }
    var availableDomains = []
    availableDomains = settings.get('availableDomains')

    const index = availableDomains.indexOf(selectedDomain)
    if (index > -1) {
      availableDomains.splice(index, 1)
      settings.set('availableDomains', availableDomains)
    }

    var alertObject = {
      title: 'Exporter',
      text: `${selectedDomain} has been deleted!`,
      icon: '',
      showConfirmButton: true,
      allowOutsideClick: true
    }

    ipcRenderer.send('ALERT', {
      message: alertObject
    })
  })

  /*
  * Collapseable buttons
  */
  var coll = document.getElementsByClassName('collapsible')
  var i
  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener('click', function () {
      this.classList.toggle('active')
      var content = this.nextElementSibling
      if (content.style.display === 'block') {
        content.style.display = 'none'
      } else {
        content.style.display = 'block'
      }
    })
  }
})

ipcRenderer.on('update_message', function (event, text) {
  var container = document.getElementById('messages')
  var message = document.createElement('div')
  message.innerHTML = text
  container.appendChild(message)
})

// Let the main process know the background process has loaded.

log.debug('renderer - end!')
