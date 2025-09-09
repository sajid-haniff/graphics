module.exports = {
    mode: "development",

    entry: './src/index.js',

    devServer: {
        contentBase: "./dist",
        host: 'localhost',
        port: 8080,
        hot: true,  // Hot reloading
        liveReload: true,  // Enable live reloading
    }
}
