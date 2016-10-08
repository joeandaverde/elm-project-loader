module.exports = {
   entry: './src/index.js',

   output: {
      path: './dist',
      filename: 'index.js'
   },

   resolve: {
      modulesDirectories: ['node_modules'],
   },

   module: {
      loaders: [{
         test: /\.elmproj$/,
         loader: '../../../index.js',
      }],

      noParse: /\.elmproj$/,
   },

   devServer: {
      inline: true,
      stats: 'errors-only',
   },
};
