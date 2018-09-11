# elm-webpack-project-loader

Specify location of main modules to build using an elm project file.

## Usage

1. Install the node package

```bash
npm install elm-webpack-project-loader
```

2. Add the `.elmproj` webpack loader.

```javascript
module: {
   rules: [{
      test: /\.elmproj$/,
      loader: 'elm-webpack-project-loader',
   }],

   noParse: /\.elmproj$/,
},

```

3. Require an elm project file

```javascript
var Elm = require('./path-to-elm-project.elmproj')
```

## Project File Structure

A JSON file that specifies the location of the `elm.json`, the main files to build, and the root of your project files.

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
   elm.json
   my-app.elmproj
```

**The .elmproj file**

```json
{
   "elm-json-dir": "./",
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
   rules: [{
      test: /\.elmproj$/,
      loader: 'elm-webpack-project-loader?debug=true',
   }],

   noParse: /\.elmproj$/,
},

```
