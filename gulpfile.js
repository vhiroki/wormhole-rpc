var gulp = require("gulp");
var babel = require("gulp-babel");
var watch = require("gulp-watch");

gulp.task('dev', function () {
    return watch('lib/**/*.js').on('change', function (filePath) {
        gulp.src(filePath, {base: 'lib'})
            .pipe(babel())
            .pipe(gulp.dest('dist'));
    });
});