/* global require, console, process */
var gulp = require('gulp');
var del = require('del');
var argv = require('optimist').argv;
var config = require('./gulp.config')(); // require and run the local config file/function
var package = require('./package.json');

// gulp plugins
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var concat = require('gulp-concat');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var chmod = require('gulp-chmod');
var tar = require('gulp-tar');
var gzip = require('gulp-gzip');
var nodemon = require('gulp-nodemon');
var bump = require('gulp-bump');

if (argv.help) {
    console.log('Build kbOpenSeadragon project.');
    console.log('USAGE:');
    console.log('');
    console.log('gulp testLocal - Serve files from http-pub to test it locally.');
    console.log('gulp testIE - Build a development setup in testIE folder to test it cross-platform. Change the ' +
        'IP_LOCALHOSTURL in the gulp.config file. Serve files from this folder.');
    console.log('gulp production - build production files for the KB flavor of OpenSeadragon.');
    console.log('gulp dist - reads from the production folder and creates azip with the version number.');
    console.log('gulp --help - print this message.');
    process.exit();
}

gulp.task('default', ['production'], function () {});

// Deletes all the folders created by gulp tasks and leaves the http-pub
gulp.task('clean', function (cb) {
    del([config.DEST, config.DEVDEST, config.DISTDEST, config.TEST_IE_DEST]).then(function (paths) {
        gutil.log('deleted paths:', paths);
        if ('undefined' !== typeof cb) {
            cb();
        }
    });
});

// Copies whatever we have in http-pub into the testIE, after changing all the  references of the LOCALHOSTURL to see
// the IP_LOCALHOSTURL. Starts the server and makes it read from the development fodler
gulp.task('testIE', ['clean'], function () {
    gutil.log('Moving html...');
    gulp.src(config.HTMLSRC)
        .pipe(replace(config.LOCALHOSTURL, config.IP_LOCALHOSTURL))
        .pipe(gulp.dest(config.TEST_IE_DEST));

    // move js files
    gutil.log('Moving js ...');
    gulp.src(config.JSSRC)
        .pipe(replace(config.LOCALHOSTURL, config.IP_LOCALHOSTURL))
        .pipe(gulp.dest(config.TEST_IE_DEST + '/js'));

    // move 3rdpartyJS
    gulp.src(config.externalJSSRC)
        .pipe(chmod(664))
        .pipe(gulp.dest(config.TEST_IE_DEST + '/3rdparty'));

    // moving unminified version of css
    gutil.log('Moving non minified version of css ...');
    gulp.src(config.CSSSRC)
        .pipe(replace(config.LOCALHOSTURL, config.IP_LOCALHOSTURL))
        .pipe(gulp.dest(config.TEST_IE_DEST + '/css'));

    // moving font
    gutil.log('Moving font package ...');
    gulp.src('http-pub/font-awesome-4.7.0/*/*')
        .pipe(gulp.dest(config.TEST_IE_DEST + '/font-awesome-4.7.0'));

    // moving images
    gutil.log('Moving images ...');
    gulp.src(config.IMGSRC)
        .pipe(gulp.dest(config.TEST_IE_DEST + '/images'));

    gulp.src('server.js')
        .pipe(replace('http-pub','testIE'))
        .pipe(gulp.dest(''));

    return nodemon('./server.js');
});

// Start the server and make it read from http-pub
gulp.task('testLocal',['clean'], function () {
    gulp.src('server.js')
        .pipe(replace('testIE', 'http-pub'))
        .pipe(gulp.dest(''));

    return nodemon('./server.js');
});

/**
 * Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 */
gulp.task('bump', function () {
   gutil.log('Bumping versions');
   var type = argv.type;
   var version = argv.version;
   var options = {};
   if (version){
       options.version = version;
       gutil.log('To' + version);
   } else {
       options.type = type;
       gutil.log('For type:' + type);
   }
   return gulp
       .src(config.PACKAGES)
       .pipe(bump(options))
       .pipe(gulp.dest(config.ROOT));
});

// Minifies and concatenate the js files and minifies the CSS, copies the fonts
// and the 3rd party libraries and puts them in production folder
gulp.task('production', ['clean'], function (cb) {
    gutil.log('Building a ', gutil.colors.cyan('production'), 'build for', gutil.colors.green('"' + config.STATICURL + '"'));
    gutil.log('Createing the full URL with the version number in the path.');

    var finalURL = config.STATICURL + package.version + '/';
    var release_dest = config.DEST + "/" + package.version;

    // move html files
    gutil.log('Moving html...');
    gulp.src(config.HTMLSRC)
    .pipe(replace(config.LOCALHOSTURL, finalURL))
    .pipe(replace('KbOSD.js','KbOSD_bundle_min.js')) // FIXME: This ought to be more generic, but gulp-replace does not work with regExp on streams??
    .pipe(gulp.dest(release_dest));

    // bundling a non minified version and move js files
    gutil.log('Bundling and moving js ...');
    gulp.src(config.JSSRC)
    .pipe(concat('KbOSD_bundle.js'))
    .pipe(replace(config.LOCALHOSTURL, finalURL))
    .pipe(gulp.dest(release_dest + '/js'));

    // minify and move js files
    gutil.log('Minifying and moving js ...');
    gulp.src(config.JSSRC)
    .pipe(uglify())
    .pipe(concat('KbOSD_bundle.js'))
    .pipe(rename(function (path) {
        path.basename += '_min';
    }))
    .pipe(replace('kbOSD.css','kbOSD_min.css')) // FIXME: This ought to be more generic, but gulp-replace does not work with regExp on streams??
    .pipe(replace(config.LOCALHOSTURL, finalURL))
    .pipe(gulp.dest(release_dest + '/js'));

    // move 3rdpartyJS
    gulp.src(config.externalJSSRC)
    .pipe(chmod(664))
    .pipe(gulp.dest(release_dest + '/3rdparty'));

    // moving unminified version of css
    gutil.log('Moving non minified version of css ...');
    gulp.src(config.CSSSRC)
    .pipe(replace(config.LOCALHOSTURL, finalURL))
    .pipe(gulp.dest(release_dest + '/css'));

    // minify and move css
    gutil.log('Minifying and moving css ...');
    gulp.src(config.CSSSRC)
    .pipe(cssmin())
    .pipe(rename(function (path) {
        path.basename += '_min';
    }))
    .pipe(replace(config.LOCALHOSTURL, finalURL))
    .pipe(gulp.dest(release_dest + '/css'));

    // moving images
    gutil.log('Moving images ...');
    gulp.src(config.IMGSRC)
    .pipe(gulp.dest(release_dest + '/images'));

    // moving font
    gutil.log('Moving font package ...');
    gulp.src('http-pub/font-awesome-4.7.0/*/*')
        .pipe(gulp.dest(release_dest + '/font-awesome-4.7.0'));

    gutil.log('Production files done. Use', gutil.colors.green('gulp dist'), 'to create a tarball for distribution.');

    if ('undefined' !== typeof cb) {
        cb();
    }
});

gulp.task('dist', function (cb) {
    // tar/zipping distribution file
    // Takes everything from the production folder, creates a zip with the version number
    // and puts it in the dist folder (from there you copy it to the server)
    gutil.log('Creating a distribution tarball ...');
    gulp.src(config.DEST + '/**/*')
        .pipe(tar(package.version+'.tar'))
        .pipe(gzip())
        .pipe(gulp.dest(config.DISTDEST));

    if ('undefined' !== typeof cb) {
        cb();
    }
});
