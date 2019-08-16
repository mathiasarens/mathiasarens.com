"use strict";

// Load plugins
const autoprefixer = require("gulp-autoprefixer");
const browsersync = require("browser-sync").create();
const cleanCSS = require("gulp-clean-css");
const del = require("del");
const gulp = require("gulp");
const header = require("gulp-header");
const merge = require("merge-stream");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const sass = require("gulp-sass");
const uglify = require("gulp-uglify");
const ftp = require("vinyl-ftp");

// Load package.json for banner
const pkg = require("./package.json");

// Set the banner content
const banner = [
  "/*!\n",
  " * Start Bootstrap - <%= pkg.title %> v<%= pkg.version %> (<%= pkg.homepage %>)\n",
  " * Copyright 2013-" + new Date().getFullYear(),
  " <%= pkg.author %>\n",
  " * Licensed under <%= pkg.license %> (https://github.com/BlackrockDigital/<%= pkg.name %>/blob/master/LICENSE)\n",
  " */\n",
  "\n"
].join("");

// BrowserSync
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: "./"
    },
    port: 3000
  });
  done();
}

// BrowserSync reload
function browserSyncReload(done) {
  browsersync.reload();
  done();
}

// Clean vendor
function clean() {
  return del(["./vendor/"]);
}

// Bring third party dependencies from node_modules into vendor directory
function modules() {
  // Bootstrap
  var bootstrap = gulp
    .src("./node_modules/bootstrap/dist/**/*")
    .pipe(gulp.dest("./vendor/bootstrap"));
  // Font Awesome CSS
  var fontAwesomeCSS = gulp
    .src("./node_modules/@fortawesome/fontawesome-free/css/**/*")
    .pipe(gulp.dest("./vendor/fontawesome-free/css"));
  // Font Awesome Webfonts
  var fontAwesomeWebfonts = gulp
    .src("./node_modules/@fortawesome/fontawesome-free/webfonts/**/*")
    .pipe(gulp.dest("./vendor/fontawesome-free/webfonts"));
  // jQuery Easing
  var jqueryEasing = gulp
    .src("./node_modules/jquery.easing/*.js")
    .pipe(gulp.dest("./vendor/jquery-easing"));
  // jQuery
  var jquery = gulp
    .src([
      "./node_modules/jquery/dist/*",
      "!./node_modules/jquery/dist/core.js"
    ])
    .pipe(gulp.dest("./vendor/jquery"));
  return merge(
    bootstrap,
    fontAwesomeCSS,
    fontAwesomeWebfonts,
    jquery,
    jqueryEasing
  );
}

// CSS task
function css() {
  return gulp
    .src("./scss/**/*.scss")
    .pipe(plumber())
    .pipe(
      sass({
        outputStyle: "expanded",
        includePaths: "./node_modules"
      })
    )
    .on("error", sass.logError)
    .pipe(
      autoprefixer({
        browsers: ["last 2 versions"],
        cascade: false
      })
    )
    .pipe(
      header(banner, {
        pkg: pkg
      })
    )
    .pipe(gulp.dest("./css"))
    .pipe(
      rename({
        suffix: ".min"
      })
    )
    .pipe(cleanCSS())
    .pipe(gulp.dest("./css"))
    .pipe(browsersync.stream());
}

// JS task
function js() {
  return gulp
    .src(["./js/*.js", "!./js/*.min.js"])
    .pipe(uglify())
    .pipe(
      header(banner, {
        pkg: pkg
      })
    )
    .pipe(
      rename({
        suffix: ".min"
      })
    )
    .pipe(gulp.dest("./js"))
    .pipe(browsersync.stream());
}

// Watch files
function watchFiles() {
  gulp.watch("./scss/**/*", css);
  gulp.watch(["./js/**/*", "!./js/**/*.min.js"], js);
  gulp.watch("./**/*.html", browserSyncReload);
}

function ftpToWebserver() {
  var conn = ftp.create({
    host: process.env.MATHIASARENS_COM_HOST,
    user: process.env.MATHIASARENS_COM_USER,
    password: process.env.MATHIASARENS_COM_PW,
    parallel: 10
  });

  var globs = [
    "src/**",
    "css/**",
    "js/**",
    "img/**",
    "fonts/**",
    "pdf/**",
    "vendor/bootstrap/css/bootstrap.min.css",
    "vendor/bootstrap/css/bootstrap.min.css.map",
    "vendor/fontawesome-free/css/all.min.css",
    "vendor/fontawesome-free/webfonts/*",
    "vendor/font-mfizz/dist/*",
    "vendor/jquery/jquery.min.js",
    "vendor/jquery-easing/jquery.easing.min.js",
    "vendor/bootstrap/js/bootstrap.bundle.min.js",
    "vendor/bootstrap/js/bootstrap.bundle.min.js.map",
    "vendor/jquery-easing/jquery.easing.min.js",
    "index.html"
  ];

  // using base = '.' will transfer everything to /public_html correctly
  // turn off buffering in gulp.src for best performance

  return gulp
    .src(globs, { base: ".", buffer: false })
    .pipe(conn.newer("/")) // only upload newer files
    .pipe(conn.dest("/"));
}

// Define complex tasks
const vendor = gulp.series(clean, modules);
const build = gulp.series(vendor, gulp.parallel(css, js));
const watch = gulp.series(build, gulp.parallel(watchFiles, browserSync));
const deploy = gulp.series(ftpToWebserver, build)

// Export tasks
exports.css = css;
exports.js = js;
exports.clean = clean;
exports.vendor = vendor;
exports.build = build;
exports.watch = watch;
exports.default = build;
exports.deploy = deploy;
