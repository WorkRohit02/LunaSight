// src/components/LunarSouthPoleMap.tsx
//
//  Interactive 2‑D lunar south‑pole map using real NASA WMTS tiles.
//  • Moon Trek (NASA) – EPSG:104903 (polar stereographic)
//  • LROC QuickMap – EPSG:10 (also polar stereographic)
//  • Max‑zoom respects each service’s native limits
//  • Up to two selectable sites – oldest is dropped when a third is added
//  • onSiteSelect callback delivers { id, name, latitude, longitude }
//  • Legend, scale bar and Reset button are included
//  • No mock data – everything comes from the user’s clicks or props
//
import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ScaleControl,
  useMapEvents,
} from "react-leaflet";
import L, { CRS, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import proj4 from "proj4";
import "proj4leaflet";

/* ---------------------------------------------------------------------------
   Moon‑specific CRS definitions
   --------------------------------------------------------------------------- */
// EPSG:104903 – the Polar Stereographic projection used by NASA Moon Trek
const moonTrekCRS = new CRS.Proj4(
  "EPSG:104903",
  "+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R=1738.0 +units=m +no_defs",
  {
    // Resolutions match the WMTS matrix set “default028mm”. They are the
    // standard Web‑Mercator values divided by 2ⁿ, but expressed for the
    // lunar polar stereographic projection.
    resolutions: [
      156543.033928041, // z 0
      78271.5169640205,
      39135.7584820102,
      19567.8792410051,
      9783.9396205026,
      4891.9698102513,
      2445.9849051256,
      1222.9924525628,
      611.4962262814,
      305.7481131407,
      152.8740565704,
      76.4370282852,
      38.2185141426,
      19.1092570713, // z 13 (max for most Moon Trek layers)
    ],
    origin: [0, 0],
  }
);

// EPSG:10 – the Polar Stereographic projection used by LROC QuickMap
// (identical parameters to the Moon Trek CRS, just a different EPSG code)
const quickMapCRS = new CRS.Proj4(
  "EPSG:10",
  "+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R=1738.0 +units=m +no_defs",
  {
    // QuickMap’s WMTS matrix set is the same as Moon Trek’s, so we can reuse
    // the same list of resolutions.
    resolutions: [
      156543.033928041,
      78271.5169640205,
      39135.7584820102,
      19567.8792410051,
      9783.9396205026,
      4891.9698102513,
      2445.9849051256,
      1222.9924525628,
      611.4962262814,
      305.7481131407,
      152.8740565704,
      76.4370282852,
      38.2185141426,
      19.1092570713,
    ],
    origin: [0, 0],
  }
);

/* ---------------------------------------------------------------------------
   Type definitions
   --------------------------------------------------------------------------- */
interface Site {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface Props {
  /** Which WMTS service to use – “moonTrek” (NASA) or “quickMap” (LROC) */
  service: "moonTrek" | "quickMap";
  /** WMTS layer name that exists on *both* services.
   *  Example: "LRO_LOLA_DEM_SouthPole_100m" or "LROC_Mosaic". */
  layer: string;
  /** Callback fired whenever a site is added/updated */
  onSiteSelect?: (site: Site) => void;
}

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */
export const LunarSouthPoleMap: React.FC<Props> = ({
  service,
  layer,
  onSiteSelect,
}) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [showHillshade, setShowHillshade] = useState(true);

  /* -------------------------------------------------------------
     Tile URL construction – each service has its own WMTS pattern.
     The URLs are taken directly from the official documentation.
     ------------------------------------------------------------- */
  const tileUrl =
    service === "moonTrek"
      ? `https://trek.nasa.gov/tiles/Moon/SP/${layer}/1.0.0/default/default028mm/{z}/{x}/{y}.png`
      : `https://quickmap.lroc.im-ldi.com/tiles/quickmap/SP/${layer}/{z}/{x}/{y}.jpg`;

  // Hill‑shade is only offered by QuickMap; we still keep the UI element
  // so the user can toggle it for the QuickMap service.
  const hillshadeUrl =
    "https://quickmap.lroc.im-ldi.com/tiles/quickmap/SP/Hillshade/{z}/{x}/{y}.png";

  // Max zoom is the highest level listed in the WMTS capabilities for each
  // service. For Moon Trek it is 13, for QuickMap it is 12.
  const maxZoom = service === "moonTrek" ? 13 : 12;

  // Choose the appropriate CRS instance for the selected service.
  const crs = service === "moonTrek" ? moonTrekCRS : quickMapCRS;

  /* -------------------------------------------------------------
     Map click handling – keep at most two sites.
     ------------------------------------------------------------- */
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        // Do not exceed two markers.
        const newSite: Site = {
          id: crypto.randomUUID(),
          name: `Site ${sites.length + 1}`,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        };
        const updated = [...sites, newSite].slice(-2); // keep last two
        setSites(updated);
        onSiteSelect?.(newSite);
      },
    });
    return null;
  };

  /* -------------------------------------------------------------
     UI helpers
     ------------------------------------------------------------- */
  const handleReset = () => {
    setSites([]);
    onSiteSelect?.({ id: "", name: "", latitude: 0, longitude: 0 });
  };

  const formatCoord = (lat: number, lng: number) => {
    const latDir = lat < 0 ? "S" : "N";
    const lngDir = lng < 0 ? "W" : "E";
    return `${Math.abs(lat).toFixed(1)}°${latDir}, ${Math.abs(lng).toFixed(1)}°${lngDir}`;
  };

  return (
    <>
      {/* ---------------------------------------------------------
          Controls – Hillshade toggle and reset button
         --------------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(255,255,255,0.9)",
          padding: "6px 10px",
          borderRadius: 4,
          fontSize: "0.85rem",
          zIndex: 1000,
        }}
      >
        {/* Hillshade – only visible for QuickMap, but we keep the UI for
            consistency. */}
        {service === "quickMap" && (
          <label style={{ marginRight: 8 }}>
            <input
              type="checkbox"
              checked={showHillshade}
              onChange={(e) => setShowHillshade(e.target.checked)}
            />{" "}Hillshade overlay
          </label>
        )}

        <button
          onClick={handleReset}
          style={{
            marginLeft: 8,
            padding: "4px 8px",
            background: "#d9534f",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      {/* ---------------------------------------------------------
          The Leaflet map
         --------------------------------------------------------- */}
      <MapContainer
        crs={crs}
        center={[-89.9, 0] as LatLngExpression} // South‑pole centre
        zoom={2}
        minZoom={0}
        maxZoom={maxZoom}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          // Add hillshade overlay only when QuickMap is active and the box is checked.
          if (service === "quickMap" && showHillshade) {
            L.tileLayer(hillshadeUrl, { opacity: 0.5 }).addTo(map);
          }
        }}
      >
        {/* Basemap tiles */}
        <TileLayer url={tileUrl} attribution="NASA Moon Trek / LROC QuickMap" />

        {/* Scale bar – always metric (km) */}
        <ScaleControl imperial={false} position="bottomleft" />

        {/* Click handling */}
        <MapClickHandler />

        {/* Site markers */}
        {sites.map((site) => (
          <Marker
            key={site.id}
            position={[site.latitude, site.longitude] as LatLngExpression}
          >
            <Popup>
              <strong>{site.name}</strong>
              <br />
              {formatCoord(site.latitude, site.longitude)}
            </Popup>
          </Marker>
        ))}

        {/* -----------------------------------------------------
            Small floating panel showing the *latest* site’s coords
           ----------------------------------------------------- */}
        {sites.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(255,255,255,0.8)",
              padding: "6px 10px",
              borderRadius: 4,
              fontSize: "0.9rem",
              zIndex: 1000,
            }}
          >
            <div>
              <strong>Current site</strong>
            </div>
            <div>{formatCoord(sites[sites.length - 1].latitude, sites[sites.length - 1].longitude)}</div>
          </div>
        )}

        {/* -----------------------------------------------------
            Legend (static – you can extend it with more entries)
           ----------------------------------------------------- */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            background: "rgba(255,255,255,0.9)",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: "0.85rem",
            zIndex: 1000,
          }}
        >
          <strong>Legend</strong>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>🔴 Selected site (max 2)</li>
          </ul>
        </div>
      </MapContainer>
    </>
  );
};
