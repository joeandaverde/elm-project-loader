# elm-project-loader

Specify location of main modules to build using an elm project file.

## Usage

1. Install the node package

```bash
npm install elm-project-loader
```

2. Add the `.elmproj` webpack loader.

```javascript
module: {
   loaders: [{
      test: /\.elmproj$/,
      loader: 'elm-project',
   }],

   noParse: /\.elmproj$/,
},

```

3. Require an elm project file

```javascript
var Elm = require('./path-to-elm-project.elmproj')
```

## Project File Structure

A JSON file that specifies the location of the `elm-package.json`, the main files to build, and the root of your project files.

**Assuming the file structure:**

```
/app
   /src
   |   /elm
   |----  /Components
   |-------- /WidgetA
   |----------- Main.elm
   |-------- /WidgetB
   |----------- Main.elm
   |
   elm-package.json
   my-app.elmproj
```  

**The .elmproj file**

```json
{
   "elm-package-dir": "./",
   "main-modules": [
      "./src/elm/Components/WidgetA/Main.elm",
      "./src/elm/Components/WidgetB/Main.elm"
   ]
}
```

## Using the Elm Debugger

Append the 'debug' query string to the end of the loader.

```javascript
module: {
   loaders: [{
      test: /\.elmproj$/,
      loader: 'elm-project?debug=true',
   }],

   noParse: /\.elmproj$/,
},

```
