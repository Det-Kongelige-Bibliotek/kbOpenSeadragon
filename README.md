# kbOpenSeadragon
Open Seadragon kb flavour

This is an openSeadragon wrapper for [The Royal Library, Denmark](http://www.kb.dk). It customizes an oppenSeadragon viewer, and let users insert a javascript snippet to summon an openSeadragon instance.

It passes on an openSeadragon configuration object to openSeadragon.

## How to install it
You can set up a local instance and test it locally

### Prerequisites
1. have [nodeJs and npm](https://nodejs.org/en/) installed.

2. install grunt-cli

  * npm install -g grunt-cli

3. install gulp

  * npm install -g gulp

Either run the install script in the root directory, or do the following steps manually:

1. Create a library under http-pub called "__3rdparty__"

2. Stand in the 3rdparty library and:

3. clone [openSeadragon](https://github.com/openseadragon/openseadragon.git)

  * git clone https://github.com/openseadragon/openseadragon.git

  * cd openseadragon

  * npm install

  * grunt

  * cd ..

  * ln -s openseadragon/build/openseadragon/openseadragon.js openseadragon.js

4. clone [history.js](https://github.com/browserstate/history.js.git)

  * ln -s history.js/scripts/bundled/html4+html5/native.history.js

When all this is in place, go to the project root and do:

5. npm install

## How to start it

When everything is installed, you can start the localhost testserver by typing:

1. ./server.js

The server will listen both on port 8001 and 8002, and just serve files with webroot set to http-pub. The two ports is in order to test Xdomain requests.

## How to see it

Open __http://localhost:8001/__ in you prefered browser, and there you go.

index.html is a test page that contains a kbOpenSeadragon viewer feeded with some images from the KB IIIF image server.

## How to distribute it to a server

If you want to put the system up on a server, you can deploy it with:

1. gulp --dest=myProjectRootURL (which will give you working production files under _/production_ )

    * Note that there are some static absolute URLs in the production files that are pointed at the _dest_ URL (it defaults to https://static.kb.dk/~hafe/kbOpenSeadragon/ )

2. gulp dist (which will create a tarball under _/dist_ )

3. scp dist/kbOpenSeadragon.tar.gz myWebServer.com:

4. ssh to the server, unpack the tar in a directory under the desired webroot (be aware that there is no parent dir in the tarball)
