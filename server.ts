import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Discord/Telegram notifications
  app.post("/api/notify", async (req, res) => {
    const { webhookUrl, message } = req.body;
    
    if (!webhookUrl || !message) {
      return res.status(400).json({ error: "Missing webhookUrl or message" });
    }

    try {
      // Simple Discord webhook support
      await axios.post(webhookUrl, {
        content: message,
        username: "Trading Sentinel",
        avatar_url: "https://cdn-icons-png.flaticon.com/512/2586/2586117.png"
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Notification error:", error.message);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
