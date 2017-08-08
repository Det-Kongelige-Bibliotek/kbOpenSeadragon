// File to keep our configuration settings

module.exports = function () {
    var root = './';

    var config = {

        ROOT: root,
        // the js source code
        JSSRC: 'http-pub/js/*.js',
        // all the js to validate
        alljs: ['http-pub/js/*.js', './*.js'],
        //external libraries
        externalJSSRC: ['http-pub/3rdparty/openseadragon.js', 'http-pub/3rdparty/native.history.js', 'http-pub/3rdparty/jspdf.min.js'],
        // the CSS files
        CSSSRC: 'http-pub/css/*.css',
        // the images
        IMGSRC: 'http-pub/images/*',
        // HTML source files
        HTMLSRC: 'http-pub/*.html',
        // name of the production destination folder
        DEST: 'production',
        // name of the test server destination folder
        TEST_DEST: 'test',
        // test folder
        TEST_IE_DEST: 'testIE',
        // dist folder
        DISTDEST: 'dist',
        // dist folder for the test server
        DIST_TEST_DEST: 'test_dist',
        // localhost URL
        LOCALHOSTURL: 'http://localhost:8002/',
        // local IP address
        IP_LOCALHOSTURL: 'http://192.168.109.130:8001/',     // TO BE CHANGED BY DEVELOPERS
        // Base URL in the static server
        STATICURL: 'https://static.kb.dk/kbOpenSeadragon/',
        // Base URL in the static test server
        STATIC_TEST_URL: 'https://static-test-01.kb.dk/kbOpenSeadragon/',

        // json files where we update the software version number
        PACKAGES: ['./package.json']
    };
    return config;
};