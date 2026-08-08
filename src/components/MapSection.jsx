import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import "../MapSection.css";
import { ref, onValue, update } from "firebase/database";
import { database } from "../firebase/firebaseConfig";

// Custom Leaflet Icons Fix
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

export default function MapSection() {
    const TOMTOM_API_KEY = 'ADEP30hUNYnI2MVpGaRsqNACvNdK7Gpi';

    const [mapCenter, setMapCenter] = useState([14.5648, 120.9932]);
    const [origin, setOrigin] = useState(null); 
    const [destination, setDestination] = useState(null); 
    const [vehicleLayer, setVehicleLayer] = useState("LOW");
    
    const originRef = useRef(origin);
    const destRef = useRef(destination);
    const isNavigatingRef = useRef(false);
    
    useEffect(() => { originRef.current = origin; }, [origin]);
    useEffect(() => { destRef.current = destination; }, [destination]);

    const [originQuery, setOriginQuery] = useState("");
    const [originSuggestions, setOriginSuggestions] = useState([]);
    const [destQuery, setDestQuery] = useState("");
    const [destSuggestions, setDestSuggestions] = useState([]);

    const [routeSegments, setRouteSegments] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null); 
    const [isNavigating, setIsNavigating] = useState(false);
    const [liveLocation, setLiveLocation] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => { isNavigatingRef.current = isNavigating; }, [isNavigating]);

    const [firebaseNodes, setFirebaseNodes] = useState({});
    const nodeBlockStates = useRef({});

    // Leaflet Native Map Refs
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerGroupRef = useRef(null);

    // 1. Initialize Pure Leaflet Map on Mount
    useEffect(() => {
        if (!mapInstanceRef.current && mapRef.current) {
            const map = L.map(mapRef.current, {
                center: mapCenter,
                zoom: 15,
                zoomControl: false
            });

            // Base Layers & TomTom Traffic
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
            L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`, { maxZoom: 19, opacity: 0.85, tileSize: 128, zoomOffset: 1 }).addTo(map);
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", { maxZoom: 19, zIndex: 1000 }).addTo(map);

            // Layer group for dynamic markers/routes so we can clear them easily
            const layerGroup = L.layerGroup().addTo(map);
            layerGroupRef.current = layerGroup;

            // Map Click Events (Shift+Click Teleport, Alt+Click Admin Node, Normal Click Pins)
            map.on('click', (e) => {
                if (e.originalEvent.shiftKey) {
                    if (isNavigatingRef.current) {
                        const latlng = [e.latlng.lat, e.latlng.lng];
                        setLiveLocation(latlng);
                        if (originRef.current) setOrigin(prev => ({ ...prev, latlng }));
                    } else {
                        alert("⚠️ Click 'Start Navigation' first!");
                    }
                    return;
                }

                if (e.originalEvent.altKey) {
                    const lat = e.latlng.lat;
                    const lng = e.latlng.lng;
                    const nodeId = window.prompt(`ADMIN TOOL\n\nPlace Node at ${lat.toFixed(5)}, ${lng.toFixed(5)}:`);
                    if (nodeId) {
                        update(ref(database, 'nodes/' + nodeId), { lat, lng }).catch(() => alert("Failed."));
                    }
                    return;
                }

                const latlng = [e.latlng.lat, e.latlng.lng];
                if (!originRef.current) {
                    setOrigin({ latlng, title: "Dropped Pin" });
                    setOriginQuery("Dropped Pin");
                } else {
                    setDestination({ latlng, title: "Dropped Pin" });
                    setDestQuery("Dropped Pin");
                }
            });

            // Right-Click Remove Node
            map.on('contextmenu', () => {
                const nodeId = window.prompt("ADMIN REMOVAL TOOL\n\nEnter Node ID to remove:");
                if (nodeId && window.confirm(`Hide ${nodeId}?`)) {
                    update(ref(database, 'nodes/' + nodeId), { lat: null, lng: null }).catch(() => alert("Failed."));
                }
            });

            mapInstanceRef.current = map;
        }
    }, []);

    // Update Map Center Dynamically & Invalidate Size to prevent shifting
    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(mapCenter, 16);
            setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
            }, 100);
        }
    }, [mapCenter]);

    // 2. Render Markers & Routes dynamically into the Leaflet layer group
    useEffect(() => {
        const mapGroup = layerGroupRef.current;
        if (!mapGroup) return;

        mapGroup.clearLayers();

        // Origin Marker
        if (origin) {
            L.marker(origin.latlng, { icon: greenIcon }).addTo(mapGroup).bindPopup(origin.title);
        }
        // Destination Marker
        if (destination) {
            L.marker(destination.latlng, { icon: redIcon }).addTo(mapGroup).bindPopup(destination.title);
        }
        // Live Location Dot
        if (liveLocation) {
            L.circleMarker(liveLocation, { radius: 8, fillColor: "#3b82f6", color: "#ffffff", weight: 3, fillOpacity: 1 }).addTo(mapGroup);
        }

        // Firebase Nodes
        Object.keys(firebaseNodes).forEach(nodeId => {
            const nodeContainer = firebaseNodes[nodeId];
            if (!nodeContainer || typeof nodeContainer !== 'object') return;
            const childKeys = Object.keys(nodeContainer);
            if (childKeys.length === 0) return;
            
            const latestData = nodeContainer[childKeys[childKeys.length - 1]];
            const lat = latestData?.lat || nodeContainer.lat;
            const lng = latestData?.lng || nodeContainer.lng;
            const floodDepth = latestData?.waterLevel || 0;
            const battery = latestData?.battery || 'N/A';
            const status = latestData?.status || 'UNKNOWN';

            if (!lat || !lng) return;

            let color = "#10b981";
            if (floodDepth >= 50) color = "#ef4444";
            else if (floodDepth >= 30) color = "#f59e0b";
            else if (floodDepth >= 15) color = "#eab308";

            const popupContent = `
                <div style="font-family: Inter, sans-serif;">
                    <b style="font-size: 14px; color: #0f172a;">Node: ${nodeId}</b><br />
                    <span style="font-size: 13px; color: #475569;">
                        Flood Depth: <b style="color: ${color};">${floodDepth} cm</b><br />
                        Battery: <b>${battery}V</b><br />
                        Status: <b style="color: ${status === 'ONLINE' ? '#10b981' : '#ef4444'};">${status}</b>
                    </span>
                </div>
            `;

            L.circleMarker([lat, lng], { radius: 8, fillColor: color, color: "#ffffff", weight: 2, fillOpacity: 0.9 })
                .addTo(mapGroup)
                .bindPopup(popupContent);
        });

        // Route Segments Polylines
        routeSegments.forEach(segment => {
            const positions = segment.coords.map(c => [c.latitude, c.longitude]);
            L.polyline(positions, { color: segment.color, weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(mapGroup);
        });

    }, [origin, destination, liveLocation, firebaseNodes, routeSegments]);

    // Firebase Listener
    useEffect(() => {
        const nodesRef = ref(database, 'nodes');
        const unsubscribe = onValue(nodesRef, (snapshot) => {
            const nodes = snapshot.val();
            if (nodes) {
                setFirebaseNodes(nodes);
                checkFloodTriggers(nodes);
            }
        });
        return () => unsubscribe();
    }, [vehicleLayer]);

    const autoLocate = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const latlng = [position.coords.latitude, position.coords.longitude];
                setLiveLocation(latlng);
                setOrigin({ latlng, title: "Current Location" });
                setOriginQuery("Current Location");
                setMapCenter(latlng);
            });
        }
    };

    useEffect(() => { autoLocate(); }, []);

    const checkFloodTriggers = (nodes) => {
        const limits = { "LOW": 15, "MID": 30, "HIGH": 50 };
        const myLimit = limits[vehicleLayer] || 15;
        let forceReroute = false;

        Object.keys(nodes).forEach(nodeId => {
            const nodeContainer = nodes[nodeId];
            if (nodeContainer && typeof nodeContainer === 'object') {
                const childKeys = Object.keys(nodeContainer);
                if (childKeys.length > 0) {
                    const latestData = nodeContainer[childKeys[childKeys.length - 1]];
                    const floodDepth = latestData?.waterLevel || 0;
                    if (floodDepth >= myLimit && nodeBlockStates.current[nodeId] !== 'blocked') {
                        forceReroute = true;
                    }
                    nodeBlockStates.current[nodeId] = floodDepth >= myLimit ? 'blocked' : 'clear';
                }
            }
        });

        if (isNavigatingRef.current && forceReroute) {
            alert("⚠️ Flood detected ahead from IoT sensor network! Recalculating route...");
            fetchRoute(true);
        }
    };

    const handleSearchInput = async (query, isOrigin) => {
        if (isOrigin) setOriginQuery(query);
        else setDestQuery(query);

        if (query.trim().length < 2) {
            if (isOrigin) setOriginSuggestions([]);
            else setDestSuggestions([]);
            return;
        }

        const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&lat=${mapCenter[0]}&lon=${mapCenter[1]}&radius=30000&countrySet=PH&limit=10&typeahead=true&idxSet=POI,PAD,Str`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.results) {
                const sorted = data.results.sort((a, b) => (b.poi ? 1 : 0) - (a.poi ? 1 : 0));
                let results = sorted.map(r => ({
                    lat: r.position.lat,
                    lon: r.position.lon,
                    primary: r.poi ? r.poi.name : (r.address.streetName || r.address.freeformAddress),
                    secondary: r.address.freeformAddress || "Philippines"
                }));
                const unique = [];
                const seen = new Set();
                results.forEach(item => {
                    const key = `${item.primary.toLowerCase()}-${item.secondary.toLowerCase()}`;
                    if (!seen.has(key)) { seen.add(key); unique.push(item); }
                });
                if (isOrigin) setOriginSuggestions(unique.slice(0, 5));
                else setDestSuggestions(unique.slice(0, 5));
            }
        } catch (err) {
            console.error("Search error:", err);
        }
    };

    const selectLocationItem = (item, isOrigin) => {
        const latlng = [item.lat, item.lon];
        if (isOrigin) {
            setOrigin({ latlng, title: item.primary });
            setOriginQuery(item.primary);
            setOriginSuggestions([]);
        } else {
            setDestination({ latlng, title: item.primary });
            setDestQuery(item.primary);
            setDestSuggestions([]);
        }
        setMapCenter(latlng);
    };

    const fetchRoute = async (isAutoReroute = false) => {
        const currentOrigin = originRef.current;
        const currentDest = destRef.current;
        if (!currentOrigin || !currentDest) {
            if (!isAutoReroute) alert("⚠️ Please set Origin and Destination.");
            return;
        }

        setIsNavigating(true);
        setIsCalculating(true);

        const payload = {
            origin_lat: currentOrigin.latlng[0], origin_lon: currentOrigin.latlng[1],
            dest_lat: currentDest.latlng[0], dest_lon: currentDest.latlng[1],
            vehicle_type: vehicleLayer, is_reroute: isAutoReroute
        };

        try {
            const response = await fetch('http://127.0.0.1:5000/api/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.status === 'success') {
                if (data.segments && data.segments.length > 0) setRouteSegments(data.segments);
                else if (data.path) setRouteSegments([{ coords: data.path, color: '#3b82f6' }]);
                setRouteInfo({ distance: (data.distance / 1000).toFixed(2), time: Math.round(data.time / 60) });
            } else {
                alert(`❌ Routing Error: ${data.message}`);
            }
        } catch (error) {
            console.error("API error:", error);
        } finally {
            setIsCalculating(false);
        }
    };

    const clearMap = () => {
        setOrigin(null); setDestination(null); setOriginQuery(""); setDestQuery("");
        setRouteSegments([]); setRouteInfo(null); setIsNavigating(false);
        nodeBlockStates.current = {};
    };

    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: '1200px', height: '580px', margin: '20px auto', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div className="glass-panel" style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 1000 }}>
                <div className="panel-header">
                    <div>
                        <h2>FRENDS</h2>
                        <p>Dynamic Routing</p>
                    </div>
                    <button className="locate-btn" onClick={autoLocate} title="Find My Location">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </button>
                </div>

                <div className="input-group">
                    <label>Origin</label>
                    <div className="search-wrapper">
                        <svg className="input-icon" style={{color: 'var(--primary)'}} fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4"/></svg>
                        <input type="text" className="search-input" value={originQuery} onChange={(e) => handleSearchInput(e.target.value, true)} placeholder="Search starting point..." />
                        {originSuggestions.length > 0 && (
                            <ul className="suggestions-list">
                                {originSuggestions.map((item, idx) => (
                                    <li key={idx} onClick={() => selectLocationItem(item, true)}>
                                        <div className="sugg-text">
                                            <div className="sugg-primary">{item.primary}</div>
                                            <div className="sugg-secondary">{item.secondary}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="input-group">
                    <label>Destination</label>
                    <div className="search-wrapper">
                        <svg className="input-icon" style={{color: 'var(--danger)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <input type="text" className="search-input" value={destQuery} onChange={(e) => handleSearchInput(e.target.value, false)} placeholder="Search destination..." />
                        {destSuggestions.length > 0 && (
                            <ul className="suggestions-list">
                                {destSuggestions.map((item, idx) => (
                                    <li key={idx} onClick={() => selectLocationItem(item, false)}>
                                        <div className="sugg-text">
                                            <div className="sugg-primary">{item.primary}</div>
                                            <div className="sugg-secondary">{item.secondary}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="input-group">
                    <label>Vehicle Clearance Layer</label>
                    <div className="select-wrapper">
                        <select value={vehicleLayer} onChange={(e) => setVehicleLayer(e.target.value)}>
                            <option value="LOW">Low (Sedan / Hatchback)</option>
                            <option value="MID">Mid (SUV / Pick-up)</option>
                            <option value="HIGH">High (Truck / Bus)</option>
                        </select>
                    </div>
                </div>

                <div className="button-group">
                    <button className="action-btn btn-primary" onClick={() => fetchRoute(false)} disabled={isCalculating}>
                        {isCalculating ? 'Calculating...' : 'Start Navigation'}
                    </button>
                    <button className="action-btn btn-clear" onClick={clearMap}>Clear Map</button>
                </div>
            </div>

            <div className={`route-info ${routeInfo ? 'show' : ''}`} style={{ zIndex: 1000 }}>
                {routeInfo && (
                    <>
                        <div className="stat-group">
                            <span className="stat-label">Distance</span>
                            <div className="stat-value"><span>{routeInfo.distance}</span> km</div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-group">
                            <span className="stat-label">Est. Time</span>
                            <div className="stat-value"><span>{routeInfo.time}</span> min</div>
                        </div>
                    </>
                )}
            </div>

            {/* Pure Leaflet Dom Container - Fixed inside bounds */}
            <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
        </div>
    );
}
