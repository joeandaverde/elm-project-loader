const _ = require('lodash')
const Path = require('path')
const LoaderUtils = require('loader-utils')
const NodeElmCompiler = require('node-elm-compiler')
const Fs = require('fs')
const GlobFs = require('glob-fs')

const CreateSolution = (options) => {
   return new Promise((resolve, reject) => {
      const relativeToProject = (path) => {
         return Path.join(Path.dirname(options.projectFile), path)
      }

      const elmPackageDir = relativeToProject(options.project['elm-package-dir'])

      Fs.readFile(Path.join(elmPackageDir, 'elm-package.json'), (err, contents) => {
         if (err) {
            return reject(err)
         }

         return resolve({
            'project-file': options.projectFile,
            'elm-package-dir': elmPackageDir,
            'main-modules': _.map(options.project['main-modules'], relativeToProject),
            'elm-package': JSON.parse(contents),
            'cache-dependency-resolve': (options.project['cache-dependency-resolve'] || 'false').toString() === 'true',
         })
      })
   })
}

const ExtractImports = (importRegex) => {
   return (fileName) => {
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

const CheckExtension = (basePath, extension, cache) => {
   return (relativePath) => {
      const fullPath = Path.join(basePath, relativePath + extension)

      if (cache[fullPath]) {
         return Promise.resolve(cache[fullPath])
      }

      return new Promise((resolve) => {
         Fs.access(fullPath, Fs.R_OK, (err) => {
            cache[fullPath] = err ? false : fullPath
            resolve(cache[fullPath])
         })
      })
   }
}

const RunFileTests = (tests, pathPart) => {
   return _.reduce(tests, (promiseChain, test) => {
      return promiseChain.then((res) => {
         if (res) {
            return res
         }
         return test(pathPart)
      })
   }, Promise.resolve(false))
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
      return Promise.all(_.map(modulePaths, modulePath => {
         return RunFileTests(fileTests, modulePath)
      }))
      .then(x => _.compact(_.flatten(x)))
   })
   .then(newDependencies => {
      return _CrawlDependencies(newDependencies, fileTests, _.uniq(dependencies.concat(newDependencies)), _.difference(remainingPossibleFiles, newDependencies), newCache)
   })
}

const CrawlDependencies = (solution) => {
   const elmPackageDir = solution['elm-package-dir']
   const sourceDirs = solution['elm-package']['source-directories']
   const checkCache = {}
   const searchDirs = _.map(sourceDirs, d => Path.join(elmPackageDir, d))
   const fileTests = _.flatMap(searchDirs, d => {
      return [
         CheckExtension(d, '.elm', checkCache),
         CheckExtension(d, '.js', checkCache),
      ]
   })

   // Start by listing all js and elm files dependencies
   return Promise.all(_.map(searchDirs, p => {
      return GlobFs({ gitignore: true, dotfiles: true })
      .readdirPromise('**/*.+(js|elm)', { cwd: p })
      .then(res => _.filter(res, r => /(js|elm)$/i.test(r)))
   }))
   .then(results => _.uniq(_.flatten(results)))
   .then(allPossibleFiles => {
      return _CrawlDependencies(solution['main-modules'], fileTests, solution['main-modules'], _.difference(allPossibleFiles, solution['main-modules']), {})
   })
}

const Compile = (solution) => {
   const options = {
      yes: true,
      emitWarning: true,
      cwd: solution['elm-package-dir'],
   }

   return NodeElmCompiler.compileToString(solution['main-modules'], options)
}

const dependencyCache = {}

const ElmProjectLoader = (solution) => {
   const getDependencies = () => {
      if (solution['cache-dependency-resolve'] && dependencyCache[solution['project-file']]) {
         return Promise.resolve(dependencyCache[solution['project-file']])
      }

      return CrawlDependencies(solution)
      .then(deps => {
         dependencyCache[solution['project-file']] = deps
         return deps
      })
   }

   return Promise.all([Compile(solution), getDependencies()])
   .then(results => {
      return {
         output: results[0],
         dependencies: results[1],
         solution: solution,
      }
   })
}

module.exports = function (source) {
   const callback = this.async()

   if (!callback) {
      throw new Error('elm-project-loader only supports async mode.')
   }

   return Promise.resolve()
   .then(() => {
      return {
         params: LoaderUtils.parseQuery(this.query),
         project: JSON.parse(source),
         projectFile: LoaderUtils.getRemainingRequest(this),
      }
   })
   .then(options => {
      return CreateSolution(options)
      .then(solution => {
         solution['cache-dependency-resolve'] && this.cacheable()

         if (solution['cache-dependency-resolve'] && dependencyCache[solution['project-file']]) {
            _.map(dependencyCache[solution['project-file']], d => this.addDependency(d))
         }

         return ElmProjectLoader(solution)
         .then(loaded => {
            _.map(loaded.dependencies, d => this.addDependency(d))

            callback(null, [loaded.output, 'module.exports = Elm;'].join('\n'))
         })
      })
   })
   .catch(e => {
      callback(e)
   })
}
