/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
var createIssue = require('github-create-issue')
const readLastLines = require('read-last-lines')

function userSubmittedreport () {
  var canSendReport = 1
  const requiredVars = [
    'reportType',
    'reportSection',
    'reportSeverity',
    'reportSummary',
    'reportDescription',
    'reportEmail'
  ]
  for (let index = 0; index < requiredVars.length; index++) {
    const element = document.getElementById(requiredVars[index]).value
    if (element === '' || element === 'Choose...') {
      var alertMessage = 'You need to add info to all fields!'
      var alertObject = {
        title: 'Completed!',
        html: alertMessage,
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'Oh boy!',
        allowOutsideClick: true
      }
      swal.fire(alertObject)
      return
    }
  }
  var reportTypeElement = document.getElementById('reportType')
  var reportType = reportTypeElement.options[reportTypeElement.selectedIndex].text

  var reportComponentElement = document.getElementById('reportSection')
  var reportComponent = reportComponentElement.options[reportComponentElement.selectedIndex].text

  var reportSeverityElement = document.getElementById('reportSeverity')
  var reportSeverity = reportSeverityElement.options[reportSeverityElement.selectedIndex].text

  var reportSummary = document.getElementById('reportSummary').value
  var reportDescription = document.getElementById('reportDescription').value
  var reportReproduce = document.getElementById('reportReproduce').value
  var reportExpected = document.getElementById('reportExpected').value
  var reportEmail = document.getElementById('reportEmail').value

  if (canSendReport) {
    const typeDict = {
      'Bug/Issue': 'Type: Bug',
      'Documentation Request': 'Type: Documentation',
      'Enhancement Request': 'Type: Enhancement',
      Question: 'Type: Question',
      'Suggestion/Feedback': 'Type: Feedback',
      'Just saying thanks!': 'Type: Thank you',
      Other: ''
    }

    const componentDict = {
      General: 'Component: General',
      Exporter: 'Component: Exporter',
      Parser: 'Component: Parser',
      Weather: 'Component: Weather',
      UI: 'Component: UI',
      Other: ''

    }

    const severityDict = {
      'Critical - Application breaks entirely': 'Priority: Critical',
      'High - Error messages show or functionality does not work': 'Priority: High',
      'Medium - Something to consider for future dev': 'Priority: Medium',
      'Low - Make note of this': 'Priority: Low'
    }

    var gitType = typeDict[reportType]
    var gitSeverity = severityDict[reportSeverity]
    var gitComponent = componentDict[reportComponent]
    var labels = [gitType, gitComponent, gitSeverity]

    var body = '**Description:**\n' + reportDescription +
    '\n**Steps to reproduce:**\n' + reportReproduce +
    '\n**Expected Behavior:**\n' + reportExpected +
    '\n**Contact Email:**\n' + reportEmail

    var opts = {
      token: '444462c4ee9dc95512e4569ec6b917be1a0f9d75',
      useragent: 'SAPCPQTools',
      body: body,
      labels: labels
    }

    createIssue('CLunaUrsa/SAP-CPQ-CI', reportSummary, opts, clbk)
  }
}

function autoReport (errorMessage) {
  var body
  body = 'A user has encountered an error and has submitted a report!'
  body = body + '<br><b>Error Message:</b><br>' + errorMessage

  var domain = document.getElementById('domain').value
  var baseUrl = document.getElementById('url').value
  var username = document.getElementById('username').value
  var passwordLen = document.getElementById('password').value.length
  var filePath = document.getElementById('actual-file').value
  var siteKey = domain + ' @ ' + baseUrl.replace(/\./g, '-')

  body = body + '<br><br><b>The following parameters were used:</b><br>' +
  `Domain: ${domain}<br>` +
  `Url: ${baseUrl}<br>` +
  `Username: ${username}<br>` +
  `Password: ${passwordLen} characters<br>` +
  `FilePath: ${filePath}<br>` +
  `Site Key: ${siteKey}`

  var logPath = log.transports.file.findLogPath()
  var logLines = readLastLines.read(logPath, 50)
    .then((lines) => {
      body = body + '<br><br><b>Last 50 lines of log:</b><br>' + lines
      var opts = {
        token: '444462c4ee9dc95512e4569ec6b917be1a0f9d75',
        useragent: 'SAPCPQTools',
        body: body
      }

      // var alertMessage = '<p style="text-align:left;">' + body
      // var alertObject = {
      //   title: 'Completed!',
      //   width: '60%',
      //   html: alertMessage,
      //   icon: 'success',
      //   showConfirmButton: true,
      //   confirmButtonText: 'Oh boy!',
      //   allowOutsideClick: true
      // }
      // swal.fire(alertObject)
      createIssue('LunaUrsa/SAP-CPQ-CI', 'Auto-Report', opts, clbk)
    })
}

function clbk (error, issue, info) {
  // Check for rate limit information...
  if (info) {
    var alertMessage = 'Report submitted! <br>Thank you for your feedback!'
    var alertObject = {
      title: 'Completed!',
      html: alertMessage,
      icon: 'success',
      showConfirmButton: true,
      confirmButtonText: 'Oh boy!',
      allowOutsideClick: true
    }
    swal.fire(alertObject)
  }
  if (error) {
    throw new Error(error.message)
  }
}
