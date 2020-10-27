/* eslint-disable no-undef */
// This page was mostly taken from the default documentation
// It controlls the right click context menu on the app icon.

const { app, Menu } = require('electron')

const isMac = process.platform === 'darwin'

const settings = require('electron-settings')

const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  // {
  //     label: 'File',
  //     submenu: [
  // isMac ? { role: 'close' } : { role: 'quit' },
  // { type: 'separator' },
  {
    label: 'Toggle Debug Logs',
    type: 'checkbox',
    checked: settings.get('debug_logs'),
    click () {
      var debug = settings.get('debug_logs')
      log.log('Debug was: ' + debug)
      settings.set('debug_logs', !debug)
      log.log('Debug now: ' + !debug)
    }
  },
  {
    label: 'Toggle Verbose Logs',
    type: 'checkbox',
    checked: settings.get('verbose_logs'),
    click () {
      var verbose = settings.get('verbose_logs')
      log.log('Verbose was: ' + verbose)
      settings.set('verbose_logs', !verbose)
      log.log('Verbose now: ' + !verbose)
    }
  },
  { role: 'reload' },
  { role: 'forcereload' },
  { role: 'toggledevtools' }//,
  // {
  //     label: 'Documentation',
  //     click: async () => {
  //         const { shell } = require('electron')
  //         await shell.openExternal('https://electronjs.org')
  //     }
  // },
  // {
  //     label: 'Repository',
  //     click: async () => {
  //         const { shell } = require('electron')
  //         await shell.openExternal('https://electronjs.org')
  //     }
  // }
  //     ]
  // }
  // { role: 'editMenu' }
  // {
  //     label: 'Edit',
  //     submenu: [
  //         { role: 'undo' },
  //         { role: 'redo' },
  //         { type: 'separator' },
  //         { role: 'cut' },
  //         { role: 'copy' },
  //         { role: 'paste' },
  //         ...(isMac ? [
  //             { role: 'pasteAndMatchStyle' },
  //             { role: 'delete' },
  //             { role: 'selectAll' },
  //             { type: 'separator' },
  //             {
  //                 label: 'Speech',
  //                 submenu: [
  //                     { role: 'startspeaking' },
  //                     { role: 'stopspeaking' }
  //                 ]
  //             }
  //         ] : [
  //             { role: 'delete' },
  //             { type: 'separator' },
  //             { role: 'selectAll' }
  //         ])
  //     ]
  // },
  // { role: 'viewMenu' }
  // {
  //     label: 'View',
  //     submenu: [
  //         { role: 'reload' },
  //         { role: 'forcereload' },
  //         { role: 'toggledevtools' },
  //         { type: 'separator' },
  //         { role: 'resetzoom' },
  //         { role: 'zoomin' },
  //         { role: 'zoomout' },
  //         { type: 'separator' },
  //         { role: 'togglefullscreen' }
  //     ]
  // },
  // { role: 'windowMenu' }
  // {
  //     label: 'Window',
  //     submenu: [
  //         { role: 'minimize' },
  //         { role: 'zoom' },
  //         ...(isMac ? [
  //             { type: 'separator' },
  //             { role: 'front' },
  //             { type: 'separator' },
  //             { role: 'window' }
  //         ] : [
  //             { role: 'close' }
  //         ])
  //     ]
  // },
  // {
  //     role: 'help',
  //     submenu: [
  //         {
  //             label: 'Documentation',
  //             click: async () => {
  //                 const { shell } = require('electron')
  //                 await shell.openExternal('https://electronjs.org')
  //             }
  //         },
  //         {
  //             label: 'Repository',
  //             click: async () => {
  //                 const { shell } = require('electron')
  //                 await shell.openExternal('https://electronjs.org')
  //             }
  //         }
  //     ]
  // }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

module.exports = {
  menu
}
