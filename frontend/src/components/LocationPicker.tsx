import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Loader2 } from 'lucide-react';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

// Component to handle map view updates
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const LocationMarker = ({ position, onLocationSelect }: { position: L.LatLng | null, onLocationSelect: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return position === null ? null : (
        <Marker position={position} />
    );
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ initialLat, initialLng, onLocationSelect }) => {
    // Default center (Italy) or initial position
    const [position, setPosition] = useState<L.LatLng | null>(initialLat && initialLng ? L.latLng(initialLat, initialLng) : null);
    const [mapCenter, setMapCenter] = useState<[number, number]>(initialLat && initialLng ? [initialLat, initialLng] : [41.9028, 12.4964]);
    const [zoom, setZoom] = useState(initialLat && initialLng ? 15 : 6);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (initialLat && initialLng) {
            const newPos = L.latLng(initialLat, initialLng);
            setPosition(newPos);
            setMapCenter([initialLat, initialLng]);
            setZoom(15);
        }
    }, [initialLat, initialLng]);

    const handleLocationSelect = (lat: number, lng: number) => {
        const newPos = L.latLng(lat, lng);
        setPosition(newPos);
        // Don't necessarily move map center on click, just marker
        onLocationSelect(lat, lng);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);

                setMapCenter([newLat, newLng]);
                setZoom(15);
                handleLocationSelect(newLat, newLng);
            } else {
                alert('Luogo non trovato. Prova con un indirizzo più specifico.');
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Errore durante la ricerca.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleGeolocate = () => {
        if (!navigator.geolocation) {
            alert("La geolocalizzazione non è supportata dal tuo browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setMapCenter([latitude, longitude]);
                setZoom(16);
                handleLocationSelect(latitude, longitude);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Impossibile ottenere la tua posizione. Assicurati di aver dato il consenso.");
            }
        );
    };

    return (
        <div className="w-full space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        placeholder="Cerca via o città..."
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none text-sm shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        type="button"
                        onClick={() => handleSearch()}
                        disabled={isSearching}
                        className="bg-nature-600 text-white px-4 rounded-xl hover:bg-nature-700 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center"
                    >
                        {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleGeolocate}
                    className="flex items-center justify-center gap-2 bg-white text-nature-700 border-2 border-nature-200 px-4 py-3 rounded-xl font-bold text-sm hover:bg-nature-50 hover:border-nature-300 transition-all shadow-sm"
                >
                    <MapPin size={18} /> <span className="sm:hidden lg:inline">Posizione Attuale</span>
                </button>
            </div>

            <div className="h-[350px] w-full rounded-2xl overflow-hidden border-2 border-nature-100 shadow-inner z-0 relative group">
                <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater center={mapCenter} zoom={zoom} />
                    <LocationMarker position={position} onLocationSelect={handleLocationSelect} />
                </MapContainer>

                <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-lg text-[10px] font-black text-nature-900 uppercase tracking-widest pointer-events-none flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-nature-500 animate-pulse"></div>
                    Clicca per fissare il punto
                </div>

                {!position && (
                    <div className="absolute inset-0 bg-nature-900/5 backdrop-blur-[2px] z-[400] pointer-events-none flex items-center justify-center">
                        <div className="bg-white px-6 py-4 rounded-3xl shadow-2xl border border-nature-100 flex flex-col items-center gap-3 animate-bounce">
                            <MapPin size={32} className="text-nature-600" />
                            <p className="font-bold text-gray-900 text-sm">Seleziona il tuo civico sulla mappa</p>
                        </div>
                    </div>
                )}
            </div>

            {position && (
                <div className="p-4 bg-nature-50 rounded-2xl border border-nature-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-nature-600 text-white rounded-lg">
                            <MapPin size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-nature-600 uppercase tracking-widest leading-none mb-1">Punto Consegna Fissato</p>
                            <p className="text-xs font-bold text-gray-900">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
