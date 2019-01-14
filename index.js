'use strict'

const _ = require('lodash')
const Path = require('path')
const LoaderUtils = require('loader-utils')
const Fs = require('fs')
const GlobFs = require('glob-fs')
const Spawn = require('child_process').spawn
const TempFile = require('temp')

const CreateSolution = options => {
   return new Promise((resolve, reject) => {
      const relativeToProject = path => {
         return Path.join(Path.dirname(options.projectFile), path)
      }

      const elmJsonDir = relativeToProject(options.project['elm-json-dir'])

      Fs.readFile(Path.join(elmJsonDir, 'elm.json'), (err, contents) => {
         if (err) {
            return reject(err)
         }

         return resolve({
            'project-file': options.projectFile,
            'elm-json-dir': elmJsonDir,
            'main-modules': _.map(options.project['main-modules'], relativeToProject),
            'elm-json': JSON.parse(contents),
            'cache-dependency-resolve': (options.project['cache-dependency-resolve'] || 'false').toString() === 'true',
            'query-params': options.params,
         })
      })
   })
}

const ExtractImports = importRegex => {
   return fileName => {
      return new Promise((resolve, reject) => {
         Fs.readFile(fileName, (err, contents) => {
            if (err) {
               return reject(err)
            }

            const lines = contents.toString().split('\n')

            const modules = _.chain(lines)
               .map(m => m.match(importRegex))
               .compact()
               .map(x => x[1])
               .value()

            return resolve(modules)
         })
      })
   }
}

const CheckIfElmFileExists = (basePath, cache) => {
   return relativePath => {
      const fullPath = Path.join(basePath, relativePath + '.elm')

      if (cache[fullPath]) {
         return Promise.resolve(cache[fullPath])
      }

      return new Promise(resolve => {
         Fs.access(fullPath, Fs.R_OK, err => {
            cache[fullPath] = err ? false : fullPath
            resolve(cache[fullPath])
         })
      })
   }
}

const RunFileTests = (tests, pathPart) => {
   return _.reduce(
      tests,
      (promiseChain, test) => {
         return promiseChain.then(res => {
            if (res) {
               return res
            }
            return test(pathPart)
         })
      },
      Promise.resolve(false)
   )
}

const importRegex = /^import\s+([^\s]+)/

const _CrawlDependencies = (paths, fileTests, dependencies, remainingPossibleFiles, cache) => {
   if (_.isEmpty(paths) || _.isEmpty(remainingPossibleFiles)) {
      return Promise.resolve(_.sortBy(dependencies, _.identity))
   }

   const unvisitedPaths = _.filter(paths, p => !cache[p])
   const newCache = _.merge(cache, _.keyBy(unvisitedPaths, _.identity))

   const parseTasks = _.map(unvisitedPaths, ExtractImports(importRegex))

   return Promise.all(parseTasks)
      .then(x => _.uniq(_.flatten(x)))
      .then(modules => _.map(modules, m => m.replace(/\.+/g, '/')))
      .then(modulePaths => {
         return Promise.all(
            _.map(modulePaths, modulePath => {
               return RunFileTests(fileTests, modulePath)
            })
         ).then(x => _.compact(_.flatten(x)))
      })
      .then(newDependencies => {
         return _CrawlDependencies(
            newDependencies,
            fileTests,
            _.uniq(dependencies.concat(newDependencies)),
            _.difference(remainingPossibleFiles, newDependencies),
            newCache
         )
      })
}

const CrawlDependencies = solution => {
   const elmPackageDir = solution['elm-json-dir']
   const sourceDirs = solution['elm-json']['source-directories']
   const checkCache = {}
   const searchDirs = _.map(sourceDirs, d => Path.join(elmPackageDir, d))
   const fileTests = _.map(searchDirs, d => {
      return CheckIfElmFileExists(d, checkCache)
   })

   return Promise.all(
         _.map(searchDirs, p => {
            return GlobFs({
                  gitignore: true,
                  dotfiles: true,
               })
               .readdirPromise('**/*.elm', {
                  cwd: p,
               })
               .then(res => _.filter(res, r => /elm$/i.test(r)))
         })
      )
      .then(results => _.uniq(_.flatten(results)))
      .then(allPossibleFiles => {
         return _CrawlDependencies(
            solution['main-modules'],
            fileTests,
            solution['main-modules'],
            _.difference(allPossibleFiles, solution['main-modules']), {}
         )
      })
}

// Adapted from checkFiles by https://github.com/samrensenhouse
const cleanMismatchedTempFiles = (elm_stuff_path, file_type_to_check, companion_file_type) => {
   const files = GlobFs.readdirSync(`${elm_stuff_path}/**/*.${file_type_to_check}`)

   _.forEach(files, file => {
      const matching_file = `${file.replace(/\.[^/.]+$/, '')}.${companion_file_type}`

      if (!Fs.existsSync(matching_file)) {
         try {
            Fs.unlinkSync(file)
         } catch (e) {}
      }
   })
}

const Compile = solution => {
   const collectOutput = stream => {
      let output = ''

      stream.on('data', d => (output += d))

      return {
         data: () => output,
      }
   }

   return new Promise((resolve, reject) => {
         TempFile.open({
               prefix: 'elm-project',
               suffix: '.js',
            },
            (err, info) => {
               if (err) return reject(err)

               const debug = solution['query-params']['debug'] ? '--debug' : ''
               const optimize = solution['query-params']['optimize'] ? '--optimize' : ''

               const elmArgs = _.compact(['make', debug, optimize, '--output', info.path].concat(solution['main-modules']))

               if (process.env.NODE_ENV !== 'production') {
                  const elm_stuff_path = Path.join(solution['elm-json-dir'], 'elm-stuff')

                  cleanMismatchedTempFiles(elm_stuff_path, 'elmi', 'elmo')
                  cleanMismatchedTempFiles(elm_stuff_path, 'elmo', 'elmi')
               }

               const elmMakeProc = Spawn('elm', elmArgs, {
                  cwd: solution['elm-json-dir'],
               })

               let stdOut = collectOutput(elmMakeProc.stdout)
               let stdErr = collectOutput(elmMakeProc.stderr)

               elmMakeProc.on('close', code => {
                  if (code !== 0) {
                     return reject(stdOut.data() + '\n' + stdErr.data())
                  }

                  Fs.readFile(info.path, (err, compiledOutput) => {
                     if (err) return reject(err)

                     Fs.unlink(info.path, () => {
                        /* Ignore error with unlink */
                     })

                     return resolve(compiledOutput)
                  })
               })
            }
         )
      })
      .then(output => {
         return {
            output,
            err: null,
         }
      })
      .catch(err => {
         return {
            output: null,
            err,
         }
      })
}

const dependencyCache = {}

const ElmProjectLoader = solution => {
   const getDependencies = () => {
      if (solution['cache-dependency-resolve'] && dependencyCache[solution['project-file']]) {
         return Promise.resolve(dependencyCache[solution['project-file']])
      }

      return CrawlDependencies(solution).then(deps => {
         dependencyCache[solution['project-file']] = deps
         return deps
      })
   }

   return Promise.all([Compile(solution), getDependencies()]).then(results => {
      return {
         result: results[0],
         dependencies: results[1],
         solution: solution,
      }
   })
}

module.exports = function (source) {
   const callback = this.async()

   if (!callback) {
      throw new Error('elm-webpack-project-loader only supports async mode.')
   }

   return Promise.resolve()
      .then(() => {
         return {
            params: LoaderUtils.getOptions(this) || {},
            project: JSON.parse(source),
            projectFile: LoaderUtils.getRemainingRequest(this),
         }
      })
      .then(options => {
         return CreateSolution(options).then(solution => {
            solution['cache-dependency-resolve'] && this.cacheable()

            if (solution['cache-dependency-resolve'] && dependencyCache[solution['project-file']]) {
               _.map(dependencyCache[solution['project-file']], d => this.addDependency(d))
            }

            return ElmProjectLoader(solution).then(loaded => {
               _.map(loaded.dependencies, d => this.addDependency(d))

               if (loaded.result.err) {
                  throw loaded.result.err
               }

               callback(null, loaded.result.output)
            })
         })
      })
      .catch(e => {
         this.emitError(e)
         callback(e)
      })
}
