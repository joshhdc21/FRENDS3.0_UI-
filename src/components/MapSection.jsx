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
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [panelOpen, setPanelOpen] = useState(true);
    
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

            // Base Layers & TomTom Traffic
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
            L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`, { maxZoom: 19, opacity: 0.85, tileSize: 128, zoomOffset: 1 }).addTo(map);
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", { maxZoom: 19, zIndex: 1000 }).addTo(map);

            // Layer group for dynamic markers/routes
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
                        update(ref(database, 'nodes/' + nodeId), { lat, lng, waterLevel: 0, battery: 4.2, status: "ONLINE" }).catch(() => alert("Failed."));
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
            L.circleMarker(liveLocation, { radius: 8, fillColor: "#3b82f6", color: "#ffffff", weight: 3, fillOpacity: 1 }).addTo(mapGroup);
        }

        // Firebase Nodes
        Object.keys(firebaseNodes).forEach(nodeId => {
            const nodeContainer = firebaseNodes[nodeId];
            if (!nodeContainer || typeof nodeContainer !== 'object') return;
            
            let lat, lng, floodDepth = 0, battery = 'N/A', status = 'UNKNOWN';

            // Handle both .set() and .push() formats
            if (nodeContainer.lat !== undefined && nodeContainer.lng !== undefined) {
                lat = nodeContainer.lat;
                lng = nodeContainer.lng;
                floodDepth = nodeContainer.waterLevel || 0;
                battery = nodeContainer.battery || 'N/A';
                status = nodeContainer.status || 'ONLINE';
            } else {
                const childKeys = Object.keys(nodeContainer).filter(k => k !== 'lat' && k !== 'lng');
                if (childKeys.length > 0) {
                    const latestData = nodeContainer[childKeys[childKeys.length - 1]];
                    lat = latestData?.lat || nodeContainer.lat;
                    lng = latestData?.lng || nodeContainer.lng;
                    floodDepth = latestData?.waterLevel || 0;
                    battery = latestData?.battery || 'N/A';
                    status = latestData?.status || 'UNKNOWN';
                }
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

        // Route Segments
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

    const checkFloodTriggers = (nodes) => {
        const limits = { "LOW": 15, "MID": 30, "HIGH": 50 };
        const myLimit = limits[vehicleLayer] || 15;
        let forceReroute = false;

        Object.keys(nodes).forEach(nodeId => {
            const nodeContainer = nodes[nodeId];
            if (nodeContainer && typeof nodeContainer === 'object') {
                let floodDepth = 0;

                if (nodeContainer.waterLevel !== undefined) {
                    floodDepth = nodeContainer.waterLevel;
                } else {
                    const childKeys = Object.keys(nodeContainer).filter(k => k !== 'lat' && k !== 'lng');
                    if (childKeys.length > 0) {
                        const latestData = nodeContainer[childKeys[childKeys.length - 1]];
                        floodDepth = latestData?.waterLevel || 0;
                    }
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
            const response = await fetch('https://frends-3-backend.onrender.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.status === 'SUCCESS' || data.status === 'success') {
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

    return (
        <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: isMobile ? '100vh' : '580px', 
            borderRadius: isMobile ? '0' : '12px', 
            overflow: 'hidden', 
            boxShadow: isMobile ? 'none' : '0 4px 20px rgba(0,0,0,0.08)',
            backgroundColor: '#e2e8f0'
        }}>
            {/* Mobile Panel Toggle Button */}
            {isMobile && (
                <button 
                    onClick={() => setPanelOpen(!panelOpen)}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 1100,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                >
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            )}

            {/* Glass Panel */}
            <div className="glass-panel" style={{ 
                position: 'absolute', 
                top: isMobile ? (panelOpen ? '0' : '-100%') : '12px', 
                left: isMobile ? '0' : '12px', 
                right: isMobile ? '0' : 'auto',
                width: isMobile ? '100%' : '340px',
                maxHeight: isMobile ? (panelOpen ? '75vh' : '0') : 'calc(100% - 24px)',
                zIndex: 1000,
                borderRadius: isMobile ? '0 0 16px 16px' : '24px',
                transition: isMobile ? 'top 0.3s ease' : 'none',
                overflow: isMobile && panelOpen ? 'auto' : 'hidden',
                padding: isMobile ? '20px' : '24px',
                gap: '16px',
            }}>
                <div className="panel-header">
                    <div>
                        <h2 style={{ fontSize: isMobile ? '20px' : '24px' }}>FRENDS</h2>
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
                        <input 
                            type="text" 
                            className="search-input" 
                            value={originQuery} 
                            onChange={(e) => handleSearchInput(e.target.value, true)} 
                            placeholder="Search starting point..." 
                            style={{ fontSize: isMobile ? '16px' : '14px' }}
                        />
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
                        <input 
                            type="text" 
                            className="search-input" 
                            value={destQuery} 
                            onChange={(e) => handleSearchInput(e.target.value, false)} 
                            placeholder="Search destination..."
                            style={{ fontSize: isMobile ? '16px' : '14px' }}
                        />
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
                    <label>Vehicle Clearance</label>
                    <div className="select-wrapper">
                        <select value={vehicleLayer} onChange={(e) => setVehicleLayer(e.target.value)} style={{ fontSize: isMobile ? '16px' : '14px' }}>
                            <option value="LOW">Low (Sedan / Hatchback)</option>
                            <option value="MID">Mid (SUV / Pick-up)</option>
                            <option value="HIGH">High (Truck / Bus)</option>
                        </select>
                    </div>
                </div>

                <div className="button-group">
                    <button 
                        className="action-btn btn-primary" 
                        onClick={() => fetchRoute(false)} 
                        disabled={isCalculating}
                        style={{
                            padding: isMobile ? '14px' : '16px',
                            fontSize: isMobile ? '15px' : '14px',
                            minHeight: isMobile ? '48px' : 'auto',
                        }}
                    >
                        {isCalculating ? 'Calculating...' : 'Start Navigation'}
                    </button>
                    <button 
                        className="action-btn btn-clear" 
                        onClick={clearMap}
                        style={{
                            padding: isMobile ? '12px' : '14px',
                            fontSize: isMobile ? '14px' : '13px',
                            minHeight: isMobile ? '44px' : 'auto',
                        }}
                    >
                        Clear Map
                    </button>
                </div>
            </div>

            {/* Route Info Pill */}
            <div className={`route-info ${routeInfo ? 'show' : ''}`} style={{ 
                position: 'absolute',
                bottom: isMobile ? '20px' : '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                background: '#ffffff',
                borderRadius: '50px',
                padding: isMobile ? '12px 24px' : '16px 32px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '20px' : '32px',
                fontSize: isMobile ? '12px' : '14px',
                transition: 'bottom 0.3s ease',
            }}>
                {routeInfo && (
                    <>
                        <div className="stat-group" style={{ textAlign: 'center' }}>
                            <span className="stat-label" style={{ fontSize: isMobile ? '11px' : '12px' }}>Distance</span>
                            <div className="stat-value" style={{ fontSize: isMobile ? '18px' : '22px' }}>
                                <span>{routeInfo.distance}</span> <span style={{ fontSize: isMobile ? '14px' : '16px', marginLeft: '4px' }}>km</span>
                            </div>
                        </div>
                        <div className="stat-divider" style={{ width: isMobile ? '0px' : '1px', height: isMobile ? '1px' : '36px', background: '#e2e8f0' }}></div>
                        <div className="stat-group" style={{ textAlign: 'center' }}>
                            <span className="stat-label" style={{ fontSize: isMobile ? '11px' : '12px' }}>Est. Time</span>
                            <div className="stat-value" style={{ fontSize: isMobile ? '18px' : '22px' }}>
                                <span>{routeInfo.time}</span> <span style={{ fontSize: isMobile ? '14px' : '16px', marginLeft: '4px' }}>min</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Map Container */}
            <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
        </div>
    );
}
