const net = require("node:net");

// Fixed TCP destinations only: this is not an HTTP CONNECT or forward proxy.
const routes = Object.freeze([
  Object.freeze({ port: 3001, host: "web" }),
  Object.freeze({ port: 3011, host: "server" }),
]);

function relay(client, route) {
  const upstream = net.connect({ host: route.host, port: route.port });
  const close = () => { client.destroy(); upstream.destroy(); };
  client.setTimeout(300000, close);
  upstream.setTimeout(300000, close);
  client.on("error", close);
  upstream.on("error", close);
  client.on("close", () => upstream.destroy());
  upstream.on("close", () => client.destroy());
  client.pipe(upstream).pipe(client);
}

if (require.main === module) {
  for (const route of routes) {
    const server = net.createServer((client) => relay(client, route));
    server.on("error", (error) => {
      console.error(`LAB_INGRESS: ${error.code || "listen failed"}`);
      process.exit(1);
    });
    server.listen(route.port, "0.0.0.0");
  }
}

module.exports = { routes, relay };
