var Webpack = require('webpack')

module.exports = {
   entry: './src/index.js',

   output: {
      path: './dist',
      filename: 'index.js'
   },

   plugins: [
      new Webpack.HotModuleReplacementPlugin()
   ],

   resolve: {
      modulesDirectories: ['node_modules'],
   },

   module: {
      loaders: [{
         test: /\.elmproj$/,
         loaders: [
            'elm-hot',
            '../../../index.js', // elm-project-loader when installed via npm
         ],
      }],

      noParse: /\.elmproj$/,
   },

   devServer: {
      inline: true,
      hot: true,
      stats: 'errors-only',
   },
};
