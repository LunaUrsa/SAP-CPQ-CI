# SAP CPQ Tools 
This is an electron app that aims to be extendable for new projects.

Currently it has two very useful features:

* Code Exporter and continuous integration
* Formula Formatter

## Getting Started
Head on over to the [Releases](https://github.com/LunaUrsa/SAP-CPQ-CI/releases) section and download/install the latest release.

Everything should work out of the box, no need to install python or anything.

Once running you're encouranged to submit "Reports" on issues/suggestions you have!

## How to contribute

If you're an end user the best thing you can do is submit reports/suggestions via the application. These are sent directly to GitHub for our review. 

If you're a developer you can help out in a few ways. We'll start with getting you started running the application in development mode. 

This guide assumes you have nothing required installed.

### Development Setup
1) Go to the [node.js webpage](https://nodejs.org/en/) and install node. Make sure you install chocolately or else you're going to have a bad time. 
2) Download this repository into whatever development directory you want.
3) Open up a command prompt (not powershell) in administrator mode
4) Navigate to said development directory.
> cd C:\Users\UserName\Documents\Coding\SAP-CPQ-Tools
5) Install yarn (run the following command in the command prompt)
> choco install yarn
6) Install the package
> yarn
7) Sit back and relax while it installs everything
8) Ensure you switch to the virtual python environment!!
> .\env\Scripts\activate
9) Make changes to your code
10) Test your changes in development mode
> yarn start
11) Build the electron application
> yarn run devBuild
12) Test the build by going into the win-unpacked folder and running the exe
13) There is no need to distribute the EXE, github does packaging on its own.

VS code extension

## Deployment

A new release will be created whenever a branch is pushed to Master.
This will happen automatically via github actions, you just need to publish the release.

## Built With

* [Electron](https://www.electronjs.org/) - The framework used
* NodeJS
* HTML
* Python

## Contributing

Check out the Issues

## Authors

Authors:
Eric Hoftiezer - Electron structure and code exporter
Jamie Vo - Basically all the UI.
Corey Shewell - Code Parser
Lawrence Clark - General consultation

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments
* The awesome team!