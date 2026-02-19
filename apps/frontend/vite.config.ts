import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

function apiProxyPlugin(): Plugin {
  return {
    name: "api-proxy",
    configureServer(server) {
      // Vite 内蔵プロキシより先に /api をハンドルする
      server.middlewares.use("/api", (req, res) => {
        const url = `http://localhost:23000/api${req.url}`;
        const headers: Record<string, string> = {
          host: "localhost:23000",
        };
        if (req.headers["content-type"]) {
          headers["content-type"] = req.headers["content-type"] as string;
        }
        if (req.headers.accept) {
          headers.accept = req.headers.accept as string;
        }

        const proxyReq = require("node:http").request(
          url,
          { method: req.method, headers },
          (proxyRes: import("node:http").IncomingMessage) => {
            res.writeHead(proxyRes.statusCode ?? 200, {
              ...proxyRes.headers,
              "access-control-allow-origin": "*",
            });
            proxyRes.pipe(res);
          },
        );
        proxyReq.on("error", () => {
          res.writeHead(502);
          res.end("Proxy error");
        });
        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
  plugins: [
    apiProxyPlugin(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    viteReact(),
    tailwindcss(),
  ],
});
