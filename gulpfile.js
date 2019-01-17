'use strict';

const gulp       = require('gulp');
const fs         = require('fs');
const path       = require('path');
const replace    = require('gulp-replace');
const pkg        = require('./package.json');
const iopackage  = require('./io-package.json');
const version    = (pkg && pkg.version) ? pkg.version : iopackage.common.version;
const request    = require('request');
const unzip      = require('unzip');
/*const appName   = getAppName();

function getAppName() {
    const parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1].split('.')[0].toLowerCase();
}
*/
const fileName = 'words.js';
const languages  =  {
    en: {},
    de: {},
    ru: {},
    pt: {},
    nl: {},
    fr: {},
    it: {},
    es: {},
    pl: {},
    'zh-cn': {}
};
const srcDir     = __dirname + '/';

function lang2data(lang, isFlat) {
    let str = isFlat ? '' : '{\n';
    let count = 0;
    for (const w in lang) {
        if (lang.hasOwnProperty(w)) {
            count++;
            if (isFlat) {
                str += (lang[w] === '' ? (isFlat[w] || w) : lang[w]) + '\n';
            } else {
                const key = '  "' + w.replace(/"/g, '\\"') + '": ';
                str += key + '"' + lang[w].replace(/"/g, '\\"') + '",\n';
            }
        }
    }
    if (!count) return isFlat ? '' : '{\n}';
    if (isFlat) {
        return str;
    } else {
        return str.substring(0, str.length - 2) + '\n}';
    }
}

function readWordJs(src) {
    try {
        let words;
        if (fs.existsSync(src + 'js/' + fileName)) {
            words = fs.readFileSync(src + 'js/' + fileName).toString();
        } else {
            words = fs.readFileSync(src + fileName).toString();
        }

        const lines = words.split(/\r\n|\r|\n/g);
        let i = 0;
        while (!lines[i].match(/^\$\.extend\(systemDictionary, {/)) {
            i++;
        }
        lines.splice(0, i);

        // remove last empty lines
        i = lines.length - 1;
        while (!lines[i]) {
            i--;
        }
        if (i < lines.length - 1) {
            lines.splice(i + 1);
        }

        lines[0] = lines[0].replace('$.extend(systemDictionary, ', '');
        lines[lines.length - 1] = lines[lines.length - 1].trim().replace(/}\);$/, '}');
        words = lines.join('\n');
        const resultFunc = new Function('return ' + words + ';');

        return resultFunc();
    } catch (e) {
        return null;
    }
}
function padRight(text, totalLength) {
    return text + (text.length < totalLength ? new Array(totalLength - text.length).join(' ') : '');
}
function writeWordJs(data, src) {
    let text = '// DO NOT EDIT THIS FILE!!! IT WILL BE AUTOMATICALLY GENERATED FROM src/i18n\n';
    text += '/*global systemDictionary:true */\n';
    text += '\'use strict\';\n\n';
    text += 'systemDictionary = {\n';
    for (const word in data) {
        if (data.hasOwnProperty(word)) {
            text += '    ' + padRight('"' + word.replace(/"/g, '\\"') + '": {', 50);
            let line = '';
            for (const lang in data[word]) {
                if (data[word].hasOwnProperty(lang)) {
                    line += '"' + lang + '": "' + padRight(data[word][lang].replace(/"/g, '\\"') + '",', 50) + ' ';
                }
            }
            if (line) {
                line = line.trim();
                line = line.substring(0, line.length - 1);
            }
            text += line + '},\n';
        }
    }
    text += '};';
    if (fs.existsSync(src + 'js/' + fileName)) {
        fs.writeFileSync(src + 'js/' + fileName, text);
    } else {
        fs.writeFileSync(src + '' + fileName, text);
    }
}

const EMPTY = '';

function words2languages(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        if (!fs.existsSync(src + 'i18n/')) {
            fs.mkdirSync(src + 'i18n/');
        }
        for (const l in langs) {
            if (!langs.hasOwnProperty(l)) continue;
            const keys = Object.keys(langs[l]);
            //keys.sort();
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            if (!fs.existsSync(src + 'i18n/' + l)) {
                fs.mkdirSync(src + 'i18n/' + l);
            }

            fs.writeFileSync(src + 'i18n/' + l + '/translations.json', lang2data(obj));
        }
    } else {
        console.error('Cannot read or parse ' + fileName);
    }
}
function words2languagesFlat(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        const keys = Object.keys(langs.en);
        keys.sort();
        for (const l in langs) {
            if (!langs.hasOwnProperty(l)) continue;
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            langs[l] = obj;
        }
        if (!fs.existsSync(src + 'i18n/')) {
            fs.mkdirSync(src + 'i18n/');
        }
        for (const ll in langs) {
            if (!langs.hasOwnProperty(ll)) continue;
            if (!fs.existsSync(src + 'i18n/' + ll)) {
                fs.mkdirSync(src + 'i18n/' + ll);
            }

            fs.writeFileSync(src + 'i18n/' + ll + '/flat.txt', lang2data(langs[ll], langs.en));
        }
        fs.writeFileSync(src + 'i18n/flat.txt', keys.join('\n'));
    } else {
        console.error('Cannot read or parse ' + fileName);
    }
}
function languagesFlat2words(src) {
    const dirs = fs.readdirSync(src + 'i18n/');
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort(function (a, b) {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB) return 1;
            if (posA < posB) return -1;
            return 0;
        }
    });
    const keys = fs.readFileSync(src + 'i18n/flat.txt').toString().split('\n');

    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt') continue;
        const lang = dirs[l];
        const values = fs.readFileSync(src + 'i18n/' + lang + '/flat.txt').toString().split('\n');
        langs[lang] = {};
        keys.forEach(function (word, i) {
            langs[lang][word] = values[i];
        });

        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    const temporaryIgnore = ['pt', 'fr', 'nl', 'flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn('Take from actual words.js: ' + w);
                    bigOne[w] = aWords[w]
                }
                dirs.forEach(function (lang) {
                    if (temporaryIgnore.indexOf(lang) !== -1) return;
                    if (!bigOne[w][lang]) {
                        console.warn('Missing "' + lang + '": ' + w);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}
function languages2words(src) {
    const dirs = fs.readdirSync(src + 'i18n/');
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort(function (a, b) {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB) return 1;
            if (posA < posB) return -1;
            return 0;
        }
    });
    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt') continue;
        const lang = dirs[l];
        langs[lang] = fs.readFileSync(src + 'i18n/' + lang + '/translations.json').toString();
        langs[lang] = JSON.parse(langs[lang]);
        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    const temporaryIgnore = ['pt', 'fr', 'nl', 'it', 'es', 'pl'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn('Take from actual words.js: ' + w);
                    bigOne[w] = aWords[w]
                }
                dirs.forEach(function (lang) {
                    if (temporaryIgnore.indexOf(lang) !== -1) return;
                    if (!bigOne[w][lang]) {
                        console.warn('Missing "' + lang + '": ' + w);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}

gulp.task('wwwWords2languages', function (done) {
    words2languages('./www/');
    done();
});

gulp.task('wwwWords2languagesFlat', function (done) {
    words2languagesFlat('./www/');
    done();
});

gulp.task('wwwLanguagesFlat2words', function (done) {
    languagesFlat2words('./www/');
    done();
});

gulp.task('wwwLanguages2words', function (done) {
    languages2words('./www/');
    done();
});

gulp.task('adminWords2languages', function (done) {
    words2languages('./admin/');
    done();
});

gulp.task('adminWords2languagesFlat', function (done) {
    words2languagesFlat('./admin/');
    done();
});

gulp.task('adminLanguagesFlat2words', function (done) {
    languagesFlat2words('./admin/');
    done();
});

gulp.task('adminLanguages2words', function (done) {
    languages2words('./admin/');
    done();
});


gulp.task('replacePkg', function (done) {
    gulp.src([
        srcDir + 'package.json',
        srcDir + 'io-package.json'
    ])
    .pipe(replace(/"version": *"[.0-9]*",/g, '"version": "' + version + '",'))
    .pipe(gulp.dest(srcDir));
});
gulp.task('replaceVis', function () {
    return gulp.src([
        srcDir + 'www/js/vis.js'
    ])
        .pipe(replace(/const version = *'[.0-9]*';/g, 'const version = "' + version + '";'))
        .pipe(replace(/"version": *"[.0-9]*",/g, '"version": "' + version + '",'))
        .pipe(replace(/version: *"[.0-9]*",/g, 'version: "' + version + '",'))
        .pipe(replace(/version: *'[.0-9]*',/g, 'version: \'' + version + '\','))
        .pipe(replace(/<!-- vis Version [.0-9]+ -->/g, '<!-- vis Version ' + version + ' -->'))
        .pipe(replace(/# vis Version [.0-9]+/g, '# vis Version ' + version))
        .pipe(replace(/ dev build [.0-9]+/g, '# dev build 0'))
        .pipe(gulp.dest( srcDir + '/www/js'));
});
gulp.task('replaceHtml', function (done) {
    gulp.src([
        srcDir + 'www/cache.manifest',
        srcDir + 'www/index.html',
        srcDir + 'www/edit.html'
    ])
        .pipe(replace(/<!-- vis Version [.0-9]+ -->/g, '<!-- vis Version ' + version + ' -->'))
        .pipe(replace(/const version = *'[.0-9]*';/g, 'const version = \'' + version + '\';'))
        .pipe(replace(/"version": *"[.0-9]*",/g, '"version": "' + version + '",'))
        .pipe(replace(/version: *"[.0-9]*",/g, 'version: "' + version + '",'))
        .pipe(replace(/version: *'[.0-9]*',/g, 'version: \'' + version + '\','))
        .pipe(replace(/# vis Version [.0-9]+/g, '# vis Version ' + version))
        .pipe(replace(/# dev build [.0-9]+/g, '# dev build 0'))
        .pipe(gulp.dest(srcDir + '/www'));
});

gulp.task('updatePackages', function (done) {
    iopackage.common.version = pkg.version;
    iopackage.common.news = iopackage.common.news || {};
    if (!iopackage.common.news[pkg.version]) {
        const news = iopackage.common.news;
        const newNews = {};

        newNews[pkg.version] = {
            en: 'news',
            de: 'neues',
            ru: 'новое'
        };
        iopackage.common.news = Object.assign(newNews, news);
    }
    fs.writeFileSync('io-package.json', JSON.stringify(iopackage, null, 4));
    done();
});

gulp.task('updateReadme', function (done) {
    const readme = fs.readFileSync('README.md').toString();
    const pos = readme.indexOf('## Changelog\n');
    if (pos !== -1) {
        const readmeStart = readme.substring(0, pos + '## Changelog\n'.length);
        const readmeEnd   = readme.substring(pos + '## Changelog\n'.length);

        if (readme.indexOf(version) === -1) {
            const timestamp = new Date();
            const date = timestamp.getFullYear() + '-' +
                ('0' + (timestamp.getMonth() + 1).toString(10)).slice(-2) + '-' +
                ('0' + (timestamp.getDate()).toString(10)).slice(-2);

            let news = '';
            if (iopackage.common.news && iopackage.common.news[pkg.version]) {
                news += '* ' + iopackage.common.news[pkg.version].en;
            }

            fs.writeFileSync('README.md', readmeStart + '### ' + version + ' (' + date + ')\n' + (news ? news + '\n\n' : '\n') + readmeEnd);
        }
    }
    done();
});

gulp.task('download', done => {
    request({
        url: 'https://github.com/GermanBluefox/TileBoard/archive/master.zip',
        encoding: null,
        method: 'GET'
    }, (err, status, body) => {
        if (body) {
            if (!fs.existsSync(__dirname + '/original')) {
                fs.mkdirSync(__dirname + '/original');
            }
            fs.writeFileSync(__dirname + '/original/master.zip', body);
        }
        done();
    });
});

gulp.task('unzip', done => {
    return fs.createReadStream(__dirname + '/original/master.zip')
        .pipe(unzip.Extract({ path: __dirname + '/original'}));
});

function copyFolder(src, dst) {
    const files = fs.readdirSync(src);
    files.forEach(file => {
        const fullPath = path.join(src, file);
        const fullPathD = path.join(dst, file);
        const stat = fs.lstatSync(fullPath);
        if (stat.isDirectory()) {
            if (!fs.existsSync(fullPathD)) {
                fs.mkdirSync(fullPathD);
            }
            copyFolder(fullPath, fullPathD);
        } else {
            if (file.match(/\.md$/)) return;
            if (file.match(/\.gitignore$/)) return;
            if (file.match(/\.less$/)) return;
            if (file.match(/\.example\.js$/)) return;
            if (!fs.existsSync(dst)) {
                fs.mkdirSync(dst);
            }
            const data = fs.readFileSync(fullPath);
            fs.writeFileSync(fullPathD, data);
        }
    })
}

function prepareIndexHtml() {
    let data = fs.readFileSync(__dirname + '/original/TileBoard-master/index.html').toString();
    data = data.replace('<link rel="stylesheet" href="styles/custom.css"/>', '<link rel="stylesheet" href="../tileboard.0/custom.css"/>');
    data = data.replace('<script src="config.js"></script>', '<script src="../tileboard.0/config.js"></script>');
    if (data.indexOf('socket.io.js') === -1) {
        data = data.replace('<script src="scripts/vendors/angular.min.js"></script>',
            '<script type="text/javascript" src="../../lib/js/socket.io.js"></script>\n' +
            '   <script src="./_socket/info.js"></script>\n' +
            '   <script src="scripts/vendors/conn.js"></script>\n' +
            '   <script src="scripts/vendors/angular.min.js"></script>');
    }

    fs.writeFileSync(__dirname + '/www/index.html', data);
}

gulp.task('copy', done => {
    copyFolder(__dirname + '/original/TileBoard-master/', __dirname + '/www/');
    //fs.writeFileSync(__dirname + '/www/index.html', fs.readFileSync(__dirname + '/src/index.html'));
    fs.writeFileSync(__dirname + '/www/scripts/vendors/conn.js', fs.readFileSync(__dirname + '/src/conn.js'));
    fs.writeFileSync(__dirname + '/www/scripts/models/api.js', fs.readFileSync(__dirname + '/src/api.js'));
    prepareIndexHtml();
    done();
});

gulp.task('replace', gulp.series('replacePkg', 'replaceVis', 'replaceHtml'));

gulp.task('update', gulp.series('updatePackages', 'updateReadme', 'replace'));

gulp.task('default', gulp.series('download', 'unzip', 'copy'));