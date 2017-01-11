/* global require, console, process */
var gulp = require('gulp');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var concat = require('gulp-concat');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var chmod = require('gulp-chmod');
var tar = require('gulp-tar');
var gzip = require('gulp-gzip');
var jshint = require('gulp-jshint');
var gulpprint = require('gulp-print');
var gulpif = require('gulp-if');
var args = require('yargs').argv;

var del = require('del');
var argv = require('optimist').argv;

var externalJSSRC = ['http-pub/3rdparty/openseadragon.js', 'http-pub/3rdparty/native.history.js'];
var JSSRC = 'http-pub/js/*.js';
var CSSSRC = 'http-pub/css/*.css';
var IMGSRC = 'http-pub/images/*';
var HTMLSRC = 'http-pub/*.html';
var DEST = 'production';
var DEVDEST = 'development';
var DISTDEST = 'dist';
var LOCALHOSTURL = 'http://localhost:8002/';
var STATICURL = argv.dest || 'https://static.kb.dk/kbOpenSeadragon/';

if (STATICURL.charAt(STATICURL.length - 1) !== '/') {
    STATICURL = STATICURL + '/';
}

if (argv.help) {
    console.log('Build kbOpenSeadragon project.');
    console.log('USAGE:');
    console.log('gulp [development|production][--dest=<destinationURL>]');
    console.log('');
    console.log('gulp validate - Check the quality of the code with jshint.');
    console.log('gulp production - build production files for the KB flavor of OpenSeadragon.');
    console.log('gulp --dest=https://static.kb.dk/~hafe/kbOpenSeadragon/ - build productionfiles with all static urls pointing at https://static.kb.dk/~hafe/kbOpenSeadragon/');
    console.log('gulp development - build a development setup with neither minification nor obfuscation. *DEPRECATED*');
    console.log('gulp --help - print this message.');
    process.exit();
}

gulp.task('default', ['production'], function () {});

gulp.task('validate', function(){
   return gulp
       .src([JSSRC, './*.js']) // we want to check both the js files and the gulpfile.js in the root
       .pipe(gulpif(args.verbose, gulpprint())) // print the files that are being validated if one uses --verbose
       .pipe(jshint())
       .pipe(jshint.reporter('jshint-stylish', {verbose: true}));

});

gulp.task('clean', function (cb) {
    del([DEST, DEVDEST, DISTDEST]).then(function (paths) {
        gutil.log('deleted paths:', paths);
        if ('undefined' !== typeof cb) {
            cb();
        }
    });
});

gulp.task('development', ['clean'], function (cb) {
    gutil.log('Building a ', gutil.colors.cyan('development'), 'build for', gutil.colors.green('"' + STATICURL + '"'));
    // move html files
    gutil.log('Moving html...');
    gulp.src(HTMLSRC)
    .pipe(replace(LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(DEVDEST));

    // bundle, minify and move js files
    gutil.log('Moving js ...');
    gulp.src(JSSRC)
    .pipe(replace(LOCALHOSTURL, STATICURL))
    .pipe(concat('KbOSD_bundle.js'))
    .pipe(gulp.dest(DEVDEST));

    // move 3rdpartyJS
    gulp.src(externalJSSRC)
    .pipe(chmod(664))
    .pipe(gulp.dest(DEST + '/3rdparty'));

    // minify and move css
    gutil.log('Moving css ...');
    gulp.src(CSSSRC)
    .pipe(replace(LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(DEVDEST));

    // moving images
    gutil.log('Moving images ...');
    gulp.src(IMGSRC)
    .pipe(gulp.dest(DEST + '/images'));

    if ('undefined' !== typeof cb) {
        cb();
    }
});

gulp.task('production', ['clean'], function (cb) {
    gutil.log('Building a ', gutil.colors.cyan('production'), 'build for', gutil.colors.green('"' + STATICURL + '"'));
    // move html files
    gutil.log('Moving html...');
    gulp.src(HTMLSRC)
    .pipe(replace(LOCALHOSTURL, STATICURL))
    .pipe(replace('KbOSD.js','KbOSD_bundle_min.js')) // FIXME: This ought to be more generic, but gulp-replace does not work with regExp on streams??
    .pipe(gulp.dest(DEST));

    // bundling a non minified version and move js files
    gutil.log('Bundling and moving js ...');
    gulp.src(JSSRC)
    .pipe(concat('KbOSD_bundle.js'))
    .pipe(replace(LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(DEST + '/js'));

    // minify and move js files
    gutil.log('Minifying and moving js ...');
    gulp.src(JSSRC)
    .pipe(uglify())
    .pipe(concat('KbOSD_bundle.js'))
    .pipe(rename(function (path) {
        path.basename += '_min';
    }))
    .pipe(replace('kbOSD.css','kbOSD_min.css')) // FIXME: This ought to be more generic, but gulp-replace does not work with regExp on streams??
    .pipe(replace(LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(DEST + '/js'));

    // move 3rdpartyJS
    gulp.src(externalJSSRC)
    .pipe(chmod(664))
    .pipe(gulp.dest(DEST + '/3rdparty'));

    // moving unminified version of css
    gutil.log('Moving non minified version of css ...');
    gulp.src(CSSSRC)
    .pipe(replace(LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(DEST + '/css'));

    // minify and move css
    gutil.log('Minifying and moving css ...');
    gulp.src(CSSSRC)
    .pipe(cssmin())
    .pipe(rename(function (path) {
        path.basename += '_min';
    }))
    .pipe(replace(LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(DEST + '/css'));

    // moving images
    gutil.log('Moving images ...');
    gulp.src(IMGSRC)
    .pipe(gulp.dest(DEST + '/images'));

    gutil.log('Production files done. Use', gutil.colors.green('gulp dist'), 'to create a tarball for distribution.');

    if ('undefined' !== typeof cb) {
        cb();
    }
});

gulp.task('dist', function (cb) {
    // tar/zipping distribution file
    gutil.log('Creating a distribution tarball ...');
    gulp.src(DEST + '/**/*')
    .pipe(tar('kbOpenSeadragon.tar'))
    .pipe(gzip())
    .pipe(gulp.dest(DISTDEST));

    if ('undefined' !== typeof cb) {
        cb();
    }
});
