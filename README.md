# elm-project-loader

Specify location of main modules to build using an elm project file. 

## Usage

```bash 
npm install elm-project-loader
```

```javascript

var Elm = require('elm-project-loader!./path-to-elm-project')
```

## Project File Structure

A JSON file that specifies the location of the `elm-package.json`, the main files to build, and the root of your project files.

my-app.elmproj

```json
{
   "elm-package-dir": "./",
   "src-dir": "./",
   "main-modules": [
      "./Components/WidgetA/Main.elm",
      "./Components/WidgetB/Main.elm"
   ]
}
```
