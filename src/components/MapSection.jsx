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

// Haversine formula
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

// Bearing formula
const getBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

export default function MapSection({ onNavigate, onLogout }) {
    const TOMTOM_API_KEY = import.meta.env.VITE_MAPAPI_TOMTOM_API_KEY;

    // FRENDS LEFT SLIDE-OUT MENU
    const [menuOpen, setMenuOpen] = useState(false);

    const [mapCenter, setMapCenter] = useState([14.5648, 120.9932]);
    const [origin, setOrigin] = useState(null); 
    const [destination, setDestination] = useState(null); 
    const [vehicleLayer, setVehicleLayer] = useState("LOW");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    const [theme, setTheme] = useState("dark");
    const [driveMode, setDriveMode] = useState(false);
    const [showFloodWarning, setShowFloodWarning] = useState(false); 
    const [showTraffic, setShowTraffic] = useState(true);
    const [navStep, setNavStep] = useState({ distance: '--', action: 'Calculating...', arrow: '↱' }); 
    
    const [showReportModal, setShowReportModal] = useState(false);
    const [userReports, setUserReports] = useState({});
    
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState("bisaya_free"); 

   // Current Location Banner State
    const [currentLocationName, setCurrentLocationName] = useState("Locating...");
    const [showLocationBanner, setShowLocationBanner] = useState(false);

    // Smart Traffic Prompt States
    const [showTrafficPrompt, setShowTrafficPrompt] = useState(false);
    const stoppageTimerRef = useRef(null);
    const hasPromptedRecentlyRef = useRef(false);

    const originRef = useRef(origin);
    const destRef = useRef(destination);
    const isNavigatingRef = useRef(false);
    const searchTimeoutRef = useRef(null);
    const lastRerouteTime = useRef(0);
    const lastSpokenDistRef = useRef(Infinity);
    const warnedHazardsRef = useRef(new Set()); 
    
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
    const trafficLayerRef = useRef(null); 
    const userMarkerRef = useRef(null); 

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

    useEffect(() => {
        if ('geolocation' in navigator) {
            // Show "Locating..." immediately while waiting for GPS
            setShowLocationBanner(true);

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    const latlng = [lat, lon];
                    setMapCenter(latlng);
                    setLiveLocation(latlng);
                    
                    if (!originRef.current) {
                        setOrigin({ latlng, title: "Your Location" });
                        setOriginQuery("Your Location");
                    }

                    if (TOMTOM_API_KEY && TOMTOM_API_KEY !== "undefined") {
                        try {
                            const res = await fetch(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${TOMTOM_API_KEY.trim()}&view=Unified`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.addresses && data.addresses.length > 0) {
                                    const addr = data.addresses[0].address;
                                    const placeName = addr.municipality || addr.city || addr.freeformAddress;
                                    if (placeName) {
                                        setCurrentLocationName(placeName);
                                    } else {
                                        setCurrentLocationName("your current location");
                                    }
                                }
                            }
                        } catch (e) {
                            console.error("Reverse geocode fetch failed:", e);
                            setCurrentLocationName("your current location");
                        }
                    } else {
                        setCurrentLocationName("your current location");
                    }

                    // Hide the banner 5 seconds AFTER the actual location is found
                    setTimeout(() => setShowLocationBanner(false), 5000);
                },
                (err) => {
                    console.error("Initial GPS Error:", err);
                    setShowLocationBanner(false); // Hide the banner if the user denies GPS permissions
                },
                { enableHighAccuracy: true }
            );
        }
    }, [TOMTOM_API_KEY]);

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

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        if (!trafficLayerRef.current) {
            trafficLayerRef.current = L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`, { 
                maxZoom: 19, opacity: 0.85, tileSize: 128, zoomOffset: 1, zIndex: 10 
            });
        }

        if (showTraffic) {
            if (!map.hasLayer(trafficLayerRef.current)) map.addLayer(trafficLayerRef.current);
        } else {
            if (map.hasLayer(trafficLayerRef.current)) map.removeLayer(trafficLayerRef.current);
        }
    }, [showTraffic, TOMTOM_API_KEY]);

    useEffect(() => {
        let watchId;
        if (driveMode) {
            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const newLatlng = [position.coords.latitude, position.coords.longitude];
                        setLiveLocation(newLatlng);
                        if (position.coords.speed !== null) setSpeed(Math.round(position.coords.speed * 3.6));
                        else setSpeed(0);
                        if (position.coords.heading !== null && !isNaN(position.coords.heading)) setHeading(position.coords.heading);
                        if (mapInstanceRef.current) mapInstanceRef.current.panTo(newLatlng, { animate: true, duration: 1.0 });
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

    useEffect(() => {
        if (!driveMode || !liveLocation || !userReports) return;

        Object.keys(userReports).forEach(key => {
            const report = userReports[key];
            if (Date.now() - report.timestamp > 4 * 60 * 60 * 1000) return;
            if (warnedHazardsRef.current.has(key)) return;

            const dist = getDistanceInMeters(liveLocation[0], liveLocation[1], report.lat, report.lng);

            if (dist < 500) {
                warnedHazardsRef.current.add(key);
                let hazardName = report.type.toLowerCase();
                if (selectedVoice === "bisaya_free") {
                    if (hazardName === "accident") hazardName = "aksidente";
                    if (hazardName === "construction") hazardName = "gimbuhaton sa kalsada";
                    if (hazardName === "police") hazardName = "pulis";
                }

                const speechText = selectedVoice === "bisaya_free" 
                    ? `Pag amping, naay nareport nga ${hazardName} sa unahan.` 
                    : `Caution, ${hazardName} reported ahead.`;
                
                speakInstruction(speechText);
            }
        });
    }, [liveLocation, driveMode, userReports, selectedVoice]);

    // UNUSUAL TRAFFIC & HAZARD PROMPT MONITOR
    useEffect(() => {
        if (!driveMode || !isNavigating || speed === "--") {
            if (stoppageTimerRef.current) clearTimeout(stoppageTimerRef.current);
            setShowTrafficPrompt(false);
            return;
        }

        const speedNum = Number(speed);

        if (speedNum <= 5) {
            if (!stoppageTimerRef.current && !hasPromptedRecentlyRef.current) {
                stoppageTimerRef.current = setTimeout(() => {
                    setShowTrafficPrompt(true);
                    hasPromptedRecentlyRef.current = true;
                    setTimeout(() => { hasPromptedRecentlyRef.current = false; }, 600000);
                }, 25000);
            }
        } else {
            if (stoppageTimerRef.current) {
                clearTimeout(stoppageTimerRef.current);
                stoppageTimerRef.current = null;
            }
        }

        return () => {
            if (stoppageTimerRef.current) clearTimeout(stoppageTimerRef.current);
        };
    }, [speed, driveMode, isNavigating]);

    // ADAPTIVE PATH & OFF-ROUTE DETECTION
    useEffect(() => {
        if (!driveMode || !liveLocation || routeSegments.length === 0 || isCalculating) return;

        let minDistance = Infinity;
        let closestIdx = 0;
        let flatPath = [];

        routeSegments.forEach(segment => {
            if (segment.coords) flatPath.push(...segment.coords);
        });

        if (flatPath.length < 2) return;

        flatPath.forEach((pt, idx) => {
            const lat = pt.latitude !== undefined ? pt.latitude : pt[0];
            const lng = pt.longitude !== undefined ? pt.longitude : pt[1];
            if (lat && lng) {
                const dist = getDistanceInMeters(liveLocation[0], liveLocation[1], lat, lng);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIdx = idx;
                }
            }
        });

        const offRouteThreshold = (typeof speed === 'number' && speed > 60) ? 70 : 45;

        if (minDistance > offRouteThreshold) {
            const now = Date.now();
            if (now - lastRerouteTime.current < 6000) return; 
            lastRerouteTime.current = now;

            setRouteSegments([]);
            setRouteInfo(null);

            setNavStep({ distance: "Rerouting...", action: "Finding new path", arrow: "↻" });
            speakInstruction(selectedVoice === "bisaya_free" ? "Nasaag ka. Nag calculate ug bag-ong ruta..." : "Recalculating route...");
            setOrigin({ latlng: liveLocation, title: "Current Location" });
            fetchRoute(true, liveLocation); 
            return;
        }

        let nextTurnIdx = flatPath.length - 1;
        let action = "Continue straight";
        let arrow = "↑";
        
        for (let i = closestIdx; i < flatPath.length - 2; i++) {
            const p1 = flatPath[i];
            const p2 = flatPath[i+1];
            const p3 = flatPath[i+2];
            
            const b1 = getBearing(p1.latitude || p1[0], p1.longitude || p1[1], p2.latitude || p2[0], p2.longitude || p2[1]);
            const b2 = getBearing(p2.latitude || p2[0], p2.longitude || p2[1], p3.latitude || p3[0], p3.longitude || p3[1]);
            
            let angleDiff = b2 - b1;
            if (angleDiff > 180) angleDiff -= 360;
            if (angleDiff < -180) angleDiff += 360;

            if (Math.abs(angleDiff) > 40) {
                nextTurnIdx = i + 1;
                if (angleDiff > 0) { action = "Turn right"; arrow = "↱"; }
                else { action = "Turn left"; arrow = "↰"; }
                break;
            }
        }

        const turnPt = flatPath[nextTurnIdx];
        const distToTurn = Math.round(getDistanceInMeters(liveLocation[0], liveLocation[1], turnPt.latitude || turnPt[0], turnPt.longitude || turnPt[1]));
        
        setNavStep({ 
            distance: distToTurn > 1000 ? `${(distToTurn/1000).toFixed(1)} km` : `${distToTurn} m`, 
            action: nextTurnIdx === flatPath.length - 1 ? "Arrive at destination" : action, 
            arrow: nextTurnIdx === flatPath.length - 1 ? "📍" : arrow 
        });

        if (distToTurn <= 200 && lastSpokenDistRef.current > 200) {
            lastSpokenDistRef.current = 200;
            const text = selectedVoice === "bisaya_free" 
                ? `Sa duha ka gatos ka metro, ${action.includes('right') ? 'liko sa tuo' : 'liko sa wala'}` 
                : `In 200 meters, ${action}`;
            speakInstruction(text);
        } else if (distToTurn <= 50 && lastSpokenDistRef.current > 50) {
            lastSpokenDistRef.current = 50;
            const text = selectedVoice === "bisaya_free" ? (action.includes('right') ? 'liko sa tuo karon' : 'liko sa wala karon') : `${action} now`;
            speakInstruction(text);
        } else if (distToTurn > 250) {
            lastSpokenDistRef.current = Infinity; 
        }

    }, [liveLocation, driveMode, routeSegments, isCalculating, selectedVoice, speed]);

    useEffect(() => {
        const mapGroup = layerGroupRef.current;
        if (!mapGroup) return;

        mapGroup.clearLayers();

        if (origin && !driveMode) L.marker(origin.latlng, { icon: greenIcon }).addTo(mapGroup).bindPopup(origin.title);
        if (destination && !driveMode) L.marker(destination.latlng, { icon: redIcon }).addTo(mapGroup).bindPopup(destination.title);
        
        if (liveLocation || (driveMode && origin)) {
            const loc = liveLocation || origin.latlng;
            L.circleMarker(loc, { radius: 18, fillColor: '#8ab4f8', color: 'transparent', fillOpacity: 0.3, pane: 'routePane' }).addTo(mapGroup);
            
            const userIconHtml = `
                <div style="
                    width: 24px; height: 24px; background-color: #4285F4; border: 3px solid white; border-radius: 50%; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.4); position: relative; transform: rotate(${heading}deg); transition: transform 0.5s ease;
                ">
                    <div style="
                        width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; 
                        border-bottom: 10px solid white; position: absolute; top: -8px; left: 3px;
                    "></div>
                </div>
            `;

            const customUserIcon = L.divIcon({ html: userIconHtml, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });

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
            const ageMs = Date.now() - report.timestamp;
            
            if (!report.lat || !report.lng || ageMs > 4 * 60 * 60 * 1000) return;
            
            let emoji = "⚠️";
            if (report.type === "Accident") emoji = "💥";
            else if (report.type === "Construction") emoji = "🚧";
            else if (report.type === "Police") emoji = "🚓";

            const reportIcon = L.divIcon({ html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">${emoji}</div>`, className: '', iconSize: [30, 30] });
            
            const minsAgo = Math.floor(ageMs / 60000);
            const timeString = minsAgo === 0 ? "Just now" : `${minsAgo} min ago`;

            const popupHtml = `
                <div style="font-family: Inter, sans-serif; text-align: center; padding: 4px;">
                    <b style="color: #ea4335; font-size: 15px;">${report.type}</b><br/>
                    <span style="color: #5f6368; font-size: 12px; font-weight: 500;">Reported ${timeString}</span>
                </div>
            `;

            L.marker([report.lat, report.lng], { icon: reportIcon, pane: 'routePane' })
                .addTo(mapGroup)
                .bindPopup(popupHtml);
        });

        let flatPath = [];
        routeSegments.forEach(segment => {
            if (!segment || !Array.isArray(segment.coords)) return;
            const positions = segment.coords.map(c => [
                c.latitude !== undefined ? c.latitude : c[0], 
                c.longitude !== undefined ? c.longitude : c[1]
            ]);
            flatPath.push(...positions);
        });

        if (flatPath.length > 0) {
            if (driveMode) {
                let closestIdx = 0;
                if (liveLocation) {
                    let minDistance = Infinity;
                    flatPath.forEach((pt, idx) => {
                        const dist = getDistanceInMeters(liveLocation[0], liveLocation[1], pt[0], pt[1]);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestIdx = idx;
                        }
                    });
                }

                const traveledPath = closestIdx > 0 ? flatPath.slice(0, closestIdx + 1) : [];
                const remainingPath = flatPath.slice(closestIdx);

                if (traveledPath.length > 1) {
                    L.polyline(traveledPath, { color: '#4a5568', weight: 10, opacity: 0.7, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
                }
                if (remainingPath.length > 1) {
                    L.polyline(remainingPath, { color: '#111827', weight: 12, opacity: 0.8, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
                    L.polyline(remainingPath, { color: ui.accentBlue, weight: 8, opacity: 1.0, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
                }
            } else {
                L.polyline(flatPath, { color: '#111827', weight: 9, opacity: 0.8, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
                L.polyline(flatPath, { color: ui.accentBlue, weight: 5, opacity: 1.0, lineCap: 'round', lineJoin: 'round', pane: 'routePane' }).addTo(mapGroup);
            }
        }

        if (!driveMode && flatPath.length > 0 && mapInstanceRef.current && !isCalculating) {
            mapInstanceRef.current.fitBounds(L.latLngBounds(flatPath), { padding: [50, 50] });
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
            const cleanQuery = query.trim();
            if (cleanQuery.length < 2) {
                if (isOrigin) setOriginSuggestions([]); 
                else setDestSuggestions([]);
                return;
            }

            const apiKey = TOMTOM_API_KEY?.trim();
            if (!apiKey || apiKey === "undefined") {
                console.error("⚠️ TomTom API Key is missing. Check your .env file.");
                return;
            }

            const lat = mapCenter[0] ? mapCenter[0].toFixed(5) : "14.56480";
            const lon = mapCenter[1] ? mapCenter[1].toFixed(5) : "120.99320";

            const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(cleanQuery)}.json?key=${apiKey}&lat=${lat}&lon=${lon}&radius=30000&countrySet=PH&limit=10&typeahead=true&view=Unified`;
            
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    const errorDetails = await res.text();
                    console.error(`🚨 TomTom API 400 Error Details:`, errorDetails);
                    throw new Error(`API Status ${res.status}`);
                }
                
                const data = await res.json();
                if (data.results) {
                    const sorted = data.results.sort((a, b) => (b.poi ? 1 : 0) - (a.poi ? 1 : 0));
                    let results = sorted.map(r => ({
                        lat: r.position.lat, lon: r.position.lon,
                        primary: r.poi ? r.poi.name : (r.address.streetName || r.address.freeformAddress),
                        secondary: r.address.freeformAddress || "Philippines"
                    }));
                    
                    const unique = [];
                    const seen = new Set();
                    results.forEach(item => {
                        const key = `${item.primary.toLowerCase()}-${item.secondary.toLowerCase()}`;
                        if (!seen.has(key)) { seen.add(key); unique.push(item); }
                    });
                    
                    if (isOrigin) setOriginSuggestions(unique.slice(0, 10)); 
                    else setDestSuggestions(unique.slice(0, 10)); 
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

    const fetchRoute = async (isAutoReroute = false, overrideOrigin = null) => {
        const currentOrigin = originRef.current;
        const currentDest = destRef.current;
        const startLat = overrideOrigin ? overrideOrigin[0] : (currentOrigin ? currentOrigin.latlng[0] : null);
        const startLon = overrideOrigin ? overrideOrigin[1] : (currentOrigin ? currentOrigin.latlng[1] : null);

        if (!startLat || !currentDest) {
            if (!isAutoReroute) alert("⚠️ Please set Origin and Destination.");
            return;
        }

        setIsNavigating(true); setIsCalculating(true);

        try {
            const response = await fetch('https://frends-3-backend.onrender.com/api/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin_lat: startLat, origin_lon: startLon,
                    dest_lat: currentDest.latlng[0], dest_lon: currentDest.latlng[1],
                    vehicle_type: vehicleLayer, is_reroute: isAutoReroute
                })
            });
            const data = await response.json();
            
            if (data.status === 'SUCCESS' || data.status === 'success') {
                const startPin = { latitude: startLat, longitude: startLon };
                const endPin = { latitude: currentDest.latlng[0], longitude: currentDest.latlng[1] };

                if (data.segments && data.segments.length > 0 && data.segments[0].coords) {
                    data.segments[0].coords.unshift(startPin);
                    data.segments[data.segments.length - 1].coords.push(endPin);
                    setRouteSegments(data.segments);
                } else if (data.path && data.path.length > 0) {
                    setRouteSegments([{ coords: [startPin, ...data.path, endPin], color: ui.accentBlue }]); 
                }

                setNavStep({ distance: "Calculating m", action: "Head straight", arrow: "↱" });
                
                // FIXED: Enforce a 1-minute minimum to stop "0 min" errors
                setRouteInfo({ 
                    distance: (data.distance / 1000).toFixed(1), 
                    time: Math.max(1, Math.round(data.time / 60)) 
                });
            } else {
                alert(`⚠️ Routing Error: ${data.message || 'Unable to calculate path.'}`);
                clearMap();
            }
        } catch (error) { 
            console.error("API error:", error); 
            alert("🚨 Network Error: Could not connect to the FRENDS 3.0 routing server.");
            clearMap();
        } finally { setIsCalculating(false); }
    };

    const startDriveMode = () => {
        setMenuOpen(false);
        setDriveMode(true); 
        setShowFloodWarning(true);
        
        if (mapInstanceRef.current && (liveLocation || origin)) {
            const startLoc = liveLocation || origin.latlng;
            mapInstanceRef.current.flyTo(startLoc, 19, { animate: true });
        }

        setTimeout(() => {
            let speechText = "";
            if (selectedVoice === "bisaya_free") {
                let bisayaAction = "deretso lang";
                if (navStep.action.toLowerCase().includes("right")) bisayaAction = "liko sa tuo";
                else if (navStep.action.toLowerCase().includes("left")) bisayaAction = "liko sa wala";
                else if (navStep.action.toLowerCase().includes("arrive")) bisayaAction = "naa na ka sa imong padulngan";
                
                const distanceText = navStep.distance.replace('m', 'metros');
                speechText = `Mga ${distanceText} sa unahan, ${bisayaAction}. Amping sa byahe kay basin naay baha sa imong agianan.`;
            } else {
                speechText = `In ${navStep.distance}, ${navStep.action.toLowerCase()}. Local floods may affect your active route.`;
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
            <style>
                {`
                    nav, footer, header, .header, .nav, .navbar, .bottom-nav, 
                    [class*="nav"], [class*="Nav"], [class*="bottom"], 
                    [id*="nav"], [id*="Nav"], [class*="header"], [id*="header"] {
                        display: none !important;
                    }
                    @keyframes fadeInOut {
                        0% { opacity: 0; transform: translate(-50%, -10px); }
                        15% { opacity: 1; transform: translate(-50%, 0); }
                        85% { opacity: 1; transform: translate(-50%, 0); }
                        100% { opacity: 0; transform: translate(-50%, -10px); }
                    }
                    @keyframes slideDown {
                        0% { opacity: 0; transform: translate(-50%, -20px); }
                        100% { opacity: 1; transform: translate(-50%, 0); }
                    }

                    .frends-map-menu-toggle {
                        position: absolute;
                        top: 24px;
                        left: 24px;
                        width: 48px;
                        height: 48px;
                        border: 1px solid rgba(255,255,255,0.06);
                        border-radius: 15px;
                        background: ${ui.inputBg};
                        color: ${ui.textMain};
                        box-shadow: 0 4px 14px rgba(0,0,0,0.30);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 22px;
                        line-height: 1;
                        cursor: pointer;
                        z-index: 7500;
                        transition: transform .18s ease, background .18s ease;
                        -webkit-tap-highlight-color: transparent;
                    }
                    .frends-map-menu-toggle:hover { background: ${ui.border}; transform: scale(1.03); }
                    .frends-map-menu-toggle:active { transform: scale(.97); }

                    .frends-map-menu-overlay {
                        position: absolute;
                        inset: 0;
                        background: rgba(0,0,0,0.44);
                        backdrop-filter: blur(1.5px);
                        -webkit-backdrop-filter: blur(1.5px);
                        z-index: 6800;
                    }

                    .frends-map-menu {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: min(560px, 92vw);
                        height: 100%;
                        box-sizing: border-box;
                        background: ${ui.panelBg};
                        color: ${ui.textMain};
                        z-index: 7000;
                        transform: translateX(-105%);
                        transition: transform .30s cubic-bezier(.22,1,.36,1);
                        box-shadow: 10px 0 34px rgba(0,0,0,0.42);
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        padding-top: env(safe-area-inset-top);
                    }
                    .frends-map-menu.open { transform: translateX(0); }

                    .frends-map-menu-header {
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 18px;
                        padding: 34px 38px 24px;
                    }
                    .frends-map-menu-brand {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        min-width: 0;
                    }
                    .frends-map-menu-kicker {
                        margin: 0 0 8px;
                        font-size: 16px;
                        line-height: 1;
                        font-weight: 700;
                        letter-spacing: 1.1px;
                        color: ${ui.textMuted};
                    }
                    .frends-map-menu-title {
                        display: block;
                        min-width: 0;
                    }
                    .frends-map-menu-title strong {
                        display: block;
                        font-size: 31px;
                        line-height: 1.05;
                        letter-spacing: -.5px;
                        font-weight: 700;
                        color: ${ui.textMain};
                    }
                    .frends-map-menu-title span { display: none; }

                    .frends-map-menu-close {
                        width: 56px;
                        height: 56px;
                        flex: 0 0 56px;
                        border: 0;
                        border-radius: 16px;
                        background: ${ui.inputBg};
                        color: ${ui.textMain};
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        transition: background .18s ease, transform .18s ease;
                    }
                    .frends-map-close-x,
                    .frends-map-close-x::after {
                        position: absolute;
                        width: 27px;
                        height: 2px;
                        background: ${ui.textMain};
                        border-radius: 2px;
                        content: '';
                        transform: rotate(45deg);
                    }
                    .frends-map-close-x::after {
                        transform: rotate(90deg);
                        left: 0;
                        top: 0;
                    }
                    .frends-map-menu-close:hover { background: ${ui.border}; }
                    .frends-map-menu-close:active { transform: scale(.96); }

                    .frends-map-menu-items {
                        flex: 1;
                        overflow-y: auto;
                        padding: 4px 26px 24px;
                        scrollbar-width: thin;
                    }
                    .frends-map-menu-section {
                        padding: 22px 12px 10px;
                        font-size: 16px;
                        line-height: 1;
                        font-weight: 700;
                        color: ${ui.textMuted};
                        letter-spacing: 1.15px;
                        text-transform: uppercase;
                    }
                    .frends-map-menu-section:first-child { padding-top: 10px; }

                    .frends-map-menu-item {
                        width: 100%;
                        min-height: 70px;
                        padding: 10px 12px;
                        margin: 2px 0;
                        border: 0;
                        border-radius: 14px;
                        background: transparent;
                        color: ${ui.textMain};
                        display: flex;
                        align-items: center;
                        gap: 18px;
                        text-align: left;
                        font-size: 20px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background .18s ease, transform .18s ease;
                    }
                    .frends-map-menu-item:hover { background: ${ui.inputBg}; }
                    .frends-map-menu-item:active { transform: scale(.992); }
                    .frends-map-menu-item.active { background: transparent; color: ${ui.textMain}; }

                    .frends-map-menu-icon {
                        width: 44px;
                        height: 44px;
                        flex: 0 0 44px;
                        border-radius: 13px;
                        background: ${ui.inputBg};
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 21px;
                        font-weight: 600;
                        color: ${ui.textMain};
                        line-height: 1;
                    }
                    .frends-map-menu-item.active .frends-map-menu-icon { background: ${ui.inputBg}; }
                    .frends-map-menu-icon.traffic { font-size: 22px; }
                    .frends-map-menu-icon.news { font-size: 19px; }

                    .frends-map-menu-footer {
                        border-top: 1px solid ${ui.border};
                        padding: 18px 38px calc(18px + env(safe-area-inset-bottom));
                    }
                    .frends-map-menu-status {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        color: ${ui.textMuted};
                        font-size: 15px;
                    }
                    .frends-map-menu-status-dot {
                        width: 12px;
                        height: 12px;
                        flex: 0 0 12px;
                        border-radius: 50%;
                        background: ${ui.accentGreen};
                        box-shadow: 0 0 0 4px rgba(129,201,149,.13);
                    }

                    @media (max-width: 768px) {
                        .frends-map-menu-toggle {
                            top: max(12px, env(safe-area-inset-top));
                            left: 12px;
                            width: 44px;
                            height: 44px;
                            border-radius: 13px;
                            font-size: 20px;
                        }
                        .frends-map-menu { width: min(390px, 92vw); }
                        .frends-map-menu-header { padding: 24px 22px 18px; }
                        .frends-map-menu-kicker { font-size: 13px; }
                        .frends-map-menu-title strong { font-size: 27px; }
                        .frends-map-menu-close { width: 48px; height: 48px; flex-basis: 48px; border-radius: 14px; }
                        .frends-map-close-x, .frends-map-close-x::after { width: 24px; }
                        .frends-map-menu-items { padding: 4px 14px 18px; }
                        .frends-map-menu-section { padding: 20px 10px 8px; font-size: 13px; }
                        .frends-map-menu-item { min-height: 60px; padding: 8px 10px; gap: 14px; font-size: 17px; }
                        .frends-map-menu-icon { width: 40px; height: 40px; flex-basis: 40px; border-radius: 12px; }
                        .frends-map-menu-footer { padding: 14px 22px calc(14px + env(safe-area-inset-bottom)); }
                        .frends-map-menu-status { font-size: 13px; }
                    }
                `}
            </style>

            <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />

            {!driveMode && (
               <aside
                  aria-label="FRENDS Navigation"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 'calc(100% - 48px)',
                    maxWidth: '450px',
                    backgroundColor: ui.panelBg,
                    color: ui.textMain,
                    zIndex: 7000,
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    transform: menuOpen ? 'translateX(0)' : 'translateX(-105%)',
                    transition: 'transform 0.3s cubic-bezier(.22,1,.36,1)',
                    boxShadow: '10px 0 34px rgba(0,0,0,0.42)',
                    overflow: 'hidden',
                    paddingTop: 'env(safe-area-inset-top)'
                }}
                >
                    <div style={{ padding: isMobile ? '24px 24px 18px' : '25px 32px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${ui.border}`, flexShrink: 0, boxSizing: 'border-box' }}>
                        <div>
                            <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 700, letterSpacing: '1.4px', color: theme === 'dark' ? '#9AA0A6' : '#5F6368', textTransform: 'uppercase', marginBottom: '3px' }}>FRENDS</div>
                            <div style={{ fontSize: isMobile ? '27px' : '30px', fontWeight: 700, lineHeight: 1.1, color: ui.textMain }}>Navigation</div>
                        </div>
                        <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" style={{ width: isMobile ? '48px' : '52px', height: isMobile ? '48px' : '52px', minWidth: isMobile ? '48px' : '52px', minHeight: isMobile ? '48px' : '52px', border: `1px solid ${ui.border}`, borderRadius: '14px', backgroundColor: ui.inputBg, color: ui.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '25px', fontWeight: 400, cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3c4043' : '#e8eaed'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ui.inputBg; }}>×</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '4px 20px 18px' : '4px 24px 22px', boxSizing: 'border-box' }}>
                        <div style={{ padding: isMobile ? '17px 8px 9px' : '18px 10px 9px', fontSize: isMobile ? '12px' : '13px', fontWeight: 700, letterSpacing: '1.1px', color: ui.textMuted, textTransform: 'uppercase' }}>MAIN</div>
                        <button type="button" onClick={() => { setMenuOpen(false); }} style={{ width: '100%', minHeight: isMobile ? '52px' : '56px', padding: '7px 10px', border: 'none', borderRadius: '13px', backgroundColor: 'transparent', color: ui.textMain, display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '14px', fontSize: isMobile ? '16px' : '17px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.18s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme === 'dark' ? '#303134' : '#f1f3f4'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                            <span style={{ width: isMobile ? '36px' : '38px', height: isMobile ? '36px' : '38px', minWidth: isMobile ? '36px' : '38px', minHeight: isMobile ? '36px' : '38px', borderRadius: '11px', backgroundColor: ui.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '18px' : '19px', lineHeight: 1 }}>◉</span>
                            <span>Map</span>
                        </button>

                        <div style={{ padding: isMobile ? '19px 8px 9px' : '20px 10px 9px', fontSize: isMobile ? '12px' : '13px', fontWeight: 700, letterSpacing: '1.1px', color: ui.textMuted, textTransform: 'uppercase' }}>MONITORING</div>
                        {[ { label: 'Flood', icon: '≋', action: 'nodes' }, { label: 'Traffic', icon: '🚦', action: 'traffic' }, { label: 'News', icon: '▣', action: 'dashboard' } ].map((item) => (
                            <button key={item.label} type="button" onClick={() => { setMenuOpen(false); if (onNavigate) { onNavigate(item.action); } }} style={{ width: '100%', minHeight: isMobile ? '52px' : '56px', padding: '7px 10px', border: 'none', borderRadius: '13px', backgroundColor: 'transparent', color: ui.textMain, display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '14px', fontSize: isMobile ? '16px' : '17px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.18s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme === 'dark' ? '#303134' : '#f1f3f4'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                <span style={{ width: isMobile ? '36px' : '38px', height: isMobile ? '36px' : '38px', minWidth: isMobile ? '36px' : '38px', minHeight: isMobile ? '36px' : '38px', borderRadius: '11px', backgroundColor: ui.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: item.label === 'Traffic' ? '18px' : '19px', lineHeight: 1 }}>{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        ))}

                        <div style={{ padding: isMobile ? '19px 8px 9px' : '20px 10px 9px', fontSize: isMobile ? '12px' : '13px', fontWeight: 700, letterSpacing: '1.1px', color: ui.textMuted, textTransform: 'uppercase' }}>INFORMATION</div>
                        <button type="button" onClick={() => { setMenuOpen(false); if (onNavigate) { onNavigate('about'); } }} style={{ width: '100%', minHeight: isMobile ? '52px' : '56px', padding: '7px 10px', border: 'none', borderRadius: '13px', backgroundColor: 'transparent', color: ui.textMain, display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '14px', fontSize: isMobile ? '16px' : '17px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.18s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme === 'dark' ? '#303134' : '#f1f3f4'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                            <span style={{ width: isMobile ? '36px' : '38px', height: isMobile ? '36px' : '38px', minWidth: isMobile ? '36px' : '38px', minHeight: isMobile ? '36px' : '38px', borderRadius: '11px', backgroundColor: ui.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px', lineHeight: 1 }}>i</span>
                            <span>About FRENDS</span>
                        </button>
                        <button type="button" onClick={() => { setMenuOpen(false); if (onLogout) { onLogout(); } }} style={{ width: '100%', minHeight: isMobile ? '52px' : '56px', padding: '7px 10px', border: 'none', borderRadius: '13px', backgroundColor: 'transparent', color: ui.textMain, display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '14px', fontSize: isMobile ? '16px' : '17px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.18s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme === 'dark' ? '#303134' : '#f1f3f4'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                            <span style={{ width: isMobile ? '36px' : '38px', height: isMobile ? '36px' : '38px', minWidth: isMobile ? '36px' : '38px', minHeight: isMobile ? '36px' : '38px', borderRadius: '11px', backgroundColor: ui.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px', lineHeight: 1 }}>↪</span>
                            <span>Logout</span>
                        </button>
                    </div>

                    <div style={{ borderTop: `1px solid ${ui.border}`, padding: isMobile ? '12px 24px' : '14px 32px', display: 'flex', alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ui.accentGreen, marginRight: '9px', boxShadow: `0 0 8px ${ui.accentGreen}` }} />
                        <span style={{ fontSize: isMobile ? '12px' : '13px', color: ui.textMuted }}>FRENDS map is active</span>
                    </div>
                </aside>
            )}

            {/* CURRENT LOCATION REMINDER TOAST BANNER */}
            {showLocationBanner && currentLocationName && (
                <div style={{
                    position: 'absolute',
                    bottom: isMobile ? '90px' : '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: ui.panelBg,
                    color: ui.textMain,
                    padding: '12px 20px',
                    borderRadius: '28px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 4000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: `1px solid ${ui.border}`,
                    animation: 'fadeInOut 5s ease'
                }}>
                    <span style={{ fontSize: '18px' }}>📍</span>
                    <span>You are currently in <b>{currentLocationName}</b></span>
                </div>
            )}

            {/* WAZE-STYLE UNUSUAL TRAFFIC PROMPT BANNER */}
            {showTrafficPrompt && (
                <div style={{
                    position: 'absolute',
                    top: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: isMobile ? 'calc(100% - 32px)' : '380px',
                    backgroundColor: ui.panelBg,
                    color: ui.textMain,
                    zIndex: 5000,
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    border: `1px solid ${ui.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'slideDown 0.3s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>🐢</span>
                            <span style={{ fontSize: '15px', fontWeight: '600' }}>Heavy traffic ahead</span>
                        </div>
                        <button onClick={() => setShowTrafficPrompt(false)} style={{ background: 'none', border: 'none', color: ui.textMuted, fontSize: '18px', cursor: 'pointer' }}>✕</button>
                    </div>
                    <span style={{ fontSize: '13px', color: ui.textMuted }}>Traffic is moving slow. Is there a hazard causing this?</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <button onClick={() => { submitReport('Accident'); setShowTrafficPrompt(false); }} style={{ backgroundColor: ui.inputBg, border: 'none', borderRadius: '10px', padding: '10px 4px', color: ui.textMain, fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>💥 Accident</button>
                        <button onClick={() => { submitReport('Construction'); setShowTrafficPrompt(false); }} style={{ backgroundColor: ui.inputBg, border: 'none', borderRadius: '10px', padding: '10px 4px', color: ui.textMain, fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>🚧 Roadwork</button>
                        <button onClick={() => { submitReport('Hazard'); setShowTrafficPrompt(false); }} style={{ backgroundColor: ui.inputBg, border: 'none', borderRadius: '10px', padding: '10px 4px', color: ui.textMain, fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>⚠️ Hazard</button>
                    </div>
                    <button onClick={() => setShowTrafficPrompt(false)} style={{ backgroundColor: 'transparent', border: 'none', color: ui.textMuted, fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', marginTop: '2px' }}>No, just traffic</button>
                </div>
            )}

            <div style={{
                position: 'absolute', top: isMobile ? '0px' : '12px', left: isMobile ? 0 : '24px', 
                width: isMobile ? '100%' : '380px', backgroundColor: ui.panelBg, zIndex: 1000,
                display: 'flex', flexDirection: 'column', boxShadow: isMobile ? 'none' : '0 4px 12px rgba(0,0,0,0.4)',
                borderRadius: isMobile ? 0 : '16px', transform: driveMode ? (isMobile ? 'translateY(-200%)' : 'translateX(-150%)') : 'translate(0, 0)',
                transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), max-height 0.3s ease',
                paddingBottom: activeInput ? 0 : '4px', maxHeight: isMobile ? (activeInput ? 'calc(100vh - 24px)' : 'auto') : 'none'
            }}>
                <div style={{ padding: isMobile ? '10px 12px' : '12px 14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <button
                        type="button"
                        onClick={() => setMenuOpen(prev => !prev)}
                        aria-label={menuOpen ? "Close FRENDS menu" : "Open FRENDS menu"}
                        aria-expanded={menuOpen}
                        style={{ width: isMobile ? '38px' : '40px', height: isMobile ? '38px' : '40px', flexShrink: 0, border: 'none', borderRadius: '50%', backgroundColor: ui.inputBg, color: ui.textMain, fontSize: isMobile ? '20px' : '21px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', transition: 'all 0.2s ease' }}
                    >
                        {menuOpen ? '×' : '☰'}
                    </button>

                    {/* TRAFFIC TOGGLE */}
                    <button
                        type="button"
                        onClick={() => setShowTraffic(prev => !prev)}
                        aria-label={showTraffic ? "Hide traffic" : "Show traffic"}
                        title={showTraffic ? "Hide Traffic" : "Show Traffic"}
                        style={{ width: isMobile ? '38px' : '40px', height: isMobile ? '38px' : '40px', flexShrink: 0, border: `2px solid ${showTraffic ? ui.accentGreen : ui.border}`, borderRadius: '50%', backgroundColor: ui.inputBg, color: ui.textMain, fontSize: isMobile ? '18px' : '19px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', opacity: showTraffic ? 1 : 0.75, transition: 'all 0.2s ease' }}
                    >
                        🚦
                    </button>

                    <button 
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setActiveInput(null);
                            if (routeInfo) {
                                setRouteSegments([]);
                                setRouteInfo(null);
                            } else {
                                clearMap();
                            }
                        }} 
                        style={{ width: '38px', height: '38px', flexShrink: 0, background: 'transparent', border: 'none', color: ui.textMain, fontSize: isMobile ? '22px' : '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                    >
                        ←
                    </button>

                    <div style={{ width: isMobile ? '20px' : '24px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', border: `2px solid ${ui.textMuted}`, backgroundColor: 'transparent' }} />
                        <div style={{ height: isMobile ? '22px' : '27px', width: '2px', borderLeft: `2px dotted ${ui.textMuted}`, opacity: 0.65 }} />
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ui.accentRed, boxShadow: `0 0 0 3px ${ui.accentRed}22` }} />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 }}>
                        <input type="text" value={originQuery} onChange={(e) => handleSearchInput(e.target.value, true)} onFocus={() => setActiveInput('origin')} onBlur={() => setTimeout(() => { if (activeInput === 'origin') setActiveInput(null); }, 250)} placeholder="Your location" style={{ width: '100%', height: isMobile ? '40px' : '42px', boxSizing: 'border-box', backgroundColor: ui.inputBg, color: ui.textMain, border: activeInput === 'origin' ? `1px solid ${ui.accentBlue}` : '1px solid transparent', padding: '0 13px', borderRadius: '10px', fontSize: isMobile ? '14px' : '15px', fontWeight: '500', outline: 'none', transition: 'border 0.2s ease' }} />
                        <input type="text" value={destQuery} onChange={(e) => handleSearchInput(e.target.value, false)} onFocus={() => setActiveInput('destination')} onBlur={() => setTimeout(() => { if (activeInput === 'destination') setActiveInput(null); }, 250)} placeholder="Where to?" style={{ width: '100%', height: isMobile ? '40px' : '42px', boxSizing: 'border-box', backgroundColor: ui.inputBg, color: ui.textMain, border: activeInput === 'destination' ? `1px solid ${ui.accentBlue}` : '1px solid transparent', padding: '0 13px', borderRadius: '10px', fontSize: isMobile ? '14px' : '15px', fontWeight: '500', outline: 'none', transition: 'border 0.2s ease' }} />
                    </div>

                    <button onClick={swapLocations} style={{ width: '34px', height: '34px', flexShrink: 0, backgroundColor: ui.inputBg, border: 'none', color: ui.textMain, fontSize: '18px', cursor: 'pointer', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s ease' }}>
                        ⇅
                    </button>
                </div>

                {activeInput && (
                    <div style={{ backgroundColor: ui.bg, overflowY: 'auto', maxHeight: isMobile ? 'calc(100vh - 150px)' : '420px', borderTop: `1px solid ${ui.border}` }}>
                        {(activeInput === 'origin' ? originSuggestions : destSuggestions).length > 0 ? (
                            (activeInput === 'origin' ? originSuggestions : destSuggestions).map((item, idx) => (
                                <div key={idx} onMouseDown={() => selectLocationItem(item, activeInput === 'origin')} style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '12px 14px' : '14px 20px', borderBottom: `1px solid ${ui.border}`, cursor: 'pointer', minHeight: isMobile ? '54px' : '58px' }}>
                                    <div style={{ width: '36px', height: '36px', flexShrink: 0, backgroundColor: ui.inputBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                                        <span style={{ fontSize: '16px' }}>📍</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: ui.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.primary}</span>
                                        <span style={{ fontSize: '12px', color: ui.textMuted, marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.secondary}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '24px 16px', textAlign: 'center', color: ui.textMuted, fontSize: '13px' }}>Search for a place or destination</div>
                        )}
                    </div>
                )}

                {!activeInput && !routeInfo && (
                    <>
                        <div style={{ padding: isMobile ? '4px 12px 10px' : '8px 16px 14px', display: 'flex', gap: '7px', overflowX: 'auto', scrollbarWidth: 'none', borderTop: `1px solid ${ui.border}` }}>
                            {[ { type: 'LOW', icon: '🚗', label: 'Sedan / Hatch' }, { type: 'MID', icon: '🚙', label: 'SUV / Pick-up' }, { type: 'HIGH', icon: '🚌', label: 'Truck / Bus' } ].map(vehicle => (
                                <button key={vehicle.type} onClick={() => setVehicleLayer(vehicle.type)} style={{ flexShrink: 0, backgroundColor: vehicleLayer === vehicle.type ? `${ui.accentBlue}20` : 'transparent', color: vehicleLayer === vehicle.type ? ui.accentBlue : ui.textMain, border: `1px solid ${vehicleLayer === vehicle.type ? ui.accentBlue : ui.border}`, borderRadius: '18px', padding: isMobile ? '7px 11px' : '8px 14px', fontSize: isMobile ? '12px' : '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                    <span style={{ fontSize: isMobile ? '13px' : '15px' }}>{vehicle.icon}</span>{vehicle.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: isMobile ? '8px 12px 12px' : '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ fontSize: isMobile ? '12px' : '14px', color: ui.textMuted, fontWeight: '500' }}>Navigation voice</span>
                                <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} style={{ backgroundColor: ui.inputBg, color: ui.textMain, border: 'none', padding: isMobile ? '7px 10px' : '8px 12px', borderRadius: '14px', fontSize: isMobile ? '11px' : '13px', outline: 'none', maxWidth: isMobile ? '145px' : '160px', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                                    <option value="bisaya_free">🇵🇭 Bisaya (Copilot)</option>
                                    {voices.map(voice => (
                                        <option key={voice.name} value={voice.name}>{voice.name.replace(/Microsoft |Google /g, '')}</option>
                                    ))}
                                </select>
                            </div>

                            <button onClick={() => fetchRoute(false)} disabled={isCalculating || !origin || !destination} style={{ width: '100%', height: isMobile ? '42px' : '46px', backgroundColor: (!origin || !destination) ? ui.inputBg : ui.accentBlue, color: (!origin || !destination) ? ui.textMuted : ui.btnText, border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '15px', fontWeight: '700', cursor: (!origin || !destination) ? 'default' : 'pointer', boxShadow: origin && destination ? '0 4px 12px rgba(0,0,0,0.18)' : 'none', transition: 'all 0.2s ease' }}>
                                {isCalculating ? 'Calculating route...' : 'Directions'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* RESPONSIVE BOTTOM SHEET - ROUTE INFO */}
            {routeInfo && !driveMode && !activeInput && (
                <div style={{
                    position: 'absolute', bottom: isMobile ? 0 : '24px', left: isMobile ? 0 : '24px', right: isMobile ? 0 : 'auto', 
                    width: isMobile ? '100%' : '380px', backgroundColor: ui.panelBg, zIndex: 3000, boxSizing: 'border-box', 
                    borderRadius: isMobile ? '24px 24px 0 0' : '24px', padding: '20px 20px',
                    paddingBottom: isMobile ? 'calc(max(20px, env(safe-area-inset-bottom)) + 20px)' : '20px',
                    boxShadow: '0 -4px 16px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                    {isMobile && <div style={{ width: '40px', height: '4px', backgroundColor: ui.border, borderRadius: '2px', alignSelf: 'center', marginBottom: '-8px' }} />}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '32px', fontWeight: 'bold', color: ui.accentBlue }}>{routeInfo.time} min</span>
                            <span style={{ fontSize: '18px', color: ui.textMuted }}>({routeInfo.distance} km)</span>
                        </div>
                        <span style={{ color: ui.textMuted, fontSize: '14px', marginTop: '2px' }}>
                            Arrive around <b style={{color: ui.textMain}}>{new Date(Date.now() + routeInfo.time * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b> • Adjusted for live conditions
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button style={{ flex: 1, backgroundColor: ui.inputBg, color: ui.textMain, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '15px', fontWeight: 'bold' }}>Steps</button>
                        <button onClick={startDriveMode} style={{ flex: 2, backgroundColor: ui.accentBlue, color: ui.btnText, border: 'none', borderRadius: '24px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Start</button>
                    </div>
                </div>
            )}

            {/* INCIDENT REPORT MODAL */}
            {showReportModal && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
                    <div style={{ backgroundColor: ui.bg, padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: ui.textMain, fontSize: '18px', fontWeight: '600' }}>Report an Incident</h3>
                            <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: ui.textMuted }}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[ { type: 'Accident', icon: '💥' }, { type: 'Construction', icon: '🚧' }, { type: 'Hazard', icon: '⚠️' }, { type: 'Police', icon: '🚓' } ].map(hazard => (
                                <button key={hazard.type} onClick={() => submitReport(hazard.type)} style={{ padding: '16px', backgroundColor: ui.inputBg, border: 'none', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', color: ui.textMain }}>
                                    <span style={{ fontSize: '32px' }}>{hazard.icon}</span>
                                    <span style={{ fontWeight: '500', fontSize: '14px' }}>{hazard.type}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* RESPONSIVE DRIVE MODE UI OVERLAYS */}
            {driveMode && (
                <>
                    <div style={{ position: 'absolute', top: '16px', left: isMobile ? '16px' : '50%', right: isMobile ? '16px' : 'auto', transform: isMobile ? 'none' : 'translateX(-50%)', width: isMobile ? 'auto' : '400px', boxSizing: 'border-box', zIndex: 3000, pointerEvents: 'none' }}>
                        <div style={{ backgroundColor: ui.accentBlue, borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', color: theme === 'dark' ? '#131314' : 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', pointerEvents: 'auto' }}>
                            <span style={{ fontSize: '42px', fontWeight: 'bold', lineHeight: 1 }}>{navStep.arrow}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '18px', fontWeight: '500', opacity: 0.9 }}>{navStep.distance}</span>
                                <span style={{ fontSize: '24px', fontWeight: '600' }}>{navStep.action}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: '24px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 3000, pointerEvents: 'none' }}>
                        <div style={{ backgroundColor: ui.panelBg, borderRadius: '50%', width: '64px', height: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', color: ui.textMain, border: `3px solid ${ui.border}`, pointerEvents: 'auto' }}>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '1' }}>{speed}</span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: ui.textMuted }}>km/h</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end', pointerEvents: 'auto' }}>
                            <div onClick={() => setShowReportModal(true)} style={{ backgroundColor: '#f59e0b', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', cursor: 'pointer' }}>
                                <span style={{ fontSize: '26px' }}>⚠️</span>
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
                    </div>
                </>
            )}
        </div>
    );
}