module.exports = {
    mode: "development",

    entry: './src/index.js',

    devServer: {
        contentBase: "./dist",
        host: '172.30.47.65',
        port: 8080,
        hot: true,  // Hot reloading
        liveReload: true,  // Enable live reloading
    }
}
