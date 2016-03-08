const _ = require('lodash')
const Path = require('path')
const LoaderUtils = require('loader-utils')
const NodeElmCompiler = require('node-elm-compiler')
const Fs = require('fs')

const CreateSolution = (options) => {
   const project = options.project

   const elmPackageDir = Path.join(Path.dirname(options.projectFile), project['elm-package-dir'])

   const fullModulePaths = _.map(project['main-modules'], m => {
      return Path.join(elmPackageDir, m)
   })

   return Promise.resolve({
      'elm-package-dir': elmPackageDir,
      'cache-dependency-resolve': false,
      'main-modules': fullModulePaths,
   })
}

const ExtractImports = (regex) => {
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

const CheckExtension = (extension) => {
   return (basePath) => {
      return new Promise((resolve) => {
         Fs.access(basePath + extension, Fs.R_OK, (err) => {
            resolve(err ? false : (basePath + extension))
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
   .then(modules => {
      return modules.map(m => {
         return Path.join(solution['elm-package-dir'], m.replace(/\.+/g, '/'))
      })
   })
   .then(paths => {
      return FilterNonExistentFiles(paths, [
         CheckExtension('.elm'),
         CheckExtension('.js'),
      ])
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
   .then(result => {
      return result.output
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
