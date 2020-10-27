/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

// https://www.npmjs.com/package/chokidar
// This watches files for changes and then does the "onModify" function
const chokidar = require('chokidar')
// HTTP requests
var request = require('request')
// File system
var fs = require('fs')
// This turns strings into "slugs" or strings that can be used on the windows file system
var slugify = require('slugify')
// Specifically for opening the folder that contains the code
var explorer = require('child_process')

var filePath = ''
var accessToken = ''
var startTime = ''
var watcher
var domain = ''
var baseUrl = ''
var username = ''
var password = ''
var siteKey = ''
var siteInformation = {}
var alertMessage = ''

function startExtraction () {
  try {
    // This will start the export process.
    log.debug('CI.js - startExtraction: Start!')

    // Log the current time to determine how long the entire process takes
    startTime = Date.now()

    // Open the message window to let the user know this is in-progress.
    alertMessage = '<p style="text-align:left;">Starting extraction process...'
    var alertObject = {
      title: 'Working...',
      html: alertMessage,
      imageUrl: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }
    swal.fire(alertObject)

    // Save any changes the user might have made to options.
    save(false)

    // Refresh the most recent information
    refreshCredentials()

    // Start the promise chain
    // Start with getting the access token to login
    var getAccessToken = getToken(false)
    getAccessToken
      .then(function (accessToken) {
        // Get the results for all scripts from CPQ
        var scriptDB = getScriptDB()
        scriptDB
          .then(function (DB) {
            var processed = processDb()
            processed
              .then(
                function (totalFiles) {
                  var endTime = Date.now()
                  var totalTimeSeconds = (endTime - startTime) / 1000
                  alertMessage = alertMessage + `<br><br>${totalFiles} files total pulled!<br>Runtime: ${totalTimeSeconds}s<b>`
                  alertObject = {
                    title: 'Completed!',
                    html: alertMessage,
                    icon: 'success',
                    showConfirmButton: true,
                    confirmButtonText: 'Oh boy!',
                    allowOutsideClick: true
                  }
                  swal.fire(alertObject)
                }
              )
              .catch((err) => sendError(err))
          })
          .catch((err) => sendError(err))
      })
    log.debug('CI.js - startExtraction: End!')
  } catch (error) {
    sendError(error)
  }
}

function refreshCredentials () {
  try {
    // This function will just refresh the global variables
    log.debug('CI.js - refreshCredentials: Start!')
    var alertObject = {}
    alertMessage = alertMessage + '<br>Refreshing Credentials...'
    alertObject = {
      title: 'Working...',
      html: alertMessage,
      imageUrl: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }
    swal.update(alertObject)

    siteKey = document.getElementById('domainSelector').selectedOptions[0].value
    siteInformation = settings.get(siteKey)
    domain = siteInformation.domain
    baseUrl = 'https://' + siteInformation.url
    username = siteInformation.username
    password = siteInformation.password
    filePath = siteInformation.folder
    accessToken = siteInformation.accessToken

    alertMessage = alertMessage + 'Done!'
    alertObject = {
      title: 'Working...',
      html: alertMessage,
      imageUrl: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }
    swal.update(alertObject)
    log.debug('CI.js - refreshCredentials: End!')
  } catch (error) {
    sendError(error)
  }
}

function getToken (refresh) {
  try {
    // This function will generate an authentication token,
    // if one does not exist, or needs to be refreshed

    log.debug('CI.js - getToken: Start!')
    // var accessToken = siteInformation.accessToken

    alertMessage = alertMessage + '<br>Generating Token...'
    var alertObject = {
      title: 'Working...',
      html: alertMessage,
      imageUrl: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }
    swal.update(alertObject)

    // If we already have a token stored, and we're not manually refreshing the token.
    // Then just resolve with the previously generated token.
    if (accessToken && !refresh) {
      return new Promise(function (resolve, reject) {
        alertMessage = alertMessage + 'Done!'
        alertObject = {
          title: 'Working...',
          html: alertMessage,
          imageUrl: './images/wait.gif',
          showConfirmButton: false,
          allowOutsideClick: false
        }
        swal.update(alertObject)
        log.debug('CI.js - getToken: Using existing token!')
        resolve(accessToken)
      })
    }

    // This is a relatively simple POST call using plain-text credentials
    // This takes the information from the application and sends it to CPQ
    // To get a token you need to use your username/password for that CPQ site.
    // Initialy you need to get a token to do the rest of the calls
    // Ideally, CPQ will respond with an authentication token we'll use in future calls.
    tokenUrl = baseUrl + '/basic/api/token'
    var grant = 'grant_type=password&username=' + username + '&password=' + password + '&domain=' + domain
    var tokenOptions = {
      method: 'POST',
      url: tokenUrl,
      headers: {
        'Content-Type': 'text/plain',
        Cookie: 'USE_RESPONSIVE_GUI=1'
      },
      body: grant
    }
    // Debugging credentials
    // log.debug('CI.js - grant: ' + grant)
    // log.debug('CI.js - tokenUrl: ' + tokenUrl)
    return new Promise(function (resolve, reject) {
      // The idea is to wait for the "request" function to funish before returning the body
      // Otherwise the code would continue while "request" is running and use a blank value
      request(tokenOptions, function (error, tokenResponse) {
        if (error) {
          // Very generic error message
          reject(error)
        }
        accessTokenString = JSON.parse(tokenResponse.body).access_token
        var alertObject = {}
        if (accessTokenString !== undefined) {
          // The expected format for the token is "Bearer XXXXXXXetc"
          accessToken = 'Bearer ' + accessTokenString
          siteInformation.accessToken = accessToken
          settings.set(siteKey, siteInformation)

          alertMessage = alertMessage + 'Done!'
          alertObject = {
            title: 'Working...',
            html: alertMessage,
            imageUrl: './images/wait.gif',
            showConfirmButton: false,
            allowOutsideClick: false
          }
          swal.update(alertObject)
          log.debug('CI.js - getToken: End!')
          resolve(accessToken)
        } else {
          error = 'There was an error while generating your token!<br>Double check your credentials are correct!'
          alertMessage = `${error} <br>Username: ${username}<br>Password: ${password}<br>Domain: ${domain}<br>URL: ${tokenUrl}`
          alertObject = {
            title: 'CI Error!',
            html: alertMessage,
            showConfirmButton: false,
            allowOutsideClick: true
          }
          swal.update(alertObject)
          reject(new Error(error))
        }
      })
    })
  } catch (error) {
    sendError(error)
  }
}

function getScriptDB () {
  try {
    // Scripts are contained in tables, accessible from the API script in "createCpqScript"
    // We do a big SQL call to grab basically everything, and then store that DB on the local PC
    // From there we can reference information, like the ScriptID, without needing to query CPQ again
    log.debug('CI.js - getScriptDB: Start!')

    alertMessage = alertMessage + '<br>Pulling Scripts...'
    var alertObject = {
      title: 'Working...',
      html: alertMessage,
      imageUrl: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }
    swal.update(alertObject)

    // This is the big ol SQL statement that grabs everything into a UNIONed table
    // If you think you can improve on this by all means go ahead.
    // There are a ton of other tables that contain scripts, but only these scripts..
    // ..can be updated via API. So that's all i did for now.
    var sqlBase =
    'SELECT ' +
      'CASE ' +
        "WHEN P.System_ID <> '' THEN 'ProductScripts' " +
        "ELSE 'GlobalScripts' " +
      'END AS folder, ' +
      'CAST(S.Script as NVARCHAR(MAX)) as scriptContent, ' +
      "CAST(CONCAT(S.Name, '.py') as NVARCHAR(MAX)) as scriptName, " +
      'S.Id as scriptId, ' +
      'P.SYSTEM_ID as productName, ' +
      'P.PRODUCT_ID as productId ' +
    'FROM ' +
      'SystemEventScript S ' +
    'LEFT JOIN ' +
      'Products P ' +
    'ON ' +
      'S.ProductId = P.product_id ' +
    'WHERE ' +
      "Active = 'True' " +
    'UNION ' +
    'SELECT ' +
      "CAST('CustomActions' as NVARCHAR(MAX)) as folder, " +
      'CAST(Script as NVARCHAR(MAX)) as scriptContent, ' +
      "CAST(CONCAT(Action_Name, '.py') as NVARCHAR(MAX)) as Name, " +
      'ACTION_ID as scriptId, ' +
      'null as productName, ' +
      'null as productId ' +
    'FROM ' +
      'Actions ' +
    'WHERE ' +
      'datalength(Script) > 0 ' +
    'UNION ' +
    'SELECT ' +
      "CAST('CustomCalculations' as NVARCHAR(MAX)) as folder, " +
      'CAST(Script as NVARCHAR(MAX)) as scriptContent, ' +
      "CAST(CONCAT(Name, '.py') as NVARCHAR(MAX)) as scriptName, " +
      'Id as scriptId, ' +
      'null as productName, ' +
      'null as productId ' +
    'FROM ' +
      'CartEditableMathDefn ' +
    'WHERE ' +
      'datalength(Script) > 0 ' +
    'UNION ' +
    'SELECT ' +
      "CAST('CustomResponsiveTemplates' as NVARCHAR(MAX)) as folder, " +
      'CAST(Content as NVARCHAR(MAX)) as scriptContent, ' +
      "CAST(CONCAT(Name, '.html') as NVARCHAR(MAX)) as scriptName, " +
      'Id as scriptId, ' +
      'null as productName, ' +
      'null as productId ' +
    'FROM ' +
      'CustomResponsiveTemplate ' +
    'ORDER BY Name OFFSET 0 ROWS'

    // The API expects a certain format for the SQL being sent.
    // These could be shortened to one line but it's easier to see how the request is built
    var params = '{"SQL": "' + sqlBase + '"}'
    var executeScriptUrl = baseUrl + '/customapi/executescript?scriptname=CanidiumAPI&username=' + username + '&password=' + password + '&domain=' + domain
    var getDBurl = executeScriptUrl + '&param=' + params
    getScriptsOptions = {
      method: 'POST',
      url: getDBurl,
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: 'process',
        Cookie: 'USE_RESPONSIVE_GUI=1'
      }
    }
    // For debugging
    // log.debug('CI.js - Using URL: ' + getDBurl)

    return new Promise(function (resolve, reject) {
      request(getScriptsOptions, function (error, response) {
        if (error) {
          reject(error)
        }
        var statusMessage = response.statusMessage
        if (statusMessage === 'Forbidden') {
          // If you don't have access then it will basically refresh the token and re-run this function
          // This is probably a shitty way to do things but it's the best i could do for now
          var getAccessToken = getToken(true)
            .then(function (AT) {
              request(getScriptsOptions, function (error, response) {
                if (error) {
                  reject(error)
                }
                var statusMessage = response.statusMessage
                if (response.body) {
                  try {
                    var results = JSON.parse(response.body)
                    if (results.indexOf('Unknown script:') >= 0) {
                      var scriptCreated = createCpqScript()
                        .then(function (scriptIGuess) {
                          request(getScriptsOptions, function (error, response) {
                            if (error) {
                              reject(error)
                            }
                            if (response.body) {
                              results = JSON.parse(response.body)
                              if (!results.error) {
                                if (results.pagedRecords) {
                                  results = results.pagedRecords
                                }
                                siteInformation.scriptDatabase = results
                                settings.set(siteKey, siteInformation)

                                alertMessage = alertMessage + 'Done!'
                                var alertObject = {
                                  title: 'Working...',
                                  html: alertMessage,
                                  imageUrl: './images/wait.gif',
                                  showConfirmButton: false,
                                  allowOutsideClick: false
                                }
                                swal.update(alertObject)
                                log.debug('CI.js - getScriptDB: End!')
                                resolve(results)
                              }
                            }
                          })
                        })
                    } else if (!results.error) {
                      if (results.pagedRecords) {
                        results = results.pagedRecords
                      }
                      siteInformation.scriptDatabase = results
                      settings.set(siteKey, siteInformation)

                      alertMessage = alertMessage + 'Done!'
                      alertObject = {
                        title: 'Working...',
                        html: alertMessage,
                        imageUrl: './images/wait.gif',
                        showConfirmButton: false,
                        allowOutsideClick: false
                      }
                      swal.update(alertObject)
                      log.debug('CI.js - getScriptDB: End!')
                      resolve(results)
                    }
                  } catch (error) {
                    reject(error)
                  }
                }
              })
            })
        }
        if (response.body) {
          try {
            var results = JSON.parse(response.body)
            if (results.indexOf('Unknown script:') >= 0) {
              // If you try to run the function and the script does not exist..
              // .. create the script and then re-run the function.
              var scriptCreated = createCpqScript()
                .then(function (scriptIGuess) {
                  request(getScriptsOptions, function (error, response) {
                    if (error) {
                      reject(error)
                    }
                    if (response.body) {
                      results = JSON.parse(response.body)
                      if (!results.error) {
                        if (results.pagedRecords) {
                          results = results.pagedRecords
                        }
                        siteInformation.scriptDatabase = results
                        settings.set(siteKey, siteInformation)

                        alertMessage = alertMessage + 'Done!'
                        alertObject = {
                          title: 'Working...',
                          html: alertMessage,
                          imageUrl: './images/wait.gif',
                          showConfirmButton: false,
                          allowOutsideClick: false
                        }
                        swal.update(alertObject)
                        log.debug('CI.js - getScriptDB: End!')
                        resolve(results)
                      }
                    }
                  })
                })
            } else if (!results.error) {
              if (results.pagedRecords) {
                results = results.pagedRecords
              }
              // Set variables based on the returned information
              siteInformation.scriptDatabase = results

              settings.set(siteKey, siteInformation)

              alertMessage = alertMessage + 'Done!'
              alertObject = {
                title: 'Working...',
                html: alertMessage,
                imageUrl: './images/wait.gif',
                showConfirmButton: false,
                allowOutsideClick: false
              }
              swal.update(alertObject)
              log.debug('CI.js - getScriptDB: End!')
              resolve(results)
            }
          } catch (error) {
            reject(error)
          }
        }
      })
    })
  } catch (error) {
    sendError(error)
  }
}

function createCpqScript () {
  try {
    // Since we use a global script API endpoint for certain functions, we need to make sure the script exists
    // Before this was done manually, now it is automatic using the token we generated
    // This script will be the same on every CPQ site, hardcoded below.
    log.debug('CI.js - createCpqScript: Start!')

    alertMessage = alertMessage + '<br>Creating API Global Script...'
    var alertObject = {
      title: 'Working...',
      html: alertMessage,
      imageUrl: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }
    swal.update(alertObject)

    var url = baseUrl + '/api/script/v1/GlobalScripts'
    createScriptPayload = '{"ScriptDefinition": {"Id": 4, "Name": "API", "SystemId": "api", "Description": "This is an API endpoint. Version 1.0. It can be deleted when finished with development.",  "Script": "ApiResponse = ApiResponseFactory.JsonResponse(SqlHelper.GetList(Param.SQL))",  "Active": "true"}}'

    // var accessToken = siteInformation.accessToken
    createScriptOptions = {
      method: 'POST',
      url: url,
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json'
      },
      body: createScriptPayload
    }
    // log.debug('CI.js - createCpqScript: Starting request!')

    return new Promise(function (resolve, reject) {
      request(createScriptOptions, function (error, response) {
        if (error) {
          reject(error)
        } else {
          var statusMessage = response.statusMessage
          if (statusMessage === 'Created') {
            resolve('Script has been created!')
          } else if (statusMessage === 'Forbidden') {
            // If we can't access the site we try to generate a token and then try again.
            var getAccessToken = getToken(true)
              .then(function (AT) {
                request(createScriptOptions, function (error, response) {
                  if (error) {
                    reject(error)
                  } else {
                    var statusMessage = response.statusMessage
                    if (statusMessage === 'Created') {
                      alertMessage = alertMessage + 'Done!'
                      var alertObject = {
                        title: 'Working...',
                        html: alertMessage,
                        imageUrl: './images/wait.gif',
                        showConfirmButton: false,
                        allowOutsideClick: false
                      }
                      swal.update(alertObject)
                      log.debug('CI.js - createCpqScript: Script Created!')
                      resolve('Script has been created!')
                    }
                  }
                })
              })
          } else {
            var responseMessage = JSON.parse(response.body)
            if (responseMessage.error) {
              var errorMessage = responseMessage.error.message
              if (errorMessage === 'Script name must be unique.') {
              // If the script is already created then fine, silently continue
                log.debug('CI.js - createCpqScript: Scrit already exists!')
                resolve(response.body)
              } else {
                log.error('CI.js - createCpqScript: error:')
                log.error(errorMessage)
                reject(errorMessage)
              }
            }
          }
        }
      })
    })
  } catch (error) {
    sendError(error)
  }
}

async function processDb () {
  try {
    // This will process the newly refreshed scriptDatabase
    log.debug('CI.js - processDb: Start!')

    alertMessage = alertMessage + '<br>Processing data from CPQ...'
    var alertObject = {
      title: 'Working...',
      html: alertMessage,
      imageUrl: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }
    swal.update(alertObject)

    // Grab the latest information
    var scriptDatabase = siteInformation.scriptDatabase

    // Create the base folder, if necessary
    // Sometimes you'll delete the folder you selected
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath)
      log.warn(`Created new folder: ${filePath}`)
    }

    var totalFiles = 0
    // Create a map of promises of each entry in the scriptDB
    // This will ensure the next part does not run until this is finished.
    const promises = scriptDatabase.map(eachScript => {
      totalFiles = totalFiles + 1
      var folder = eachScript[0].Value
      var folderPath = `${filePath}\\${folder}`
      // Create the "globalScripts" folder, for example
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath)
        log.warn(`Created new folder: ${folderPath}`)
      }
      var alertObject

      // If the product name exists, then we need to save this file..
      // ..to the /productName/ folder directory, so we sneak this in before..
      // ..finishing the folderPath variable
      var productName = eachScript[4].Value
      if (productName) {
        // This is a slugify check. Certain characters are not possible to save..
        // .. on a windows file system, so this will conver them and alert the user.
        var convertedProductName = slugify(productName, { replacement: ' ' })
        if (convertedProductName !== productName) {
          alertMessage = alertMessage + `<br><br><b>!!! Warning!!!!</b><br>Cannot use this product name on windows:<br>${productName}<br>This file was automatically renamed to: <br>${convertedProductName}<br>Consider renaming this file in CPQ.<br>`
          alertObject = {
            title: 'Working...',
            html: alertMessage,
            imageUrl: './images/wait.gif',
            showConfirmButton: false,
            allowOutsideClick: false
          }
          swal.update(alertObject)
        }
        folderPath = folderPath + '\\' + convertedProductName
        // Create the /productName/ folder if necessary
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath)
          log.warn(`Created new folder: ${folderPath}`)
        }
      }

      var scriptName = eachScript[2].Value
      // This is a slugify check. Certain characters are not possible to save..
      // .. on a windows file system, so this will conver them and alert the user.
      var convertedScriptName = slugify(scriptName, { replacement: ' ' })
      if (convertedScriptName !== scriptName) {
        alertMessage = alertMessage + `<br><b>!!! Warning!!!!</b><br>Cannot use this script name on windows:<br>${scriptName}<br>This file was automatically renamed to: <br>${convertedScriptName}<br>Consider renaming this file in CPQ.<br>`
        alertObject = {
          title: 'Working...',
          html: alertMessage,
          imageUrl: './images/wait.gif',
          showConfirmButton: false,
          allowOutsideClick: false
        }
        swal.update(alertObject)
      }
      folderPath = folderPath + '\\' + convertedScriptName

      var scriptContent = eachScript[1].Value
      // After all that we finally just save the file to the desktop.
      fs.writeFile(folderPath, scriptContent, function (err) {
        if (err) {
          sendError(err)
        } else {
          log.verbose(`CI.JS - Saved!: ${folderPath}`)
        }
      })
    })

    // Once all entries in the scriptDatabase have been processed, we're done.
    await Promise.all(promises)
    return new Promise(function (resolve, reject) {
      alertMessage = alertMessage + 'Done!'
      var alertObject = {
        title: 'Working...',
        html: alertMessage,
        imageUrl: './images/wait.gif',
        showConfirmButton: false,
        allowOutsideClick: false
      }
      swal.update(alertObject)
      log.debug('CI.js - processDb: End!')
      resolve(totalFiles)
    })
  } catch (err) {
    sendError(err)
  }
}

function openFolder () {
  // All this really does is open the file explorer to the shown folder path.
  var folderLocation = document.getElementById('actual-file').value
  explorer.exec('start "" "' + folderLocation + '"')
}

function initWatcher () {
  try {
    // This is what happens when you toggle the watcher button
    deactivateWatcher()
    refreshCredentials()
    alertMessage = '<p style="text-align:left;">Starting watcher, please wait.<br>Checking for HTML and Python files...'
    var alertObject = {
      title: 'Working...',
      html: alertMessage,
      imageUrl: './images/wait.gif',
      showConfirmButton: false,
      allowOutsideClick: false
    }
    swal.fire(alertObject)

    var totalFiles = 0

    save(false)

    // Create the watch directory.
    // You can have multiple directories and/or file types
    var watchDir = [filePath + '/**/*.py', filePath + '/**/*.html']
    log.log('CI.js - Starting watch process on: ' + watchDir)
    // Initialize watcher.
    watcher = chokidar.watch([watchDir], {
    // ignore dotfiles
      ignored: ['**/env/**/*', '**/build/**/*', '**/dist/**/*', '**/engine/**/*', '**/node_modules/**/*', '**/.git/**/*', /(^|[/\\])\../],
      persistent: true
    })

    // Add event listeners.
    watcher
      .on('add', path => {
        // log.log(`CI.js - File ${path} has been added`)
        // alertMessage = alertMessage + `<br>Starting watcher<br>Checking for HTML and Python files<br>Found ${totalFiles} files so far!`
        // var alertObject = {
        //   title: 'Working...',
        //   html: alertMessage,
        //   imageUrl: './images/wait.gif',
        //   showConfirmButton: false,
        //   allowOutsideClick: false
        // }
        // swal.update(alertObject)
        totalFiles++
      })
      .on('change', path => {
      // When you save changes to a file
        log.log(`CI.js - File ${path} has been changed!`)
        onModify(path)
      })
      .on('unlink', path => {
      // When you delete a file
        log.log(`CI.js - File ${path} has been removed AND I WILL DO NOTHING ABOUT THIS`)
      // onChange(false, path)
      })

    // More possible events.
    watcher
      .on('addDir', path => log.log(`CI.js - Directory ${path} has been added`))
      .on('unlinkDir', path => log.log(`CI.js - Directory ${path} has been removed`))
      .on('error', error => log.log(`CI.js - Watcher error: ${error}`))
      .on('ready', () => {
      // After finishing scanning
        alertMessage = alertMessage + `Done!<br><br> Initial scan complete, found ${totalFiles} files.<br><b>Ready for changes!</b>`
        var alertObject = {
          title: 'Watching',
          html: alertMessage,
          icon: 'success',
          showConfirmButton: true,
          confirmButtonText: 'Disable watcher',
          allowOutsideClick: false,
          onClose: () => {
            deactivateWatcher()
          }
        }
        swal.fire(alertObject)
      })
    // .on('raw', (event, path, details) => { // internal
    //   log.log('Raw event info:', event, path, details)
    // })

  // 'add', 'addDir' and 'change' events also receive stat() results as second
  // argument when available: https://nodejs.org/api/fs.html#fs_class_fs_stats
  // watcher.on('change', (path, stats) => {
  //   if (stats) log.log.log(`File ${path} changed size to ${stats.size}`)
  // })
  } catch (error) {
    sendError(error)
  }
}

function onModify (path) {
  try {
  // This will run every time there is a file change
  // Currently only expects one file change at a time
  // Im not sure we need to prepare for more than one file?
    log.debug('CI.js - onModify: Start!')
    // For debugging, get the time we start the function
    startTime = Date.now()

    // Declare some variables that will be used in this process
    // var fileName = path.slice(path.lastIndexOf('\\') + 1, path.lastIndexOf('.'))
    var fileNameWithExt = path.slice(path.lastIndexOf('\\') + 1)
    var fileName = path.slice(path.lastIndexOf('\\') + 1, path.lastIndexOf('.'))

    var fileFolderPath = path.slice(0, path.lastIndexOf('\\'))
    var fileFolderName = ''
    if (fileFolderPath.indexOf('ProductScripts') > 0) {
      fileFolderName = 'ProductScripts'
    } else {
      fileFolderName = fileFolderPath.slice(fileFolderPath.lastIndexOf('\\') + 1)
    }

    var scriptDatabase = siteInformation.scriptDatabase

    var scriptDetails = {}
    for (var eachScript of scriptDatabase) {
      var scriptName = eachScript[2].Value
      if (fileNameWithExt === scriptName) {
        scriptDetails.folder = eachScript[0].Value
        scriptDetails.scriptContent = eachScript[1].Value
        scriptDetails.scriptName = eachScript[2].Value
        scriptDetails.scriptId = eachScript[3].Value
        scriptDetails.productName = eachScript[4].Value
        scriptDetails.productId = eachScript[5].Value
        // We only need the first one that matches
        break
      }
    }
    // Now that we have the ID of the script, we can use that to pull in the scripts information
    // This is necessary so we don't overwrite existing values with blank information
    var scriptXMLRecieved = getScriptXML(scriptDetails)
    scriptXMLRecieved
      .then(function (scriptXml) {
      // Use that JSON object that represents the file we want to modify to update it.
        // Use that JSON object that represents the file we want to modify to update it.
        var updateSuccess = updateCpqScript(scriptXml, scriptDetails)
        updateSuccess
          .then(function (response) {
          // The final "return" is to display how long it took to the user.
          // Shown in ms since it generally takes less than a second.
            const millis = Date.now() - startTime
            log.warn(`Finished updating script! Runtime: ${millis}ms`)
          })
          .catch((err) => sendError(err))
      })
      .catch((err) => sendError(err))
  } catch (error) {
    sendError(error)
  }
}

function getScriptXML (scriptDict) {
  try {
    log.debug('CI.js - getScriptDetails: Start!')
    // This function is kind of important
    // Without this, every time we updated a script it would blank out the rest of the values
    // EG: If we updated a global script, it would wipe out the Events
    // We could use the same SQL function we use to get the script ID to get the rest of the information...
    // ... however using this API we get a JSON object that's a lot easier to manipulate

    var scriptName = scriptDict.scriptName
    var scriptFolder = scriptDict.folder
    var scriptId = scriptDict.scriptId
    var productId = scriptDict.productId
    var productName = scriptDict.productName
    var scriptInfoUrl
    if (scriptFolder === 'CustomResponsiveTemplates') {
      scriptInfoUrl = `${baseUrl}/api/responsiveTemplate/v1/${scriptFolder}/${scriptId}`
    } else if (scriptFolder === 'ProductScripts') {
      scriptInfoUrl = `${baseUrl}/api/script/v1/products/${productId}/scripts/${scriptId}`
    } else {
      scriptInfoUrl = `${baseUrl}/api/script/v1/${scriptFolder}/${scriptId}`
    }

    log.log(`CI.js - scriptDetailsUrl: ${scriptInfoUrl}`)

    // var accessToken = siteInformation.accessToken
    getScriptOptions = {
      method: 'GET',
      url: scriptInfoUrl,
      headers: {
        Authorization: accessToken
      }
    }
    return new Promise(function (resolve, reject) {
      request(getScriptOptions, function (error, response) {
        var responseBody = response.body
        if (error) {
          reject(error)
        }
        if (response.statusMessage === 'Forbidden') {
          var getAccessToken = getToken(true)
            .then(function (AT) {
              request(getScriptOptions, function (error, response) {
                responseBody = response.body
                if (error) {
                  reject(error)
                }
                if (responseBody) {
                  try {
                    var result = JSON.parse(response.body)
                    log.log('CI.js - getScriptDetails - response.body:')
                    log.log(result)
                    if (!result.error) {
                      var fullFilePath
                      // Once we return valid results, we read the local file contents
                      if (scriptFolder === 'ProductScripts') {
                        fullFilePath = filePath + '\\' + scriptFolder + '\\' + productName + '\\' + scriptName
                      } else {
                        fullFilePath = filePath + '\\' + scriptFolder + '\\' + scriptName
                      }
                      var localScriptCode = fs.readFileSync(fullFilePath).toString()
                      // Depending on the type of file we need to change a different JSON node
                      var lastModifiedBy
                      var lastModifiedOn
                      if (scriptFolder === 'GlobalScripts') {
                        result.scriptDefinition.script = localScriptCode
                        // Because i cant figure out how to set dates
                        result.scriptDefinition.startDate = ''
                        result.scriptDefinition.endDate = ''
                        lastModifiedBy = result.scriptDefinition.modifiedBy
                        lastModifiedOn = result.scriptDefinition.modifiedOn
                      }
                      if (scriptFolder === 'CustomActions') {
                        result.actionDefinition.script = localScriptCode
                        lastModifiedBy = result.actionDefinition.modifiedBy
                        lastModifiedOn = result.actionDefinition.modifiedOn
                      }
                      if (scriptFolder === 'CustomCalculations') {
                        result.calculationDefinition.script = localScriptCode
                        lastModifiedBy = result.calculationDefinition.modifiedBy
                        lastModifiedOn = result.calculationDefinition.modifiedOn
                      }
                      if (scriptFolder === 'CustomResponsiveTemplates') {
                        result.content = localScriptCode
                        lastModifiedBy = result.modifiedBy
                        lastModifiedOn = result.modifiedOn
                      }
                      if (scriptFolder === 'ProductScripts') {
                        result.productScriptDefinition.script = localScriptCode
                        lastModifiedBy = result.productScriptDefinition.modifiedBy
                        lastModifiedOn = result.productScriptDefinition.modifiedOn
                      }
                      log.log(`CI.js - getScriptDetails: File last updated by ${lastModifiedBy} on ${lastModifiedOn}`)

                      log.log('CI.js - updateScript: Checking if i should update script...')
                      if (lastModifiedBy.toLowerCase() !== username.toLowerCase()) {
                        log.debug('CI.js - updateScript: I should not update this script!')
                        return new Promise(function (resolve, reject) {
                          reject(new Error('Someone else updated this file last!<br><br>To avoid a merge conflict, go into CPQ and "Save" this script yourself.'))
                        })
                      }
                      resolve(result)
                    } else {
                      log.error('getScriptxml - Error: ' + result.error.message)
                      reject(error)
                    }
                  } catch (error) {
                    reject(error)
                  }
                }
              })
            })
        }
        if (response.statusMessage === 'Bad Request') {
          reject(response.statusMessage)
        }
        if (responseBody) {
          try {
            var result = JSON.parse(response.body)
            log.log('CI.js - getScriptDetails - response.body:')
            log.log(result)
            if (!result.error) {
              var fullFilePath
              // Once we return valid results, we read the local file contents
              if (scriptFolder === 'ProductScripts') {
                fullFilePath = filePath + '\\' + scriptFolder + '\\' + productName + '\\' + scriptName
              } else {
                fullFilePath = filePath + '\\' + scriptFolder + '\\' + scriptName
              }
              var localScriptCode = fs.readFileSync(fullFilePath).toString()
              // Depending on the type of file we need to change a different JSON node
              var lastModifiedBy
              var lastModifiedOn
              if (scriptFolder === 'GlobalScripts') {
                result.scriptDefinition.script = localScriptCode
                // Because i cant figure out how to set dates
                result.scriptDefinition.startDate = ''
                result.scriptDefinition.endDate = ''
                lastModifiedBy = result.scriptDefinition.modifiedBy
                lastModifiedOn = result.scriptDefinition.modifiedOn
              }
              if (scriptFolder === 'CustomActions') {
                result.actionDefinition.script = localScriptCode
                lastModifiedBy = result.actionDefinition.modifiedBy
                lastModifiedOn = result.actionDefinition.modifiedOn
              }
              if (scriptFolder === 'CustomCalculations') {
                result.calculationDefinition.script = localScriptCode
                lastModifiedBy = result.calculationDefinition.modifiedBy
                lastModifiedOn = result.calculationDefinition.modifiedOn
              }
              if (scriptFolder === 'CustomResponsiveTemplates') {
                result.content = localScriptCode
                lastModifiedBy = result.modifiedBy
                lastModifiedOn = result.modifiedOn
              }
              if (scriptFolder === 'ProductScripts') {
                result.productScriptDefinition.script = localScriptCode
                lastModifiedBy = result.productScriptDefinition.modifiedBy
                lastModifiedOn = result.productScriptDefinition.modifiedOn
              }
              log.log(`CI.js - getScriptDetails: File last updated by ${lastModifiedBy} on ${lastModifiedOn}`)

              log.log('CI.js - updateScript: Checking if i should update script...')
              if (lastModifiedBy.toLowerCase() !== username.toLowerCase()) {
                log.debug('CI.js - updateScript: I should not update this script!')
                return new Promise(function (resolve, reject) {
                  reject(new Error('Someone else updated this file last!<br><br>To avoid a merge conflict, go into CPQ and "Save" this script yourself.'))
                })
              }
              resolve(result)
            } else {
              log.error('getScriptXml - Error: ' + result.error.message)
              reject(error)
            }
          } catch (error) {
            reject(error)
          }
        }
      })
    })
  } catch (error) {
    sendError(error)
  }
}

function updateCpqScript (scriptXml, scriptDetails) {
  try {
    log.debug('CI.js - updateCpqScript: Start!')
    // This will update the script in CPQ
    // It's fairly simple
    var scriptId = scriptDetails.scriptId
    var fileFolderName = scriptDetails.folder
    var scriptName = scriptDetails.scriptName
    var productId = scriptDetails.productId
    var productName = scriptDetails.productName
    var updateUrl
    if (fileFolderName === 'CustomResponsiveTemplates') {
      updateUrl = baseUrl + '/api/responsiveTemplate/v1/' + fileFolderName + '/' + scriptId
    } else if (fileFolderName === 'ProductScripts') {
      updateUrl = `${baseUrl}/api/script/v1/products/${productId}/scripts/${scriptId}`
    } else {
      updateUrl = baseUrl + '/api/script/v1/' + fileFolderName + '/' + scriptId
    }

    log.log(`CI.js - updateUrl: ${updateUrl}`)

    // var accessToken = siteInformation.accessToken
    var updateScriptOptions = {
      method: 'PUT',
      url: updateUrl,
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json'
        // Cookie: 'USE_RESPONSIVE_GUI=1'
      },
      body: JSON.stringify(scriptXml)
    }
    // var updateScriptOptions = {
    //   method: 'PUT',
    //   url: updateUrl,
    //   headers: {
    //     Authorization: accessToken,
    //     'Content-Type': 'application/json',
    //     Cookie: 'USE_RESPONSIVE_GUI=1'
    //   },
    //   body: JSON.stringify(scriptXml)
    // }

    return new Promise(function (resolve, reject) {
      request(updateScriptOptions, function (error, response) {
        if (error) {
          reject(error)
        }
        if (response.statusMessage === 'Forbidden') {
          getToken(true)
          updateCpqScript(scriptXml, scriptDetails)
        } else if (response.body) {
          // Response should not have any body on update
          var result = JSON.parse(response.body)
          reject(result.error.message)
        } else if (response.statusCode === 200) {
          fileFound = 1
          alertMessage = alertMessage + `<br>Updated ${scriptName} in CPQ!`
          var alertObject = {
            title: 'Watcher',
            html: alertMessage,
            showConfirmButton: true,
            confirmButtonText: 'Disable watcher',
            allowOutsideClick: false,
            onClose: () => {
              deactivateWatcher()
              document.getElementById('watcher').checked = false
            }
          }
          swal.update(alertObject)
          resolve('updateScript - Updated script!')
        } else {
          log.error('CI.js - response:')
          log.error(response)
          reject(response)
        }
      })
    })
  } catch (error) {
    sendError(error)
  }
}

function deactivateWatcher () {
  try {
    log.debug('CI.js - deactivateWatcher - Start!')
    watcher.close()
    watcher = null
  } catch (error) {
    log.warn('Could not close watcher, this might be fine.')
  }
}

function save (message) {
  try {
    // This will take the values on the page and save them to memory
    // Get all of the fields we care about saving.
    var domain = document.getElementById('domain').value
    var baseUrl = document.getElementById('url').value
    var username = document.getElementById('username').value
    var password = document.getElementById('password').value
    var filePath = document.getElementById('actual-file').value
    var siteKey = domain + ' @ ' + baseUrl.replace(/\./g, '-')

    // Check if settings already exist, and if so, get them
    // Otherwise we're using the empty object
    var credentialsObject = {}
    if (settings.has(siteKey)) {
      credentialsObject = settings.get(siteKey)
    }
    credentialsObject.url = baseUrl
    credentialsObject.username = username
    credentialsObject.password = password
    credentialsObject.folder = filePath
    credentialsObject.domain = domain

    // Set the values to memory
    settings.set(siteKey, credentialsObject)

    // Then we have to modify which sites are avialable

    // Get a list of available sites
    var availableDomains = []
    availableDomains = settings.get('availableDomains')
    var newDomains = []
    if (availableDomains) {
      // If the object is not empty
      if (!availableDomains.includes(siteKey)) {
        // If the site does not already exist in the list
        availableDomains.push(siteKey)
        newDomains = availableDomains
        settings.set('availableDomains', newDomains)
        getDefaults()
      }
    } else {
      // If the availableDomains object is empty
      // Set the setting to the current domain, in an array form.
      newDomains = [siteKey]
      settings.set('availableDomains', newDomains)
      getDefaults()
    }
    // Alert the user.
    if (message) {
      var alertObject = {
        title: 'Congratulations!',
        html: '<p style="text-align:left;"> Settings have been saved!</p>',
        icon: 'success',
        showConfirmButton: true,
        allowOutsideClick: true
      }
      swal.fire(alertObject)
    }
    ipcRenderer.send('MESSAGE_FROM_RENDERER', {
      message: 'Save - Finished!'
    })
  } catch (error) {
    sendError(error)
  }
}

function getDefaults () {
  try {
    // settings.set('availableDomains')
    // This function runs every time you open exporter.html
    // It read the "settings" and put existing values on the page.
    log.debug('getDefaults - Start!')
    document.getElementById('domainSelector').options.length = 0
    var currentDomains = settings.get('availableDomains')
    if (currentDomains) {
      if (currentDomains.length > 0) {
        var currentDomain = currentDomains[0]
        var domainSettings = settings.get(currentDomain)
        if (domainSettings) {
          document.getElementById('domain').value = domainSettings.domain
          document.getElementById('url').value = domainSettings.url
          document.getElementById('username').value = domainSettings.username
          document.getElementById('password').value = domainSettings.password
          document.getElementById('actual-file').value = domainSettings.folder
        }
        var dropdown = document.getElementById('domainSelector')
        currentDomains.forEach(eachDomain => {
          var option = document.createElement('option')
          option.text = eachDomain
          dropdown.add(option)
        })
      }
    }
    log.debug('renderer - getDefaults - Finished!')
  } catch (error) {
    sendError(error)
  }
}

function sendError (error) {
  log.error(error)
  var message = ''
  if (error.stack) {
    message = error.stack
  } else {
    message = error
  }
  var formattedMessage = '<p style="text-align:left;">' + message
  formattedMessage = formattedMessage.replace(/ at /g, '<br>at ')
  formattedMessage = formattedMessage.replace(/(?<=\()(.*)(?=CanidiumApp)/g, '')
  // formattedMessage = formattedMessage.replace(/ {4}/g, '<br>')
  var alertObject = {
    title: 'Canidium CI Error!',
    width: '60%',
    icon: 'error',
    html: formattedMessage,
    showConfirmButton: true,
    confirmButtonText: 'Send Error Report',
    showCancelButton: true,
    cancelButtonText: 'I did this to myself',
    allowOutsideClick: false
  }
  swal.fire(alertObject)
    .then((result) => {
      if (result.value) {
        autoReport(error.stack)
      }
    })
}

// This function is disabled as of 1.2.0
// function testLogin () {
//   try {
//     // This function will test your login token
//     // If that does not work, it will make a new token
//     log.log('CI.js - testLogin: Start!')
//     // Open the message window to let the user know this is in-progress.
//     alertMessage = 'Trying to login with your information..'
//     var alertObject = {
//       title: 'Working...',
//       html: alertMessage,
//       imageUrl: './images/wait.gif',
//       showConfirmButton: false,
//       allowOutsideClick: false
//     }
//     // Swal 'fire' creates a new window, rather than 'update' an existing one.
//     swal.fire(alertObject)

//     // Save any changes the user might have made to options.
//     save(false)

//     // Refresh the most recent information
//     refreshCredentials()

//     // Now we start the promise-chain.
//     // The idea here is to wait for the variable to get assigned value and ".then" do something
//     // If something goes wrong in the function then ".catch" the error
//     // We need to chain it like this because each part depends on the part before:
//     // You need to get the Access Token first, before you can do anything else.
//     var getAccessToken = getToken(false)
//     getAccessToken
//       .then(function (accessToken) {
//         var alertOjbect
//         if (accessToken.indexOf('Bearer') >= 0) {
//           alertObject = {
//             title: 'Congratulations!',
//             html: '<b>You were able to login using the given credentials!</b>',
//             showConfirmButton: true,
//             allowOutsideClick: true
//           }
//           swal.fire(alertObject)
//         } else {
//           // I'm not sure when this would happen
//           alertObject = {
//             title: 'Oops!',
//             html: accessToken,
//             showConfirmButton: true,
//             allowOutsideClick: true
//           }
//           swal.fire(alertObject)
//         }
//       })
//       .catch((err) => log.error(err))
//   } catch (error) {
//     sendError(error)
//   }
// }

// This function was disabled in 1.2.0 until Eric can re-do it.
// function getCss (results, endpoint) {
//   try {
//     log.warn('CI.js - getCss: Starting')
//     // Branding needs to have this loop because there are multiple branding files:
//     // Bulletin Board CSS, CSS Responsive and legacy CSS.
//     // The BBCSS does not do anything, there is no bulletin board anymore.
//     // Otherwise there's no way to determine which CSS is being used other than to pull both.
//     for (let i = 0; i < results[0].length; i++) {
//       var subElement = results[0][i]
//       var companyName = results[0][0].Value
//       if (subElement.Key !== 'BrandName') {
//         if (subElement.Value) {
//           fileName = subElement.Value
//           var convertedFileName = slugify(fileName, { replacement: ' ' })
//           if (convertedFileName !== fileName) {
//             alertMessage = alertMessage + `<br>!!! Warning!<br>!!! Consider renaming this file to save on windows systems: <br>!!! ${fileName}<br>!!! This file was automatically renamed to: <br>!!! ${convertedFileName}<br>`
//             var alertObject = {
//               title: 'Working...',
//               html: alertMessage,
//               imageUrl: './images/wait.gif',
//               showConfirmButton: false,
//               allowOutsideClick: false
//             }
//             swal.update(alertObject)
//           }

//           brandingUrl = baseUrl + '/mt/' + domain + '/styles/' + convertedFileName
//           log.log('CI.js - brandingUrl:' + brandingUrl)

//           var getCssOptions = {
//             method: 'GET',
//             url: brandingUrl,
//             headers: {
//               'Content-Type': 'text/xml',
//               SOAPAction: 'process',
//               Cookie: 'USE_RESPONSIVE_GUI=1'
//             }
//           }

//           var script
//           request(getCssOptions, function (error, response) {
//             if (error) {
//               reject(error)
//             } else {
//               var script = response.body
//               var folderPath = endpoint + '\\' + companyName
//               scriptDatabase.data.push(
//                 {
//                   scriptFolder: folderPath,
//                   scriptContent: script,
//                   scriptName: convertedFileName
//                 }
//               )
//               log.warn('CI.js - getCss: Pushed on: ' + convertedFileName)
//               log.warn('CI.js - getCss: Resolving on: ' + scriptDatabase.length)
//               // log.debug(`CI.js - Saving CSS: ${fullFilePath}`)
//               // // log.log(script.slice(0, 100))
//               // fs.writeFile(fullFilePath, script, function (err) {
//               //   if (err) throw err
//               //   log.debug('CI.js - Saved CSS!')
//               // })
//             }
//           })
//         }
//       }
//     }
//     resolve(scriptDatabase)
//   } catch (err) {
//     sendError(err)
//   }
// }
