import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Scale, MessageCircle, Truck, CheckCircle, Clock, ShoppingBag, Search, ListFilter, Ban, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { DateTimePicker } from '../../components/admin/DateTimePicker';

interface Order {
    id: number;
    user?: { name: string; email: string };
    status: string;
    items: any[];
    createdAt: string;
    deliveryMethod: string;
    shippingAddress?: string;
    deliveryNotes?: string;
    adminNotes?: string;
    estimatedTotal: number;
    finalTotal?: number;
    customerPhone?: string;
    customerName?: string;
    customerEmail?: string;
    scheduledDate?: string;
    scheduledTime?: string;
}

const ORDER_STATUSES = ['PENDING', 'WEIGHING_COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const OrderManager = () => {
    const { token } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
    const [searchParams] = useSearchParams();
    const [fulfillmentData, setFulfillmentData] = useState<Record<number, number>>({});
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isWeighingOpen, setIsWeighingOpen] = useState(false);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isSavingEdits, setIsSavingEdits] = useState(false);

    useEffect(() => {
        if (selectedOrder) {
            setEditDate(selectedOrder.scheduledDate || '');
            setEditTime(selectedOrder.scheduledTime || '');
            setEditNotes(selectedOrder.adminNotes || '');
        } else {
            setEditDate('');
            setEditTime('');
            setEditNotes('');
        }
    }, [selectedOrder]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [showSearch, setShowSearch] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const { addToast } = useToastStore();
    const API_URL = '';

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredOrders.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredOrders.map(o => o.id));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkUpdateStatus = async (status: string, force = false) => {
        if (!force) {
            const labels: Record<string, string> = {
                PENDING: 'In Attesa',
                WEIGHING_COMPLETED: 'Pesato',
                OUT_FOR_DELIVERY: 'In Consegna',
                DELIVERED: 'Concluso',
                CANCELLED: 'Annullato'
            };
            setConfirmModal({
                isOpen: true,
                title: 'Cambio Stato Multiplo',
                message: `Sei sicuro di voler cambiare lo stato di ${selectedIds.length} ordini selezionati in "${labels[status] || status}"?`,
                onConfirm: () => handleBulkUpdateStatus(status, true)
            });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/orders/bulk`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds, status })
            });

            if (res.ok) {
                fetchOrders();
                setSelectedIds([]);
                addToast('Stati ordini aggiornati con successo!', 'success');
            } else {
                addToast('Errore durante l\'aggiornamento multiplo dello stato.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di connessione al server.', 'error');
        }
    };

    const handleBulkDelete = async (force = false) => {
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Ordini Multipli',
                message: `Sei sicuro di voler eliminare definitivamente i ${selectedIds.length} ordini selezionati? Questa operazione cancellerà tutti i dati associati in modo permanente.`,
                onConfirm: () => handleBulkDelete(true)
            });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/orders/bulk`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds })
            });

            if (res.ok) {
                fetchOrders();
                setSelectedIds([]);
                setSelectedOrder(null);
                addToast('Ordini selezionati eliminati definitivamente!', 'success');
            } else {
                addToast('Errore durante l\'eliminazione degli ordini.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di connessione al server.', 'error');
        }
    };

    useEffect(() => {
        if (token) fetchOrders();
    }, [token]);

    useEffect(() => {
        const orderId = searchParams.get('id');
        if (orderId && orders.length > 0) {
            const order = orders.find(o => o.id === parseInt(orderId));
            if (order) {
                setFilterStatus('ALL'); // Reset filter to make sure it's visible if we are in list view
                handleSelectOrder(order);
            }
        }
    }, [searchParams, orders]);

    // Suppress parent layout scroll for this page and manage exact height
    useEffect(() => {
        const parent = document.querySelector('main');
        if (parent) {
            const originalOverflow = parent.style.overflow;
            const originalHeight = parent.style.height;
            const originalMaxHeight = parent.style.maxHeight;
            const originalPaddingBottom = parent.style.paddingBottom;

            const handleResize = () => {
                const isMobile = window.innerWidth < 1024;
                parent.style.overflow = 'hidden';
                if (isMobile) {
                    parent.style.height = 'calc(100vh - 72px)';
                    parent.style.maxHeight = 'calc(100vh - 72px)';
                    parent.style.paddingBottom = '80px'; // Space for mobile floating nav
                } else {
                    parent.style.height = '100vh';
                    parent.style.maxHeight = '100vh';
                    parent.style.paddingBottom = '2rem'; // Match padding of lg:p-8
                }
            };

            handleResize();
            window.addEventListener('resize', handleResize);

            return () => {
                parent.style.overflow = originalOverflow;
                parent.style.height = originalHeight;
                parent.style.maxHeight = originalMaxHeight;
                parent.style.paddingBottom = originalPaddingBottom;
                window.removeEventListener('resize', handleResize);
            };
        }
    }, []);

    const fetchOrders = () => {
        fetch(`${API_URL}/api/admin/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error(`Error ${res.status}`);
                return res.json();
            })
            .then(data => {
                setOrders(data);
            })
            .catch(err => {
                console.error('Fetch error:', err);
                addToast('Impossibile caricare gli ordini.', 'error');
            });
    };

    const handleSelectOrder = (order: Order) => {
        setSelectedOrder(order);
        const initialData: Record<number, number> = {};
        order.items.forEach(item => {
            initialData[item.id] = Number(item.quantityFulfilled || item.quantityOrdered);
        });
        setFulfillmentData(initialData);
    };

    const handleFulfill = async () => {
        if (!selectedOrder) return;

        const items = Object.entries(fulfillmentData)
            .filter(([_, quantity]) => quantity !== undefined && !isNaN(Number(quantity)))
            .map(([id, quantity]) => ({
                orderItemId: Number(id),
                quantityFulfilled: Number(quantity)
            }));

        try {
            const res = await fetch(`${API_URL}/api/admin/orders/${selectedOrder.id}/fulfill`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items })
            });

            if (res.ok) {
                const updatedOrder = await res.json();
                setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                setSelectedOrder(updatedOrder);
                addToast('Pesatura completata correttamente!', 'success');
            } else {
                const errorData = await res.json();
                console.error('Fulfillment error:', errorData);
                addToast(`Errore: ${errorData.error || 'Salvataggio fallito'}`, 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di connessione al server.', 'error');
        }
    };

    const handleUpdateStatus = async (status: string, force = false) => {
        if (!selectedOrder) return;
        if (status !== selectedOrder.status && !force) {
            const labels: Record<string, string> = {
                PENDING: 'In Attesa',
                WEIGNING_COMPLETED: 'Pesato', // Support typo matching if any
                WEIGHING_COMPLETED: 'Pesato',
                OUT_FOR_DELIVERY: 'In Consegna',
                DELIVERED: 'Concluso',
                CANCELLED: 'Annullato'
            };
            setConfirmModal({
                isOpen: true,
                title: 'Conferma Cambio Stato',
                message: `Sei sicuro di voler cambiare lo stato dell'ordine #${selectedOrder.id} in "${labels[status] || status}"?`,
                onConfirm: () => handleUpdateStatus(status, true)
            });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/orders/${selectedOrder.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, adminNotes: editNotes })
            });

            if (res.ok) {
                const updatedOrder = await res.json();
                setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                setSelectedOrder(updatedOrder);
                addToast('Stato ordine aggiornato!', 'success');
            } else {
                addToast('Errore durante l\'aggiornamento dello stato.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di connessione al server.', 'error');
        }
    };

    const handleDeleteOrder = async (force = false) => {
        if (!selectedOrder) return;
        if (!force) {
            setConfirmModal({
                isOpen: true,
                title: 'Elimina Ordine Permanente',
                message: `Sei sicuro di voler eliminare definitivamente l'ordine #${selectedOrder.id}? Questa operazione cancellerà tutti i dati associati in modo permanente.`,
                onConfirm: () => handleDeleteOrder(true)
            });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/orders/${selectedOrder.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setOrders(orders.filter(o => o.id !== selectedOrder.id));
                setSelectedOrder(null);
                addToast('Ordine eliminato definitivamente!', 'success');
            } else {
                addToast('Errore durante l\'eliminazione dell\'ordine.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di connessione al server.', 'error');
        }
    };

    const handleSaveAllEdits = async () => {
        if (!selectedOrder) return;
        setIsSavingEdits(true);
        try {
            const dateChanged = editDate !== (selectedOrder.scheduledDate || '');
            const timeChanged = editTime !== (selectedOrder.scheduledTime || '');
            const notesChanged = editNotes !== (selectedOrder.adminNotes || '');

            let updatedOrder = { ...selectedOrder };

            // 1. Save schedule if date or time changed
            if (dateChanged || timeChanged) {
                const resSchedule = await fetch(`${API_URL}/api/admin/orders/${selectedOrder.id}/schedule`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        scheduledDate: editDate || null,
                        scheduledTime: editTime || null
                    })
                });

                if (resSchedule.ok) {
                    updatedOrder = await resSchedule.json();
                } else {
                    const data = await resSchedule.json();
                    throw new Error(data.error || 'Impossibile salvare la pianificazione.');
                }
            }

            // 2. Save notes if notes changed
            if (notesChanged) {
                const resStatus = await fetch(`${API_URL}/api/admin/orders/${selectedOrder.id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: updatedOrder.status,
                        adminNotes: editNotes
                    })
                });

                if (resStatus.ok) {
                    updatedOrder = await resStatus.json();
                } else {
                    throw new Error('Impossibile salvare le note interne.');
                }
            }

            // Update order list and selected order
            setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            setSelectedOrder(updatedOrder);
            addToast('Modifiche salvate con successo!', 'success');
        } catch (err: any) {
            console.error(err);
            addToast(err.message || 'Errore durante il salvataggio.', 'error');
        } finally {
            setIsSavingEdits(false);
        }
    };

    const calculateCurrentTotal = () => {
        if (!selectedOrder) return 0;
        return selectedOrder.items.reduce((acc, item) => {
            const qty = fulfillmentData[item.id] || 0;
            return acc + (item.product.priceCents * qty);
        }, 0);
    };

    const filteredOrders = orders.filter(o => {
        const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            o.id.toString().includes(q) ||
            (o.customerName || '').toLowerCase().includes(q) ||
            (o.customerEmail || '').toLowerCase().includes(q) ||
            (o.user?.name || '').toLowerCase().includes(q) ||
            o.items.some(i => i.product.name.toLowerCase().includes(q));

        return matchesStatus && matchesSearch;
    });

    const getStatusCount = (status: string) => {
        if (status === 'ALL') return orders.length;
        return orders.filter(o => o.status === status).length;
    };

    const statusTabs = [
        { id: 'ALL', label: 'Tutti', icon: <ListFilter size={16} />, color: 'gray' },
        { id: 'PENDING', label: 'In Attesa', icon: <Clock size={16} />, color: 'yellow' },
        { id: 'WEIGHING_COMPLETED', label: 'Pesati', icon: <Scale size={16} />, color: 'blue' },
        { id: 'OUT_FOR_DELIVERY', label: 'In Consegna', icon: <Truck size={16} />, color: 'purple' },
        { id: 'DELIVERED', label: 'Consegnati', icon: <CheckCircle size={16} />, color: 'green' },
        { id: 'CANCELLED', label: 'Annullati', icon: <Ban size={16} />, color: 'red' },
    ];

    const colorMap: Record<string, string> = {
        gray: 'text-gray-500 bg-gray-100',
        yellow: 'text-amber-500 bg-amber-50',
        blue: 'text-blue-500 bg-blue-50',
        purple: 'text-purple-500 bg-purple-50',
        green: 'text-green-500 bg-green-50',
        red: 'text-red-500 bg-red-50',
    };

    const activeColorMap: Record<string, string> = {
        gray: 'ring-gray-200',
        yellow: 'ring-amber-200',
        blue: 'ring-blue-200',
        purple: 'ring-purple-200',
        green: 'ring-green-200',
        red: 'ring-red-200',
    };

    return (
        <div className={`flex flex-col h-full bg-gray-50 -m-5 lg:-m-8 ${selectedOrder ? 'p-0 lg:p-8' : 'p-5 lg:p-8'} overflow-hidden`}>
            <div className={`space-y-3 lg:space-y-6 mb-3 lg:mb-6 ${selectedOrder ? 'hidden lg:block' : 'block'}`}>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestione Ordini</h1>
                        <p className="text-gray-500 text-sm mt-1 font-medium">Gestisci le pesature e monitora lo stato delle consegne.</p>
                    </div>

                    {/* Mobile Toolbar Toggle Buttons */}
                    <div className="flex lg:hidden gap-2 w-full">
                        <button
                            onClick={() => {
                                setShowSearch(!showSearch);
                                setShowFilter(false);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                                showSearch || searchQuery
                                    ? 'bg-nature-600 text-white border-transparent shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 shadow-sm'
                            }`}
                        >
                            <Search size={14} />
                            <span>Cerca</span>
                            {searchQuery && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                        </button>
                        <button
                            onClick={() => {
                                setShowFilter(!showFilter);
                                setShowSearch(false);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                                showFilter || filterStatus !== 'ALL'
                                    ? 'bg-nature-600 text-white border-transparent shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 shadow-sm'
                            }`}
                        >
                            <ListFilter size={14} />
                            <span>Stato</span>
                            {filterStatus !== 'ALL' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                        </button>
                        <button
                            onClick={() => {
                                setIsMultiSelectActive(!isMultiSelectActive);
                                if (!isMultiSelectActive) {
                                    setSelectedIds([]);
                                }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                                isMultiSelectActive
                                    ? 'bg-nature-600 text-white border-transparent shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 shadow-sm'
                            }`}
                        >
                            <CheckCircle size={14} />
                            <span>Sel. Multipla</span>
                        </button>
                    </div>

                    {/* Search Input Panel & Bulk Toggle on Desktop */}
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className={`relative w-full lg:w-96 group ${showSearch ? 'block' : 'hidden'} lg:block`}>
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-nature-600 transition-colors">
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Cerca per ID, cliente o prodotto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-nature-500/10 focus:border-nature-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setIsMultiSelectActive(!isMultiSelectActive);
                                if (!isMultiSelectActive) {
                                    setSelectedIds([]);
                                }
                            }}
                            className={`hidden lg:flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold border transition-all ${
                                isMultiSelectActive
                                    ? 'bg-nature-600 text-white border-transparent shadow-md shadow-nature-200'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-nature-300 hover:text-nature-700'
                            }`}
                        >
                            <CheckCircle size={18} />
                            <span>Selezione Multipla</span>
                        </button>
                    </div>
                </div>

                {/* Status Tabs */}
                <div className={`flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full overflow-x-auto custom-scrollbar no-scrollbar ${showFilter ? 'block' : 'hidden'} lg:flex`}>
                    {statusTabs.map(tab => {
                        const count = getStatusCount(tab.id);
                        const isActive = filterStatus === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setFilterStatus(tab.id)}
                                className={`
                                    flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                    ${isActive
                                        ? `bg-white text-nature-900 shadow-sm ring-2 ${activeColorMap[tab.color]}`
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                    }
                                `}
                            >
                                <span className={isActive ? colorMap[tab.color].split(' ')[0] : 'text-gray-400'}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                                <span className={`
                                    px-2 py-0.5 rounded-lg text-[10px] font-black
                                    ${isActive ? colorMap[tab.color] : 'bg-gray-200 text-gray-500'}
                                `}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
                {/* Left column: Orders list */}
                <div className={`flex flex-col h-full min-h-0 ${selectedOrder ? 'hidden lg:flex' : 'flex'} lg:col-span-5 xl:col-span-4`}>
                    <div className="space-y-2 lg:space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-28 lg:pb-4">
                        {isMultiSelectActive && filteredOrders.length > 0 && (
                            <div 
                                onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-100 mb-2 select-none cursor-pointer hover:border-nature-200 transition-all shadow-sm shrink-0 animate-in fade-in duration-200"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                                    readOnly
                                    className="w-4.5 h-4.5 text-nature-600 rounded focus:ring-nature-500 cursor-pointer pointer-events-none"
                                />
                                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Seleziona Tutti ({filteredOrders.length})</span>
                            </div>
                        )}
                        {filteredOrders.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <ShoppingBag size={48} className="mb-4 opacity-50" />
                                <p>Nessun ordine trovato</p>
                            </div>
                        )}
                        {filteredOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => handleSelectOrder(order)}
                                className={`bg-white p-2.5 lg:p-5 rounded-xl lg:rounded-2xl shadow-sm border cursor-pointer transition-all flex items-center gap-3 ${selectedOrder?.id === order.id ? 'border-nature-500 ring-2 ring-nature-500 bg-nature-50/30' : 'border-gray-100 hover:border-nature-200'
                                    }`}
                            >
                                {/* Checkbox for multiple selection */}
                                {isMultiSelectActive && (
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}
                                        className="shrink-0 flex items-center justify-center p-1.5 hover:bg-gray-100 rounded-lg transition-colors animate-in zoom-in-50 duration-200"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(order.id)}
                                            readOnly
                                            className="w-4.5 h-4.5 text-nature-600 rounded focus:ring-nature-500 cursor-pointer pointer-events-none"
                                        />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    {/* Mobile view: single line compact row */}
                                    <div className="lg:hidden flex items-center justify-between w-full gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-8 h-8 bg-nature-100 rounded flex items-center justify-center text-nature-700 font-black text-xs shrink-0">
                                                #{order.id}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 leading-tight text-sm truncate" title={order.customerName || order.user?.name || 'Cliente'}>
                                                    {order.customerName || order.user?.name || 'Cliente'}
                                                </h3>
                                                <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                                                    {new Date(order.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                </p>
                                                {order.scheduledDate && (
                                                    <p className="text-[9px] text-blue-600 font-bold mt-0.5">
                                                        Pianificato: {order.scheduledDate.split('-').reverse().join('/')} {order.scheduledTime || ''}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-gray-400 shrink-0">
                                                {order.deliveryMethod === 'DELIVERY' ? <Truck size={14} /> : <Scale size={14} />}
                                            </span>
                                            <StatusBadge status={order.status} isCompact />
                                            <div className="text-right shrink-0">
                                                <span className="text-sm font-black text-nature-900 block">
                                                    € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop view: standard two-row layout */}
                                    <div className="hidden lg:block w-full">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-nature-100 rounded-xl flex items-center justify-center text-nature-700 font-black text-base">
                                                    #{order.id}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 leading-tight text-base">{order.customerName || order.user?.name || 'Cliente'}</h3>
                                                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
                                                    {order.scheduledDate && (
                                                        <p className="text-xs text-blue-600 font-bold mt-1">
                                                            Pianificato: {order.scheduledDate.split('-').reverse().join('/')} {order.scheduledTime || ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>

                                        <div className="flex justify-between items-end border-t border-gray-50 pt-3 mt-3">
                                            <div className="flex gap-2">
                                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-md text-gray-600">
                                                    {order.deliveryMethod === 'DELIVERY' ? <Truck size={11} /> : <Scale size={11} />}
                                                    {order.deliveryMethod === 'DELIVERY' ? 'Domicilio' : 'Ritiro'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-black text-nature-900">
                                                    € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                                </span>
                                                {!order.finalTotal && <span className="text-[10px] text-gray-400 block -mt-1 uppercase tracking-wider">Stimato</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column: Detail Panel or Placeholder */}
                <div className={`h-full min-h-0 ${selectedOrder ? 'flex fixed inset-0 z-[60] lg:relative lg:inset-auto lg:z-auto bg-white' : 'hidden lg:flex'} lg:col-span-7 xl:col-span-8 flex-col overflow-hidden`}>
                    {selectedOrder ? (
                        <div className="bg-white lg:rounded-2xl lg:shadow-xl lg:border lg:border-nature-100 flex flex-col overflow-hidden h-full relative">
                            {/* Mobile Back Header */}
                            <div className="lg:hidden p-4 border-b border-gray-100 flex items-center justify-between bg-nature-900 text-white shrink-0">
                                <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-2 p-1.5 bg-nature-800 rounded-lg hover:bg-nature-700">
                                    <X size={20} /> <span className="text-sm font-bold">Chiudi Dettaglio</span>
                                </button>
                                <span className="font-bold">Ordine #{selectedOrder.id}</span>
                            </div>

                             {/* Main content wrapper - flex layout, no scroll */}
                             <div className="flex-1 p-4 md:p-6 flex flex-col min-h-0 overflow-y-auto lg:overflow-visible relative z-30">
                                <div className="hidden lg:flex justify-between items-center mb-4 pb-2.5 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 leading-none">Ordine #{selectedOrder.id}</h2>
                                        <p className="text-gray-400 text-xs mt-1.5">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stato:</span>
                                        <StatusBadge status={selectedOrder.status} />
                                    </div>
                                </div>

                                {/* Compact Status Steps */}
                                {selectedOrder.status !== 'CANCELLED' && (
                                    <div className="flex justify-between items-center gap-1.5 sm:gap-3 mb-4 p-2 bg-gray-50 rounded-xl text-[10px] sm:text-xs font-bold text-gray-500 shrink-0">
                                        {ORDER_STATUSES.map((status, index) => {
                                            const currentIndex = ORDER_STATUSES.indexOf(selectedOrder.status);
                                            const isPast = index < currentIndex;
                                            const isCurrent = index === currentIndex;
                                            const labels: Record<string, string> = {
                                                PENDING: 'Ricevuto',
                                                WEIGHING_COMPLETED: 'Pesato',
                                                OUT_FOR_DELIVERY: 'Spedito',
                                                DELIVERED: 'Concluso'
                                            };
                                            return (
                                                <div key={status} className="flex items-center gap-1.5">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                                        isCurrent ? 'bg-nature-600 text-white animate-pulse' :
                                                        isPast ? 'bg-nature-100 text-nature-700' : 'bg-gray-200 text-gray-400'
                                                    }`}>
                                                        {isPast ? '✓' : index + 1}
                                                    </span>
                                                    <span className={`text-[10px] md:text-xs ${
                                                        isCurrent ? 'text-nature-950 font-black' : isPast ? 'text-gray-700 font-semibold' : 'text-gray-400'
                                                    } ${isCurrent ? 'block' : 'hidden sm:block'}`}>
                                                        {labels[status]}
                                                    </span>
                                                    {index < ORDER_STATUSES.length - 1 && <span className="text-gray-300">→</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Customer Info & Internal Notes */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-4 shrink-0 relative z-30">
                                    {/* Customer Info */}
                                    <div className="bg-nature-50/60 p-3 lg:p-4 rounded-xl border border-nature-100/50 text-xs flex flex-col justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-nature-600 block mb-1">Cliente</span>
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-extrabold text-base text-nature-900 leading-tight truncate">{selectedOrder.customerName || selectedOrder.user?.name}</p>
                                                    <p className="text-nature-700 mt-0.5 truncate">{selectedOrder.customerEmail || selectedOrder.user?.email}</p>
                                                    {selectedOrder.shippingAddress && (
                                                        <p className="text-nature-800 font-medium mt-1.5 truncate" title={selectedOrder.shippingAddress}>
                                                            📍 {selectedOrder.shippingAddress}
                                                        </p>
                                                    )}
                                                </div>
                                                {selectedOrder.customerPhone && (
                                                    <a href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                                        className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors shadow-sm ml-2 flex items-center justify-center shrink-0">
                                                        <MessageCircle size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {selectedOrder.deliveryNotes && (
                                            <div className="border-t border-nature-200/50 pt-2 mt-2 text-nature-600 truncate" title={selectedOrder.deliveryNotes}>
                                                <strong>Note:</strong> {selectedOrder.deliveryNotes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Appointment Scheduling */}
                                    <div className="bg-blue-50/60 p-3 lg:p-4 rounded-xl border border-blue-100/50 text-xs flex flex-col justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">Pianificazione Appuntamento</span>
                                            <div className="space-y-1.5 mt-1.5">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Data e Ora Appuntamento</label>
                                                <DateTimePicker
                                                    date={editDate}
                                                    time={editTime}
                                                    onChange={(d, t) => {
                                                        setEditDate(d);
                                                        setEditTime(t);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Internal Notes */}
                                    <div className="bg-yellow-50/60 p-3 lg:p-4 rounded-xl border border-yellow-100/50 text-xs flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-700 block mb-1">Note Interne</span>
                                        <textarea
                                            className="w-full flex-1 p-2 bg-white border border-yellow-200 rounded-lg text-xs lg:text-sm focus:ring-1 focus:ring-yellow-400 outline-none resize-none min-h-[50px] lg:min-h-[64px]"
                                            placeholder="Note interne..."
                                            value={editNotes}
                                            onChange={(e) => setEditNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Unsaved Changes Banner */}
                                {selectedOrder && (editDate !== (selectedOrder.scheduledDate || '') || editTime !== (selectedOrder.scheduledTime || '') || editNotes !== (selectedOrder.adminNotes || '')) && (
                                    <div className="bg-nature-50 border border-nature-200 rounded-xl p-3 mb-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-200 shrink-0">
                                        <div className="flex items-center gap-2 text-nature-800 text-xs font-bold">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nature-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-nature-500"></span>
                                            </span>
                                            Ci sono modifiche non salvate
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditDate(selectedOrder.scheduledDate || '');
                                                    setEditTime(selectedOrder.scheduledTime || '');
                                                    setEditNotes(selectedOrder.adminNotes || '');
                                                }}
                                                className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-lg transition-all"
                                            >
                                                Annulla
                                            </button>
                                            <button
                                                onClick={handleSaveAllEdits}
                                                disabled={isSavingEdits}
                                                className="px-3 py-1.5 bg-nature-600 hover:bg-nature-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1"
                                            >
                                                {isSavingEdits ? 'Salvataggio...' : 'Salva Modifiche'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Order Items Table (Only scrollable child) */}
                                <div className="flex-1 min-h-0 flex flex-col mb-4 bg-white border border-gray-100 rounded-xl p-3 lg:p-4 overflow-hidden">
                                    <div className="grid grid-cols-12 gap-2 sm:gap-3 pb-2 mb-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                                        <span className="col-span-5">Prodotto</span>
                                        <span className="col-span-3 text-right">Richiesto</span>
                                        <span className="col-span-4 text-right">Effettivo</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                        {selectedOrder.items.map(item => {
                                            const itemActualQty = typeof fulfillmentData[item.id] === 'number' ? fulfillmentData[item.id] : (((fulfillmentData[item.id] as any) === '' ? 0 : (item.quantityFulfilled || item.quantityOrdered)) as number);
                                            const itemEstCost = (item.product.priceCents * item.quantityOrdered) / 100;
                                            const itemActualCost = (item.product.priceCents * itemActualQty) / 100;
                                            return (
                                                <div key={item.id} className="grid grid-cols-12 gap-2 sm:gap-3 items-center py-2 px-2.5 sm:px-3 bg-gray-50/50 hover:bg-gray-50 rounded-lg border border-gray-100/50 text-xs">
                                                    {/* Product details */}
                                                    <div className="col-span-5 min-w-0">
                                                        <p className="font-bold text-gray-900 truncate" title={item.product.name}>{item.product.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                                            Unitario: € {(item.product.priceCents / 100).toFixed(2)} / {item.product.unitType}
                                                        </p>
                                                    </div>

                                                    {/* Requested info */}
                                                    <div className="col-span-3 text-right">
                                                        <span className="font-semibold text-gray-600 block">
                                                            {item.quantityOrdered} {item.product.unitType}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 block mt-0.5">
                                                            € {itemEstCost.toFixed(2)}
                                                        </span>
                                                    </div>

                                                    {/* Actual info */}
                                                    <div className="col-span-4 flex flex-col items-end text-right">
                                                        {item.product.isVariableWeight && !item.quantityFulfilled ? (
                                                            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[10px] uppercase tracking-wider block">
                                                                Da pesare
                                                            </span>
                                                        ) : (
                                                            <span className="font-extrabold text-nature-900 block">
                                                                {item.quantityFulfilled || item.quantityOrdered} {item.product.unitType}
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] font-black text-nature-700 block mt-0.5">
                                                            € {itemActualCost.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer (Sticky) */}
                            <div className="bg-white border-t border-gray-100 p-3 lg:p-4 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 z-20">
                                <div className="bg-nature-900 text-white px-4 py-2 sm:py-2.5 rounded-xl shadow-sm flex items-center justify-between sm:flex-col sm:justify-center sm:items-start min-w-[130px] shrink-0">
                                    <span className="text-[10px] text-nature-300 font-bold uppercase tracking-wider">Totale {selectedOrder.finalTotal ? 'Finale' : 'Stimato'}</span>
                                    <span className="text-base sm:text-lg font-black leading-none mt-0 sm:mt-1">
                                        € {((selectedOrder.finalTotal || calculateCurrentTotal()) / 100).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 justify-end flex-1 w-full sm:w-auto">
                                    {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'WEIGHING_COMPLETED') && (
                                        <button onClick={() => setIsWeighingOpen(true)} className="px-3 py-2.5 sm:px-4 sm:py-2.5 bg-nature-600 hover:bg-nature-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial">
                                            <Scale size={16} /> Pesatura
                                        </button>
                                    )}

                                    {selectedOrder.status === 'WEIGHING_COMPLETED' && (
                                        <button onClick={() => handleUpdateStatus('OUT_FOR_DELIVERY')} className="px-3 py-2.5 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial">
                                            <Truck size={16} /> Spedisci
                                        </button>
                                    )}

                                    {selectedOrder.status === 'OUT_FOR_DELIVERY' && (
                                        <button onClick={() => handleUpdateStatus('DELIVERED')} className="px-3 py-2.5 sm:px-4 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial">
                                            <CheckCircle size={16} /> Concludi
                                        </button>
                                    )}

                                    {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
                                        <button onClick={() => handleUpdateStatus('CANCELLED')} className="px-2.5 py-2.5 text-red-500 font-bold hover:bg-red-50 text-[11px] sm:text-xs rounded-xl transition-colors shrink-0">
                                            Annulla
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteOrder()} className="px-2.5 py-2.5 text-red-600 font-bold hover:bg-red-50 hover:text-red-700 text-[11px] sm:text-xs rounded-xl transition-colors shrink-0">
                                        Elimina
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-8 text-center h-full text-gray-400">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-400 border border-gray-100">
                                <ShoppingBag size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Dettagli Ordine</h3>
                            <p className="text-sm text-gray-500 max-w-xs">Seleziona un ordine dall'elenco a sinistra per visualizzarne i dettagli e completare la pesatura.</p>
                        </div>
                    )}
                </div>
            </div>
            {isWeighingOpen && selectedOrder && (
                <div className="fixed inset-0 bg-[#0c2e19]/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-nature-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-nature-900 text-white shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Scale className="text-nature-300 animate-pulse" />
                                <div>
                                    <h3 className="font-black text-lg">Pesatura Ordine #{selectedOrder.id}</h3>
                                    <p className="text-nature-300 text-xs mt-0.5">Inserisci il peso effettivo per ciascun articolo a peso variabile.</p>
                                </div>
                            </div>
                            <button onClick={() => {
                                const resetData: Record<number, number> = {};
                                selectedOrder.items.forEach(item => {
                                    resetData[item.id] = Number(item.quantityFulfilled || item.quantityOrdered);
                                });
                                setFulfillmentData(resetData);
                                setIsWeighingOpen(false);
                            }} className="p-1.5 bg-nature-800 rounded-lg hover:bg-nature-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {selectedOrder.items.map(item => {
                                const itemActualQty = typeof fulfillmentData[item.id] === 'number' 
                                    ? fulfillmentData[item.id] 
                                    : (((fulfillmentData[item.id] as any) === '' ? 0 : (item.quantityFulfilled || item.quantityOrdered)) as number);
                                const itemEstCost = (item.product.priceCents * item.quantityOrdered) / 100;
                                const itemActualCost = (item.product.priceCents * itemActualQty) / 100;
                                
                                return (
                                    <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-gray-900">{item.product.name}</span>
                                                {item.product.isVariableWeight && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Peso Variabile</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 font-semibold mt-1">
                                                Prezzo unitario: € {(item.product.priceCents / 100).toFixed(2)} / {item.product.unitType}
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shrink-0">
                                            {/* Weights info */}
                                            <div className="text-xs">
                                                <p className="text-gray-500 font-medium">Richiesto: <span className="font-bold text-gray-700">{item.quantityOrdered} {item.product.unitType}</span></p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">Costo stimato: € {itemEstCost.toFixed(2)}</p>
                                            </div>

                                            {/* Input */}
                                            <div className="flex flex-col items-end gap-1.5">
                                                {item.product.isVariableWeight ? (
                                                    <div className="flex items-center gap-1.5">
                                                        {/* Minus Button */}
                                                        <button 
                                                            onClick={() => {
                                                                const currentVal = Number(fulfillmentData[item.id] !== undefined ? fulfillmentData[item.id] : (item.quantityFulfilled || item.quantityOrdered));
                                                                const newVal = Math.max(0, currentVal - 0.1);
                                                                setFulfillmentData({
                                                                    ...fulfillmentData,
                                                                    [item.id]: parseFloat(newVal.toFixed(2))
                                                                });
                                                            }}
                                                            className="w-8 h-8 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-900 flex items-center justify-center font-black text-base select-none transition-colors border border-yellow-200 active:scale-90"
                                                            title="Riduci peso di 0.1 kg"
                                                        >
                                                            -
                                                        </button>

                                                        {/* Input wrapper */}
                                                        <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1.5 rounded-xl border border-yellow-200 focus-within:ring-2 focus-within:ring-yellow-400 justify-end w-fit shadow-sm">
                                                            <Scale size={13} className="text-yellow-600 hidden sm:inline" />
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="w-12 text-right bg-transparent font-black text-yellow-900 outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                value={fulfillmentData[item.id] !== undefined ? fulfillmentData[item.id] : ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setFulfillmentData({ 
                                                                        ...fulfillmentData, 
                                                                        [item.id]: val === '' ? '' as any : parseFloat(val) 
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-xs font-bold text-yellow-700">{item.product.unitType}</span>
                                                        </div>

                                                        {/* Plus Button */}
                                                        <button 
                                                            onClick={() => {
                                                                const currentVal = Number(fulfillmentData[item.id] !== undefined ? fulfillmentData[item.id] : (item.quantityFulfilled || item.quantityOrdered));
                                                                const newVal = currentVal + 0.1;
                                                                setFulfillmentData({
                                                                    ...fulfillmentData,
                                                                    [item.id]: parseFloat(newVal.toFixed(2))
                                                                });
                                                            }}
                                                            className="w-8 h-8 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-900 flex items-center justify-center font-black text-base select-none transition-colors border border-yellow-200 active:scale-90"
                                                            title="Aumenta peso di 0.1 kg"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-100 px-3 py-1 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold">
                                                        {item.quantityOrdered} {item.product.unitType}
                                                    </div>
                                                )}
                                                <span className="text-[11px] font-black text-nature-700">
                                                    Costo effettivo: € {itemActualCost.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                            <div className="bg-nature-900 text-white px-4 py-2.5 rounded-xl shadow-inner flex items-center justify-between sm:flex-col sm:justify-center sm:items-start min-w-[150px] shrink-0">
                                <span className="text-[10px] text-nature-300 font-bold uppercase tracking-wider">Nuovo Totale Calcolato</span>
                                <span className="text-base sm:text-lg font-black leading-none mt-0 sm:mt-1">
                                    € {(calculateCurrentTotal() / 100).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                                <button onClick={() => {
                                    const resetData: Record<number, number> = {};
                                    selectedOrder.items.forEach(item => {
                                        resetData[item.id] = Number(item.quantityFulfilled || item.quantityOrdered);
                                    });
                                    setFulfillmentData(resetData);
                                    setIsWeighingOpen(false);
                                }} className="px-4 py-2.5 text-gray-500 font-bold hover:bg-gray-200 text-sm rounded-xl transition-colors">
                                    Annulla
                                </button>
                                <button onClick={async () => {
                                    await handleFulfill();
                                    setIsWeighingOpen(false);
                                }} className="px-5 py-2.5 bg-nature-600 hover:bg-nature-700 text-white font-bold text-sm rounded-xl shadow transition-all flex items-center justify-center gap-1.5">
                                    <Scale size={16} /> Salva Pesatura
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal
                isOpen={!!confirmModal}
                title={confirmModal?.title || ''}
                message={confirmModal?.message || ''}
                onConfirm={() => {
                    if (confirmModal) {
                        confirmModal.onConfirm();
                        setConfirmModal(null);
                    }
                }}
                onCancel={() => setConfirmModal(null)}
            />

            {/* Bulk Action Toolbar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 100, x: '-50%' }}
                        className="fixed bottom-20 sm:bottom-8 left-1/2 z-[60] bg-white/80 backdrop-blur-xl px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-1.5 sm:gap-2 border border-white/50 w-auto max-w-[95%] sm:max-w-none"
                    >
                        <div className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 bg-nature-600 text-white rounded-[1.5rem] shadow-lg shadow-nature-200">
                            <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                                {selectedIds.length}
                            </div>
                            <span className="font-bold text-sm hidden sm:inline">Ordini</span>
                        </div>

                        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-gray-50/50 rounded-[1.5rem] border border-gray-100">
                            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 border-r border-gray-200">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdateStatus('WEIGHING_COMPLETED')}
                                    className="p-2 sm:p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-all animate-in zoom-in-50 duration-200"
                                    title="Segna come Pesati"
                                >
                                    <Scale size={20} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdateStatus('OUT_FOR_DELIVERY')}
                                    className="p-2 sm:p-3 text-purple-600 hover:bg-purple-50 rounded-2xl transition-all animate-in zoom-in-50 duration-200"
                                    title="Segna come In Consegna"
                                >
                                    <Truck size={20} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdateStatus('DELIVERED')}
                                    className="p-2 sm:p-3 text-green-600 hover:bg-green-50 rounded-2xl transition-all animate-in zoom-in-50 duration-200"
                                    title="Segna come Conclusi"
                                >
                                    <CheckCircle size={20} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleBulkUpdateStatus('CANCELLED')}
                                    className="p-2 sm:p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all animate-in zoom-in-50 duration-200"
                                    title="Annulla Selezionati"
                                >
                                    <Ban size={20} />
                                </motion.button>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: '#fef2f2' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleBulkDelete()}
                                className="p-2 sm:p-3 text-red-600 hover:text-red-700 rounded-2xl transition-all"
                                title="Elimina Selezionati"
                            >
                                <Trash2 size={20} />
                            </motion.button>
                        </div>

                        <motion.button
                            whileHover={{ backgroundColor: '#f3f4f6' }}
                            onClick={() => setSelectedIds([])}
                            className="p-2 sm:p-3 text-gray-400 hover:text-gray-600 rounded-full transition-all"
                            title="Annulla selezione"
                        >
                            <X size={18} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatusBadge = ({ status, pulse, isCompact }: { status: string; pulse?: boolean; isCompact?: boolean }) => {
    const styles: Record<string, string> = {
        PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        WEIGHING_COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
        OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700 border-purple-200',
        DELIVERED: 'bg-green-100 text-green-700 border-green-200',
        CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    };
    const labels: Record<string, string> = {
        PENDING: 'In Attesa', WEIGHING_COMPLETED: 'Pesato', OUT_FOR_DELIVERY: 'In Consegna', DELIVERED: 'Consegnato', CANCELLED: 'Annullato',
    };
    return (
        <span className={`
            rounded-xl font-black uppercase tracking-wider border transition-all relative
            ${isCompact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
            ${styles[status]}
            ${pulse ? 'animate-pulse ring-2 ring-current/20 shadow-lg shadow-current/10' : ''}
        `}>
            {labels[status] || status}
            {pulse && <span className="absolute -inset-1 rounded-xl bg-current opacity-10 animate-ping"></span>}
        </span>
    );
};
