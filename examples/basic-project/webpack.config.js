const Path = require("path");

module.exports = {
   entry: "./src/index.js",

   output: {
      path: Path.join(__dirname, "./dist"),
      filename: "index.js"
   },

   module: {
      rules: [
         {
            test: /\.elmproj$/,
            loader: Path.join(__dirname, "../../index.js")
         }
      ],

      noParse: /\.elmproj$/
   },

   devServer: {
      inline: true,
      stats: "errors-only"
   }
};
