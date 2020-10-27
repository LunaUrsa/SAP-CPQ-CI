/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// console.clear()
// https://www.npmjs.com/package/chokidar
// This watches files for changes and then does "stuff"
const chokidar = require('chokidar')
// HTTP requests
var request = require('request')
// File system
var fs = require('fs')

var filePath = ''
var fileName = ''
var fileFolderPath = ''
var fileFolderName = ''
var accessToken = ''
var startTime = ''
var watcher

function deactivateWatcher () {
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'deactivateWatcher - Start!'
  })
  // watcher.stop()
  // this.watcher.stop()
  watcher.close()
}

function initWatcher () {
  save(false)
  // Create the watch directory.
  // You can have multiple directories and/or file types
  var watchDir = settings.get('actual-file') + '/**/*.py'
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'Starting watch process on: ' + watchDir
  })
  // Initialize watcher.
  watcher = chokidar.watch([watchDir], {
    // ignore dotfiles
    ignored: ['**/env/**/*', '**/build/**/*', '**/dist/**/*', '**/engine/**/*', '**/node_modules/**/*', '**/.git/**/*', /(^|[/\\])\../],
    persistent: true
  })

  // Add event listeners.
  watcher
    .on('add', path => console.log(`File ${path} has been added`))
    .on('change', path => {
      console.log(`File ${path} has been changed!`)
      onChange(true, path)
    })
    .on('unlink', path => {
      console.log(`File ${path} has been removed`)
      onChange(false, path)
    })

  // More possible events.
  watcher
    .on('addDir', path => console.log(`Directory ${path} has been added`))
    .on('unlinkDir', path => console.log(`Directory ${path} has been removed`))
    .on('error', error => console.log(`Watcher error: ${error}`))
    .on('ready', () => console.log('Initial scan complete. Ready for changes'))
  // .on('raw', (event, path, details) => { // internal
  //   console.log('Raw event info:', event, path, details)
  // })

  // 'add', 'addDir' and 'change' events also receive stat() results as second
  // argument when available: https://nodejs.org/api/fs.html#fs_class_fs_stats
  // watcher.on('change', (path, stats) => {
  //   if (stats) console.console.log(`File ${path} changed size to ${stats.size}`)
  // })
}

function onChange (active, path) {
  // This will run every time there is a file change
  // Currently only expects one file change at a time
  // Im not sure we need to prepare for more than one file?
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'onChange: Start!'
  })
  // For debugging, get the time we start the function
  startTime = Date.now()

  // Declare some variables that will be used in this process
  filePath = path
  fileName = path.slice(path.lastIndexOf('\\') + 1, -3)
  fileFolderPath = path.slice(0, path.lastIndexOf('\\'))
  fileFolderName = fileFolderPath.slice(fileFolderPath.lastIndexOf('\\') + 1)

  var getAccessToken = getToken()
  getAccessToken
    // Now we start the promise-chain.
    // The idea here is to wait for the variable to get assigned value and ".then" do something
    // If something goes wrong in the function then ".catch" the error
    // We need to chain it like this because each part depends on the part before:
    // You need to get the script DB to know the ID of the script you're updating.
    // You need an access token to get the script DB
    .then(function (accessToken) {
      var scriptDB = getScriptDB(fileFolderName)
      scriptDB
        .then(function (DB) {
          var updateSuccess = updateScript(DB, active)
          updateSuccess
            .then(function (response) {
              // The final "return" is to display how long it took to the user.
              // Shown in ms since it generally takes less than a second.
              const millis = Date.now() - startTime
              console.warn(`Finished updating script! Runtime: ${millis}ms`)
            })
            .catch((err) => sendError(err))
        })
        .catch((err) => sendError(err))
    })
    .catch((err) => sendError(err))
}

function testLogin () {
  save(false)
  var getAccessToken = getToken()
  getAccessToken
    // Now we start the promise-chain.
    // The idea here is to wait for the variable to get assigned value and ".then" do something
    // If something goes wrong in the function then ".catch" the error
    // We need to chain it like this because each part depends on the part before:
    // You need to get the script DB to know the ID of the script you're updating.
    // You need an access token to get the script DB
    .then(function (accessToken) {
      var alertOjbect
      if (accessToken.indexOf('Bearer') >= 0) {
        alertObject = {
          title: 'Congratulations!',
          text: 'You were able to login using the given credentials!',
          showConfirmButton: true,
          allowOutsideClick: false
        }
        ipcRenderer.send('ALERT', {
          message: alertObject
        })
      } else {
        alertObject = {
          title: 'Oops!',
          text: accessToken,
          showConfirmButton: true,
          allowOutsideClick: false
        }
        ipcRenderer.send('ALERT', {
          message: alertObject
        })
      }
    })
    .catch((err) => sendError(err))
}

function startExtraction () {
  try {
    // This will start the export process, the main function.
    ipcRenderer.send('MESSAGE_FROM_WATCHER', {
      message: 'startExtraction: Start!'
    })

    startTime = Date.now()

    var alertObject = {
      title: 'Working...',
      text: 'Starting up, please wait',
      icon: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }

    ipcRenderer.send('ALERT', {
      message: alertObject
    })

    // Assuming the user has made changes they want to use,
    // save those changes with the "false" flag so that
    // it does not print the alert that the settings were saved.
    save(false)

    // var watcherButtonValue = document.getElementById('watcher').checked
    // if (watcherButtonValue) {
    //   var alertObject = {
    //     title: 'Oops?',
    //     text: 'You should disable the watcher before pulling files!',
    //     icon: 'error',
    //     showConfirmButton: true,
    //     allowOutsideClick: true
    //   }

    //   ipcRenderer.send('ALERT', {
    //     message: alertObject
    //   })
    //   return
    // }

    // Get a list of "checked" options from the page.
    var parameters = []
    // The the ID of every "input" field on the page.
    var variables = get_ids()
    // For each of those ID's
    for (var i = 0; i < variables.length; i++) {
      var type = document.getElementById(variables[i]).getAttribute('type')
      if (type === 'checkbox') {
        var attrClass = document.getElementById(variables[i]).getAttribute('class')
        var isOption = attrClass.indexOf('option')
        if (isOption >= 0) {
          var value = document.getElementById(variables[i]).checked
          if (value) {
            // Add that ID to a list.
            parameters.push(variables[i])
            ipcRenderer.send('MESSAGE_FROM_WATCHER', {
              message: 'start - Added to params: ' + variables[i]
            })
          }
        }
      }
    }
    if (parameters.length === 0) {
      alertObject = {
        title: 'Oops?',
        text: "You can't extract anything if you don't select something!",
        icon: 'error',
        showConfirmButton: true,
        allowOutsideClick: true
      }

      ipcRenderer.send('ALERT', {
        message: alertObject
      })
      return
    }
    ipcRenderer.send('MESSAGE_FROM_WATCHER', {
      message: 'Parameters: ' + parameters
    })

    var totalCount = 0
    var getAccessToken = getToken()
    getAccessToken
      // Now we start the promise-chain.
      // The idea here is to wait for the variable to get assigned value and ".then" do something
      // If something goes wrong in the function then ".catch" the error
      // We need to chain it like this because each part depends on the part before:
      // You need to get the script DB to know the ID of the script you're updating.
      // You need an access token to get the script DB
      .then(function (accessToken) {
        var scriptExists = createCpqScript()
        scriptExists
          .then(function () {
            parameters.forEach(element => {
              var scriptDB = getScriptDB(element)
              scriptDB
                .then(function (DB) {
                  var processedCount = processResponse(DB)
                  processedCount
                    .then(function (totalFiles) {
                      // The final "return" is to display how long it took to the user.
                      // Shown in ms since it generally takes less than a second.
                      const millis = Date.now() - startTime
                      console.warn(`Finished pulling ${totalFiles} scripts! Runtime: ${millis}ms`)
                    })
                    .catch((err) => sendError(err))
                })
                .catch((err) => sendError(err))
            })
          })
          .catch((err) => sendError(err))
        var alertObject = {
          title: 'Congratulations!',
          text: 'Files have been extracted!',
          showConfirmButton: true,
          allowOutsideClick: true
        }
        ipcRenderer.send('ALERT', {
          message: alertObject
        })
      })
      .catch((err) => sendError(err))
  } catch (error) {
    error_log(error)
  }
}

function getToken () {
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'getToken: Start!'
  })
  var username = settings.get('username')
  var password = settings.get('password')
  var domain = settings.get('domain')
  // Initialy you need to get a token to do the rest of the calls
  // To get a token you need to use your username/password for that CPQ site.
  var grant = 'grant_type=password&username=' + username + '&password=' + password + '&domain=' + domain
  var tokenOptions = {
    method: 'POST',
    url: 'https://sandbox.webcomcpq.com/basic/api/token',
    headers: {
      'Content-Type': 'text/plain',
      Cookie: 'USE_RESPONSIVE_GUI=1'
    },
    body: grant
  }
  console.log(grant)
  return new Promise(function (resolve, reject) {
    // We're also using promises here.
    // The idea is to wait for the "request" function to funish before returning the body
    // Otherwise the code would continue while "request" is running and use a blank value
    request(tokenOptions, function (error, tokenResponse) {
      if (error) {
        // Very generic error message
        console.error('Your token was not generated, check username/password (2)')
        reject(error)
      }
      accessToken = JSON.parse(tokenResponse.body).access_token
      if (accessToken !== undefined) {
        // The expected format for the token is "Bearer XXXXXXXetc"
        accessToken = 'Bearer ' + accessToken
        ipcRenderer.send('MESSAGE_FROM_WATCHER', {
          message: 'getToken: Finished!'
        })
        resolve(accessToken)
      } else {
        //
        resolve('Your token was not generated, check username/password (1)')
      }
    })
  })
}

function updateScript (scriptDict, active) {
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'updateScript: Start!'
  })
  var scriptInfo = {}
  var fileFound = 0
  var updateUrl
  if (active) {
    var script = fs.readFileSync(filePath).toString()
  }
  for (const element of scriptDict) {
    var scriptData
    if (fileFolderName === 'GlobalScripts') {
      scriptData = element.scriptDefinition
    } else if (fileFolderName === 'CustomActions') {
      scriptData = element.actionDefinition
    } else if (fileFolderName === 'CustomCalculations') {
      scriptData = element.calculationDefinition
    }

    var name = scriptData.name
    if (fileName === name) {
      // If the file already exists in CPQ
      ipcRenderer.send('MESSAGE_FROM_WATCHER', {
        message: 'updateScript: Checking if i should update script...'
      })
      var modifiedDate = scriptData.modifiedOn
      var modifiedUser = scriptData.modifiedBy
      ipcRenderer.send('MESSAGE_FROM_WATCHER', {
        message: `updateScript: File last updated by ${modifiedUser} on ${modifiedDate}`
      })
      var username = settings.get('username')
      if (scriptData.modifiedBy !== username) {
        ipcRenderer.send('MESSAGE_FROM_WATCHER', {
          message: 'updateScript: I should not update this script!'
        })
        // var now = new Date().toISOString()

        // ipcRenderer.send('MESSAGE_FROM_WATCHER', {
        //   message: 'updateScript: modDate: ' + modifiedDate
        // })
        // ipcRenderer.send('MESSAGE_FROM_WATCHER', {
        //   message: 'updateScript: nowDate: ' + now
        // })

        // var difference = (((new Date(now) - new Date(modifiedDate)) / 1000) / 60)

        // ipcRenderer.send('MESSAGE_FROM_WATCHER', {
        //   message: 'updateScript: difference in minutes: ' + difference
        // })
        return new Promise(function (resolve, reject) {
          reject(new Error('Someone else updated this file last!\n\nTo avoid a merge conflict, go into CPQ and "Save" this script yourself.'))
        })
      }

      if (!active) {
        script = scriptData.script
      }

      if (fileFolderName === 'GlobalScripts') {
        scriptInfo = {
          ScriptDefinition: {
            Id: scriptData.id,
            Name: fileName,
            Description: scriptData.description,
            Script: script,
            Active: active
          }
        }
      } else if (fileFolderName === 'CustomActions') {
        scriptInfo = {
          actionDefinition: {
            Id: scriptData.id,
            Name: fileName,
            placement: scriptData.placement,
            Script: script,
            Active: active,
            systemId: scriptData.systemId
          },
          actionCondition: {
            globalCondition: element.actionCondition.globalCondition,
            preActionCondition: element.actionCondition.preActionCondition,
            postActionCondition: element.actionCondition.postActionCondition
          }
        }
      } else if (fileFolderName === 'CustomCalculations') {
        scriptInfo = {
          calculationDefinition: {
            Id: scriptData.id,
            Name: fileName,
            isActive: active,
            description: scriptData.description,
            Script: script
          }
        }
      }
      var baseUrl = 'https://' + settings.get('url')
      updateUrl = baseUrl + '/api/script/v1/' + fileFolderName + '/' + scriptData.id
      console.log(`updateUrl: ${updateUrl}`)
      var updateScriptOptions = {
        method: 'PUT',
        url: updateUrl,
        headers: {
          Authorization: accessToken,
          'Content-Type': 'application/json',
          Cookie: 'USE_RESPONSIVE_GUI=1'
        },
        body: JSON.stringify(scriptInfo)
      }
      return new Promise(function (resolve, reject) {
        request(updateScriptOptions, function (error, response) {
          if (error) {
            console.error('Your token was not generated, check username/password')
            reject(error)
          }
          if (response.body) {
            var result = JSON.parse(response.body)
            reject(result.error.message)
          } else {
            fileFound = 1
            resolve('updateScript - Updated script!')
          }
        })
      })
    }
  }
  if (!fileFound) {
    ipcRenderer.send('MESSAGE_FROM_WATCHER', {
      message: 'updateScript: Creating new script!'
    })
    var maxId = 0
    for (const element of scriptDict) {
      var scriptID = scriptData.id
      if (scriptID > maxId) {
        maxId = scriptID
      }
    }

    if (fileFolderName === 'GlobalScripts') {
      scriptInfo = {
        ScriptDefinition: {
          Id: maxId,
          Name: fileName,
          Script: script,
          Active: true
        }
      }
    } else if (fileFolderName === 'CustomActions') {
      scriptInfo = {
        actionDefinition: {
          Id: maxId,
          Name: fileName,
          placement: 'C',
          Script: script,
          Active: true,
          systemId: fileName
        },
        actionCondition: {
          globalCondition: '1',
          preActionCondition: '1',
          postActionCondition: '1'
        }

      }
    } else if (fileFolderName === 'CustomCalculations') {
      scriptInfo = {
        calculationDefinition: {
          Id: maxId,
          Name: fileName,
          isActive: active,
          Script: script
        }
      }
    }
    var baseUrl = 'https://' + settings.get('url')
    updateUrl = baseUrl + '/api/script/v1/' + fileFolderName
    var newScriptOptions = {
      method: 'POST',
      url: updateUrl,
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json',
        Cookie: 'USE_RESPONSIVE_GUI=1'
      },
      body: JSON.stringify(scriptInfo)
    }
    console.log(updateUrl)
    return new Promise(function (resolve, reject) {
      request(newScriptOptions, function (error, response) {
        if (error) {
          reject(error)
        }
        if (response.body) {
          var result = JSON.parse(response.body)
          reject(result)
        } else {
          resolve('createScript - Updated script!')
        }
      })
    })
  }
}

function sendError (error) {
  console.error(error)
  var message = ''
  if (error.stack) {
    message = error.stack + '\n\n Copy this and send in a report please!'
  } else {
    message = error
  }
  var alertObject = {
    title: 'Watcher Error!',
    text: message,
    showConfirmButton: true,
    allowOutsideClick: true
  }
  ipcRenderer.send('ALERT', {
    message: alertObject
  })
}

function getScriptDB (endpoint) {
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'getScriptDB: Starting on: ' + endpoint
  })
  var getScriptOptions
  var username = settings.get('username')
  var password = settings.get('password')
  var domain = settings.get('domain')
  if (endpoint === 'CustomResponsiveTemplates' || endpoint === 'Branding') {
    var baseUrl = 'https://' + settings.get('url')
    var loginUrl = baseUrl + '/customapi/executescript?scriptname=CPQExport5&username=' + username + '&password=' + password + '&domain=' + domain
    var sqlBase
    if (endpoint === 'CustomResponsiveTemplates') {
      sqlBase = 'SELECT Name, Content FROM CustomResponsiveTemplate ORDER BY Name OFFSET 0 ROWS'
    } else if (endpoint === 'Branding') {
      sqlBase = 'SELECT BrandName, BBCSS, CSSResponsive, CSS FROM Multibranding ORDER BY BrandName OFFSET 0 ROWS'
    }
    var params = '{"SQL": "' + sqlBase + '"}'
    var url = loginUrl + '&param=' + params
    getScriptsOptions = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: 'process',
        Cookie: 'USE_RESPONSIVE_GUI=1'
      }
    }
  } else {
    var baseUrl = 'https://' + settings.get('url')
    url = baseUrl + '/api/script/v1/' + endpoint + '/'
    getScriptsOptions = {
      method: 'GET',
      url: url,
      headers: {
        Authorization: accessToken,
        Cookie: 'USE_RESPONSIVE_GUI=1; WebCom-lbal=!Am8Z/ENky55B6bYWzx5fY8jUEUmt17OJbTlLW+eYUOvzABPnayhsAadcGZzucEcsMVK8C0Oco1fZjA=='
      }
    }
  }
  console.log('Using URL: ' + url)
  return new Promise(function (resolve, reject) {
    request(getScriptsOptions, function (error, response) {
      if (error) {
        reject(error)
      }
      if (response.body) {
        try {
          var result = JSON.parse(response.body)
          console.log(result)

          if (!result.error) {
            ipcRenderer.send('MESSAGE_FROM_WATCHER', {
              message: 'getScriptDB: Finished!'
            })
            ipcRenderer.send('MESSAGE_FROM_WATCHER', {
              message: 'getScriptDB: result:' + result
            })
            if (result.pagedRecords) {
              resolve(result.pagedRecords)
            } else {
              resolve(result)
            }
          } else {
            console.error('getScriptDB - Error: ' + result.error.message)
            reject(error)
          }
        } catch (error) {
          reject(error)
        }
      }
    })
  })
}

function createCpqScript () {
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'createCpqScript: Start!'
  })
  var url = 'https://sandbox.webcomcpq.com/api/script/v1/GlobalScripts'
  createScriptPayload = '{"ScriptDefinition": {"Id": 4, "Name": "CPQExport5", "Description": "This is an SQL API endpoint for the CPQ Script Exporter process.",  "Script": "ApiResponse = ApiResponseFactory.JsonResponse(SqlHelper.GetList(Param.SQL))",  "Active": "true",}}'

  createScriptOptions = {
    method: 'POST',
    url: url,
    headers: {
      Authorization: accessToken,
      'Content-Type': 'application/json'
    },
    body: createScriptPayload
  }
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'createCpqScript: Starting request!'
  })
  return new Promise(function (resolve, reject) {
    request(createScriptOptions, function (error, response) {
      if (error) {
        reject(error)
      } else {
        // var result = JSON.parse(response.body)
        ipcRenderer.send('MESSAGE_FROM_WATCHER', {
          message: 'createCpqScript: result: ' + response.body
        })
        ipcRenderer.send('MESSAGE_FROM_WATCHER', {
          message: 'createCpqScript: Finished!'
        })
        resolve(response.body)
      }
    })
  })
}

function processResponse (scriptDB) {
  ipcRenderer.send('MESSAGE_FROM_WATCHER', {
    message: 'processResponse: Start!'
  })

  var totalCount = 0
  scriptDB.forEach(element => {
    if (element[0]) {
      ipcRenderer.send('MESSAGE_FROM_WATCHER', {
        message: 'processResponse: element: ' + element[0].Key
      })
    } else {
      ipcRenderer.send('MESSAGE_FROM_WATCHER', {
        message: 'processResponse: element: ' + element
      })
    }
    var scriptData
    var folder
    var fileName
    var script
    if (element.scriptDefinition) {
      folder = 'GlobalScripts'
      scriptData = element.scriptDefinition
      fileName = scriptData.name + '.py'
      script = scriptData.script
    } else if (element.actionDefinition) {
      folder = 'CustomActions'
      scriptData = element.actionDefinition
      fileName = scriptData.name + '.py'
      script = scriptData.script
    } else if (element.calculationDefinition) {
      folder = 'CustomCalculations'
      scriptData = element.calculationDefinition
      fileName = scriptData.name + '.py'
      script = scriptData.script
    } else if (element[1].Key === 'Content') {
      folder = 'CustomResponsiveTemplate'
      scriptData = {}
      element.forEach(subElement => {
        if (subElement.Key === 'Name') {
          fileName = subElement.Value + '.html'
          console.log(fileName)
        }
        if (subElement.Key === 'Content') {
          script = subElement.Value
          console.log(script.slice(0, 100))
        }
      })
    } else if (element[0].Key === 'BrandName') {
      folder = 'Branding'
      subFolder = element[0].Value
      element.forEach(subElement => {
        if (subElement.Key !== 'BrandName') {
          fileName = subElement.Value
          var filePath = settings.get('actual-file')
          var folderPath = `${filePath}\\${folder}`
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath)
          }
          var companyPath = `${filePath}\\${folder}\\${subFolder}`
          if (!fs.existsSync(companyPath)) {
            fs.mkdirSync(companyPath)
          }

          var fullFilePath = `${companyPath}\\${fileName}`

          var domain = settings.get('domain')
          var baseUrl = 'https://' + settings.get('url')
          brandingUrl = baseUrl + '/mt/' + domain + '/styles/' + fileName
          console.log('brandingUrl:' + brandingUrl)

          var getCssOptions = {
            method: 'GET',
            url: brandingUrl,
            headers: {
              'Content-Type': 'text/xml',
              SOAPAction: 'process',
              Cookie: 'USE_RESPONSIVE_GUI=1'
            }
          }

          var script
          request(getCssOptions, function (error, response) {
            if (error) {
              console.error(error)
            } else {
              script = response.body
              console.log(`Saving  : ${fullFilePath}`)
              console.log(script.slice(0, 100))
              fs.writeFile(fullFilePath, script, function (err) {
                if (err) throw err
                console.log(`Saved!: ${fileName}`)
              })
              totalCount = totalCount + 1
            }
          })
        }
      })
      return new Promise(function (resolve, reject) {
        resolve(totalCount)
      })
    }

    if (scriptData.active !== false) {
      console.log(`Saving  : ${fileName}`)
      var filePath = settings.get('actual-file')
      var folderPath = `${filePath}\\${folder}`
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath)
      }
      var fullFilePath = `${folderPath}\\${fileName}`
      fs.writeFile(fullFilePath, script, function (err) {
        if (err) throw err
        console.log(`Saved!: ${fileName}.py`)
      })
      totalCount = totalCount + 1
    } else {
      console.log(`Inactive: ${fileName}`)
    }
  })
  return new Promise(function (resolve, reject) {
    resolve(totalCount)
  })
}
