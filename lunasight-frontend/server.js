// Simple Express backend for LunaSight
// Provides a minimal AI‑science‑engine‑style API that can be extended.
// Currently it accepts site data and returns a dummy analysis (elevation).

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Health check
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", message: "LunaSight backend is running" });
});

// Receive a site and return a mock analysis
app.post("/api/site", (req, res) => {
  const { id, name, latitude, longitude } = req.body;
  if (!id || !name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Missing required site fields" });
  }
  // Dummy “analysis” – in a real engine you would call a model here.
  const analysis = {
    id,
    name,
    latitude,
    longitude,
    // Simulated elevation (meters) – just a random value for demo.
    elevation: (Math.random() * 3000).toFixed(1),
    // Simulated horizon profile placeholder.
    horizonProfileUrl: "https://example.com/horizon-profile.json",
  };
  res.json({ status: "ok", analysis });
});

app.listen(PORT, () => {
  console.log(`LunaSight backend listening on port ${PORT}`);
});
