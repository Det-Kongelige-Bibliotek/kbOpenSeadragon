/* global require, console, process */
var gulp = require('gulp');
var del = require('del');
var argv = require('optimist').argv;
var config = require('./gulp.config')(); // require and run the local config file/function

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
var jshint = require('gulp-jshint');
var gulpprint = require('gulp-print');
var gulpif = require('gulp-if');
var nodemon = require('gulp-nodemon');

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
       .src(config.alljs) // we want to check both the js files and the gulpfile.js in the root
       .pipe(gulpif(argv.verbose, gulpprint())) // print the files that are being validated if one uses --verbose
       .pipe(jshint())
       .pipe(jshint.reporter('jshint-stylish', {verbose: true}));

});

gulp.task('clean', function (cb) {
    del([config.DEST, config.DEVDEST, config.DISTDEST]).then(function (paths) {
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
    gulp.src(config.HTMLSRC)
    .pipe(replace(config.LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(config.DEVDEST));

    // bundle, minify and move js files
    gutil.log('Moving js ...');
    gulp.src(config.JSSRC)
    .pipe(replace(config.LOCALHOSTURL, STATICURL))
    .pipe(concat('KbOSD_bundle.js'))
    .pipe(gulp.dest(config.DEVDEST));

    // move 3rdpartyJS
    gulp.src(config.externalJSSRC)
    .pipe(chmod(664))
    .pipe(gulp.dest(config.DEST + '/3rdparty'));

    // minify and move css
    gutil.log('Moving css ...');
    gulp.src(config.CSSSRC)
    .pipe(replace(config.LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(config.DEVDEST));

    // moving images
    gutil.log('Moving images ...');
    gulp.src(config.IMGSRC)
    .pipe(gulp.dest(config.DEST + '/images'));

    if ('undefined' !== typeof cb) {
        cb();
    }
});

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

    // moving images
    gutil.log('Moving images ...');
    gulp.src(config.IMGSRC)
        .pipe(gulp.dest(config.TEST_IE_DEST + '/images'));

    gulp.src('server.js')
        .pipe(replace('http-pub','testIE'))
        .pipe(gulp.dest(''));

    return nodemon('./server.js');
});

gulp.task('production', ['clean'], function (cb) {
    gutil.log('Building a ', gutil.colors.cyan('production'), 'build for', gutil.colors.green('"' + STATICURL + '"'));
    // move html files
    gutil.log('Moving html...');
    gulp.src(config.HTMLSRC)
    .pipe(replace(config.LOCALHOSTURL, STATICURL))
    .pipe(replace('KbOSD.js','KbOSD_bundle_min.js')) // FIXME: This ought to be more generic, but gulp-replace does not work with regExp on streams??
    .pipe(gulp.dest(config.DEST));

    // bundling a non minified version and move js files
    gutil.log('Bundling and moving js ...');
    gulp.src(config.JSSRC)
    .pipe(concat('KbOSD_bundle.js'))
    .pipe(replace(config.LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(config.DEST + '/js'));

    // minify and move js files
    gutil.log('Minifying and moving js ...');
    gulp.src(config.JSSRC)
    .pipe(uglify())
    .pipe(concat('KbOSD_bundle.js'))
    .pipe(rename(function (path) {
        path.basename += '_min';
    }))
    .pipe(replace('kbOSD.css','kbOSD_min.css')) // FIXME: This ought to be more generic, but gulp-replace does not work with regExp on streams??
    .pipe(replace(config.LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(config.DEST + '/js'));

    // move 3rdpartyJS
    gulp.src(config.externalJSSRC)
    .pipe(chmod(664))
    .pipe(gulp.dest(config.DEST + '/3rdparty'));

    // moving unminified version of css
    gutil.log('Moving non minified version of css ...');
    gulp.src(config.CSSSRC)
    .pipe(replace(config.LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(config.DEST + '/css'));

    // minify and move css
    gutil.log('Minifying and moving css ...');
    gulp.src(config.CSSSRC)
    .pipe(cssmin())
    .pipe(rename(function (path) {
        path.basename += '_min';
    }))
    .pipe(replace(config.LOCALHOSTURL, STATICURL))
    .pipe(gulp.dest(config.DEST + '/css'));

    // moving images
    gutil.log('Moving images ...');
    gulp.src(config.IMGSRC)
    .pipe(gulp.dest(config.DEST + '/images'));

    gutil.log('Production files done. Use', gutil.colors.green('gulp dist'), 'to create a tarball for distribution.');

    if ('undefined' !== typeof cb) {
        cb();
    }
});

gulp.task('dist', function (cb) {
    // tar/zipping distribution file
    gutil.log('Creating a distribution tarball ...');
    gulp.src(config.DEST + '/**/*')
    .pipe(tar('kbOpenSeadragon.tar'))
    .pipe(gzip())
    .pipe(gulp.dest(config.DISTDEST));

    if ('undefined' !== typeof cb) {
        cb();
    }
});
