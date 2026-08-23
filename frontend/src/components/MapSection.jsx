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
    const TOMTOM_API_KEY = import.meta.env.VITE_MAPAPI_TOMTOM_API_KEY;

    const [mapCenter, setMapCenter] = useState([14.5648, 120.9932]);
    const [origin, setOrigin] = useState(null); 
    const [destination, setDestination] = useState(null); 
    const [vehicleLayer, setVehicleLayer] = useState("LOW");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    // =========================================
    // THEME STATE
    // =========================================
    const [theme, setTheme] = useState("light");
    
    const originRef = useRef(origin);
    const destRef = useRef(destination);
    const isNavigatingRef = useRef(false);
    const searchTimeoutRef = useRef(null);
    
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
    
    // Refs for hot-swapping map tiles
    const baseLayerRef = useRef(null);
    const labelLayerRef = useRef(null);

    // =========================================
    // DYNAMIC COLOR PALETTE
    // =========================================
    const ui = {
        bg: theme === 'dark' ? '#1e293b' : '#ffffff',
        panelBg: theme === 'dark' ? '#0f172a' : '#fafafa',
        inputBg: theme === 'dark' ? '#334155' : '#f1f3f4',
        border: theme === 'dark' ? '#334155' : '#dadce0',
        textMain: theme === 'dark' ? '#ffffff' : '#202124',
        textMuted: theme === 'dark' ? '#94a3b8' : '#5f6368',
        btnHover: theme === 'dark' ? '#334155' : '#f8f9fa'
    };

    // Handle responsive resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            if (mapInstanceRef.current) {
                setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 1. Initialize Pure Leaflet Map on Mount
    useEffect(() => {
        if (!mapInstanceRef.current && mapRef.current) {
            const map = L.map(mapRef.current, {
                center: mapCenter,
                zoom: 15,
                zoomControl: false
            });

            // Add TomTom Traffic (This stays permanent regardless of theme)
            L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`, { 
                maxZoom: 19, opacity: 0.85, tileSize: 128, zoomOffset: 1, zIndex: 10 
            }).addTo(map);

            const layerGroup = L.layerGroup().addTo(map);
            layerGroupRef.current = layerGroup;

            // Map Click Events
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
                        update(ref(database, 'nodes/' + nodeId), { lat, lng, waterLevel: 50, battery: 4.2, status: "ONLINE" }).catch(() => alert("Failed."));
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

            map.on('contextmenu', () => {
                const nodeId = window.prompt("ADMIN REMOVAL TOOL\n\nEnter Node ID to remove:");
                if (nodeId && window.confirm(`Hide ${nodeId}?`)) {
                    update(ref(database, 'nodes/' + nodeId), { lat: null, lng: null }).catch(() => alert("Failed."));
                }
            });

            mapInstanceRef.current = map;
        }
    }, []);

    // =========================================
    // HOT-SWAP MAP TILES FOR DARK MODE
    // =========================================
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        // Remove old layers before adding new ones
        if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
        if (labelLayerRef.current) map.removeLayer(labelLayerRef.current);

        // We use Esri's World Dark Gray Canvas for a soft, professional slate gray, 
        // and Carto's Voyager for the light mode.
        const baseUrl = theme === 'dark' 
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
            
        const labelUrl = theme === 'dark'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';

        // zIndex ensures base is on bottom (1) and labels are on top (1000)
        baseLayerRef.current = L.tileLayer(baseUrl, { maxZoom: 19, zIndex: 1 }).addTo(map);
        labelLayerRef.current = L.tileLayer(labelUrl, { maxZoom: 19, zIndex: 1000 }).addTo(map);
    }, [theme]);

    // Update Map Center
    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(mapCenter, 16);
            setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
        }
    }, [mapCenter]);

    // 2. Render Markers & Routes
    useEffect(() => {
        const mapGroup = layerGroupRef.current;
        if (!mapGroup) return;

        mapGroup.clearLayers();

        if (origin) {
            L.marker(origin.latlng, { icon: greenIcon }).addTo(mapGroup).bindPopup(origin.title);
        }
        if (destination) {
            L.marker(destination.latlng, { icon: redIcon }).addTo(mapGroup).bindPopup(destination.title);
        }
        if (liveLocation) {
            L.circleMarker(liveLocation, { radius: 8, fillColor: "#1a73e8", color: "#ffffff", weight: 3, fillOpacity: 1 }).addTo(mapGroup);
        }

        // Firebase Nodes
        Object.keys(firebaseNodes).forEach(nodeId => {
            const nodeContainer = firebaseNodes[nodeId];
            if (!nodeContainer || typeof nodeContainer !== 'object') return;
            
            let lat = nodeContainer.lat;
            let lng = nodeContainer.lng;
            let floodDepth = 0, battery = 'N/A', status = 'UNKNOWN';

            // Filter for Firebase Push IDs (they always start with '-') and sort chronologically
            const pushKeys = Object.keys(nodeContainer)
                .filter(key => key.startsWith('-'))
                .sort(); 

            if (pushKeys.length > 0) {
                // Grab the absolute newest reading
                const latestKey = pushKeys[pushKeys.length - 1];
                const latestData = nodeContainer[latestKey];
                
                lat = latestData?.lat !== undefined ? latestData.lat : lat;
                lng = latestData?.lng !== undefined ? latestData.lng : lng;
                
                floodDepth = latestData?.waterLevel !== undefined ? latestData.waterLevel : (latestData?.depth || 0);
                battery = latestData?.battery || 'N/A';
                status = latestData?.status || 'ONLINE';
            } else if (nodeContainer.waterLevel !== undefined || nodeContainer.depth !== undefined) {
                // Fallback testing structure
                floodDepth = nodeContainer.waterLevel !== undefined ? nodeContainer.waterLevel : (nodeContainer.depth || 0);
                battery = nodeContainer.battery || 'N/A';
                status = nodeContainer.status || 'ONLINE';
            }

            if (!lat || !lng) return;

            let color = "#10b981";
            if (floodDepth >= 50) color = "#ef4444";
            else if (floodDepth >= 30) color = "#f59e0b";
            else if (floodDepth >= 15) color = "#eab308";

            const popupContent = `
                <div style="font-family: Inter, sans-serif; font-size: 13px;">
                    <b style="color: #0f172a;">Node: ${nodeId}</b><br />
                    Flood: <b style="color: ${color};">${floodDepth}cm</b><br />
                    Battery: <b>${battery}V</b><br />
                    Status: <b style="color: ${status === 'ONLINE' ? '#10b981' : '#ef4444'};">${status}</b>
                </div>
            `;

            L.circleMarker([lat, lng], { radius: 8, fillColor: color, color: "#ffffff", weight: 2, fillOpacity: 0.9 })
                .addTo(mapGroup)
                .bindPopup(popupContent);
        });

        // Route Segments with auto-zoom
        const allPositions = [];
        routeSegments.forEach(segment => {
            if (!segment || !Array.isArray(segment.coords)) return;
            const positions = segment.coords.map(c => [c.latitude, c.longitude]);
            allPositions.push(...positions);
            L.polyline(positions, { color: segment.color, weight: 6, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }).addTo(mapGroup);
        });

        if (allPositions.length > 0 && mapInstanceRef.current) {
            const bounds = L.latLngBounds(allPositions);
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }

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

    const checkFloodTriggers = (nodes) => {
        const limits = { "LOW": 15, "MID": 30, "HIGH": 50 };
        const myLimit = limits[vehicleLayer] || 15;
        let forceReroute = false;

        Object.keys(nodes).forEach(nodeId => {
            const nodeContainer = nodes[nodeId];
            if (nodeContainer && typeof nodeContainer === 'object') {
                let floodDepth = 0;

                const pushKeys = Object.keys(nodeContainer).filter(key => key.startsWith('-')).sort();
                
                if (pushKeys.length > 0) {
                    const latestKey = pushKeys[pushKeys.length - 1];
                    const latestData = nodeContainer[latestKey];
                    floodDepth = latestData?.waterLevel !== undefined ? latestData.waterLevel : (latestData?.depth || 0);
                } else if (nodeContainer.waterLevel !== undefined || nodeContainer.depth !== undefined) {
                    floodDepth = nodeContainer.waterLevel !== undefined ? nodeContainer.waterLevel : (nodeContainer.depth || 0);
                }

                if (floodDepth >= myLimit && nodeBlockStates.current[nodeId] !== 'blocked') {
                    forceReroute = true;
                }
                nodeBlockStates.current[nodeId] = floodDepth >= myLimit ? 'blocked' : 'clear';
            }
        });

        if (isNavigatingRef.current && forceReroute) {
            alert("⚠️ Flood detected ahead! Recalculating route...");
            fetchRoute(true);
        }
    };

    const handleSearchInput = (query, isOrigin) => {
        if (isOrigin) setOriginQuery(query);
        else setDestQuery(query);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(async () => {
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
        }, 500);
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
            const response = await fetch('https://frends-3-backend.onrender.com/api/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.status === 'SUCCESS' || data.status === 'success') {
                if (data.segments && data.segments.length > 0 && data.segments[0].coords) {
                    setRouteSegments(data.segments);
                } else if (data.path && data.path.length > 0) {
                    setRouteSegments([{ coords: data.path, color: '#1a73e8' }]); 
                }
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
            
            <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />

            <div style={{
                position: 'absolute',
                top: isMobile ? '100px' : '110px',
                left: isMobile ? '50%' : '20px',
                transform: isMobile ? 'translateX(-50%)' : 'none',
                width: isMobile ? '95%' : '360px',
                backgroundColor: ui.bg,
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'background-color 0.3s ease'
            }}>
                
                {/* Search Inputs Container */}
                <div style={{ padding: '16px 16px 8px 16px', borderBottom: `1px solid ${ui.border}` }}>
                    
                    {/* Theme Toggle Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: ui.textMain }}>FRENDS Routing</span>
                        <button 
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            style={{ 
                                background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' 
                            }}
                            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                        >
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', position: 'relative' }}>
                        <div style={{ width: '16px', display: 'flex', justifyContent: 'center', marginRight: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #1a73e8' }}></div>
                        </div>
                        <input 
                            type="text" 
                            value={originQuery} 
                            onChange={(e) => handleSearchInput(e.target.value, true)} 
                            placeholder="Choose starting point" 
                            style={{ flex: 1, border: 'none', background: ui.inputBg, color: ui.textMain, padding: '10px 12px', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                        />
                        {originSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: '28px', right: 0, background: ui.bg, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', borderRadius: '4px', zIndex: 1001, maxHeight: '200px', overflowY: 'auto' }}>
                                {originSuggestions.map((item, idx) => (
                                    <div key={idx} onClick={() => selectLocationItem(item, true)} style={{ padding: '10px 12px', borderBottom: `1px solid ${ui.border}`, cursor: 'pointer' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', color: ui.textMain }}>{item.primary}</div>
                                        <div style={{ fontSize: '12px', color: ui.textMuted }}>{item.secondary}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{ width: '16px', display: 'flex', justifyContent: 'center', marginRight: '12px' }}>
                            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 0C2.686 0 0 2.686 0 6C0 10.5 6 16 6 16C6 16 12 10.5 12 6C12 2.686 9.314 0 6 0ZM6 8.5C4.619 8.5 3.5 7.381 3.5 6C3.5 4.619 4.619 3.5 6 3.5C7.381 3.5 8.5 4.619 8.5 6C8.5 7.381 7.381 8.5 6 8.5Z" fill="#ea4335"/>
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            value={destQuery} 
                            onChange={(e) => handleSearchInput(e.target.value, false)} 
                            placeholder="Choose destination"
                            style={{ flex: 1, border: 'none', background: ui.inputBg, color: ui.textMain, padding: '10px 12px', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
                        />
                        {destSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: '28px', right: 0, background: ui.bg, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', borderRadius: '4px', zIndex: 1001, maxHeight: '200px', overflowY: 'auto' }}>
                                {destSuggestions.map((item, idx) => (
                                    <div key={idx} onClick={() => selectLocationItem(item, false)} style={{ padding: '10px 12px', borderBottom: `1px solid ${ui.border}`, cursor: 'pointer' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', color: ui.textMain }}>{item.primary}</div>
                                        <div style={{ fontSize: '12px', color: ui.textMuted }}>{item.secondary}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Options & Action Buttons */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: ui.panelBg }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: ui.textMuted, fontWeight: '500' }}>Vehicle Type</span>
                        <select 
                            value={vehicleLayer} 
                            onChange={(e) => setVehicleLayer(e.target.value)} 
                            style={{ border: `1px solid ${ui.border}`, borderRadius: '4px', padding: '6px 8px', fontSize: '13px', color: ui.textMain, backgroundColor: ui.bg, cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="LOW">Sedan / Hatchback</option>
                            <option value="MID">SUV / Pick-up</option>
                            <option value="HIGH">Truck / Bus</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => fetchRoute(false)} 
                            disabled={isCalculating}
                            style={{
                                flex: 1, backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: '20px', padding: '10px', fontSize: '14px', fontWeight: '500', cursor: isCalculating ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#1557b0'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#1a73e8'}
                        >
                            {isCalculating ? 'Calculating...' : 'Directions'}
                        </button>
                        <button 
                            onClick={clearMap}
                            style={{
                                padding: '10px 16px', backgroundColor: ui.bg, color: ui.textMain, border: `1px solid ${ui.border}`, borderRadius: '20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = ui.btnHover}
                            onMouseOut={(e) => e.target.style.backgroundColor = ui.bg}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Route Info Pill (Bottom Center) */}
            {routeInfo && (
                <div style={{ 
                    position: 'absolute', bottom: isMobile ? '100px' : '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: ui.bg, borderRadius: '24px', padding: '12px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '24px', transition: 'background-color 0.3s ease'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a73e8' }}>{routeInfo.time} <span style={{ fontSize: '14px', fontWeight: 'normal', color: ui.textMuted }}>min</span></span>
                    </div>
                    <div style={{ width: '1px', height: '24px', background: ui.border }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '16px', color: ui.textMain, fontWeight: '500' }}>{routeInfo.distance} <span style={{ fontSize: '14px', fontWeight: 'normal', color: ui.textMuted }}>km</span></span>
                    </div>
                </div>
            )}
        </div>
    );
}