'use strict';
var path = require('path');
var webpack = require('webpack');
var isProduction = process.argv.indexOf('-p') !== -1;

var cache = {};
var extensions = [
	'', '.js', '.jsx', '.es6.js'
];

module.exports = [{
	cache: cache,
	entry: {
		main: './src/Main.js',
	},
	output: {
		path: path.resolve(__dirname, './dist'),
		filename: '[name].js'
	},
	resolve: {
		modules: ['node_modules']
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: [/node_modules/],
				use: [{
					loader: 'babel-loader',
					options: { presets: [['es2015', { modules: false }]] }
				}]
			},
			{
				test: /\.css$/,
				use: [{
					loader: 'style-loader!css-loader'
				}]
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
		})
	]
}];