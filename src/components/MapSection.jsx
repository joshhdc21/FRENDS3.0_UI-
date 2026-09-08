import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import "../MapSection.css";
import { ref, onValue, update, push, set } from "firebase/database"; 
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
    
    // Default to dark theme to match Google Maps UI
    const [theme, setTheme] = useState("dark");
    const [driveMode, setDriveMode] = useState(false);
    const [showFloodWarning, setShowFloodWarning] = useState(false); 
    const [navStep, setNavStep] = useState({ 
        distance: '--', action: 'Calculating...', arrow: '↱' 
    }); 
    
    const [showReportModal, setShowReportModal] = useState(false);
    const [userReports, setUserReports] = useState({});
    
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState("bisaya_free"); 

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
    const [activeInput, setActiveInput] = useState(null); 

    const [routeSegments, setRouteSegments] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null); 
    const [isNavigating, setIsNavigating] = useState(false);
    
    // Enhanced Live Location State to include heading
    const [liveLocation, setLiveLocation] = useState(null);
    const [heading, setHeading] = useState(0); 
    
    const [speed, setSpeed] = useState("--"); 
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => { isNavigatingRef.current = isNavigating; }, [isNavigating]);

    const [firebaseNodes, setFirebaseNodes] = useState({});
    const nodeBlockStates = useRef({});

    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerGroupRef = useRef(null);
    
    const baseLayerRef = useRef(null);
    const labelLayerRef = useRef(null);
    const userMarkerRef = useRef(null); // Ref to hold the moving user icon

    // Google Maps Dark Mode Color Palette
    const ui = {
        bg: theme === 'dark' ? '#131314' : '#ffffff',
        panelBg: theme === 'dark' ? '#202124' : '#ffffff',
        inputBg: theme === 'dark' ? '#303134' : '#f1f3f4',
        border: theme === 'dark' ? '#3c4043' : '#dadce0',
        textMain: theme === 'dark' ? '#e8eaed' : '#202124',
        textMuted: theme === 'dark' ? '#9aa0a6' : '#5f6368',
        accentBlue: '#8ab4f8',
        accentGreen: '#81c995',
        accentRed: '#f28b82',
        btnText: theme === 'dark' ? '#202124' : '#ffffff'
    };

    // AUTO-LOCATE USER ON LOAD
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const latlng = [pos.coords.latitude, pos.coords.longitude];
                    setMapCenter(latlng);
                    setLiveLocation(latlng);
                    setOrigin({ latlng, title: "Your Location" });
                    setOriginQuery("Your Location");
                },
                (err) => console.error("Initial GPS Error:", err),
                { enableHighAccuracy: true }
            );
        }
    }, []);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
            if (availableVoices.length > 0 && !selectedVoice) {
                const defaultVoice = availableVoices.find(v => v.lang.includes('en') && v.name.includes('Google')) || availableVoices[0];
                setSelectedVoice(defaultVoice.name);
            }
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [selectedVoice]);

    const speakInstruction = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            
            if (selectedVoice === "bisaya_free") {
                const localVoice = voices.find(v => v.lang.includes('fil') || v.lang.includes('tl') || v.lang.includes('PH') || v.lang.includes('id'));
                if (localVoice) utterance.voice = localVoice;
            } else if (selectedVoice) {
                const voice = voices.find(v => v.name === selectedVoice);
                if (voice) utterance.voice = voice;
            }
            window.speechSynthesis.speak(utterance);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            if (mapInstanceRef.current) setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current && mapRef.current) {
            const map = L.map(mapRef.current, {
                center: mapCenter,
                zoom: 15,
                zoomControl: false
            });

            map.createPane('routePane');
            map.getPane('routePane').style.zIndex = 500;

            L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`, { 
                maxZoom: 19, opacity: 0.85, tileSize: 128, zoomOffset: 1, zIndex: 10 
            }).addTo(map);

            const layerGroup = L.layerGroup().addTo(map);
            layerGroupRef.current = layerGroup;

            map.on('click', (e) => {
                if (e.originalEvent.shiftKey) {
                    if (isNavigatingRef.current) {
                        const latlng = [e.latlng.lat, e.latlng.lng];
                        setLiveLocation(latlng);
                        if (originRef.current) setOrigin(prev => ({ ...prev, latlng }));
                    } else alert("⚠️ Click 'Directions' first!");
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

            mapInstanceRef.current = map;
        }
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
        if (labelLayerRef.current) map.removeLayer(labelLayerRef.current);

        const baseUrl = theme === 'dark' 
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
            : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
            
        const labelUrl = theme === 'dark'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
            : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

        baseLayerRef.current = L.tileLayer(baseUrl, { maxZoom: 19, maxNativeZoom: 16, zIndex: 1 }).addTo(map);
        labelLayerRef.current = L.tileLayer(labelUrl, { maxZoom: 19, maxNativeZoom: 16, zIndex: 1000 }).addTo(map);
    }, [theme]);

    // 2. LIVE GPS TRACKING & SPEED CALCULATION
    useEffect(() => {
        let watchId;
        if (driveMode) {
            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const newLatlng = [position.coords.latitude, position.coords.longitude];
                        setLiveLocation(newLatlng);
                        
                        // Update Speed
                        if (position.coords.speed !== null) {
                            setSpeed(Math.round(position.coords.speed * 3.6));
                        } else {
                            setSpeed(0);
                        }

                        // Update Heading for icon rotation
                        if (position.coords.heading !== null && !isNaN(position.coords.heading)) {
                            setHeading(position.coords.heading);
                        }

                        // Smoothly Pan the map to follow the user
                        if (mapInstanceRef.current) {
                            mapInstanceRef.current.panTo(newLatlng, { animate: true, duration: 1.0 });
                        }
                    },
                    (error) => console.error("GPS Tracking Error:", error),
                    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
                );
            } else alert("⚠️ Geolocation is not supported by your browser.");
        } else {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            setSpeed("--");
        }
        return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
    }, [driveMode]);

    useEffect(() => {
        if (mapInstanceRef.current && !driveMode) {
            mapInstanceRef.current.setView(mapCenter, 16);
            setTimeout(() => mapInstanceRef.current.invalidateSize(), 100);
        }
    }, [mapCenter, driveMode]);

    // Dynamic Map Rendering
    useEffect(() => {
        const mapGroup = layerGroupRef.current;
        if (!mapGroup) return;

        mapGroup.clearLayers();

        if (origin && !driveMode) L.marker(origin.latlng, { icon: greenIcon }).addTo(mapGroup).bindPopup(origin.title);
        if (destination && !driveMode) L.marker(destination.latlng, { icon: redIcon }).addTo(mapGroup).bindPopup(destination.title);
        
        // --- DYNAMIC USER ICON ---
        if (liveLocation || (driveMode && origin)) {
            const loc = liveLocation || origin.latlng;
            
            // Outer Halo (Pulsing Effect)
            L.circleMarker(loc, { radius: 18, fillColor: '#8ab4f8', color: 'transparent', fillOpacity: 0.3, pane: 'routePane' }).addTo(mapGroup);
            
            // Dynamic Directional Arrow
            const userIconHtml = `
                <div style="
                    width: 24px; 
                    height: 24px; 
                    background-color: #4285F4; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                    position: relative;
                    transform: rotate(${heading}deg);
                    transition: transform 0.5s ease;
                ">
                    <div style="
                        width: 0; 
                        height: 0; 
                        border-left: 6px solid transparent; 
                        border-right: 6px solid transparent; 
                        border-bottom: 10px solid white; 
                        position: absolute; 
                        top: -8px; 
                        left: 3px;
                    "></div>
                </div>
            `;

            const customUserIcon = L.divIcon({
                html: userIconHtml,
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            // Store ref so it moves smoothly instead of re-rendering completely
            if (!userMarkerRef.current) {
                userMarkerRef.current = L.marker(loc, { icon: customUserIcon, pane: 'routePane' }).addTo(mapGroup);
            } else {
                userMarkerRef.current.setLatLng(loc);
                userMarkerRef.current.setIcon(customUserIcon);
                userMarkerRef.current.addTo(mapGroup);
            }
        }

        Object.keys(firebaseNodes).forEach(nodeId => {
            const nodeContainer = firebaseNodes[nodeId];
            if (!nodeContainer || typeof nodeContainer !== 'object') return;
            let lat = nodeContainer.lat, lng = nodeContainer.lng;
            let floodDepth = 0;

            const pushKeys = Object.keys(nodeContainer).filter(key => key.startsWith('-')).sort(); 
            if (pushKeys.length > 0) {
                const latestData = nodeContainer[pushKeys[pushKeys.length - 1]];
                lat = latestData?.lat !== undefined ? latestData.lat : lat;
                lng = latestData?.lng !== undefined ? latestData.lng : lng;
                floodDepth = latestData?.waterLevel !== undefined ? latestData.waterLevel : (latestData?.depth || 0);
            } else if (nodeContainer.waterLevel !== undefined || nodeContainer.depth !== undefined) {
                floodDepth = nodeContainer.waterLevel !== undefined ? nodeContainer.waterLevel : (nodeContainer.depth || 0);
            }
            if (!lat || !lng) return;

            let color = "#81c995";
            if (floodDepth >= 50) color = "#f28b82";
            else if (floodDepth >= 30) color = "#fdd663";
            else if (floodDepth >= 15) color = "#fce8b2";

            const floodDepthFt = (floodDepth / 30.48).toFixed(2);
            L.circleMarker([lat, lng], { radius: 8, fillColor: color, color: "#ffffff", weight: 2, fillOpacity: 0.9 })
                .addTo(mapGroup)
                .bindPopup(`<div style="font-family: Inter, sans-serif;"><b>Node: ${nodeId}</b><br />Flood: <b style="color: ${color};">${floodDepthFt}ft</b></div>`);
        });

        Object.keys(userReports).forEach(key => {
            const report = userReports[key];
            if (!report.lat || !report.lng || Date.now() - report.timestamp > 4 * 60 * 60 * 1000) return;
            
            let emoji = "⚠️";
            if (report.type === "Accident") emoji = "💥";
            else if (report.type === "Construction") emoji = "🚧";
            else if (report.type === "Police") emoji = "🚓";

            const reportIcon = L.divIcon({ html: `<div style="font-size: 24px;">${emoji}</div>`, className: '', iconSize: [30, 30] });
            L.marker([report.lat, report.lng], { icon: reportIcon, pane: 'routePane' }).addTo(mapGroup).bindPopup(`<b>${report.type}</b>`);
        });

        const allPositions = [];
        routeSegments.forEach(segment => {
            if (!segment || !Array.isArray(segment.coords)) return;
            const positions = segment.coords.map(c => [c.latitude, c.longitude]);
            allPositions.push(...positions);
            L.polyline(positions, { color: driveMode ? '#02416d' : '#202124', weight: driveMode ? 12 : 9, opacity: 0.8, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
            L.polyline(positions, { color: driveMode ? '#8ab4f8' : (segment.color || ui.accentBlue), weight: driveMode ? 8 : 5, opacity: 1.0, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
        });

        if (!driveMode && allPositions.length > 0 && mapInstanceRef.current && !isCalculating) {
            mapInstanceRef.current.fitBounds(L.latLngBounds(allPositions), { padding: [50, 50] });
        }
    }, [origin, destination, liveLocation, heading, firebaseNodes, userReports, routeSegments, driveMode, isCalculating]);

    useEffect(() => {
        const nodesRef = ref(database, 'nodes');
        const unsubscribeNodes = onValue(nodesRef, (snapshot) => {
            if (snapshot.val()) { setFirebaseNodes(snapshot.val()); checkFloodTriggers(snapshot.val()); }
        });

        const reportsRef = ref(database, 'reports');
        const unsubscribeReports = onValue(reportsRef, (snapshot) => setUserReports(snapshot.val() || {}));

        return () => { unsubscribeNodes(); unsubscribeReports(); };
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
                    const latestData = nodeContainer[pushKeys[pushKeys.length - 1]];
                    floodDepth = latestData?.waterLevel !== undefined ? latestData.waterLevel : (latestData?.depth || 0);
                } else if (nodeContainer.waterLevel !== undefined || nodeContainer.depth !== undefined) {
                    floodDepth = nodeContainer.waterLevel !== undefined ? nodeContainer.waterLevel : (nodeContainer.depth || 0);
                }
                if (floodDepth >= myLimit && nodeBlockStates.current[nodeId] !== 'blocked') forceReroute = true;
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
                if (isOrigin) setOriginSuggestions([]); else setDestSuggestions([]);
                return;
            }
            const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&lat=${mapCenter[0]}&lon=${mapCenter[1]}&radius=30000&countrySet=PH&limit=10`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                if (data.results) {
                    let results = data.results.map(r => ({
                        lat: r.position.lat, lon: r.position.lon,
                        primary: r.poi ? r.poi.name : (r.address.streetName || r.address.freeformAddress),
                        secondary: r.address.freeformAddress || "Philippines"
                    }));
                    if (isOrigin) setOriginSuggestions(results.slice(0, 5));
                    else setDestSuggestions(results.slice(0, 5));
                }
            } catch (err) { console.error("Search error:", err); }
        }, 500);
    };

    const selectLocationItem = (item, isOrigin) => {
        const latlng = [item.lat, item.lon];
        if (isOrigin) {
            setOrigin({ latlng, title: item.primary }); setOriginQuery(item.primary); setOriginSuggestions([]);
        } else {
            setDestination({ latlng, title: item.primary }); setDestQuery(item.primary); setDestSuggestions([]);
        }
        setMapCenter(latlng); setActiveInput(null);
    };

    const swapLocations = () => {
        const tempOrigin = origin; const tempOriginQuery = originQuery;
        setOrigin(destination); setOriginQuery(destQuery);
        setDestination(tempOrigin); setDestQuery(tempOriginQuery);
    };

    const clearMap = () => {
        setOrigin(null); setDestination(null); setOriginQuery(""); setDestQuery("");
        setOriginSuggestions([]); setDestSuggestions([]);
        setRouteSegments([]); setRouteInfo(null); 
        setIsNavigating(false); setDriveMode(false); setShowFloodWarning(false); setActiveInput(null);
        setNavStep({ distance: '--', action: 'Calculating...', arrow: '↱' });
    };

    const fetchRoute = async (isAutoReroute = false) => {
        if (!origin || !destination) return;
        setIsNavigating(true); setIsCalculating(true);

        try {
            const response = await fetch('https://frends-3-backend.onrender.com/api/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin_lat: origin.latlng[0], origin_lon: origin.latlng[1],
                    dest_lat: destination.latlng[0], dest_lon: destination.latlng[1],
                    vehicle_type: vehicleLayer, is_reroute: isAutoReroute
                })
            });
            const data = await response.json();
            
            if (data.status === 'SUCCESS' || data.status === 'success') {
                const startPin = { latitude: origin.latlng[0], longitude: origin.latlng[1] };
                const endPin = { latitude: destination.latlng[0], longitude: destination.latlng[1] };

                if (data.segments && data.segments.length > 0 && data.segments[0].coords) {
                    data.segments[0].coords.unshift(startPin);
                    data.segments[data.segments.length - 1].coords.push(endPin);
                    setRouteSegments(data.segments);
                } else if (data.path && data.path.length > 0) {
                    setRouteSegments([{ coords: [startPin, ...data.path, endPin], color: ui.accentBlue }]); 
                }

                setNavStep({ distance: "40 m", action: "Head straight", arrow: "↱" });
                setRouteInfo({ distance: (data.distance / 1000).toFixed(1), time: Math.round(data.time / 60) });
            }
        } catch (error) { console.error("API error:", error); } 
        finally { setIsCalculating(false); }
    };

    const startDriveMode = () => {
        setDriveMode(true); 
        setShowFloodWarning(true);
        
        if (mapInstanceRef.current && (liveLocation || origin)) {
            mapInstanceRef.current.flyTo(liveLocation || origin.latlng, 19, { animate: true });
        }

        setTimeout(() => {
            let speechText = "";
            if (selectedVoice === "bisaya_free") {
                let bisayaAction = "deretso lang";
                if (navStep.action.toLowerCase().includes("right")) bisayaAction = "liko sa tuo";
                else if (navStep.action.toLowerCase().includes("left")) bisayaAction = "liko sa wala";
                else if (navStep.action.toLowerCase().includes("arrive")) bisayaAction = "naa na ka sa imong padulngan";
                
                const distanceText = navStep.distance.replace('m', 'metros');
                speechText = `Mga ${distanceText} sa unahan, ${bisayaAction}. Amping sa byahe kay basin gibaha ang Metro Manila.`;
            } else {
                speechText = `In ${navStep.distance}, ${navStep.action.toLowerCase()}. Metro Manila floods may affect your route.`;
            }
            speakInstruction(speechText);
        }, 800);
    };

    const stopDriveMode = () => {
        setDriveMode(false); setShowFloodWarning(false);
    };

    const recenterMap = () => {
        if (mapInstanceRef.current && liveLocation) {
            mapInstanceRef.current.flyTo(liveLocation, 19, { animate: true, duration: 1.0 });
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: driveMode ? 9999 : 0 }}>
            {/* Global UI Hider - Ensures true full-screen overlay for routing */}
            <style>
                {`
                    nav, footer, header, .header, .nav, .navbar, .bottom-nav, 
                    [class*="nav"], [class*="Nav"], [class*="bottom"], 
                    [id*="nav"], [id*="Nav"], [class*="header"], [id*="header"] {
                        display: none !important;
                    }
                `}
            </style>

            <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />

            {/* GOOGLE MAPS STYLE TOP PANEL */}
            <div style={{
                position: 'absolute', 
                top: 0, 
                left: 0, width: '100%',
                backgroundColor: ui.panelBg, zIndex: 1000,
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                transform: driveMode ? 'translateY(-200%)' : 'translateY(0)',
                transition: 'transform 0.3s ease'
            }}>
                <div style={{ padding: '16px 16px 8px 16px', paddingTop: 'max(16px, env(safe-area-inset-top))', display: 'flex', gap: '8px' }}>
                    
                    <button onClick={clearMap} style={{ background: 'none', border: 'none', color: ui.textMain, fontSize: '24px', cursor: 'pointer', marginTop: '4px' }}>
                        ←
                    </button>

                    {/* Timeline Graphics + Inputs Container */}
                    <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                        
                        {/* Timeline Graphic */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px', marginRight: '12px', marginTop: '14px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: `2px solid ${ui.textMuted}`, backgroundColor: 'transparent' }} />
                            <div style={{ flex: 1, minHeight: '36px', width: '0px', borderLeft: `3px dotted ${ui.textMuted}`, opacity: 0.6, margin: '4px 0' }} />
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: ui.accentRed, marginBottom: '22px' }} />
                        </div>

                        {/* Input Fields */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input 
                                type="text" value={originQuery} onChange={(e) => handleSearchInput(e.target.value, true)} 
                                onFocus={() => setActiveInput('origin')} onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                                placeholder="Your location" 
                                style={{ width: '100%', background: ui.inputBg, color: ui.textMain, border: 'none', padding: '12px 16px', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
                            />
                            <input 
                                type="text" value={destQuery} onChange={(e) => handleSearchInput(e.target.value, false)} 
                                onFocus={() => setActiveInput('destination')} onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                                placeholder="Choose destination"
                                style={{ width: '100%', background: ui.inputBg, color: ui.textMain, border: 'none', padding: '12px 16px', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <button onClick={swapLocations} style={{ background: 'none', border: 'none', color: ui.textMain, fontSize: '20px', cursor: 'pointer', alignSelf: 'center', paddingRight: '4px' }}>
                        ⇅
                    </button>
                </div>

                {/* Google Maps Style Vehicle Tabs (Horizontal Scroll) */}
                {!routeInfo && (
                    <div style={{ display: 'flex', gap: '8px', padding: '8px 16px 16px 16px', overflowX: 'auto', borderBottom: `1px solid ${ui.border}` }}>
                        {['LOW', 'MID', 'HIGH'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setVehicleLayer(type)} 
                                style={{ 
                                    background: vehicleLayer === type ? `${ui.accentBlue}22` : 'transparent', 
                                    color: vehicleLayer === type ? ui.accentBlue : ui.textMain, 
                                    border: `1px solid ${vehicleLayer === type ? ui.accentBlue : ui.border}`, 
                                    borderRadius: '16px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', 
                                    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', cursor: 'pointer'
                                }}
                            >
                                {type === 'LOW' ? '🚗 Sedan / Hatch' : type === 'MID' ? '🚙 SUV / Pick-up' : '🚌 Truck / Bus'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Action Bar with Voice Select Restored */}
                {!routeInfo && (
                    <div style={{ padding: '16px', paddingTop: '0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                            <span style={{ fontSize: '14px', color: ui.textMain, fontWeight: '500' }}>Navigation Voice</span>
                            <select 
                                value={selectedVoice} 
                                onChange={(e) => setSelectedVoice(e.target.value)} 
                                style={{ background: ui.inputBg, color: ui.textMain, border: 'none', padding: '8px 12px', borderRadius: '16px', fontSize: '13px', outline: 'none', maxWidth: '160px', textOverflow: 'ellipsis', cursor: 'pointer' }}
                            >
                                <option value="bisaya_free">🇵🇭 Bisaya (Copilot)</option>
                                {voices.map(voice => (
                                    <option key={voice.name} value={voice.name}>
                                        {voice.name.replace(/Microsoft |Google /g, '')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button onClick={() => fetchRoute(false)} disabled={isCalculating || !origin || !destination} style={{ width: '100%', background: (!origin || !destination) ? ui.inputBg : ui.accentBlue, color: (!origin || !destination) ? ui.textMuted : ui.btnText, border: 'none', padding: '12px', borderRadius: '24px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                            {isCalculating ? 'Routing...' : 'Directions'}
                        </button>
                    </div>
                )}

                {/* Full Screen Takeover for Suggestions */}
                {(activeInput === 'origin' && originSuggestions.length > 0) || (activeInput === 'destination' && destSuggestions.length > 0) ? (
                    <div style={{ background: ui.bg, position: 'absolute', top: '100%', width: '100%', height: '100vh', overflowY: 'auto' }}>
                        {(activeInput === 'origin' ? originSuggestions : destSuggestions).map((item, idx) => (
                            <div key={idx} onClick={() => selectLocationItem(item, activeInput === 'origin')} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${ui.border}`, cursor: 'pointer' }}>
                                <div style={{ backgroundColor: ui.inputBg, borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                                    <span style={{ fontSize: '16px', color: ui.textMuted }}>📍</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '15px', color: ui.textMain, fontWeight: '500' }}>{item.primary}</span>
                                    <span style={{ fontSize: '13px', color: ui.textMuted }}>{item.secondary}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* BOTTOM SHEET - ROUTE INFO */}
            {routeInfo && !driveMode && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, width: '100%',
                    backgroundColor: ui.panelBg, zIndex: 3000,
                    borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                    padding: '20px 20px calc(max(20px, env(safe-area-inset-bottom)) + 90px) 20px',
                    boxShadow: '0 -4px 16px rgba(0,0,0,0.3)',
                    display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                    <div style={{ width: '40px', height: '4px', backgroundColor: ui.border, borderRadius: '2px', alignSelf: 'center', marginBottom: '-8px' }} />
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '32px', fontWeight: 'bold', color: ui.accentGreen }}>{routeInfo.time} min</span>
                            <span style={{ fontSize: '18px', color: ui.textMuted }}>({routeInfo.distance} km)</span>
                        </div>
                        <span style={{ color: ui.textMuted, fontSize: '14px', marginTop: '2px' }}>Fastest route with normal traffic</span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button style={{ flex: 1, backgroundColor: ui.inputBg, color: ui.textMain, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '15px', fontWeight: 'bold' }}>
                            Steps
                        </button>
                        <button onClick={startDriveMode} style={{ flex: 2, backgroundColor: ui.accentBlue, color: ui.btnText, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Start
                        </button>
                    </div>
                </div>
            )}

            {/* DRIVE MODE UI OVERLAYS */}
            {driveMode && (
                <>
                    {/* Top Directions Banner */}
                    <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 3000, pointerEvents: 'none' }}>
                        <div style={{ backgroundColor: '#188038', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', pointerEvents: 'auto' }}>
                            <span style={{ fontSize: '42px', fontWeight: 'bold', lineHeight: 1 }}>{navStep.arrow}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '18px', fontWeight: '500', color: '#e0e0e0' }}>{navStep.distance}</span>
                                <span style={{ fontSize: '24px', fontWeight: '600' }}>{navStep.action}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Controls & Speedometer */}
                    <div style={{ position: 'absolute', bottom: '24px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 3000 }}>
                        <div style={{ backgroundColor: ui.panelBg, borderRadius: '50%', width: '64px', height: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', color: ui.textMain, border: `3px solid ${ui.border}` }}>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '1' }}>{speed}</span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: ui.textMuted }}>km/h</span>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                            <div onClick={recenterMap} style={{ backgroundColor: ui.panelBg, borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', color: ui.textMain, fontSize: '24px', cursor: 'pointer' }}>
                                🧭
                            </div>
                            <button onClick={stopDriveMode} style={{ backgroundColor: ui.accentRed, color: '#fff', border: 'none', borderRadius: '24px', padding: '14px 32px', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', cursor: 'pointer' }}>
                                ✕ Exit
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}