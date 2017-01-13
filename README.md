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

1. git clone this project under your dersired working folder

2. Create a folder under http-pub called "__3rdparty__"

3. Stand in the 3rdparty library and:

4. clone [openSeadragon](https://github.com/openseadragon/openseadragon.git)

  * git clone https://github.com/openseadragon/openseadragon.git

  * cd openseadragon

  * npm install

  * grunt

  * cd ..

  * ln -s openseadragon/build/openseadragon/openseadragon.js openseadragon.js

5. clone (under http-pub/3rdparty) [history.js](https://github.com/browserstate/history.js.git)

  * ln -s history.js/scripts/bundled/html4+html5/native.history.js

When all this is in place, go to the project root and do:

6. npm install

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

4. ssh to the server

5. create a subfolder to your webroot for the project (like ~/public_html/kbOpenSeadragon), if you don't have one already.

6. move the uploaded tar file into that subfolder.

7. extract all files and folders from the tar file:
   tar xvfz kbOpenSeadragon.tar.gz (or whatever the tar file is called)
   (be aware that there is no parent dir in the tarball)

## How to use it on a blacklight application

1. Include font awesome 
    
    * Add this to your Gemfile:
 
      ```ruby
         gem "font-awesome-rails"
      ```
 
        and run `bundle install`.
 
    * Usage:
 
       In your `application.css`, include the css file:
 
       ```css
         /*
            *= require font-awesome
         */
       ```
      Then restart your webserver if it was previously running. 
  
      You can also choose Sass Support:
 
        Then you will have to add this instead to your `application.css.sass` file: 
        
        ```sass
           @import font-awesome
        ```
         
         
2. In the .erb file where you want to have an osd instance:

    * add :
     ```html
          <div id="kbOSDInstance">
            <div class="kbOSDViewer">
                <div class="kbOSDToolbar"></div>
                <div class="kbOSDContent"></div>
            </div>
           </div>
     ```
   Please note that the name footer has been change to toolbar in newer release.

    * add the link to the release you want to use:
     ```html
        <script src="http://static.kb.dk/release-*.*.*/js/KbOSD.js" ></script>
     ```





