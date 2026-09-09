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

// Haversine formula to calculate distance between two coordinates in meters
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
};

export default function MapSection() {
    const TOMTOM_API_KEY = import.meta.env.VITE_MAPAPI_TOMTOM_API_KEY;

    const [mapCenter, setMapCenter] = useState([14.5648, 120.9932]);
    const [origin, setOrigin] = useState(null); 
    const [destination, setDestination] = useState(null); 
    const [vehicleLayer, setVehicleLayer] = useState("LOW");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    // =========================================
    // THEME, DRIVE MODE & INCIDENT REPORTING
    // =========================================
    const [theme, setTheme] = useState("light");
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
    const lastRerouteTime = useRef(0);
    
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
    
    // Live Location & Heading States
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
    const userMarkerRef = useRef(null);

    const ui = {
        bg: theme === 'dark' ? '#1e293b' : '#ffffff',
        panelBg: theme === 'dark' ? '#0f172a' : '#fafafa',
        inputBg: theme === 'dark' ? '#334155' : '#f1f3f4',
        inputBgFocus: theme === 'dark' ? '#475569' : '#e8eaed',
        border: theme === 'dark' ? '#334155' : '#dadce0',
        textMain: theme === 'dark' ? '#ffffff' : '#202124',
        textMuted: theme === 'dark' ? '#94a3b8' : '#5f6368',
        btnHover: theme === 'dark' ? '#334155' : '#f8f9fa',
        accentBlue: '#1a73e8',
        accentGreen: '#10b981',
        accentRed: '#ea4335'
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

    // 100% Free Web Speech API Engine with Phonetic Hacking
    const speakInstruction = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            
            if (selectedVoice === "bisaya_free") {
                const localVoice = voices.find(v => 
                    v.lang.includes('fil') || v.lang.includes('tl') || v.lang.includes('PH') || v.lang.includes('id')
                );
                if (localVoice) utterance.voice = localVoice;
            } else if (selectedVoice) {
                const voice = voices.find(v => v.name === selectedVoice);
                if (voice) utterance.voice = voice;
            }
            window.speechUtterance = utterance; 
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

    // LIVE GPS TRACKING & SPEED CALCULATION
    useEffect(() => {
        let watchId;
        if (driveMode) {
            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const newLatlng = [position.coords.latitude, position.coords.longitude];
                        setLiveLocation(newLatlng);
                        
                        if (position.coords.speed !== null) {
                            setSpeed(Math.round(position.coords.speed * 3.6));
                        } else {
                            setSpeed(0);
                        }

                        if (position.coords.heading !== null && !isNaN(position.coords.heading)) {
                            setHeading(position.coords.heading);
                        }

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

    // OFF-ROUTE DETECTION & AUTO-REROUTING
    useEffect(() => {
        if (!driveMode || !liveLocation || routeSegments.length === 0 || isCalculating) return;

        let minDistance = Infinity;

        routeSegments.forEach(segment => {
            if (segment.coords) {
                segment.coords.forEach(pt => {
                    const lat = pt.latitude !== undefined ? pt.latitude : pt[0];
                    const lng = pt.longitude !== undefined ? pt.longitude : pt[1];
                    if (lat && lng) {
                        const dist = getDistanceInMeters(liveLocation[0], liveLocation[1], lat, lng);
                        if (dist < minDistance) minDistance = dist;
                    }
                });
            }
        });

        if (minDistance > 50) {
            const now = Date.now();
            if (now - lastRerouteTime.current < 15000) return; 
            lastRerouteTime.current = now;

            console.log(`Off-route detected! Diverged by ${Math.round(minDistance)} meters.`);
            
            setNavStep({ distance: "Rerouting...", action: "Finding new path", arrow: "↻" });
            
            setTimeout(() => {
                const speechText = selectedVoice === "bisaya_free" 
                    ? "Nasaag ka. Nag calculate ug bag-ong ruta..." 
                    : "You are off route. Recalculating detour...";
                speakInstruction(speechText);
            }, 500);

            setOrigin({ latlng: liveLocation, title: "Current Location" });
            fetchRoute(true, liveLocation); 
        }
    }, [liveLocation, driveMode, routeSegments, isCalculating, selectedVoice]);

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
        
        if (liveLocation || (driveMode && origin)) {
            const loc = liveLocation || origin.latlng;
            
            // Outer Halo
            L.circleMarker(loc, { radius: 18, fillColor: '#1a73e8', color: 'transparent', fillOpacity: 0.3, pane: 'routePane' }).addTo(mapGroup);
            
            // Rotating User Arrow Icon
            const userIconHtml = `
                <div style="
                    width: 24px; 
                    height: 24px; 
                    background-color: #1a73e8; 
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
            
            let lat = nodeContainer.lat;
            let lng = nodeContainer.lng;
            let floodDepth = 0, battery = 'N/A', status = 'UNKNOWN';

            const pushKeys = Object.keys(nodeContainer).filter(key => key.startsWith('-')).sort(); 

            if (pushKeys.length > 0) {
                const latestKey = pushKeys[pushKeys.length - 1];
                const latestData = nodeContainer[latestKey];
                lat = latestData?.lat !== undefined ? latestData.lat : lat;
                lng = latestData?.lng !== undefined ? latestData.lng : lng;
                floodDepth = latestData?.waterLevel !== undefined ? latestData.waterLevel : (latestData?.depth || 0);
                battery = latestData?.battery || 'N/A';
                status = latestData?.status || 'ONLINE';
            } else if (nodeContainer.waterLevel !== undefined || nodeContainer.depth !== undefined) {
                floodDepth = nodeContainer.waterLevel !== undefined ? nodeContainer.waterLevel : (nodeContainer.depth || 0);
                battery = nodeContainer.battery || 'N/A';
                status = nodeContainer.status || 'ONLINE';
            }

            if (!lat || !lng) return;

            let color = "#10b981";
            if (floodDepth >= 50) color = "#ef4444";
            else if (floodDepth >= 30) color = "#f59e0b";
            else if (floodDepth >= 15) color = "#eab308";

            const floodDepthFt = (floodDepth / 30.48).toFixed(2);
            const popupContent = `
                <div style="font-family: Inter, sans-serif; font-size: 13px;">
                    <b style="color: #0f172a;">Node: ${nodeId}</b><br />
                    Flood: <b style="color: ${color};">${floodDepthFt}ft</b><br />
                    Battery: <b>${battery}V</b><br />
                    Status: <b style="color: ${status === 'ONLINE' ? '#10b981' : '#ef4444'};">${status}</b>
                </div>
            `;

            L.circleMarker([lat, lng], { radius: 8, fillColor: color, color: "#ffffff", weight: 2, fillOpacity: 0.9 })
                .addTo(mapGroup)
                .bindPopup(popupContent);
        });

        Object.keys(userReports).forEach(key => {
            const report = userReports[key];
            if (!report.lat || !report.lng) return;
            
            const timeDiff = Date.now() - report.timestamp;
            if (timeDiff > 4 * 60 * 60 * 1000) return; 

            let emoji = "⚠️";
            if (report.type === "Accident") emoji = "💥";
            else if (report.type === "Construction") emoji = "🚧";
            else if (report.type === "Police") emoji = "🚓";

            const reportIcon = L.divIcon({
                html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${emoji}</div>`,
                className: '',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            L.marker([report.lat, report.lng], { icon: reportIcon, pane: 'routePane' })
                .addTo(mapGroup)
                .bindPopup(`<b style="color: #0f172a;">${report.type}</b><br/><span style="color: #64748b;">Reported at ${new Date(report.timestamp).toLocaleTimeString()}</span>`);
        });

        const allPositions = [];
        routeSegments.forEach(segment => {
            if (!segment || !Array.isArray(segment.coords)) return;
            const positions = segment.coords.map(c => [c.latitude, c.longitude]);
            allPositions.push(...positions);
            
            L.polyline(positions, { color: driveMode ? '#02416d' : '#202124', weight: driveMode ? 12 : 9, opacity: 0.8, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
            L.polyline(positions, { color: driveMode ? '#00d6ff' : (segment.color || ui.accentBlue), weight: driveMode ? 8 : 5, opacity: 1.0, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
        });

        if (!driveMode && allPositions.length > 0 && mapInstanceRef.current && !isCalculating) {
            const bounds = L.latLngBounds(allPositions);
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }

    }, [origin, destination, liveLocation, heading, firebaseNodes, userReports, routeSegments, driveMode, isCalculating]);

    useEffect(() => {
        const nodesRef = ref(database, 'nodes');
        const unsubscribeNodes = onValue(nodesRef, (snapshot) => {
            const nodes = snapshot.val();
            if (nodes) {
                setFirebaseNodes(nodes);
                checkFloodTriggers(nodes);
            }
        });

        const reportsRef = ref(database, 'reports');
        const unsubscribeReports = onValue(reportsRef, (snapshot) => {
            const reports = snapshot.val();
            if (reports) {
                setUserReports(reports);
            } else {
                setUserReports({});
            }
        });

        return () => {
            unsubscribeNodes();
            unsubscribeReports();
        };
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
            fetchRoute(true, driveMode ? liveLocation : null);
        }
    };

    const submitReport = (type) => {
        const loc = liveLocation || mapCenter; 
        if (!loc) return;

        const newReportRef = push(ref(database, 'reports'));
        set(newReportRef, {
            type: type,
            lat: loc[0],
            lng: loc[1],
            timestamp: Date.now()
        }).then(() => {
            alert(`✅ ${type} reported successfully!`);
            setShowReportModal(false);
        }).catch(err => {
            console.error("Failed to report:", err);
            alert("Failed to send report.");
        });
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
        setActiveInput(null);
    };

    const swapLocations = () => {
        const tempOrigin = origin;
        const tempOriginQuery = originQuery;
        setOrigin(destination);
        setOriginQuery(destQuery);
        setDestination(tempOrigin);
        setDestQuery(tempOriginQuery);
    };

    const clearOrigin = () => {
        setOrigin(null); setOriginQuery(""); setOriginSuggestions([]);
    };

    const clearDestination = () => {
        setDestination(null); setDestQuery(""); setDestSuggestions([]);
    };

    // 5. FETCH ROUTE WITH OVERRIDE INJECTION & CLOSURE SAFETY
    const fetchRoute = async (isAutoReroute = false, overrideOrigin = null) => {
        const currentOrigin = originRef.current;
        const currentDest = destRef.current;
        const startLat = overrideOrigin ? overrideOrigin[0] : (currentOrigin ? currentOrigin.latlng[0] : null);
        const startLon = overrideOrigin ? overrideOrigin[1] : (currentOrigin ? currentOrigin.latlng[1] : null);

        if (!startLat || !currentDest) {
            if (!isAutoReroute) alert("⚠️ Please set Origin and Destination.");
            return;
        }

        setIsNavigating(true);
        setIsCalculating(true);

        const payload = {
            origin_lat: startLat, origin_lon: startLon,
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
                const startPin = { latitude: startLat, longitude: startLon };
                const endPin = { latitude: currentDest.latlng[0], longitude: currentDest.latlng[1] };
                
                let combinedCoords = [];

                if (data.segments && data.segments.length > 0 && data.segments[0].coords) {
                    data.segments[0].coords.unshift(startPin);
                    data.segments[data.segments.length - 1].coords.push(endPin);
                    setRouteSegments(data.segments);
                    
                    data.segments.forEach(seg => {
                        combinedCoords.push(...seg.coords);
                    });
                } else if (data.path && data.path.length > 0) {
                    combinedCoords = [startPin, ...data.path, endPin];
                    setRouteSegments([{ coords: combinedCoords, color: ui.accentBlue }]); 
                }

                if (combinedCoords.length > 5) {
                    const nextPoint = combinedCoords[Math.min(5, combinedCoords.length - 1)];
                    const isRight = nextPoint.longitude > startLon; 
                    const actionText = isRight ? "Turn right" : "Turn left";
                    const arrowSymbol = isRight ? "↱" : "↰";

                    setNavStep({
                        distance: "40 m",
                        action: actionText,
                        arrow: arrowSymbol
                    });
                } else {
                    setNavStep({ distance: "40 m", action: "Arrive at destination", arrow: "📍" });
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

    const startDriveMode = () => {
        setDriveMode(true);
        setShowFloodWarning(true);
        
        if (mapInstanceRef.current && (liveLocation || origin)) {
            const startLoc = liveLocation || origin.latlng;
            mapInstanceRef.current.flyTo(startLoc, 19, { animate: true, duration: 1.5 });
        }

        setTimeout(() => {
            let speechText = "";
            
            if (selectedVoice === "bisaya_free") {
                let bisayaAction = "naabot na ka sa destinasyon";
                if (navStep.action.includes("right")) bisayaAction = "liko sa tuo";
                else if (navStep.action.includes("left")) bisayaAction = "liko sa wala";
                
                const distanceText = navStep.distance.replace('m', 'metros');
                
                speechText = `Mga ${distanceText} sa unahan, ${bisayaAction}. Amping sa byahe kay basin gibaha ang Metro Manila.`;
            } else {
                speechText = `In ${navStep.distance}, ${navStep.action.toLowerCase()}. Metro Manila floods may affect your route.`;
            }
            speakInstruction(speechText);
        }, 800);
    };

    const stopDriveMode = () => {
        setDriveMode(false);
        setShowFloodWarning(false);
        if (mapInstanceRef.current && routeSegments.length > 0) {
            const allPositions = [];
            routeSegments.forEach(segment => {
                const positions = segment.coords.map(c => [c.latitude, c.longitude]);
                allPositions.push(...positions);
            });
            const bounds = L.latLngBounds(allPositions);
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    const recenterMap = () => {
        if (mapInstanceRef.current && (liveLocation || origin)) {
            const loc = liveLocation || origin.latlng;
            mapInstanceRef.current.flyTo(loc, 19, { animate: true, duration: 1.0 });
        }
    };

    const showRouteOverview = () => {
        if (mapInstanceRef.current && routeSegments.length > 0) {
            const allPositions = [];
            routeSegments.forEach(segment => {
                const positions = segment.coords.map(c => [c.latitude, c.longitude]);
                allPositions.push(...positions);
            });
            const bounds = L.latLngBounds(allPositions);
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.0 });
        }
    };

    const clearMap = () => {
        setOrigin(null); setDestination(null); setOriginQuery(""); setDestQuery("");
        setOriginSuggestions([]); setDestSuggestions([]);
        setRouteSegments([]); setRouteInfo(null); 
        setIsNavigating(false); setDriveMode(false); setShowFloodWarning(false); setActiveInput(null);
        setNavStep({ distance: '--', action: 'Calculating...', arrow: '↱' });
        nodeBlockStates.current = {};
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: driveMode ? 9999 : 0 }}>
            
            {driveMode && (
                <style>
                    {`
                        nav, footer, .nav, .navbar, .bottom-nav, 
                        [class*="nav"], [class*="Nav"], [class*="bottom"], 
                        [id*="nav"], [id*="Nav"] {
                            display: none !important;
                        }
                    `}
                </style>
            )}

            <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />

            {/* SEARCH CARD */}
            <div style={{
                position: 'absolute',
                top: isMobile ? '12px' : '16px',
                left: isMobile ? '12px' : '20px',
                right: isMobile ? '12px' : 'auto',
                width: isMobile ? 'auto' : '380px',
                backgroundColor: ui.bg,
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
                opacity: driveMode ? 0 : 1,
                pointerEvents: driveMode ? 'none' : 'auto',
                transform: driveMode ? 'translateY(-20px)' : 'translateY(0)',
                transition: 'opacity 0.3s ease, transform 0.3s ease'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px 16px', borderBottom: `1px solid ${ui.border}` }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: ui.textMain, letterSpacing: '0.3px' }}>FRENDS Routing</span>
                    <button 
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', transition: 'background-color 0.2s' }}
                        onMouseOver={(e) => e.target.style.backgroundColor = ui.btnHover}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>

                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${ui.accentBlue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: ui.accentBlue }}></div>
                        </div>
                        <input 
                            type="text" 
                            value={originQuery} 
                            onChange={(e) => handleSearchInput(e.target.value, true)} 
                            onFocus={() => setActiveInput('origin')}
                            onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                            placeholder="Starting point" 
                            style={{ flex: 1, border: 'none', background: ui.inputBg, color: ui.textMain, padding: '12px 12px', borderRadius: '8px', fontSize: '15px', outline: 'none', transition: 'background-color 0.2s', '::placeholder': { color: ui.textMuted } }}
                            onMouseOver={(e) => e.target.style.backgroundColor = activeInput === 'origin' ? ui.inputBgFocus : ui.inputBg}
                            onMouseOut={(e) => e.target.style.backgroundColor = ui.inputBg}
                        />
                        {originQuery && (
                            <button onClick={clearOrigin} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ui.textMuted, borderRadius: '50%', transition: 'background-color 0.2s, color 0.2s' }} onMouseOver={(e) => { e.target.style.backgroundColor = ui.inputBg; e.target.style.color = ui.textMain; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = ui.textMuted; }} title="Clear">✕</button>
                        )}
                    </div>

                    {(origin || destination) && (
                        <button onClick={swapLocations} style={{ alignSelf: 'center', background: 'none', border: `2px solid ${ui.border}`, cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ui.accentBlue, fontSize: '16px', fontWeight: 'bold', transition: 'all 0.2s', marginTop: '-6px', marginBottom: '-6px' }} onMouseOver={(e) => { e.target.style.backgroundColor = ui.inputBg; e.target.style.borderColor = ui.accentBlue; e.target.style.transform = 'rotate(180deg)'; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.transform = 'rotate(0deg)'; }} title="Swap origin and destination">⇅</button>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}><path d="M12 2C7.59 2 4 5.59 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.41-3.59-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="#EA4335"/></svg>
                        <input 
                            type="text" 
                            value={destQuery} 
                            onChange={(e) => handleSearchInput(e.target.value, false)} 
                            onFocus={() => setActiveInput('destination')}
                            onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                            placeholder="Destination"
                            style={{ flex: 1, border: 'none', background: ui.inputBg, color: ui.textMain, padding: '12px 12px', borderRadius: '8px', fontSize: '15px', outline: 'none', transition: 'background-color 0.2s', '::placeholder': { color: ui.textMuted } }}
                            onMouseOver={(e) => e.target.style.backgroundColor = activeInput === 'destination' ? ui.inputBgFocus : ui.inputBg}
                            onMouseOut={(e) => e.target.style.backgroundColor = ui.inputBg}
                        />
                        {destQuery && (
                            <button onClick={clearDestination} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ui.textMuted, borderRadius: '50%', transition: 'background-color 0.2s, color 0.2s' }} onMouseOver={(e) => { e.target.style.backgroundColor = ui.inputBg; e.target.style.color = ui.textMain; }} onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = ui.textMuted; }} title="Clear">✕</button>
                        )}
                    </div>

                    {activeInput === 'origin' && originSuggestions.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: '16px', right: '16px', marginTop: '8px', background: ui.bg, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', zIndex: 1001, maxHeight: '240px', overflowY: 'auto', border: `1px solid ${ui.border}` }}>
                            {originSuggestions.map((item, idx) => (
                                <div key={idx} onClick={() => selectLocationItem(item, true)} style={{ padding: '12px 16px', borderBottom: idx < originSuggestions.length - 1 ? `1px solid ${ui.border}` : 'none', cursor: 'pointer', transition: 'background-color 0.15s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = ui.btnHover} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <div style={{ fontSize: '14px', fontWeight: '500', color: ui.textMain }}>{item.primary}</div>
                                    <div style={{ fontSize: '12px', color: ui.textMuted, marginTop: '2px' }}>{item.secondary}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeInput === 'destination' && destSuggestions.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: '16px', right: '16px', marginTop: '8px', background: ui.bg, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px', zIndex: 1001, maxHeight: '240px', overflowY: 'auto', border: `1px solid ${ui.border}` }}>
                            {destSuggestions.map((item, idx) => (
                                <div key={idx} onClick={() => selectLocationItem(item, false)} style={{ padding: '12px 16px', borderBottom: idx < destSuggestions.length - 1 ? `1px solid ${ui.border}` : 'none', cursor: 'pointer', transition: 'background-color 0.15s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = ui.btnHover} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <div style={{ fontSize: '14px', fontWeight: '500', color: ui.textMain }}>{item.primary}</div>
                                    <div style={{ fontSize: '12px', color: ui.textMuted, marginTop: '2px' }}>{item.secondary}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding: '12px 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: ui.panelBg, borderTop: `1px solid ${ui.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: ui.textMuted, fontWeight: '500' }}>Vehicle Type</span>
                        <select value={vehicleLayer} onChange={(e) => setVehicleLayer(e.target.value)} style={{ border: `1px solid ${ui.border}`, borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: ui.textMain, backgroundColor: ui.bg, cursor: 'pointer', outline: 'none', fontWeight: '500' }}>
                            <option value="LOW">Sedan / Hatchback</option>
                            <option value="MID">SUV / Pick-up</option>
                            <option value="HIGH">Truck / Bus</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', color: ui.textMuted, fontWeight: '500' }}>Nav Voice</span>
                        <select 
                            value={selectedVoice} 
                            onChange={(e) => setSelectedVoice(e.target.value)} 
                            style={{ border: `1px solid ${ui.border}`, borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: ui.textMain, backgroundColor: ui.bg, cursor: 'pointer', outline: 'none', fontWeight: '500', maxWidth: '160px', textOverflow: 'ellipsis' }}
                        >
                            <option value="bisaya_free">🇵🇭 Bisaya (Copilot)</option>
                            {voices.map(voice => (
                                <option key={voice.name} value={voice.name}>
                                    {voice.name.replace(/Microsoft |Google /g, '')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button onClick={() => fetchRoute(false)} disabled={isCalculating || !origin || !destination} style={{ flex: 1, backgroundColor: (isCalculating || !origin || !destination) ? '#999' : ui.accentBlue, color: 'white', border: 'none', borderRadius: '8px', padding: '11px 16px', fontSize: '14px', fontWeight: '600', cursor: isCalculating || !origin || !destination ? 'not-allowed' : 'pointer', transition: 'background 0.2s', letterSpacing: '0.3px' }} onMouseOver={(e) => !isCalculating && !(!origin || !destination) && (e.target.style.backgroundColor = '#1557b0')} onMouseOut={(e) => !isCalculating && !(!origin || !destination) && (e.target.style.backgroundColor = ui.accentBlue)}>
                            {isCalculating ? '⏳ Calculating...' : '→ Directions'}
                        </button>
                        <button onClick={clearMap} style={{ padding: '11px 16px', backgroundColor: ui.bg, color: ui.textMain, border: `1.5px solid ${ui.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.3px' }} onMouseOver={(e) => { e.target.style.backgroundColor = ui.btnHover; e.target.style.borderColor = ui.textMuted; }} onMouseOut={(e) => { e.target.style.backgroundColor = ui.bg; e.target.style.borderColor = ui.border; }}>
                            ✕ Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* DRIVE MODE OVERLAY UI */}
            {driveMode && (
                <>
                    <div style={{ position: 'absolute', top: '16px', left: isMobile ? '16px' : '50%', transform: isMobile ? 'none' : 'translateX(-50%)', width: isMobile ? 'calc(100% - 32px)' : '400px', zIndex: 3000, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ backgroundColor: '#03534a', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', pointerEvents: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontSize: '42px', fontWeight: 'bold', lineHeight: 1 }}>{navStep.arrow}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: '500', color: '#e0e0e0' }}>{navStep.distance}</span>
                                    <span style={{ fontSize: '24px', fontWeight: '600' }}>{navStep.action}</span>
                                </div>
                            </div>
                            <div style={{ width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a73e8', fontSize: '20px' }}>
                                ✨
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: showFloodWarning ? '240px' : '130px', left: '16px', width: '64px', height: '64px', backgroundColor: '#000', borderRadius: '50%', border: '3px solid #333', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 3000, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', transition: 'bottom 0.3s ease' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '1' }}>{speed}</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>km/h</span>
                    </div>

                    <div style={{ position: 'absolute', bottom: showFloodWarning ? '240px' : '130px', right: '16px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 3000, transition: 'bottom 0.3s ease' }}>
                        <div onClick={() => setShowReportModal(true)} style={{ width: '52px', height: '52px', backgroundColor: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} title="Report Incident">
                            <span style={{color: '#000', fontSize: '22px'}}>⚠️</span>
                        </div>
                        <div onClick={recenterMap} style={{ width: '52px', height: '52px', backgroundColor: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} title="Recenter">
                            <span style={{color: 'white', fontSize: '22px'}}>🧭</span>
                        </div>
                        <div onClick={showRouteOverview} style={{ width: '52px', height: '52px', backgroundColor: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} title="Overview">
                            <span style={{color: 'white', fontSize: '20px'}}>🔍</span>
                        </div>
                    </div>

                    {showFloodWarning && (
                        <div style={{ 
                            position: 'absolute', bottom: '130px', left: isMobile ? '16px' : '50%', transform: isMobile ? 'none' : 'translateX(-50%)', width: isMobile ? 'calc(100% - 32px)' : '400px', backgroundColor: '#000', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', color: 'white', zIndex: 3000, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' 
                        }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: '#f28b82', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ color: '#000', fontSize: '22px', fontWeight: 'bold', lineHeight: 1, marginTop: '-2px' }}>≋</span>
                                </div>
                                <span style={{ fontSize: '17px', fontWeight: '500', lineHeight: '1.4' }}>Metro Manila floods may affect your route</span>
                            </div>
                            <button onClick={() => setShowFloodWarning(false)} style={{ alignSelf: 'flex-end', backgroundColor: '#9cdbd5', color: '#000', border: 'none', borderRadius: '24px', padding: '10px 24px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={(e) => e.target.style.opacity = '0.8'} onMouseOut={(e) => e.target.style.opacity = '1'}>
                                ✕ Dismiss
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* INCIDENT REPORT MODAL */}
            {showReportModal && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: ui.bg, padding: '24px', borderRadius: '20px', width: '320px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: ui.textMain, fontSize: '18px', fontWeight: '600' }}>Report an Incident</h3>
                            <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: ui.textMuted }}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button onClick={() => submitReport('Accident')} style={{ padding: '16px', backgroundColor: ui.inputBg, border: 'none', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', color: ui.textMain, transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = ui.inputBgFocus} onMouseOut={(e) => e.currentTarget.style.backgroundColor = ui.inputBg}>
                                <span style={{ fontSize: '32px' }}>💥</span> <span style={{ fontWeight: '500' }}>Accident</span>
                            </button>
                            <button onClick={() => submitReport('Construction')} style={{ padding: '16px', backgroundColor: ui.inputBg, border: 'none', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', color: ui.textMain, transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = ui.inputBgFocus} onMouseOut={(e) => e.currentTarget.style.backgroundColor = ui.inputBg}>
                                <span style={{ fontSize: '32px' }}>🚧</span> <span style={{ fontWeight: '500' }}>Construction</span>
                            </button>
                            <button onClick={() => submitReport('Hazard')} style={{ padding: '16px', backgroundColor: ui.inputBg, border: 'none', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', color: ui.textMain, transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = ui.inputBgFocus} onMouseOut={(e) => e.currentTarget.style.backgroundColor = ui.inputBg}>
                                <span style={{ fontSize: '32px' }}>⚠️</span> <span style={{ fontWeight: '500' }}>Hazard</span>
                            </button>
                            <button onClick={() => submitReport('Police')} style={{ padding: '16px', backgroundColor: ui.inputBg, border: 'none', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', color: ui.textMain, transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = ui.inputBgFocus} onMouseOut={(e) => e.currentTarget.style.backgroundColor = ui.inputBg}>
                                <span style={{ fontSize: '32px' }}>🚓</span> <span style={{ fontWeight: '500' }}>Police</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Route Info Pill */}
            {routeInfo && (
                <div style={{ 
                    position: 'absolute', 
                    bottom: driveMode ? '40px' : (isMobile ? '140px' : '140px'),
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    zIndex: 3000, 
                    background: ui.bg, 
                    borderRadius: '16px', 
                    padding: '12px 16px', 
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '20px', 
                    transition: 'bottom 0.3s ease, background-color 0.3s ease',
                    border: `1px solid ${ui.border}`,
                    minWidth: 'max-content'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: ui.accentGreen }}>{routeInfo.time}</span>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: ui.textMuted }}>min</span>
                    </div>
                    
                    <div style={{ width: '1px', height: '32px', background: ui.border }}></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px', color: ui.textMain, fontWeight: '600' }}>{routeInfo.distance}</span>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: ui.textMuted }}>km</span>
                    </div>

                    <div style={{ width: '1px', height: '32px', background: ui.border }}></div>

                    {!driveMode ? (
                        <button 
                            onClick={startDriveMode}
                            style={{
                                backgroundColor: ui.accentBlue, color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 24px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#1557b0'}
                            onMouseOut={(e) => e.target.style.backgroundColor = ui.accentBlue}
                        >
                            Start
                        </button>
                    ) : (
                        <button 
                            onClick={stopDriveMode}
                            style={{
                                backgroundColor: ui.accentRed, color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 24px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#d32f2f'}
                            onMouseOut={(e) => e.target.style.backgroundColor = ui.accentRed}
                        >
                            ✕ Exit
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}