import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
dotenv.config();
const app = express();

app.use(cors({
  origin: ["http://localhost:3000",process.env.REACT_FRONTEND_1,process.env.REACT_FRONTEND_2],
//   origin: "http://localhost:3000",
  credentials: true,
}));

// HTTP proxy (Node backend)
app.use(
  "/api",
  createProxyMiddleware({
    target: process.env.NODE_BACKEND,
    // target: "http://localhost:7000",
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
  })
);

// Socket.IO proxy (Node backend)
const socketIoProxy = createProxyMiddleware({
  target: process.env.NODE_BACKEND,
//   target: "http://localhost:7000",
  ws: true,
  changeOrigin: true,
});

// Go WebSocket proxy
const goWsProxy = createProxyMiddleware({
  target: process.env.GO_BACKEND,
  ws: true,
  changeOrigin: true,
});

// Mount HTTP routes (important)
app.use("/socket.io", socketIoProxy);
app.use("/ws", goWsProxy);

const server = http.createServer(app);

// 🔥 THIS IS THE CRITICAL PART
server.on("upgrade", (req, socket, head) => {
  console.log("[GATEWAY] WS upgrade:", req.url);

  if (req.url.startsWith("/ws")) {
    if (req.headers.cookie) {
      console.log("[GATEWAY] Forwarding cookies to Go");
    } else {
      console.log("[GATEWAY] No cookies found");
    }

    goWsProxy.upgrade(req, socket, head);
  }
});
const PORT=process.env.PORT;
server.listen(PORT, () => {
  console.log("🚀 Gateway running on port ",PORT);
});