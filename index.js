const _ = require('lodash')
const Path = require('path')
const LoaderUtils = require('loader-utils')
const NodeElmCompiler = require('node-elm-compiler')
const Fs = require('fs')

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
            'elm-package-dir': elmPackageDir,
            'main-modules': _.map(options.project['main-modules'], relativeToProject),
            'elm-package': JSON.parse(contents),
            'cache-dependency-resolve': false,
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

const CheckExtension = (basePath, extension) => {
   return (relativePath) => {
      return new Promise((resolve) => {
         const fullPath = Path.join(basePath, relativePath + extension)
         Fs.access(fullPath, Fs.R_OK, (err) => {
            resolve(err ? false : fullPath)
         })
      })
   }
}

const FilterNonExistentFiles = (paths, tests) => {
   return Promise.all(_.map(paths, (path) => {
      return _.reduce(tests, (promiseChain, test) => {
         return promiseChain.then((res) => {
            if (res) {
               return res
            }
            return test(path)
         })
      }, Promise.resolve(false))
   }))
   .then(x => _.compact(_.flatten(x)))
}

const FindDependencies = (solution) => {
   const importRegex = /^import\s+([^\s]+)/
   const parseTasks = _.map(solution['main-modules'], ExtractImports(importRegex))

   return Promise.all(parseTasks)
   .then(x => _.uniq(_.flatten(x)))
   .then(modules => _.sortBy(modules, _.identity))
   .then(modules => _.map(modules, m => m.replace(/\.+/g, '/')))
   .then(modulePaths => {
      const sourceDirs = solution['elm-package']['source-directories']
      const elmPackageDir = solution['elm-package-dir']
      return FilterNonExistentFiles(modulePaths, _.flatMap(sourceDirs, d => {
         const packageRelativeDir = Path.join(elmPackageDir, d)

         return [
            CheckExtension(packageRelativeDir, '.elm'),
            CheckExtension(packageRelativeDir, '.js'),
         ]
      }))
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

const ElmProjectLoader = (options) => {
   return CreateSolution(options)
   .then(solution => {
      return Promise.all([Compile(solution), FindDependencies(solution)])
      .then(results => {
         return {
            output: results[0],
            dependencies: results[1],
            solution: solution,
         }
      })
   })
}

module.exports = function (source) {
   const callback = this.async()

   if (!callback) {
      return callback(new Error('elm-project-loader only supports async mode.'))
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
      return ElmProjectLoader(options)
      .then(loaded => {
         loaded.solution['cache-dependency-resolve'] && this.cacheable()

         _.map(loaded.dependencies, d => this.addDependency(d))

         callback(null, [loaded.output, 'module.exports = Elm;'].join('\n'))
      })
   })
   .catch(e => {
      callback(e)
   })
}
