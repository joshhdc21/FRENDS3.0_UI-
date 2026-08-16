import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import "../MapSection.css";
import { ref, onValue, update } from "firebase/database";
import { database } from "../firebase/firebaseConfig";

// Custom Leaflet Icons
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

    // Initialize Map - FULL SCREEN
    useEffect(() => {
        if (!mapInstanceRef.current && mapRef.current) {
            const map = L.map(mapRef.current, {
                center: mapCenter,
                zoom: 15,
                zoomControl: false
            });

            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
            L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`, { maxZoom: 19, opacity: 0.85, tileSize: 128, zoomOffset: 1 }).addTo(map);
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", { maxZoom: 19, zIndex: 1000 }).addTo(map);

            const layerGroup = L.layerGroup().addTo(map);
            layerGroupRef.current = layerGroup;

            map.on('click', (e) => {
                if (e.originalEvent.shiftKey) {
                    if (isNavigatingRef.current) {
                        const latlng = [e.latlng.lat, e.latlng.lng];
                        setLiveLocation(latlng);
                    } else {
                        alert("⚠️ Start Navigation first!");
                    }
                    return;
                }

                if (e.originalEvent.altKey) {
                    const lat = e.latlng.lat;
                    const lng = e.latlng.lng;
                    const nodeId = window.prompt(`Place Flood Node at\n${lat.toFixed(5)}, ${lng.toFixed(5)}\n\nNode ID:`);
                    if (nodeId) {
                        update(ref(database, 'nodes/' + nodeId), { lat, lng, waterLevel: 50, battery: 4.2, status: "ONLINE" }).catch(() => alert("Failed"));
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
                const nodeId = window.prompt("Remove Node\n\nNode ID:");
                if (nodeId && window.confirm(`Remove ${nodeId}?`)) {
                    update(ref(database, 'nodes/' + nodeId), { lat: null, lng: null }).catch(() => alert("Failed"));
                }
            });

            mapInstanceRef.current = map;
        }
    }, []);

    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(mapCenter, 16);
            setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
        }
    }, [mapCenter]);

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

        Object.keys(firebaseNodes).forEach(nodeId => {
            const nodeContainer = firebaseNodes[nodeId];
            if (!nodeContainer || typeof nodeContainer !== 'object') return;
            
            let lat, lng, floodDepth = 0, battery = 'N/A', status = 'UNKNOWN';

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
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; line-height: 1.5;">
                    <b style="color: #202124; display: block; margin-bottom: 8px;">📍 ${nodeId}</b>
                    <div style="color: #5f6368;">
                        💧 Depth: <span style="color: ${color}; font-weight: 600;">${floodDepth}cm</span><br/>
                        🔋 Battery: <span style="font-weight: 600;">${battery}V</span><br/>
                        🟢 Status: <span style="font-weight: 600; color: ${status === 'ONLINE' ? '#0d652d' : '#d33b27'};">${status}</span>
                    </div>
                </div>
            `;

            L.circleMarker([lat, lng], { radius: 8, fillColor: color, color: "#ffffff", weight: 2, fillOpacity: 0.9 })
                .addTo(mapGroup)
                .bindPopup(popupContent);
        });

        routeSegments.forEach(segment => {
            const positions = segment.coords.map(c => [c.latitude, c.longitude]);
            L.polyline(positions, { color: segment.color, weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(mapGroup);
        });

    }, [origin, destination, liveLocation, firebaseNodes, routeSegments]);

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
            alert("⚠️ Flood detected! Recalculating route...");
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

            const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&lat=${mapCenter[0]}&lon=${mapCenter[1]}&radius=30000&countrySet=PH&limit=8&typeahead=true&idxSet=POI,PAD,Str`;
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
                    if (isOrigin) setOriginSuggestions(unique.slice(0, 6));
                    else setDestSuggestions(unique.slice(0, 6));
                }
            } catch (err) {
                console.error("Search error:", err);
            }
        }, 400);
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
            if (!isAutoReroute) alert("⚠️ Set Origin & Destination");
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
                if (data.segments && data.segments.length > 0) setRouteSegments(data.segments);
                else if (data.path) setRouteSegments([{ coords: data.path, color: '#1f2937' }]);
                setRouteInfo({ distance: (data.distance / 1000).toFixed(2), time: Math.round(data.time / 60) });
            } else {
                alert(`Error: ${data.message}`);
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
        <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100vh',
            overflow: 'hidden',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
            {/* Full Screen Map */}
            <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

            {/* FLOATING HEADER - Search & Options */}
            <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                right: isMobile ? '56px' : 'auto',
                zIndex: 1001,
                width: isMobile ? 'auto' : '380px',
                maxHeight: 'calc(100vh - 120px)',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {/* Origin Search */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '12px',
                    transition: 'box-shadow 0.2s',
                    position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input 
                        type="text" 
                        value={originQuery} 
                        onChange={(e) => handleSearchInput(e.target.value, true)} 
                        placeholder="Starting point" 
                        style={{
                            flex: 1,
                            border: 'none',
                            padding: '12px',
                            fontSize: isMobile ? '16px' : '14px',
                            outline: 'none',
                            background: 'transparent',
                            color: '#202124'
                        }}
                    />
                    {originQuery && (
                        <button onClick={() => { setOriginQuery(''); setOriginSuggestions([]); }} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#5f6368' }}>
                            ✕
                        </button>
                    )}
                    {originSuggestions.length > 0 && (
                        <ul style={{
                            position: 'absolute',
                            top: '100%',
                            left: '0',
                            right: '0',
                            background: '#ffffff',
                            borderRadius: '0 0 8px 8px',
                            margin: '4px 0 0 0',
                            padding: '8px 0',
                            listStyle: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 2000
                        }}>
                            {originSuggestions.map((item, idx) => (
                                <li key={idx} onClick={() => selectLocationItem(item, true)}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        borderBottom: idx < originSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ color: '#202124', fontSize: '14px', fontWeight: 500 }}>{item.primary}</div>
                                    <div style={{ color: '#5f6368', fontSize: '12px', marginTop: '2px' }}>{item.secondary}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Destination Search */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '12px',
                    transition: 'box-shadow 0.2s',
                    position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#d33b27" strokeWidth="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                    </svg>
                    <input 
                        type="text" 
                        value={destQuery} 
                        onChange={(e) => handleSearchInput(e.target.value, false)} 
                        placeholder="Destination" 
                        style={{
                            flex: 1,
                            border: 'none',
                            padding: '12px',
                            fontSize: isMobile ? '16px' : '14px',
                            outline: 'none',
                            background: 'transparent',
                            color: '#202124'
                        }}
                    />
                    {destQuery && (
                        <button onClick={() => { setDestQuery(''); setDestSuggestions([]); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#5f6368' }}>
                            ✕
                        </button>
                    )}
                    {destSuggestions.length > 0 && (
                        <ul style={{
                            position: 'absolute',
                            top: '100%',
                            left: '0',
                            right: '0',
                            background: '#ffffff',
                            borderRadius: '0 0 8px 8px',
                            margin: '4px 0 0 0',
                            padding: '8px 0',
                            listStyle: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 2000
                        }}>
                            {destSuggestions.map((item, idx) => (
                                <li key={idx} onClick={() => selectLocationItem(item, false)}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        borderBottom: idx < destSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ color: '#202124', fontSize: '14px', fontWeight: 500 }}>{item.primary}</div>
                                    <div style={{ color: '#5f6368', fontSize: '12px', marginTop: '2px' }}>{item.secondary}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Vehicle Type Options Card - TIED TO BACKEND */}
                {(origin || destination) && (
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#202124', display: 'block', marginBottom: '12px' }}>Vehicle Clearance Layer</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { value: 'LOW', label: 'Low (Sedan / Hatchback)', icon: '🚗' },
                                { value: 'MID', label: 'Mid (SUV / Pick-up)', icon: '🚙' },
                                { value: 'HIGH', label: 'High (Truck / Bus)', icon: '🚚' }
                            ].map(option => (
                                <label key={option.value} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    background: vehicleLayer === option.value ? '#e0e7ff' : '#f8f9fa',
                                    border: vehicleLayer === option.value ? '2px solid #2563eb' : '1px solid #dadce0',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => !isMobile && (e.currentTarget.style.background = '#f0f0f0')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = vehicleLayer === option.value ? '#e0e7ff' : '#f8f9fa')}
                                >
                                    <input 
                                        type="radio" 
                                        name="vehicle" 
                                        value={option.value}
                                        checked={vehicleLayer === option.value}
                                        onChange={(e) => setVehicleLayer(e.target.value)}
                                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '14px', marginRight: '8px' }}>{option.icon}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#202124' }}>{option.label}</span>
                                </label>
                            ))}
                        </div>

                        <button 
                            onClick={() => fetchRoute(false)} 
                            disabled={isCalculating || !origin || !destination}
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginTop: '12px',
                                background: isCalculating ? '#dadce0' : '#1f2937',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: isCalculating ? 'default' : 'pointer',
                                transition: 'background 0.2s',
                                opacity: (!origin || !destination) ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => !isCalculating && (e.currentTarget.style.background = '#0f172a')}
                            onMouseLeave={(e) => !isCalculating && (e.currentTarget.style.background = '#1f2937')}
                        >
                            {isCalculating ? '⏳ Calculating...' : '🧭 Navigate'}
                        </button>

                        <button 
                            onClick={clearMap}
                            style={{
                                width: '100%',
                                padding: '10px',
                                marginTop: '8px',
                                background: '#f8f9fa',
                                color: '#202124',
                                border: '1px solid #dadce0',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#ececec'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
                        >
                            ✕ Clear
                        </button>
                    </div>
                )}
            </div>

            {/* FLOATING FOOTER - Route Info */}
            {routeInfo && (
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    left: isMobile ? '12px' : '16px',
                    right: isMobile ? '12px' : 'auto',
                    zIndex: 1000,
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    maxWidth: isMobile ? 'auto' : '360px'
                }}>
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '8px', fontWeight: 600 }}>Route Summary</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5f6368', marginBottom: '4px' }}>DISTANCE</div>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                                    {routeInfo.distance}
                                    <span style={{ fontSize: '14px', marginLeft: '4px', color: '#5f6368' }}>km</span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#5f6368', marginBottom: '4px' }}>EST. TIME</div>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                                    {routeInfo.time}
                                    <span style={{ fontSize: '14px', marginLeft: '4px', color: '#5f6368' }}>min</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#5f6368', fontStyle: 'italic', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                        🌊 Route avoids flooded areas based on {vehicleLayer === 'LOW' ? 'sedan' : vehicleLayer === 'MID' ? 'SUV' : 'truck'} clearance
                    </div>
                </div>
            )}

            {/* Mobile Menu Toggle */}
            {isMobile && (
                <button 
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 1100,
                        background: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                >
                    <svg width="24" height="24" fill="none" stroke="#202124" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            )}
        </div>
    );
}