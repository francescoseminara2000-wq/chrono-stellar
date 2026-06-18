import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    Map as MapIcon, 
    Truck, 
    Clock, 
    Scale, 
    Navigation, 
    ChevronRight, 
    Phone, 
    MessageCircle, 
    Globe, 
    Moon, 
    Sun, 
    ShieldAlert, 
    Calendar as CalendarIcon, 
    Trash2, 
    Plus, 
    X,
    User
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { Link } from 'react-router-dom';
import { SearchableSelect } from '../../components/admin/SearchableSelect';

interface DeliveryOrder {
    id: number;
    customerName: string;
    customerPhone: string | null;
    shippingAddress: string;
    status: string;
    latitude: number;
    longitude: number;
    finalTotal: number | null;
    estimatedTotal: number;
    createdAt: string;
}

// Map Centering Component
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        const size = map.getSize();
        if (size.x > 0 && size.y > 0) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
};

// Force Leaflet to recalculate container size when it mounts or changes
const MapResizeListener = () => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 150);
        
        const handleResize = () => {
            map.invalidateSize();
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [map]);
    return null;
};

// Adaptive Zoom Component
const AdaptiveZoom = ({ deliveries, storeLocation }: { deliveries: DeliveryOrder[], storeLocation: { lat: number, lng: number } | null }) => {
    const map = useMap();

    useEffect(() => {
        if (deliveries.length === 0 && !storeLocation) return;

        const bounds = L.latLngBounds([]);

        if (storeLocation) {
            bounds.extend([storeLocation.lat, storeLocation.lng]);
        }

        deliveries.forEach(d => {
            if (d.latitude && d.longitude) {
                bounds.extend([d.latitude, d.longitude]);
            }
        });

        const fit = () => {
            if (bounds.isValid()) {
                const size = map.getSize();
                if (size.x > 0 && size.y > 0) {
                    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
                }
            }
        };

        // Run immediately
        fit();

        // Also run on map resize
        map.on('resize', fit);
        return () => {
            map.off('resize', fit);
        };
    }, [deliveries, storeLocation, map]);

    return null;
};

const MAP_LAYERS = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: 'Standard',
        icon: <MapIcon size={14} />
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community',
        name: 'Satellite',
        icon: <Globe size={14} />
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        name: 'Dark',
        icon: <Moon size={14} />
    },
    light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        name: 'Light',
        icon: <Sun size={14} />
    }
};

export const DeliveryMap = () => {
    const { token } = useAuthStore();
    const { addToast } = useToastStore();
    
    // Tabs state
    const [activeTab, setActiveTab] = useState<'regia' | 'mappa' | 'blocchi'>('regia');

    // Existing Map state
    const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
    const [mapType, setMapType] = useState<keyof typeof MAP_LAYERS>('street');
    const [storeLocation, setStoreLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const API_URL = import.meta.env.VITE_API_URL || '';

    // Center of map (Default to a general area, will update based on data)
    const [mapCenter, setMapCenter] = useState<[number, number]>([45.8485, 9.3568]); // Valmadrera default
    const [zoom, setZoom] = useState(13);

    // Logistics Dashboard State
    const [dashboardData, setDashboardData] = useState<any[]>([]);
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);

    // Logistics Closures State
    const [closures, setClosures] = useState<any[]>([]);
    const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
    const [isClosuresLoading, setIsClosuresLoading] = useState(true);

    // Closure Form state
    const [closureDate, setClosureDate] = useState('');
    const [closureType, setClosureType] = useState<'GLOBAL' | 'ZONE'>('GLOBAL');
    const [selectedZoneId, setSelectedZoneId] = useState('');

    // Proactive Warning Modal State
    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [conflictInfo, setConflictInfo] = useState<{ count: number; date: string; type: string; orders: any[] } | null>(null);

    // Suppress parent layout scroll for this page and manage exact height conditionally per tab
    useEffect(() => {
        const parent = document.querySelector('main');
        if (parent) {
            const originalOverflow = parent.style.overflow;
            const originalHeight = parent.style.height;
            const originalMaxHeight = parent.style.maxHeight;
            const originalPadding = parent.style.padding;
            const originalPaddingBottom = parent.style.paddingBottom;

            const handleResize = () => {
                const isMobile = window.innerWidth < 1024;
                if (activeTab === 'mappa') {
                    parent.style.overflow = 'hidden';
                    if (isMobile) {
                        parent.style.height = 'calc(100vh - 72px)';
                        parent.style.maxHeight = 'calc(100vh - 72px)';
                        parent.style.padding = '0px';
                        parent.style.paddingBottom = '64px'; // Space for mobile docked nav
                    } else {
                        parent.style.height = '100vh';
                        parent.style.maxHeight = '100vh';
                        parent.style.padding = ''; // Reset to default tailwind classes
                        parent.style.paddingBottom = '2rem'; // Match padding of lg:p-8
                    }
                } else {
                    // Standard scrolling page
                    parent.style.overflow = originalOverflow;
                    parent.style.height = originalHeight;
                    parent.style.maxHeight = originalMaxHeight;
                    parent.style.padding = originalPadding;
                    parent.style.paddingBottom = originalPaddingBottom;
                }
            };

            handleResize();
            window.addEventListener('resize', handleResize);

            return () => {
                parent.style.overflow = originalOverflow;
                parent.style.height = originalHeight;
                parent.style.maxHeight = originalMaxHeight;
                parent.style.padding = originalPadding;
                parent.style.paddingBottom = originalPaddingBottom;
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [activeTab]);

    // Resize trigger on tab switch to fix leaflet container rendering
    useEffect(() => {
        if (activeTab === 'mappa' && !isLoading) {
            const timer = setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [activeTab, isLoading]);

    // Initial Fetch
    useEffect(() => {
        fetchStoreSettings();
        fetchDeliveries();
        fetchDashboard();
        fetchClosures();
        fetchDeliveryZones();
    }, []);

    const fetchStoreSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/settings`);
            if (res.ok) {
                const data = await res.json();
                if (data.latitude && data.longitude) {
                    setStoreLocation({ lat: data.latitude, lng: data.longitude });
                }
            }
        } catch (err) {
            console.error('Error fetching store settings:', err);
        }
    };

    const fetchDeliveries = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_URL}/api/admin/deliveries/map`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Errore nel caricamento dei dati logistici');
            const data = await res.json();
            setDeliveries(data);
        } catch (err) {
            console.error(err);
            addToast('Impossibile caricare la mappa delle consegne.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDashboard = async () => {
        try {
            setIsDashboardLoading(true);
            const res = await fetch(`${API_URL}/api/admin/logistics/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDashboardData(data);
            }
        } catch (err) {
            console.error(err);
            addToast('Impossibile caricare il piano di regia logistica.', 'error');
        } finally {
            setIsDashboardLoading(false);
        }
    };

    const fetchClosures = async () => {
        try {
            setIsClosuresLoading(true);
            const res = await fetch(`${API_URL}/api/admin/logistics/closures`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClosures(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsClosuresLoading(false);
        }
    };

    const fetchDeliveryZones = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/delivery-zones`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDeliveryZones(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddClosure = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!closureDate) {
            addToast('Seleziona una data per il blocco.', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/logistics/closures`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: closureDate,
                    type: closureType,
                    deliveryZoneId: closureType === 'ZONE' ? Number(selectedZoneId) : null
                })
            });

            const data = await res.json();

            if (res.ok) {
                addToast('Blocco logistico inserito con successo!', 'success');
                setClosureDate('');
                setSelectedZoneId('');
                fetchClosures();
                fetchDashboard(); // update dashboard since scheduling dates might now conflict
                
                // Show modal if orders are impacted
                if (data.affectedOrdersCount > 0) {
                    setConflictInfo({
                        count: data.affectedOrdersCount,
                        date: closureDate,
                        type: closureType,
                        orders: data.affectedOrders
                    });
                    setConflictModalOpen(true);
                }
            } else {
                addToast(data.error || 'Errore durante la creazione del blocco.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di connessione al server.', 'error');
        }
    };

    const handleDeleteClosure = async (id: number) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/logistics/closures/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                addToast('Blocco logistico rimosso con successo.', 'success');
                fetchClosures();
            } else {
                addToast('Errore durante la rimozione del blocco.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di connessione al server.', 'error');
        }
    };

    const handleUpdateOrderSchedule = async (orderId: number, newDate: string, newTime: string) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/schedule`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    scheduledDate: newDate || null,
                    scheduledTime: newTime || null
                })
            });

            if (res.ok) {
                addToast('Pianificazione appuntamento aggiornata!', 'success');
                fetchDashboard();
                fetchDeliveries(); // sync map deliveries
            } else {
                const data = await res.json();
                addToast(data.error || 'Impossibile salvare la pianificazione.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di rete.', 'error');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#EF4444'; // Red
            case 'WEIGHING_COMPLETED': return '#F59E0B'; // Amber
            case 'OUT_FOR_DELIVERY': return '#10B981'; // Green
            default: return '#6B7280'; // Gray
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 rounded-md uppercase tracking-wider">In Attesa</span>;
            case 'WEIGHING_COMPLETED':
                return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md uppercase tracking-wider">Confermato</span>;
            case 'OUT_FOR_DELIVERY':
                return <span className="px-2 py-0.5 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 rounded-md uppercase tracking-wider">In Spedizione</span>;
            default:
                return <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200 rounded-md uppercase tracking-wider">{status}</span>;
        }
    };

    const createMarkerIcon = (status: string, isSelected: boolean) => {
        const color = getStatusColor(status);
        const size = isSelected ? 32 : 24;
        return L.divIcon({
            html: `<div style="
                background-color: ${color}; 
                width: ${size}px; 
                height: ${size}px; 
                border-radius: 50% 50% 50% 0; 
                border: 3px solid white; 
                transform: rotate(-45deg); 
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
            "></div>`,
            className: 'custom-marker',
            iconSize: [size, size],
            iconAnchor: [size / 2, size]
        });
    };

    return (
        <div className="space-y-6">
            {/* Page Title & Tab Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-gray-100/50 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <MapIcon className="text-nature-600" size={32} /> Regia Logistica & Consegne
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Gestione appuntamenti, blocchi temporali e tracciamento spedizioni.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-2xl w-full md:w-auto shadow-inner">
                    <button
                        onClick={() => setActiveTab('regia')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            activeTab === 'regia' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Clock size={16} /> Regia Logistica
                    </button>
                    <button
                        onClick={() => setActiveTab('mappa')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            activeTab === 'mappa' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <MapIcon size={16} /> Mappa
                    </button>
                    <button
                        onClick={() => setActiveTab('blocchi')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            activeTab === 'blocchi' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <ShieldAlert size={16} /> Blocchi Logistici
                    </button>
                </div>
            </div>

            {/* TAB 1: REGIA LOGISTICA (ORDERS DASHBOARD BY DATE & ZONE) */}
            {activeTab === 'regia' && (
                <div className="space-y-6">
                    {isDashboardLoading ? (
                        <div className="bg-white p-20 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-4 border-nature-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="font-bold text-gray-500 text-sm">Caricamento regia logistica...</p>
                        </div>
                    ) : dashboardData.length === 0 ? (
                        <div className="bg-white p-20 rounded-3xl shadow-sm border border-gray-100 text-center text-gray-400 font-medium">
                            <Clock size={48} className="mx-auto mb-4 opacity-30 text-nature-600" />
                            <p>Nessun ordine attivo pianificato al momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {dashboardData.map((dateGroup) => {
                                const formattedDate = dateGroup.date === 'Non Pianificato' 
                                    ? 'Ordini non pianificati' 
                                    : dateGroup.date.split('-').reverse().join('/');
                                
                                return (
                                    <div key={dateGroup.date} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                                        <div className="border-b border-gray-100 pb-3 flex justify-between items-center bg-gray-50/50 -mx-6 -mt-6 p-6 rounded-t-3xl">
                                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
                                                <CalendarIcon className="text-nature-600" size={22} /> {formattedDate}
                                            </h2>
                                            <span className="text-xs font-extrabold text-nature-700 bg-nature-50 border border-nature-200/50 px-3 py-1 rounded-full">
                                                {dateGroup.groups.reduce((acc: number, g: any) => acc + g.orders.length, 0)} ordini
                                            </span>
                                        </div>

                                        <div className="space-y-6">
                                            {dateGroup.groups.map((cityGroup: any) => (
                                                <div key={cityGroup.city} className="space-y-3">
                                                    <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-nature-500"></span> {cityGroup.city}
                                                    </h3>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {cityGroup.orders.map((order: any) => (
                                                            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-nature-200 transition-all flex flex-col justify-between">
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between items-start">
                                                                        <span className="text-xs font-black text-nature-600 bg-nature-50 border border-nature-150 px-2 py-0.5 rounded-md">
                                                                            #{order.id}
                                                                        </span>
                                                                        {getStatusBadge(order.status)}
                                                                    </div>

                                                                    <div>
                                                                        <h4 className="font-extrabold text-gray-900 leading-tight flex items-center gap-1">
                                                                            <User size={14} className="text-gray-400" /> {order.customerName}
                                                                        </h4>
                                                                        {order.customerPhone && (
                                                                            <p className="text-xs text-gray-500 mt-0.5 font-medium flex items-center gap-1">
                                                                                <Phone size={12} className="text-gray-400" /> {order.customerPhone}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <p className="text-xs text-gray-500 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100 line-clamp-2 min-h-[48px]">
                                                                        <strong>Indirizzo:</strong> {order.deliveryMethod === 'PICKUP' ? 'Ritiro in negozio' : order.shippingAddress}
                                                                    </p>
                                                                </div>

                                                                <div className="border-t border-gray-50 pt-4 mt-4 space-y-3">
                                                                    <div className="flex justify-between items-center text-sm">
                                                                        <span className="font-bold text-gray-400">Totale:</span>
                                                                        <span className="font-black text-gray-900">
                                                                            € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                                                            {!order.finalTotal && <span className="text-[10px] text-gray-400 ml-1 font-medium">(Stim.)</span>}
                                                                        </span>
                                                                    </div>

                                                                    {/* Inline schedule planner */}
                                                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed border-gray-100">
                                                                        <div className="space-y-1">
                                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Data appt.</label>
                                                                            <input
                                                                                type="date"
                                                                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-nature-500 outline-none"
                                                                                defaultValue={order.scheduledDate || ''}
                                                                                onChange={(e) => handleUpdateOrderSchedule(order.id, e.target.value, order.scheduledTime || '')}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Ora appt.</label>
                                                                            <input
                                                                                type="time"
                                                                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-nature-500 outline-none"
                                                                                defaultValue={order.scheduledTime || ''}
                                                                                onChange={(e) => handleUpdateOrderSchedule(order.id, order.scheduledDate || '', e.target.value)}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <Link
                                                                        to={`/admin/orders?id=${order.id}`}
                                                                        className="w-full mt-2 bg-nature-900 text-white font-bold text-xs py-2 rounded-xl text-center flex items-center justify-center gap-1 hover:bg-nature-800 transition-colors"
                                                                    >
                                                                        Gestisci Dettagli <ChevronRight size={14} />
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: INTERACTIVE DELIVERY MAP */}
            {activeTab === 'mappa' && (
                <div className="h-full flex flex-col bg-[#F8F9FA] rounded-none md:rounded-[3rem] overflow-hidden md:border border-gray-100 md:shadow-sm">
                    {/* Visual stats and legends */}
                    <div className="hidden md:flex p-4 pb-2 md:p-8 md:pb-4 flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-md">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Mappa Tracciamento Spedizioni</h2>
                            <p className="text-gray-500 text-xs font-medium">Visualizzazione interattiva degli ordini pronti per la consegna.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl shadow-sm border border-gray-100">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Ricevuti</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl shadow-sm border border-gray-100">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Pronti</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl shadow-sm border border-gray-100">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">In Viaggio</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
                        {/* Desktop Sidebar */}
                        <div className="hidden md:flex md:flex-col md:bg-white md:border-r md:w-80 md:h-full md:overflow-y-auto border-gray-100 shrink-0 custom-scrollbar relative z-10">
                            <div className="p-3 border-b border-gray-50 bg-gray-50/50 sticky top-0 z-20 backdrop-blur-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{deliveries.length} CONSEGNE ATTIVE</p>
                            </div>
                            <div className="flex flex-col w-full divide-y divide-gray-50">
                                {deliveries.length === 0 && !isLoading && (
                                    <div className="p-10 text-center text-gray-400 text-sm font-medium w-full">
                                        <Truck size={32} className="mx-auto mb-2 opacity-30" />
                                        <p>Nessuna consegna attiva al momento.</p>
                                    </div>
                                )}
                                {deliveries.map(order => (
                                    <div
                                        key={order.id}
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setMapCenter([order.latitude, order.longitude]);
                                            setZoom(15);
                                        }}
                                        className={`
                                            cursor-pointer transition-all p-5 border-l-4
                                            ${selectedOrder?.id === order.id 
                                                ? 'border-nature-500 bg-nature-50/50 shadow-inner' 
                                                : 'border-transparent hover:border-nature-250'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-nature-600 bg-nature-100 px-2 py-0.5 rounded-md">#{order.id}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                                                    {order.status === 'PENDING' ? 'In Attesa' : order.status === 'WEIGHING_COMPLETED' ? 'Pronto' : 'Spedito'}
                                                </span>
                                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getStatusColor(order.status) }}></div>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-gray-900 leading-tight text-base truncate">{order.customerName}</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{order.shippingAddress}</p>
                                        <div className="flex justify-between items-center mt-3">
                                            <span className="text-sm font-black text-gray-900">€ {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}</span>
                                            <div className="p-2 rounded-lg bg-gray-100 text-gray-400 group-hover:bg-nature-500 group-hover:text-white transition-colors">
                                                <ChevronRight size={12} className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Map Section */}
                        <div className="flex-1 w-full min-h-[400px] md:min-h-0 relative z-0">
                            {isLoading ? (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-nature-600 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="font-black text-nature-900 uppercase tracking-widest text-xs">Carimento Mappa...</p>
                                    </div>
                                </div>
                            ) : (
                                <MapContainer
                                    center={mapCenter}
                                    zoom={zoom}
                                    className="absolute inset-0 h-full w-full"
                                    zoomControl={false}
                                >
                                    <MapResizeListener />
                                    <AdaptiveZoom deliveries={deliveries} storeLocation={storeLocation} />
                                    <ChangeView center={mapCenter} zoom={zoom} />
                                    <TileLayer
                                        attribution={MAP_LAYERS[mapType].attribution}
                                        url={MAP_LAYERS[mapType].url}
                                    />

                                    {/* Store Reference Marker */}
                                    {storeLocation && (
                                        <Marker
                                            position={[storeLocation.lat, storeLocation.lng]}
                                            icon={L.divIcon({
                                                html: `<div style="
                                                    background-color: #1a1a1a; 
                                                    width: 40px; 
                                                    height: 40px; 
                                                    border-radius: 50%; 
                                                    border: 4px solid white; 
                                                    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    color: white;
                                                ">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                                </div>`,
                                                className: 'store-marker',
                                                iconSize: [40, 40],
                                                iconAnchor: [20, 20]
                                            })}
                                        >
                                            <Popup closeButton={false}>
                                                <div className="p-2 font-black text-center text-xs uppercase tracking-tight">Il Mio Negozio</div>
                                            </Popup>
                                        </Marker>
                                    )}

                                    {deliveries.map(order => (
                                        <Marker
                                            key={order.id}
                                            position={[order.latitude, order.longitude]}
                                            icon={createMarkerIcon(order.status, selectedOrder?.id === order.id)}
                                            eventHandlers={{
                                                click: () => setSelectedOrder(order)
                                            }}
                                        >
                                            <Popup className="delivery-popup" minWidth={window.innerWidth < 768 ? 280 : 420} maxWidth={window.innerWidth < 768 ? 320 : 500}>
                                                <div style={{ fontFamily: "'Nunito', sans-serif", padding: 0, margin: 0 }}>
                                                    <div style={{
                                                        height: '4px',
                                                        borderRadius: '12px 12px 0 0',
                                                        backgroundColor: getStatusColor(order.status),
                                                        margin: '-1px -1px 0 -1px'
                                                    }} />

                                                    <div style={{ padding: window.innerWidth < 768 ? '12px 14px' : '18px 20px 20px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingRight: '36px', gap: window.innerWidth < 768 ? '8px' : '20px' }}>
                                                            <span style={{
                                                                fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em',
                                                                color: '#4B7B5E', backgroundColor: '#EDF7F1',
                                                                padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                Ordine #{order.id}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '11px', fontWeight: 900, letterSpacing: '0.06em',
                                                                color: 'white', backgroundColor: getStatusColor(order.status),
                                                                padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {{
                                                                    PENDING: 'In Attesa',
                                                                    WEIGHING_COMPLETED: 'Pronto',
                                                                    OUT_FOR_DELIVERY: 'In Viaggio',
                                                                }[order.status] ?? order.status}
                                                            </span>
                                                        </div>

                                                        <h4 style={{ fontSize: window.innerWidth < 768 ? '16px' : '22px', fontWeight: 900, color: '#111827', margin: '0 0 4px', lineHeight: 1.2 }}>
                                                            {order.customerName}
                                                        </h4>

                                                        <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 6px', lineHeight: 1.4 }}>
                                                            {order.shippingAddress}
                                                        </p>

                                                        <p style={{ fontSize: '16px', fontWeight: 900, color: '#111827', margin: '4px 0 16px' }}>
                                                            € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                                            {!order.finalTotal && <span style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', marginLeft: '4px' }}>(stimato)</span>}
                                                        </p>

                                                        <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '0 0 12px' }} />

                                                        {order.customerPhone && (
                                                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                                                 <a href={`tel:${order.customerPhone}`} style={{
                                                                     display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                                     padding: '10px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB',
                                                                     borderRadius: '10px', textDecoration: 'none', color: '#374151',
                                                                     fontSize: '13px', fontWeight: 700, transition: 'all 0.15s'
                                                                 }}>
                                                                     <Phone size={14} /> Chiama
                                                                 </a>
                                                                 <a href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{
                                                                     display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                                     padding: '10px', backgroundColor: '#22C55E', border: 'none',
                                                                     borderRadius: '10px', textDecoration: 'none', color: 'white',
                                                                     fontSize: '13px', fontWeight: 700, transition: 'all 0.15s'
                                                                 }}>
                                                                     <MessageCircle size={13} /> WhatsApp
                                                                 </a>
                                                             </div>
                                                         )}

                                                        <Link
                                                            to={`/admin/orders?id=${order.id}`}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                                width: '100%', padding: '12px', backgroundColor: '#1C3829',
                                                                borderRadius: '12px', textDecoration: 'none', color: 'white',
                                                                fontSize: '14px', fontWeight: 800, letterSpacing: '0.02em',
                                                                boxSizing: 'border-box'
                                                            }}
                                                        >
                                                            Gestisci Ordine <ChevronRight size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    {/* Map Type Selector */}
                                    <div className="absolute top-4 left-4 z-[500] flex flex-col gap-2">
                                        <div className="bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-lg border border-white flex flex-col gap-1 overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
                                            {(Object.keys(MAP_LAYERS) as Array<keyof typeof MAP_LAYERS>).map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => setMapType(type)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${mapType === type
                                                        ? 'bg-nature-600 text-white shadow-md'
                                                        : 'text-gray-500 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {MAP_LAYERS[type].icon}
                                                    <span>{MAP_LAYERS[type].name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </MapContainer>
                            )}

                            {/* Quick Stats Overlay (Floating Bar) */}
                            <div className="hidden sm:flex absolute bottom-6 right-6 z-[500] bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-white flex gap-6 px-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Clock size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pendenti</p>
                                        <p className="text-xl font-black text-gray-900">{deliveries.filter(d => d.status === 'PENDING').length}</p>
                                    </div>
                                </div>
                                <div className="w-[1px] h-8 bg-gray-100 my-auto"></div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Scale size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pronti</p>
                                        <p className="text-xl font-black text-gray-900">{deliveries.filter(d => d.status === 'WEIGHING_COMPLETED').length}</p>
                                    </div>
                                </div>
                                <div className="w-[1px] h-8 bg-gray-100 my-auto"></div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Navigation size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">In Strada</p>
                                        <p className="text-xl font-black text-gray-900">{deliveries.filter(d => d.status === 'OUT_FOR_DELIVERY').length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Drawer (Bottom Sheet) Backdrop */}
                        {isDrawerOpen && (
                            <div 
                                onClick={() => setIsDrawerOpen(false)}
                                className="md:hidden fixed inset-0 bg-black/40 z-[90] backdrop-blur-xs transition-opacity duration-300"
                            />
                        )}

                        {/* Mobile Drawer (Bottom Sheet) */}
                        <div className={`
                            md:hidden fixed left-0 right-0 z-[100] bg-white rounded-t-[2rem] shadow-[0_-10px_30px_rgba(0,0,0,0.15)] border-t border-gray-100 transition-all duration-500 ease-in-out flex flex-col
                            ${isDrawerOpen ? 'bottom-0 h-[60vh]' : 'bottom-16 h-14 overflow-hidden'}
                        `}>
                            <div 
                                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                                className="w-full py-3 px-6 flex flex-col items-center justify-center cursor-pointer border-b border-gray-50 bg-gray-50/50 rounded-t-[2rem] shrink-0"
                            >
                                <div className="w-12 h-1 bg-gray-300 rounded-full mb-1.5"></div>
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                        {deliveries.length} Consegne Attive
                                    </span>
                                    <span className="text-[10px] font-black text-nature-600 bg-nature-100 px-2.5 py-0.5 rounded-full">
                                        {isDrawerOpen ? 'Chiudi' : 'Espandi'}
                                    </span>
                                </div>
                            </div>

                            {isDrawerOpen && (
                                <div className="px-6 pb-2.5 pt-1.5 border-b border-gray-50 bg-gray-50/20 flex justify-between text-[10px] font-bold text-gray-500 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                        <span>{deliveries.filter(d => d.status === 'PENDING').length} Ricevuti</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                        <span>{deliveries.filter(d => d.status === 'WEIGHING_COMPLETED').length} Pronti</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                        <span>{deliveries.filter(d => d.status === 'OUT_FOR_DELIVERY').length} In Viaggio</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                                {deliveries.length === 0 && !isLoading && (
                                    <div className="py-12 text-center text-gray-400 text-sm font-medium">
                                        <Truck size={32} className="mx-auto mb-2 opacity-30" />
                                        <p>Nessuna consegna attiva al momento.</p>
                                    </div>
                                )}
                                {deliveries.map(order => (
                                    <div
                                        key={order.id}
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setMapCenter([order.latitude, order.longitude]);
                                            setZoom(15);
                                            setIsDrawerOpen(false);
                                        }}
                                        className={`
                                            p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer transition-all
                                            ${selectedOrder?.id === order.id 
                                                ? 'border-nature-500 ring-2 ring-nature-500/20 bg-nature-50/50' 
                                                : 'hover:border-nature-250'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[10px] font-black text-nature-600 bg-nature-100 px-2 py-0.5 rounded-md">#{order.id}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                                                    {order.status === 'PENDING' ? 'In Attesa' : order.status === 'WEIGHING_COMPLETED' ? 'Pronto' : 'Spedito'}
                                                </span>
                                                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: getStatusColor(order.status) }}></div>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-gray-900 leading-tight text-sm truncate">{order.customerName}</h3>
                                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{order.shippingAddress}</p>
                                        <div className="flex justify-between items-center mt-2.5 border-t border-gray-50 pt-2">
                                            <span className="text-xs font-black text-gray-900 font-sans">€ {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}</span>
                                            <div className="p-1 rounded-lg bg-gray-50 text-gray-400">
                                                <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: CALENDARIO & BLOCCHI LOGISTICI */}
            {activeTab === 'blocchi' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                    {/* Block Form */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Configura Blocco Logistico</h2>
                            <p className="text-xs text-gray-500 mt-1">Impedisce checkout ed esclude date per consegne o chiusure complete.</p>
                        </div>

                        <form onSubmit={handleAddClosure} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Data del Blocco</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-nature-500/20 focus:border-nature-500 outline-none transition-all text-sm font-semibold"
                                    value={closureDate}
                                    onChange={(e) => setClosureDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo di Chiusura</label>
                                <SearchableSelect
                                    options={[
                                        { value: 'GLOBAL', label: 'Chiusura Globale (Ritiro e Consegna)' },
                                        { value: 'ZONE', label: 'Blocco Consegne per Comune specifico' }
                                    ]}
                                    value={closureType}
                                    onChange={(val) => setClosureType(val as any)}
                                    placeholder="Tipo di Chiusura"
                                />
                            </div>

                            {closureType === 'ZONE' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Seleziona Comune</label>
                                    <SearchableSelect
                                        options={[
                                            { value: '', label: 'Scegli Comune...' },
                                            ...deliveryZones.map(z => ({
                                                value: z.id.toString(),
                                                label: `${z.city} (${z.zipCode})`
                                            }))
                                        ]}
                                        value={selectedZoneId}
                                        onChange={setSelectedZoneId}
                                        placeholder="Scegli Comune..."
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full mt-2 bg-nature-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-nature-700 shadow shadow-nature-100 transition-all active:scale-95"
                            >
                                <Plus size={18} /> Aggiungi Blocco Logistico
                            </button>
                        </form>
                    </div>

                    {/* Active Closures List */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Chiusure e Blocchi Attivi</h2>
                            <p className="text-xs text-gray-500 mt-1">Elenco delle eccezioni logistiche configurate nel sistema.</p>
                        </div>

                        {isClosuresLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-3 border-nature-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-gray-400 font-bold">Caricamento blocchi...</p>
                            </div>
                        ) : closures.length === 0 ? (
                            <div className="py-20 text-center text-gray-400 font-medium border-2 border-dashed border-gray-150 rounded-2xl">
                                <ShieldAlert size={32} className="mx-auto mb-2 opacity-30 text-nature-600" />
                                <p>Nessun blocco logistico configurato al momento.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-wider border-b border-gray-100">
                                            <th className="p-4">Data</th>
                                            <th className="p-4">Tipo</th>
                                            <th className="p-4">Ambito / Comune</th>
                                            <th className="p-4 text-center">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {closures.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50/40 transition-colors">
                                                <td className="p-4 font-bold text-gray-900">
                                                    {c.date.split('-').reverse().join('/')}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        c.type === 'GLOBAL' 
                                                            ? 'bg-red-50 text-red-700 border border-red-200' 
                                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {c.type === 'GLOBAL' ? 'Globale' : 'Comune'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-extrabold text-gray-600">
                                                    {c.type === 'GLOBAL' ? 'Tutti (Ritiro & Consegna)' : c.deliveryZone?.city || 'Sconosciuto'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => handleDeleteClosure(c.id)}
                                                        className="p-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl transition-all"
                                                        title="Rimuovi Blocco"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PROACTIVE LOGISTICS CONFLICT WARNING MODAL */}
            {conflictModalOpen && conflictInfo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="bg-red-50 p-6 flex items-start gap-4 border-b border-red-100 shrink-0">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                                <ShieldAlert size={26} className="text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-gray-900 leading-tight">Blocco con Conflitti Rilevato</h3>
                                <p className="text-xs text-gray-500 mt-1 font-medium">
                                    Il blocco del <strong>{conflictInfo.date.split('-').reverse().join('/')}</strong> ({conflictInfo.type === 'GLOBAL' ? 'Globale' : 'Comune'}) collide con gli ordini attivi elencati sotto.
                                </p>
                            </div>
                            <button 
                                onClick={() => setConflictModalOpen(false)}
                                className="ml-auto p-1.5 hover:bg-red-100/50 rounded-full text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Order list content */}
                        <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1">
                            <p className="text-xs text-gray-400 font-extrabold uppercase tracking-wider">
                                {conflictInfo.count} ORDINI DA RIPROGRAMMARE
                            </p>
                            <div className="space-y-2.5">
                                {conflictInfo.orders.map(o => (
                                    <div key={o.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                                        <div>
                                            <p className="font-extrabold text-sm text-gray-900">
                                                Ordine #{o.id} - {o.customerName}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 font-medium flex items-center gap-1">
                                                <span>Tipo: {o.deliveryMethod === 'PICKUP' ? 'Ritiro' : 'Consegna'}</span>
                                                {o.customerPhone && (
                                                    <>
                                                        <span className="text-gray-300">·</span>
                                                        <span className="flex items-center gap-0.5"><Phone size={10} /> {o.customerPhone}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            {o.customerPhone && (
                                                <a 
                                                    href={`https://wa.me/${o.customerPhone.replace(/\D/g, '')}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-sm transition-colors"
                                                    title="Contatta WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                </a>
                                            )}
                                            <Link 
                                                to={`/admin/orders?id=${o.id}`}
                                                className="p-2.5 bg-nature-900 hover:bg-nature-800 text-white rounded-xl shadow-sm transition-colors text-xs font-bold flex items-center justify-center"
                                                onClick={() => setConflictModalOpen(false)}
                                            >
                                                Gestisci
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
                            <button
                                onClick={() => setConflictModalOpen(false)}
                                className="w-full py-3 bg-nature-600 text-white font-bold rounded-xl text-center shadow shadow-nature-150 hover:bg-nature-700 transition-colors"
                            >
                                Ho capito, procedo a riprogrammare
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
