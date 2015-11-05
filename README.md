# kbOpenSeadragon
Open Seadragon kb flavour

This is an openSeadragon wrapper for [The Royal Library, Denmark](http://www.kb.dk). It customizes an oppenSeadragon viewer, and let users insert a javascript snippet to summon an openSeadragon instance.
It passes on an openSeadragon configuration object to openSeadragon.

## How to install
To set up your local machine to use it there are some prerequisites. You need to:
* have [nodeJs and npm](https://nodejs.org/en/) installed.
* Create a library under http-pub called "3rdparty" 
* have a functional openSeadragon.js file in the 3rdparty library
  I clone [openSeadragon](https://github.com/openseadragon/openseadragon.git) compiles it (with grunt-cli) and dumps a symlink inside 3rdparty.
* clone [history.js](https://github.com/browserstate/history.js.git) inside the 3rdparty library

When all this is in place do:
* npm install
* ./server.js

The server will listen on both port 8001 and 8002, and just serve files with webroot set to http-pub. This is in order to test Xdomain requests.
Open http://localhost:8001/ in you prefered browser, and there you go.
index.html is a test page that contains a kbOpenSeadragon viewer feeded with some images from the KB IIIF image server.
