module.exports = {
    mode: "development",

    entry: './src/index.js',

    devServer: {
        contentBase: "./dist",
        host: '0.0.0.0',
        port: 8080,
        hot: true,  // Hot reloading
        liveReload: true,  // Enable live reloading
    }
}
