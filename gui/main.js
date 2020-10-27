/* eslint-disable no-unused-vars */
// Main.js
// This file is called in the package.json file as the 'main' script.
// It's the first script that will run in the application.
// It is basically the main processor of the two other javascript files:
// renderer.js - Controls most of the UI functionality.
// background.js - Runs

// 'require' is a node.js specific function to load modules

// 'electron' is the module we use to run....electron!
const electron = require('electron')
// 'electron-settings' allow us to import/export user settings
const settings = require('electron-settings')
// 'path' is windows file path formatting
const path = require('path')
// 'url' is URL formatting
const url = require('url')
// ipcMain handles the Main IPC process, for inter-process communication
const { ipcMain } = require('electron')
// Right-click menu module
const { menu } = require('./menu')
// Check if this is being run on windows or not.
const isWindows = process.platform === 'win32'
// Sweet alert is the pop-up menu.
var swal = require('sweetalert2')
// Auto update module
const { autoUpdater } = require('electron-updater')
const { Menu } = require('electron')
const { protocol } = require('electron')
const log = require('electron-log')

// Github reports
const { openNewGitHubIssue } = require('electron-util')
// Debug tools
const debug = require('electron-debug')
debug()
// Determine if we're in development or not
const isDev = require('electron-is-dev')

// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

app.on('ready', () => {
  if (isDev) {
    log.log('main.js - Running in DEVELOPMENT MODE')
  } else {
    log.log('main.js - Running in PRODUCTION')
  }
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  log.log('main.js - App is ready, creating window!')
  // Create the Menu
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  createWindow()
  autoUpdater.checkForUpdates()
})

app.on('activate', function () {
  if (isDev) {
    log.log('Running in DEVELOPMENT MODE')
  } else {
    log.log('Running in PRODUCTION')
  }
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  log.log('main.js - App is ready, creating window! (Mac version)')
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('window-all-closed', function () {
  // Quit when all windows are closed.
  log.log('main.js - closing app!')
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
})

function createWindow () {
  /* Create the browser window.
    *  This only needs to happen once
    *  If the window is closed the program ends
    */
  log.log('main.js - createWindow start!')
  mainWindow = new BrowserWindow({
    frame: false, // This removes the windows buttons and file menu
    webPreferences: {
      nodeIntegration: true // This enables us to import node modules
      // webSecurity: false
    }
  })
  log.log('main.js - Window opened')

  mainWindow.maximize() // Maximize the window
  log.log('main.js - Window Maximixed')

  const homeUrl = path.join(__dirname, './index.html')
  mainWindow.loadURL(url.format({
    // Load the index.html of the app.
    pathname: homeUrl,
    protocol: 'file:',
    slashes: true
  }))
  log.log('main.js - Loaded homepage: ' + homeUrl)

  if (settings.get('debug_logs')) {
    // Open the DevTools if the developer flag is set.
    log.log("main.js - Opening dev tools because you're a developer!")
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', function () {
    // Emitted when the window is closed.
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  if (isDev) {
    // Finalize the initialization process in the log
    log.log('main.js - createWindow finished!')
    log.log('main.js - Electron has started successfully!')
    log.log('main.js - Check the Chrome developer console from here.')
    log.log('main.js - Good luck team!')
  }
}

/*
** Auto Updates
*/
// -------------------------------------------------------------------
// Logging
//
// THIS SECTION IS NOT REQUIRED
//
// This logging setup is not required for auto-updates to work,
// but it sure makes debugging easier :)
// -------------------------------------------------------------------
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'

autoUpdater.setFeedURL({
  provider: 'github',
  repo: 'SAP-CPQ-CI',
  owner: 'LunaUrsa',
  private: true,
  token: '2c15ec50f8382bc2c56f5ad5fec115ed878708bd'
})

log.info('main.js - App starting...')

// -------------------------------------------------------------------
// Define the menu
//
// THIS SECTION IS NOT REQUIRED
// -------------------------------------------------------------------
const template = []
if (process.platform === 'darwin') {
  // OS X
  const name = app.getName()
  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        role: 'about'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click () { app.quit() }
      }
    ]
  })
}

// -------------------------------------------------------------------
// Open a window that displays the version
//
// THIS SECTION IS NOT REQUIRED
//
// This isn't required for auto-updates to work, but it's easier
// for the app to show a window than to have to click "About" to see
// that updates are working.
// -------------------------------------------------------------------

let win

function sendStatusToWindow (text) {
  log.warn(text)
  // win.webContents.send('message', text);
}

function createDefaultWindow () {
  win = new BrowserWindow()
  win.on('closed', () => {
    win = null
  })
  win.loadURL(`file://${__dirname}/version.html#v${app.getVersion()}`)
  return win
}

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('main.js - Checking for update...')
})
autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('main.js - Update available.')
})
// autoUpdater.on('update-not-available', (info) => {
//   sendStatusToWindow('main.js - Update not available.')
// })
autoUpdater.on('error', (err) => {
  sendStatusToWindow('main.js - Error in auto-updater. ' + err)
})
autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = 'Download speed: ' + progressObj.bytesPerSecond
  logMessage = logMessage + ' - Downloaded ' + progressObj.percent + '%'
  logMessage = logMessage + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
  sendStatusToWindow('main.js - ' + logMessage)
})
autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('main.js - Update downloaded')
})

app.on('ready', function () {
  // Create the Menu
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // createDefaultWindow();
})

// -------------------------------------------------------------------
// Auto updates - Option 2 - More control
//
// For details about these events, see the Wiki:
// https://github.com/electron-userland/electron-builder/wiki/Auto-Update#events
//
// The app doesn't need to listen to any events except `update-downloaded`
//
// Uncomment any of the below events to listen for them.  Also,
// look in the previous section to see them being used.
// -------------------------------------------------------------------
autoUpdater.on('checking-for-update', () => {
})
autoUpdater.on('update-available', (info) => {
})
autoUpdater.on('update-not-available', (info) => {
})
autoUpdater.on('error', (err) => {
  log.error(err)
})
autoUpdater.on('download-progress', (progressObj) => {
})
autoUpdater.on('update-downloaded', (info) => {
  autoUpdater.quitAndInstall()
})

/*
**  From here on we listen to events from background/renderer processes
*/

ipcMain.on('display-app-menu', function (e, args) {
  // When ipcRenderer sends mouse click co-ordinates, show menu at that point.
  // This is used in renderer.js and attached to the menu in the top left
  // We need index.html to start and load renderer.js to attach it to the page element.
  //
  if (isWindows && mainWindow) {
    menu.popup({
      window: mainWindow,
      x: args.x,
      y: args.y
    })
  }
})

ipcMain.on('MESSAGE_FROM_BACKGROUND', (event, args) => {
  // This event listener will listen for data being sent back
  // from the background process
  // log.log(args.message)
  mainWindow.webContents.send('MESSAGE_FROM_BACKGROUND_VIA_MAIN', args.message)
})

ipcMain.on('MESSAGE_FROM_RENDERER', (event, args) => {
  // This event listener will listen for data being sent back
  // from the renderer process
  // log.log(args.message)
  mainWindow.webContents.send('MESSAGE_FROM_RENDERER_VIA_MAIN', args.message)
})

ipcMain.on('MESSAGE_FROM_CI', (event, args) => {
  // This event listener will listen for data being sent back
  // from the renderer process
  // log.log(args.message)
  mainWindow.webContents.send('MESSAGE_FROM_CI_VIA_MAIN', args.message)
})

ipcMain.on('WEATHER', (event, args) => {
  mainWindow.webContents.send('START_PROCESSING', {
    data: ['weather_engine', args.message]
  })
})

ipcMain.on('REPORT', (event, args) => {
  mainWindow.webContents.send('START_PROCESSING', {
    data: ['report', args.message]
  })
})

ipcMain.on('FORMAT', (event, args) => {
  mainWindow.webContents.send('START_PROCESSING', {
    data: ['parser', args.message]
  })
})

ipcMain.on('EXPORT', (event, args) => {
  mainWindow.webContents.send('START_PROCESSING', {
    data: ['exporter', args.message]
  })
})

ipcMain.on('ALERT', (event, args) => {
  log.log(args.message)
  mainWindow.webContents.send('ALERT', args.message)
})
