var Webpack = require("webpack");
var Path = require("path");

module.exports = {
   entry: "./src/index.js",

   output: {
      path: Path.join(__dirname, "./dist"),
      filename: "index.js"
   },

   plugins: [new Webpack.HotModuleReplacementPlugin()],

   module: {
      rules: [
         {
            test: /\.elmproj$/,
            loaders: [
               "elm-hot-loader",
               Path.join(__dirname, "../../index.js") // elm-webpack-project-loader when installed via npm
            ]
         }
      ],

      noParse: /\.elmproj$/
   },

   devServer: {
      inline: true,
      hot: true,
      stats: "errors-only"
   }
};
