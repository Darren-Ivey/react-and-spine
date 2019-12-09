const proxy = require("http-proxy-middleware");

module.exports = app => {
  app.use(
    "http://localhost:3000/",
    proxy({
      target: "http://localhost:8081/",
      changeOrigin: true
    })
  );
};