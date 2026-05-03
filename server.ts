import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // --- HELPER FUNCTIONS PROVIDED BY USER ---
  function getSunPosition(lat: number, lon: number, date: Date) {
    try {
      const rad = Math.PI / 180;
      const day = Math.floor(
        (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
      );
      const decl = 23.45 * Math.sin(rad * (360 / 365 * (day - 81)));
      const time = date.getHours() + date.getMinutes() / 60;
      const ha = (time - 12) * 15;
      const elevation = Math.asin(
        Math.sin(lat * rad) * Math.sin(decl * rad) +
        Math.cos(lat * rad) * Math.cos(decl * rad) * Math.cos(ha * rad)
      ) / rad;

      return {
        elevation: isNaN(elevation) ? -90 : elevation,
        azimuth: 0
      };
    } catch (e) {
      return { elevation: -90, azimuth: 0 };
    }
  }

  // --- API ROUTES FIRST ---
  
  // User's requested endpoint
  app.post("/sun/search", async (req, res) => {
    try {
      const body = req.body || {};
      const locations = Array.isArray(body.locations) ? body.locations : [];
      const weather = body.weather || null;

      const now = new Date(); // Use server-side real time for "Sunny now" precision

      const results = locations.map((loc, i) => {
        // Validation
        const lat = Number(loc?.lat) || 0;
        const lon = Number(loc?.lon) || 0;

        const sun = getSunPosition(lat, lon, now);
        const cloud = Number(loc?.weather?.cloud ?? weather?.cloud);
        const precipitation = Number(loc?.weather?.precipitation ?? weather?.precipitation ?? 0);
        const code = Number(loc?.weather?.code ?? weather?.code ?? 0);
        const hasWeather = Number.isFinite(cloud) && Number.isFinite(code);
        const currentSun = hasWeather && sun.elevation > 3 && cloud < 55 && precipitation <= 0 && code < 51;
        const score = hasWeather ? (currentSun ? Math.round(Math.min(100, Math.max(55, (sun.elevation / 25) * 100))) : 0) : null;
        const confidence = !hasWeather ? 'low' : cloud < 30 && precipitation <= 0 ? 'high' : 'medium';
        const reason = !hasWeather
          ? 'Weather data unavailable'
          : currentSun
            ? 'Sun above horizon, clouds allow direct sunlight, no precipitation'
            : sun.elevation <= 0
              ? 'Sun below horizon'
              : precipitation > 0 || code >= 51
                ? 'Precipitation blocks direct sunlight'
                : 'Cloud cover too high for direct sunlight';

        return {
          id: i,
          name: loc?.name || "Unknown Place",
          sunscore: score,
          sunStatus: hasWeather ? (currentSun ? 'Direct sun now' : 'No direct sun soon') : 'Sun data unavailable',
          confidence,
          reason,
          score,
          sunScore: score,
          currentSun,
          directSunStatus: hasWeather ? (currentSun ? 'now' : 'none') : 'unavailable',
          nextSunTime: "N/A",
          duration: 0,
          lat: lat,
          lon: lon,
          type: loc?.type || 'cafe',
          dist: loc?.dist || 0
        };
      });

      results.sort((a, b) => (b?.score || 0) - (a?.score || 0));

      res.json(results.slice(0, 50));

    } catch (err) {
      console.error("API ERROR:", err);
      // Fallback on total crash
      res.json([
        {
          id: 0,
          name: "Fallback Cafe",
          score: 0, 
          currentSun: false,
          nextSunTime: "N/A",
          duration: 0
        }
      ]);
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/overpass", async (req, res) => {
    try {
      const query = typeof req.body?.query === "string" ? req.body.query : "";
      if (!query.trim()) {
        res.status(400).json({ error: "Missing Overpass query" });
        return;
      }

      const upstream = await fetch("https://lz4.overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SunkindSolarApp/1.0",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      const text = await upstream.text();
      res.status(upstream.status);
      res.type(upstream.headers.get("content-type") || "application/json");
      res.send(text);
    } catch (error) {
      console.error("Overpass proxy failed:", error);
      res.status(502).json({ error: "Overpass proxy failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite dev server middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached.");
    } catch (viteError) {
      console.error("FAILED TO START VITE SERVER:", viteError);
      process.exit(1);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
