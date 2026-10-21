import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Scale, MessageCircle, Truck, CheckCircle, Clock, ShoppingBag, Search, ListFilter, Ban, Trash2, Calendar, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';
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

export const OrderManager = () => {
    const { token } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
    const [searchParams] = useSearchParams();
    const [fulfillmentData, setFulfillmentData] = useState<Record<number, number>>({});
    const [fulfillmentPriceData, setFulfillmentPriceData] = useState<Record<number, number>>({});
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isWeighingOpen, setIsWeighingOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [tempModalDate, setTempModalDate] = useState('');
    const [tempModalTime, setTempModalTime] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isSavingEdits, setIsSavingEdits] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'customer'>('overview');
    const [weighedItemIds, setWeighedItemIds] = useState<number[]>([]);
    const [weighingItemModal, setWeighingItemModal] = useState<{
        isOpen: boolean;
        item: any | null;
        tempWeight: number | string;
        tempUnitPrice: number | string;
    }>({ isOpen: false, item: null, tempWeight: '', tempUnitPrice: '' });

    useEffect(() => {
        if (selectedOrder) {
            setEditDate(selectedOrder.scheduledDate || '');
            setEditTime(selectedOrder.scheduledTime || '');
            setEditNotes(selectedOrder.adminNotes || '');

            const initialFulfillment: Record<number, number> = {};
            const initialPrices: Record<number, number> = {};
            const initialWeighedIds: number[] = [];

            selectedOrder.items.forEach(item => {
                const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
                const defaultQty = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);

                const isAlreadyWeighed = item.quantityFulfilled !== null && item.quantityFulfilled !== undefined;
                if (isAlreadyWeighed) {
                    initialWeighedIds.push(item.id);
                }

                initialFulfillment[item.id] = isAlreadyWeighed
                    ? Number(item.quantityFulfilled)
                    : defaultQty;

                initialPrices[item.id] = (item.priceAtPurchase || item.product.priceCents) / 100;
            });

            setFulfillmentData(initialFulfillment);
            setFulfillmentPriceData(initialPrices);
            setWeighedItemIds(initialWeighedIds);
        } else {
            setEditDate('');
            setEditTime('');
            setEditNotes('');
            setFulfillmentData({});
            setFulfillmentPriceData({});
            setWeighedItemIds([]);
        }
    }, [selectedOrder]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [showSearch, setShowSearch] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const { addToast, addRichToast } = useToastStore();
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

    // Suppress parent layout scroll only for list view; unlock natural scrolling when order is selected
    useEffect(() => {
        const parent = document.querySelector('main');
        if (parent) {
            const originalOverflow = parent.style.overflow;
            const originalHeight = parent.style.height;
            const originalMaxHeight = parent.style.maxHeight;
            const originalPaddingBottom = parent.style.paddingBottom;

            const handleResize = () => {
                const isMobile = window.innerWidth < 1024;
                if (!selectedOrder) {
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
                } else {
                    parent.style.overflow = 'auto';
                    parent.style.height = 'auto';
                    parent.style.maxHeight = 'none';
                    parent.style.paddingBottom = isMobile ? '80px' : '0px';
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
    }, [selectedOrder]);

    const prevOrdersRef = useRef<Order[]>([]);

    const fetchOrders = (isSilent = false) => {
        fetch(`${API_URL}/api/admin/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error(`Error ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (prevOrdersRef.current.length > 0 && isSilent) {
                    // Check for NEW orders
                    const newOrders = data.filter((o: any) => !prevOrdersRef.current.some((old: any) => old.id === o.id));
                    newOrders.forEach((newOrd: any) => {
                        const nameStr = newOrd.customerName || newOrd.user?.name || 'Cliente';
                        const totalStr = ((newOrd.finalTotal || newOrd.estimatedTotal) / 100).toFixed(2);
                        const methodStr = newOrd.deliveryMethod === 'DELIVERY' ? '🚚 Consegna a Domicilio' : '🏪 Ritiro in Negozio';
                        const dateStr = newOrd.scheduledDate ? newOrd.scheduledDate.split('-').reverse().join('/') : 'In giornata';
                        addRichToast(
                            `🛒 Nuovo Ordine Ricevuto #${newOrd.id}`,
                            `• Cliente: ${nameStr}\n• Importo: € ${totalStr}\n• Modalità: ${methodStr}\n• Data: ${dateStr}`,
                            'info',
                            9000
                        );
                    });

                    // Check for CUSTOMER APPROVAL / REJECTION status changes
                    data.forEach((freshOrd: any) => {
                        const oldOrd: any = prevOrdersRef.current.find((o: any) => o.id === freshOrd.id);
                        if (oldOrd && oldOrd.approvalStatus !== freshOrd.approvalStatus) {
                            const nameStr = freshOrd.customerName || freshOrd.user?.name || 'Cliente';
                            const totalStr = ((freshOrd.finalTotal || freshOrd.estimatedTotal) / 100).toFixed(2);
                            if (freshOrd.approvalStatus === 'CUSTOMER_APPROVED') {
                                addRichToast(
                                    `✅ Pesatura Confermata dal Cliente!`,
                                    `• Ordine: #${freshOrd.id}\n• Cliente: ${nameStr}\n• Totale Pesato: € ${totalStr}\n• Il cliente ha accettato la variazione via WhatsApp/Email!`,
                                    'success',
                                    9000
                                );
                            } else if (freshOrd.approvalStatus === 'CUSTOMER_REJECTED') {
                                addRichToast(
                                    `⚠️ Contestazione Pesatura Cliente`,
                                    `• Ordine: #${freshOrd.id}\n• Cliente: ${nameStr}\n• Il cliente ha segnalato la variazione. Verificare la chat o contattarlo al telefono.`,
                                    'warning',
                                    9000
                                );
                            }
                        }
                    });
                }

                prevOrdersRef.current = data;
                setOrders(data);

                if (selectedOrder) {
                    const freshSelected = data.find((o: any) => o.id === selectedOrder.id);
                    if (freshSelected) {
                        if (
                            freshSelected.status !== selectedOrder.status ||
                            (freshSelected as any).approvalStatus !== (selectedOrder as any).approvalStatus ||
                            (freshSelected as any).customerApprovedAt !== (selectedOrder as any).customerApprovedAt
                        ) {
                            setSelectedOrder(freshSelected);
                        }
                    }
                }
            })
            .catch(err => {
                console.error('Fetch error:', err);
                if (!isSilent) {
                    addToast('Impossibile caricare gli ordini.', 'error');
                }
            });
    };

    useEffect(() => {
        fetchOrders();

        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource(`${API_URL}/api/admin/events/stream`);

            eventSource.addEventListener('order_created', (e: MessageEvent) => {
                try {
                    const newOrd = JSON.parse(e.data);
                    const nameStr = newOrd.customerName || newOrd.user?.name || 'Cliente';
                    const totalStr = ((newOrd.finalTotal || newOrd.estimatedTotal) / 100).toFixed(2);
                    const methodStr = newOrd.deliveryMethod === 'DELIVERY' ? '🚚 Consegna a Domicilio' : '🏪 Ritiro in Negozio';
                    const dateStr = newOrd.scheduledDate ? newOrd.scheduledDate.split('-').reverse().join('/') : 'In giornata';

                    addRichToast(
                        `⚡ [LIVE] Nuovo Ordine Ricevuto #${newOrd.id}`,
                        `• Cliente: ${nameStr}\n• Importo: € ${totalStr}\n• Modalità: ${methodStr}\n• Data: ${dateStr}`,
                        'info',
                        10000
                    );
                    fetchOrders(true);
                } catch (err) {
                    console.error('SSE order_created parse error:', err);
                }
            });

            eventSource.addEventListener('order_approval', (e: MessageEvent) => {
                try {
                    const freshOrd = JSON.parse(e.data);
                    const nameStr = freshOrd.customerName || freshOrd.user?.name || 'Cliente';
                    const totalStr = ((freshOrd.finalTotal || freshOrd.estimatedTotal) / 100).toFixed(2);

                    if (freshOrd.approvalStatus === 'CUSTOMER_APPROVED') {
                        addRichToast(
                            `⚡ [LIVE] Pesatura Confermata dal Cliente!`,
                            `• Ordine: #${freshOrd.id}\n• Cliente: ${nameStr}\n• Totale Pesato: € ${totalStr}\n• Il cliente ha appena accettato la variazione via WhatsApp/Email!`,
                            'success',
                            10000
                        );
                    } else if (freshOrd.approvalStatus === 'CUSTOMER_REJECTED') {
                        addRichToast(
                            `⚡ [LIVE] Contestazione Pesatura Cliente`,
                            `• Ordine: #${freshOrd.id}\n• Cliente: ${nameStr}\n• Il cliente ha segnalato la variazione. Verificare la chat o contattarlo al telefono.`,
                            'warning',
                            10000
                        );
                    }
                    fetchOrders(true);
                } catch (err) {
                    console.error('SSE order_approval parse error:', err);
                }
            });

            eventSource.addEventListener('order_updated', () => {
                fetchOrders(true);
            });
        } catch (sseErr) {
            console.error('SSE connection error:', sseErr);
        }

        const interval = setInterval(() => {
            fetchOrders(true);
        }, 10000);

        return () => {
            if (eventSource) eventSource.close();
            clearInterval(interval);
        };
    }, [token]);

    const handleSelectOrder = (order: Order) => {
        setSelectedOrder(order);
        const initialData: Record<number, number> = {};
        const initialPriceData: Record<number, number> = {};
        order.items.forEach(item => {
            const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
            const defaultQty = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);
            initialData[item.id] = Number(item.quantityFulfilled !== null && item.quantityFulfilled !== undefined ? item.quantityFulfilled : defaultQty);
            initialPriceData[item.id] = Number((item.priceAtPurchase || item.product.priceCents) / 100);
        });
        setFulfillmentData(initialData);
        setFulfillmentPriceData(initialPriceData);
    };

    const handleOpenSingleItemWeighing = (item: any) => {
        const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
        const defaultQty = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);
        const currentWeight = fulfillmentData[item.id] !== undefined ? fulfillmentData[item.id] : (item.quantityFulfilled !== null && item.quantityFulfilled !== undefined ? Number(item.quantityFulfilled) : defaultQty);
        const currentUnitPrice = fulfillmentPriceData[item.id] !== undefined ? fulfillmentPriceData[item.id] : ((item.priceAtPurchase || item.product.priceCents) / 100);

        setWeighingItemModal({
            isOpen: true,
            item,
            tempWeight: currentWeight,
            tempUnitPrice: currentUnitPrice
        });
    };

    const handleSaveSingleItemWeighing = () => {
        if (!weighingItemModal.item || !selectedOrder) return;
        const itemId = weighingItemModal.item.id;
        const weightNum = parseFloat(String(weighingItemModal.tempWeight)) || 0;
        const priceNum = parseFloat(String(weighingItemModal.tempUnitPrice)) || 0;

        setFulfillmentData(prev => ({ ...prev, [itemId]: weightNum }));
        setFulfillmentPriceData(prev => ({ ...prev, [itemId]: priceNum }));
        setWeighedItemIds(prev => Array.from(new Set([...prev, itemId])));

        addToast(`Peso registrato per ${weighingItemModal.item.product.name}!`, 'info');
        setWeighingItemModal({ isOpen: false, item: null, tempWeight: '', tempUnitPrice: '' });
    };

    const handleFulfill = async () => {
        if (!selectedOrder) return;

        const items = selectedOrder.items.map(item => {
            const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
            const defaultQty = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);
            const qty = typeof fulfillmentData[item.id] === 'number'
                ? fulfillmentData[item.id]
                : (((fulfillmentData[item.id] as any) === '' ? 0 : (item.quantityFulfilled || defaultQty)) as number);

            const priceEuro = typeof fulfillmentPriceData[item.id] === 'number'
                ? fulfillmentPriceData[item.id]
                : (((fulfillmentPriceData[item.id] as any) === '' ? 0 : ((item.priceAtPurchase || item.product.priceCents) / 100)) as number);

            return {
                orderItemId: item.id,
                quantityFulfilled: isNaN(Number(qty)) ? 0 : Number(qty),
                priceAtPurchase: isNaN(Number(priceEuro)) ? item.priceAtPurchase : Math.round(Number(priceEuro) * 100)
            };
        });

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
                const responseData = await res.json();
                const updatedOrder = responseData.id ? responseData : responseData.order;
                setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                setSelectedOrder(updatedOrder);

                if (responseData.requiresApproval) {
                    addRichToast(
                        `⚖️ Pesatura Salvata - Approvazione Richiesta`,
                        `• Ordine: #${updatedOrder.id}\n• Cliente: ${updatedOrder.customerName || updatedOrder.user?.name || 'Cliente'}\n• Variazione: +${responseData.diffPercent}%\n• Inviato link di approvazione via WhatsApp!`,
                        'warning',
                        8000
                    );
                } else {
                    addRichToast(
                        `⚖️ Pesatura & Prezzi Salvati!`,
                        `• Ordine: #${updatedOrder.id}\n• Cliente: ${updatedOrder.customerName || updatedOrder.user?.name || 'Cliente'}\n• Totale Finale: € ${((updatedOrder.finalTotal || updatedOrder.estimatedTotal) / 100).toFixed(2)}\n• Notifica di completamento pesatura inviata al cliente.`,
                        'success',
                        7000
                    );
                }
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
                WEIGHING_COMPLETED: 'Pesato',
                OUT_FOR_DELIVERY: 'In Consegna (Spedito)',
                DELIVERED: 'Concluso / Consegnato',
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

                const statusLabels: Record<string, string> = {
                    PENDING: 'In Attesa',
                    WEIGHING_COMPLETED: 'Pesato (Pronto per spedizione)',
                    OUT_FOR_DELIVERY: 'In Consegna (Spedito)',
                    DELIVERED: 'Concluso / Consegnato',
                    CANCELLED: 'Annullato'
                };
                const nameStr = updatedOrder.customerName || updatedOrder.user?.name || 'Cliente';
                addRichToast(
                    `📋 Stato Ordine #${updatedOrder.id} Aggiornato`,
                    `• Cliente: ${nameStr}\n• Nuovo Stato: ${statusLabels[updatedOrder.status] || updatedOrder.status}\n• Modifica registrata ed in sync col sistema.`,
                    'success',
                    6000
                );
            } else {
                addToast('Errore durante l\'aggiornamento dello stato.', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore di connessione al server.', 'error');
        }
    };

    const handleResendApproval = async (orderId: number) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/resend-approval`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const targetOrd: any = orders.find(o => o.id === orderId) || selectedOrder;
                const nameStr = targetOrd ? (targetOrd.customerName || targetOrd.user?.name || 'Cliente') : 'Cliente';
                addRichToast(
                    `📲 Sollecito WhatsApp Inviato!`,
                    `• Ordine: #${orderId}\n• Destinatario: ${nameStr}\n• Link di approvazione pesatura reinviato con successo al cliente!`,
                    'info',
                    6000
                );
            } else {
                const errData = await res.json();
                addToast(`Errore: ${errData.error || 'Invio fallito'}`, 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Errore durante l\'invio del sollecito.', 'error');
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

    const handleSaveSchedule = async (newDate: string, newTime: string) => {
        if (!selectedOrder) return;
        setIsSavingEdits(true);
        try {
            const resSchedule = await fetch(`${API_URL}/api/admin/orders/${selectedOrder.id}/schedule`, {
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

            if (resSchedule.ok) {
                const updatedOrder = await resSchedule.json();
                setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                setSelectedOrder(updatedOrder);
                setEditDate(updatedOrder.scheduledDate || '');
                setEditTime(updatedOrder.scheduledTime || '');
                addToast('Pianificazione salvata con successo!', 'success');
            } else {
                const data = await resSchedule.json();
                throw new Error(data.error || 'Impossibile salvare la pianificazione.');
            }
        } catch (err: any) {
            console.error(err);
            addToast(err.message || 'Errore durante il salvataggio.', 'error');
        } finally {
            setIsSavingEdits(false);
        }
    };

    const calculateCurrentTotal = () => {
        if (!selectedOrder) return 0;
        const itemsTotal = selectedOrder.items.reduce((acc, item) => {
            const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
            const itemEstQtyKg = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);
            const qty = typeof fulfillmentData[item.id] === 'number'
                ? fulfillmentData[item.id]
                : (((fulfillmentData[item.id] as any) === '' ? 0 : (item.quantityFulfilled || itemEstQtyKg)) as number);

            const unitPriceEuro = typeof fulfillmentPriceData[item.id] === 'number'
                ? fulfillmentPriceData[item.id]
                : (((fulfillmentPriceData[item.id] as any) === '' ? 0 : ((item.priceAtPurchase || item.product.priceCents) / 100)) as number);

            return acc + (unitPriceEuro * 100 * qty);
        }, 0);

        const shipping = (selectedOrder as any).shippingCost || 0;
        return Math.round(itemsTotal + shipping);
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
        <div className={`flex flex-col ${selectedOrder ? 'w-full' : 'h-full bg-gray-50 -m-5 lg:-m-8 p-5 lg:p-8 overflow-hidden'}`}>
            {!selectedOrder && (
                <div className="space-y-3 lg:space-y-6 mb-3 lg:mb-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestione Ordini</h1>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <p className="text-gray-500 text-sm font-medium">Gestisci le pesature e monitora lo stato delle consegne.</p>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-xs" title="Aggiornamento automatico attivo ogni 15 secondi">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Live Sync (15s)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        fetchOrders(false);
                                        addToast('Ordini aggiornati con successo!', 'success');
                                    }}
                                    className="text-xs font-black text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs"
                                >
                                    🔄 Aggiorna Ora
                                </button>
                            </div>
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
            )}

            {/* Orders list: visible ONLY when no order is selected */}
            {!selectedOrder && (
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <div className="flex flex-col h-full min-h-0 flex-1 w-full">
                        <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:auto-rows-max lg:content-start overflow-y-auto pr-2 custom-scrollbar flex-1 pb-28 lg:pb-4">
                            {isMultiSelectActive && filteredOrders.length > 0 && (
                                <div 
                                    onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                    className="lg:col-span-2 flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-100 mb-2 select-none cursor-pointer hover:border-nature-200 transition-all shadow-sm shrink-0 animate-in fade-in duration-200"
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
                                <div className="lg:col-span-2 flex flex-col items-center justify-center py-20 text-gray-400">
                                    <ShoppingBag size={48} className="mb-4 opacity-50" />
                                    <p>Nessun ordine trovato</p>
                                </div>
                            )}
                            {filteredOrders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => handleSelectOrder(order)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between gap-3 shrink-0 min-h-[130px] ${
                                        (selectedOrder as Order | null)?.id === order.id
                                            ? 'bg-gradient-to-br from-emerald-50/70 via-white to-gray-50/50 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                                            : 'bg-white border-gray-200/90 hover:border-emerald-300 hover:shadow-md'
                                    }`}
                                >
                                    {/* Checkbox for multiple selection */}
                                    {isMultiSelectActive && (
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}
                                            className="absolute top-3 left-3 z-10 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(order.id)}
                                                readOnly
                                                className="w-4.5 h-4.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer pointer-events-none"
                                            />
                                        </div>
                                    )}

                                    {/* Header Row: ID + Customer Name + Timestamp + Status Badge */}
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 bg-emerald-100/80 text-emerald-900 border border-emerald-200/80 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                                                #{order.id}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-gray-900 text-base leading-tight truncate" title={order.customerName || order.user?.name || 'Cliente'}>
                                                    {order.customerName || order.user?.name || 'Cliente'}
                                                </h3>
                                                <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                                                    {new Date(order.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            <StatusBadge status={order.status} />
                                        </div>
                                    </div>

                                    {/* Middle Row: Scheduled Slot Pill */}
                                    {order.scheduledDate && (
                                        <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-indigo-950 font-bold">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={13} className="text-indigo-600 shrink-0" />
                                                <span>Pianificato: <strong>{order.scheduledDate.split('-').reverse().join('/')}</strong></span>
                                            </span>
                                            {order.scheduledTime && (
                                                <span className="text-[11px] text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs font-bold">
                                                    {order.scheduledTime.includes('-') ? `Fascia: ${order.scheduledTime}` : `alle ${order.scheduledTime}`}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Customer Weight Approval Status Pill (AT-A-GLANCE CRITICAL TAG) */}
                                    {((order as any).approvalStatus || (order.status === 'WEIGHING_COMPLETED' || order.status === 'WEIGNING_COMPLETED')) && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {(order as any).approvalStatus === 'AWAITING_CUSTOMER_APPROVAL' && (
                                                <span className="px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs animate-pulse">
                                                    ⏳ In Attesa Approvazione Pesatura Cliente
                                                </span>
                                            )}
                                            {(order as any).approvalStatus === 'CUSTOMER_APPROVED' && (
                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs">
                                                    ✅ Pesatura Approvata dal Cliente
                                                </span>
                                            )}
                                            {(order as any).approvalStatus === 'CUSTOMER_REJECTED' && (
                                                <span className="px-2.5 py-1 bg-rose-100 text-rose-950 border border-rose-300 rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs">
                                                    ❌ Pesatura Contestata dal Cliente
                                                </span>
                                            )}
                                            {(order as any).approvalStatus === 'AUTO_APPROVED' && (
                                                <span className="px-2.5 py-1 bg-sky-100 text-sky-950 border border-sky-300 rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs">
                                                    ⚡ Tolleranza Pesatura OK (≤ 10%)
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer Row: Shipping Method Badge + Payment Tag + Total Price */}
                                    <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 mt-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Delivery vs Pickup */}
                                            <span className="flex items-center gap-1 text-[11px] font-bold bg-gray-100/90 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/80">
                                                {order.deliveryMethod === 'DELIVERY' ? <Truck size={12} className="text-emerald-600" /> : <Scale size={12} className="text-amber-600" />}
                                                {order.deliveryMethod === 'DELIVERY' ? 'Domicilio' : 'Ritiro in Negozio'}
                                            </span>

                                            {/* Payment Method */}
                                            {((order as any).transactions?.[0]?.gateway === 'REVOLUT' || (order as any).paymentMethod === 'REVOLUT') ? (
                                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200">
                                                    💳 Online
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                                                    💵 Contanti / POS
                                                </span>
                                            )}
                                        </div>

                                        {/* Total Price */}
                                        <div className="text-right">
                                            <span className="text-lg font-black text-gray-900 leading-none block">
                                                € {((order.finalTotal || order.estimatedTotal) / 100).toFixed(2)}
                                            </span>
                                            {!order.finalTotal && (
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">
                                                    Stimato
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Dedicated Detail View: 2-Column Desktop Layout (Option A) & Responsive Mobile Tabs */}
            {selectedOrder && (() => {
                const weighedCount = selectedOrder.items.filter(item => weighedItemIds.includes(item.id) || (item.quantityFulfilled !== null && item.quantityFulfilled !== undefined)).length;
                const totalItemsCount = selectedOrder.items.length;
                const weighingPercentage = totalItemsCount > 0 ? Math.round((weighedCount / totalItemsCount) * 100) : 0;
                const unweighedItems = selectedOrder.items.filter(i => !weighedItemIds.includes(i.id) && i.quantityFulfilled === null);

                {/* Sub-component: Products List Card */}
                const renderProductsCard = () => (
                    <div className="bg-white border border-gray-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
                        {/* Header with Title + Progress */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">
                                        Elenco Prodotti Ordinati ({totalItemsCount})
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                        weighedCount === totalItemsCount
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-900'
                                    }`}>
                                        {weighedCount}/{totalItemsCount} Pesati
                                    </span>
                                </div>
                                <p className="text-xs font-medium text-gray-400 mt-0.5">
                                    Verifica, pesa e modifica i consuntivi articolo per articolo
                                </p>
                            </div>

                            {/* Progress Bar & Quick Action */}
                            <div className="flex items-center gap-3">
                                <div className="w-32 sm:w-40">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                                        <span>Avanzamento</span>
                                        <span>{weighingPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${weighingPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                {selectedOrder.status === 'PENDING' && unweighedItems.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenSingleItemWeighing(unweighedItems[0])}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                                        title="Pesa subito il prossimo articolo"
                                    >
                                        <Scale size={13} />
                                        <span>Pesa Prossimo</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Product Rows List */}
                        <div className="space-y-2.5">
                            {selectedOrder.items.map(item => {
                                const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
                                const itemEstQtyKg = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);
                                const itemEstCost = (item.product.priceCents * itemEstQtyKg) / 100;

                                const isWeighed = weighedItemIds.includes(item.id) || (item.quantityFulfilled !== null && item.quantityFulfilled !== undefined);
                                const currentQty = typeof fulfillmentData[item.id] === 'number'
                                    ? fulfillmentData[item.id]
                                    : (item.quantityFulfilled !== null && item.quantityFulfilled !== undefined ? Number(item.quantityFulfilled) : itemEstQtyKg);

                                const currentUnitPrice = typeof fulfillmentPriceData[item.id] === 'number'
                                    ? fulfillmentPriceData[item.id]
                                    : ((item.priceAtPurchase || item.product.priceCents) / 100);

                                const isPriceModified = currentUnitPrice !== (item.product.priceCents / 100);
                                const itemActualCost = currentQty * currentUnitPrice;

                                const qtyDiff = Number((currentQty - itemEstQtyKg).toFixed(2));
                                const priceDiff = Number((itemActualCost - itemEstCost).toFixed(2));

                                return (
                                    <div
                                        key={item.id}
                                        className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-2xl border transition-all duration-200 gap-3 shadow-2xs ${
                                            isWeighed
                                                ? 'bg-emerald-50/40 border-emerald-250 hover:border-emerald-300'
                                                : 'bg-white border-gray-200/90 hover:border-gray-300'
                                        }`}
                                    >
                                        {/* Left part: compact thumbnail + details */}
                                        <div className="flex items-center gap-3.5 min-w-0 flex-1 w-full sm:w-auto">
                                            {/* Compact Thumbnail with status badge */}
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50/60 border border-emerald-100 shrink-0 overflow-hidden relative flex items-center justify-center">
                                                {item.product.imageUrl ? (
                                                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <span className="text-2xl select-none">🍏</span>
                                                )}
                                                <span
                                                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-xs ${
                                                        isWeighed ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
                                                    }`}
                                                    title={isWeighed ? 'Prodotto Pesato' : 'Da Pesare'}
                                                >
                                                    {isWeighed ? '✓' : '⚖'}
                                                </span>
                                            </div>

                                            {/* Details */}
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-[10px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md border border-gray-200">
                                                        #{item.product.id}
                                                    </span>
                                                    <h4 className="font-black text-sm sm:text-base text-gray-900 truncate" title={item.product.name}>
                                                        {item.product.name}
                                                    </h4>
                                                    {item.product.category?.name && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                                                            {item.product.category.name}
                                                        </span>
                                                    )}
                                                    {item.product.origin && (
                                                        <span className="text-[10px] font-medium text-gray-500">
                                                            Origine: <strong className="text-gray-700">{item.product.origin}</strong>
                                                        </span>
                                                    )}
                                                    {isPriceModified && (
                                                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-900 text-[9px] font-black rounded-md border border-indigo-200 uppercase tracking-wider">
                                                            Prezzo Modificato
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-gray-600 font-bold flex-wrap">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded-lg text-gray-800 font-black text-[11px]">
                                                        Richiesto: {item.quantityOrdered} {item.product.unitType.toLowerCase()}
                                                    </span>
                                                    <span className="text-gray-400 text-[11px] font-medium">
                                                        (Base: € {(item.product.priceCents / 100).toFixed(2)}/{isPieceVariableWeight ? 'kg' : item.product.unitType.toLowerCase()})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right part: metric card + action button */}
                                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                            {/* Consuntivo / Stima Box */}
                                            <div className="text-right bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-2xs">
                                                <span className="text-[9px] font-black uppercase tracking-wider block text-gray-400">
                                                    {isWeighed ? 'Consuntivo Pesato' : 'Stima Richiesta'}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {isWeighed && qtyDiff !== 0 && (
                                                        <span className="line-through text-red-400 font-bold text-xs" title={`Richiesto: ${itemEstQtyKg}`}>
                                                            {itemEstQtyKg}
                                                        </span>
                                                    )}
                                                    <span className="font-black text-xs sm:text-sm text-gray-900">
                                                        {currentQty} {isPieceVariableWeight ? 'kg' : item.product.unitType.toLowerCase()}
                                                    </span>
                                                    <span className={`font-black text-xs px-2 py-0.5 rounded-lg border ${
                                                        isWeighed
                                                            ? 'text-emerald-900 bg-emerald-50 border-emerald-200'
                                                            : 'text-gray-700 bg-gray-50 border-gray-200'
                                                    }`}>
                                                        € {itemActualCost.toFixed(2)}
                                                    </span>
                                                    {isWeighed && priceDiff > 0 && <span className="text-[10px] font-black text-emerald-700">↑</span>}
                                                    {isWeighed && priceDiff < 0 && <span className="text-[10px] font-black text-amber-800">↓</span>}
                                                </div>
                                            </div>

                                            {/* Action Button (PENDING only) */}
                                            {selectedOrder.status === 'PENDING' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenSingleItemWeighing(item)}
                                                    className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
                                                        isWeighed
                                                            ? 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50 active:scale-95'
                                                    }`}
                                                >
                                                    <Scale size={14} />
                                                    <span>{isWeighed ? 'Modifica' : 'Pesa'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

                {/* Sub-component: Customer, Schedule & Notes Sidebar Panel */}
                const renderCustomerSidebar = () => (
                    <div className="space-y-4">
                        {/* Customer Information Card */}
                        <div className="bg-white rounded-3xl p-5 border border-emerald-150/80 shadow-xs space-y-3.5">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                    <span>👤</span> Dati Cliente
                                </span>
                                {selectedOrder.customerPhone && (
                                    <a
                                        href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-xl flex items-center gap-1 shadow-2xs transition-all"
                                        title="Chatta su WhatsApp"
                                    >
                                        <MessageCircle size={13} /> WhatsApp
                                    </a>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nome Cliente</span>
                                    <p className="font-black text-base text-gray-900">{selectedOrder.customerName || selectedOrder.user?.name || 'Cliente'}</p>
                                </div>

                                {selectedOrder.customerPhone && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Telefono</span>
                                        <a href={`tel:${selectedOrder.customerPhone}`} className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1.5">
                                            <Phone size={13} /> {selectedOrder.customerPhone}
                                        </a>
                                    </div>
                                )}

                                {(selectedOrder.customerEmail || selectedOrder.user?.email) && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email</span>
                                        <a href={`mailto:${selectedOrder.customerEmail || selectedOrder.user?.email}`} className="text-xs font-bold text-gray-600 hover:underline flex items-center gap-1.5 truncate">
                                            <Mail size={13} /> {selectedOrder.customerEmail || selectedOrder.user?.email}
                                        </a>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Destinazione</span>
                                    <div className="flex items-start gap-1.5 mt-0.5">
                                        <MapPin size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                                        <span className="text-xs font-black text-gray-800 leading-snug">
                                            {selectedOrder.shippingAddress || (selectedOrder.deliveryMethod === 'PICKUP' ? 'Ritiro in Negozio' : 'Indirizzo non specificato')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scheduling & Slot Card */}
                        <div className="bg-white rounded-3xl p-5 border border-blue-150/80 shadow-xs space-y-3.5">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                                    <span>🗓️</span> Consegna / Ritiro
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTempModalDate(editDate);
                                        setTempModalTime(editTime);
                                        setIsScheduleModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] rounded-xl shadow-2xs transition-all cursor-pointer"
                                >
                                    Pianifica
                                </button>
                            </div>

                            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                                <span className="text-[10px] font-black text-blue-800/80 uppercase tracking-wider block">Fascia Oraria Pianificata</span>
                                <span className="font-black text-sm text-blue-950 block mt-0.5">
                                    {editDate ? `🗓️ ${editDate.split('-').reverse().join('/')} ${editTime ? `(${editTime})` : ''}` : 'Non Programmato'}
                                </span>
                            </div>

                            <div className="text-[11px] text-gray-500 font-medium">
                                Modalità: <strong className="text-gray-800">{selectedOrder.deliveryMethod === 'DELIVERY' ? '🚚 Consegna a Domicilio' : '🏪 Ritiro in Negozio'}</strong>
                            </div>
                        </div>

                        {/* Internal Admin Notes Card */}
                        <div className="bg-white rounded-3xl p-5 border border-amber-150/80 shadow-xs space-y-3">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-900 block">
                                📝 Note Interne Admin
                            </span>
                            <textarea
                                className="w-full p-3 bg-amber-50/40 border border-amber-200/90 rounded-2xl text-xs focus:ring-2 focus:ring-amber-400 outline-none resize-y min-h-[75px] text-gray-800 font-bold leading-relaxed"
                                placeholder="Note ad uso esclusivo dello staff..."
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                            />
                            {selectedOrder && (editDate !== (selectedOrder.scheduledDate || '') || editTime !== (selectedOrder.scheduledTime || '') || editNotes !== (selectedOrder.adminNotes || '')) && (
                                <div className="pt-2 flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-black text-amber-800">Modifiche non salvate</span>
                                    <button
                                        type="button"
                                        onClick={handleSaveAllEdits}
                                        disabled={isSavingEdits}
                                        className="px-3 py-1.5 bg-nature-600 hover:bg-nature-700 text-white font-black text-xs rounded-xl shadow-2xs cursor-pointer transition-all disabled:opacity-50"
                                    >
                                        {isSavingEdits ? 'Salvataggio...' : 'Salva Note'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Order Info & Payment Card */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs space-y-2.5 text-xs">
                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block pb-2 border-b border-gray-100">
                                Dettagli Pagamento
                            </span>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 font-medium">Metodo</span>
                                {((selectedOrder as any).transactions?.[0]?.gateway === 'REVOLUT' || (selectedOrder as any).paymentMethod === 'REVOLUT') ? (
                                    <span className="font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-[11px]">
                                        💳 Revolut Pay Online
                                    </span>
                                ) : (
                                    <span className="font-black text-emerald-950 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px]">
                                        💵 Contanti / POS
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                                <span className="text-gray-500 font-medium">Ricezione</span>
                                <span className="font-bold text-gray-800 text-[11px]">{new Date(selectedOrder.createdAt).toLocaleString('it-IT')}</span>
                            </div>
                        </div>
                    </div>
                );

                return (
                    <div className="w-full space-y-6 pb-6 animate-in fade-in duration-200">
                        {/* Main White Order Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 p-4 sm:p-6 lg:p-7 space-y-6">
                            {/* Header: Back Button + Order ID + Status + Payment Method + Total Pill */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOrder(null)}
                                        className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs rounded-xl border border-gray-200 transition-all cursor-pointer shadow-2xs hover:border-gray-300"
                                        title="Torna all'elenco ordini"
                                    >
                                        <ArrowLeft size={16} /> Torna agli Ordini
                                    </button>
                                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-none tracking-tight">Ordine #{selectedOrder.id}</h2>
                                    {/* Payment Method Badge */}
                                    {((selectedOrder as any).transactions?.[0]?.gateway === 'REVOLUT' || (selectedOrder as any).paymentMethod === 'REVOLUT') ? (
                                        <span className="px-3.5 py-1 bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-full font-black text-xs flex items-center gap-1.5 shadow-2xs">
                                            💳 Revolut Pay Online
                                        </span>
                                    ) : (
                                        <span className="px-3.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-200 rounded-full font-black text-xs flex items-center gap-1.5 shadow-2xs">
                                            💵 Contanti / POS alla Consegna
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="bg-[#052e16] text-white px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-2 border border-emerald-900">
                                        <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider">Totale</span>
                                        <span className="text-sm font-black text-white">
                                            € {((selectedOrder.finalTotal || calculateCurrentTotal()) / 100).toFixed(2)}
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider hidden sm:inline">Stato:</span>
                                    <StatusBadge status={selectedOrder.status} />
                                </div>
                            </div>

                            {/* Customer Approval Status Alert Box (if active) */}
                            {(selectedOrder as any).approvalStatus && ['AWAITING_CUSTOMER_APPROVAL', 'CUSTOMER_APPROVED', 'CUSTOMER_REJECTED'].includes((selectedOrder as any).approvalStatus) && (
                                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
                                    (selectedOrder as any).approvalStatus === 'AWAITING_CUSTOMER_APPROVAL'
                                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                                        : (selectedOrder as any).approvalStatus === 'CUSTOMER_APPROVED'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                        : 'bg-red-50 border-red-300 text-red-950'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl shrink-0">
                                            {(selectedOrder as any).approvalStatus === 'AWAITING_CUSTOMER_APPROVAL' && '⏳'}
                                            {(selectedOrder as any).approvalStatus === 'CUSTOMER_APPROVED' && '✅'}
                                            {(selectedOrder as any).approvalStatus === 'CUSTOMER_REJECTED' && '❌'}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm leading-snug">
                                                {(selectedOrder as any).approvalStatus === 'AWAITING_CUSTOMER_APPROVAL' && 'In Attesa Approvazione Pesatura Cliente'}
                                                {(selectedOrder as any).approvalStatus === 'CUSTOMER_APPROVED' && 'Pesatura Approvata dal Cliente'}
                                                {(selectedOrder as any).approvalStatus === 'CUSTOMER_REJECTED' && 'Pesatura Contestata dal Cliente'}
                                            </h4>
                                            <p className="text-xs font-bold opacity-80 mt-0.5">
                                                {(selectedOrder as any).approvalStatus === 'AWAITING_CUSTOMER_APPROVAL' && 'La variazione supera la soglia di tolleranza. In attesa che il cliente confermi dal link WhatsApp.'}
                                                {(selectedOrder as any).approvalStatus === 'CUSTOMER_APPROVED' && `Confermata il ${(selectedOrder as any).customerApprovedAt ? new Date((selectedOrder as any).customerApprovedAt).toLocaleString('it-IT') : 'recente'}.`}
                                                {(selectedOrder as any).approvalStatus === 'CUSTOMER_REJECTED' && 'Il cliente ha richiesto assistenza o contestato la variazione.'}
                                            </p>
                                        </div>
                                    </div>

                                    {(selectedOrder as any).approvalStatus === 'AWAITING_CUSTOMER_APPROVAL' && (
                                        <button
                                            type="button"
                                            onClick={() => handleResendApproval(selectedOrder.id)}
                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                                        >
                                            📲 Sollecita WhatsApp
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* MOBILE TABS (< lg only) */}
                            <div className="lg:hidden flex items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-2xl shrink-0 border border-gray-200/70 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('items')}
                                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        activeTab === 'items'
                                            ? 'bg-white text-nature-950 shadow-md border border-gray-200/80 scale-[1.01]'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                                >
                                    <span>🛒</span> Prodotti ({totalItemsCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('customer')}
                                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        activeTab === 'customer'
                                            ? 'bg-white text-nature-950 shadow-md border border-gray-200/80 scale-[1.01]'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                                >
                                    <span>👤</span> Cliente
                                </button>
                            </div>

                            {/* MOBILE CONTENT (< lg): Renders selected tab content */}
                            <div className="lg:hidden space-y-4 pb-12">
                                {activeTab === 'items' && renderProductsCard()}
                                {activeTab === 'customer' && renderCustomerSidebar()}
                            </div>

                            {/* DESKTOP 2-COLUMN VIEW (lg:): Products on Left, Sidebar on Right */}
                            <div className="hidden lg:flex flex-row items-start gap-6 pb-12">
                                {/* Left Column: Products Card */}
                                <div className="flex-1 min-w-0">
                                    {renderProductsCard()}
                                </div>

                                {/* Right Column: Customer & Delivery Sidebar */}
                                <div className="w-80 xl:w-96 shrink-0 sticky top-4 self-start">
                                    {renderCustomerSidebar()}
                                </div>
                            </div>

                            {/* Action Footer (Sticky at bottom-0, docked cleanly with no gap) */}
                            <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 lg:-mx-7 lg:-mb-7 p-4 sm:p-5 rounded-b-3xl shadow-[0_-8px_25px_rgba(0,0,0,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                                <div className="bg-[#052e16] text-white px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-between sm:flex-col sm:justify-center sm:items-start min-w-[140px] shrink-0 border border-emerald-900">
                                    <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider block">Totale {selectedOrder.finalTotal ? 'Finale' : 'Stimato'}</span>
                                    <span className="text-xl font-black text-white leading-none mt-1">
                                        € {((selectedOrder.finalTotal || calculateCurrentTotal()) / 100).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 justify-end flex-1 w-full sm:w-auto flex-wrap">
                                    {/* WhatsApp Button */}
                                    {selectedOrder.customerPhone && (
                                        <a
                                            href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                            title="Apri Chat WhatsApp col Cliente"
                                        >
                                            <MessageCircle size={18} /> WhatsApp
                                        </a>
                                    )}

                                    {/* Action button in PENDING status: Unlocks ONLY when all items are weighed */}
                                    {selectedOrder.status === 'PENDING' && (
                                        selectedOrder.items.every(item => weighedItemIds.includes(item.id) || (item.quantityFulfilled !== null && item.quantityFulfilled !== undefined)) ? (
                                            <button
                                                onClick={handleFulfill}
                                                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer animate-in zoom-in-95"
                                            >
                                                <Scale size={18} /> Conferma Pesatura Generale & Notifica
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (unweighedItems.length > 0) handleOpenSingleItemWeighing(unweighedItems[0]);
                                                }}
                                                className="px-3.5 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                                                title="Clicca per aprire la pesatura del prossimo articolo"
                                            >
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                                </span>
                                                Pesa prodotti rimanenti ({unweighedItems.length})
                                            </button>
                                        )
                                    )}

                                    {selectedOrder.status === 'WEIGHING_COMPLETED' && (
                                        (selectedOrder as any).approvalStatus === 'AWAITING_CUSTOMER_APPROVAL' ? (
                                            <div className="px-4 py-3 bg-amber-50 text-amber-950 border border-amber-300 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xs cursor-not-allowed opacity-90" title="Spedizione bloccata fino all'approvazione del cliente dal link WhatsApp/Email">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                                </span>
                                                🔒 Spedisci Bloccato (In Attesa Approvazione Cliente)
                                            </div>
                                        ) : (
                                            <button onClick={() => handleUpdateStatus('OUT_FOR_DELIVERY')} className="px-4 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer">
                                                <Truck size={18} /> Spedisci
                                            </button>
                                        )
                                    )}

                                    {selectedOrder.status === 'OUT_FOR_DELIVERY' && (
                                        <button onClick={() => handleUpdateStatus('DELIVERED')} className="px-4 py-3 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer">
                                            <CheckCircle size={18} /> Concludi
                                        </button>
                                    )}

                                    {/* Annulla Ordine Button */}
                                    {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
                                        <button onClick={() => handleUpdateStatus('CANCELLED')} className="px-3.5 py-3 text-red-600 font-extrabold hover:bg-red-50 text-xs sm:text-sm rounded-2xl border border-red-200 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer">
                                            <Ban size={16} /> Annulla
                                        </button>
                                    )}

                                    {/* Elimina Ordine Button */}
                                    {selectedOrder.status === 'CANCELLED' && (
                                        <button onClick={() => handleDeleteOrder()} className="px-4 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer">
                                            <Trash2 size={18} /> Elimina Ordine
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {isScheduleModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-nature-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Calendar className="text-blue-350" />
                                <div>
                                    <h3 className="font-black text-lg">Pianifica Appuntamento</h3>
                                    <p className="text-blue-300 text-xs mt-0.5">Ordine #{selectedOrder.id}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsScheduleModalOpen(false)} 
                                className="p-1.5 bg-blue-800 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                            <div className="w-full space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Seleziona Data e Ora</label>
                                <DateTimePicker
                                    date={tempModalDate}
                                    time={tempModalTime}
                                    onChange={(d, t) => {
                                        setTempModalDate(d);
                                        setTempModalTime(t);
                                    }}
                                    inline={true}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 shrink-0">
                            {tempModalDate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTempModalDate('');
                                        setTempModalTime('');
                                    }}
                                    className="w-full sm:w-auto px-4 py-3 bg-red-50 hover:bg-red-105 text-red-600 font-bold text-xs rounded-xl transition-colors uppercase tracking-wider cursor-pointer text-center"
                                >
                                    Rimuovi Pianificazione
                                </button>
                            )}
                            <div className="flex flex-1 gap-3 w-full justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsScheduleModalOpen(false)}
                                    className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 font-bold text-xs rounded-xl transition-colors uppercase tracking-wider cursor-pointer text-center"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleSaveSchedule(tempModalDate, tempModalTime);
                                        setIsScheduleModalOpen(false);
                                    }}
                                    className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-xl shadow transition-colors uppercase tracking-wider cursor-pointer font-black text-center"
                                >
                                    Conferma
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isWeighingOpen && selectedOrder && (
                <div className="fixed inset-0 bg-[#0c2e19]/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-nature-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-nature-900 text-white shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Scale className="text-nature-300 animate-pulse" />
                                <div>
                                    <h3 className="font-black text-lg">Pesatura & Variazioni Prezzo Ordine #{selectedOrder.id}</h3>
                                    <p className="text-nature-300 text-xs mt-0.5">Modifica il peso effettivo o applica variazioni al prezzo unitario per ciascun articolo.</p>
                                </div>
                            </div>
                            <button onClick={() => {
                                const resetQtyData: Record<number, number> = {};
                                const resetPriceData: Record<number, number> = {};
                                selectedOrder.items.forEach(item => {
                                    const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
                                    const defaultQty = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);
                                    resetQtyData[item.id] = Number(item.quantityFulfilled !== null && item.quantityFulfilled !== undefined ? item.quantityFulfilled : defaultQty);
                                    resetPriceData[item.id] = Number((item.priceAtPurchase || item.product.priceCents) / 100);
                                });
                                setFulfillmentData(resetQtyData);
                                setFulfillmentPriceData(resetPriceData);
                                setIsWeighingOpen(false);
                            }} className="p-1.5 bg-nature-800 rounded-lg hover:bg-nature-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {selectedOrder.items.map(item => {
                                const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
                                const itemEstQtyKg = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);
                                const itemActualQty = typeof fulfillmentData[item.id] === 'number' 
                                    ? fulfillmentData[item.id] 
                                    : (((fulfillmentData[item.id] as any) === '' ? 0 : (item.quantityFulfilled || itemEstQtyKg)) as number);
                                const itemEstCost = ((item.priceAtPurchase || item.product.priceCents) * itemEstQtyKg) / 100;
                                const itemUnitPriceEuro = typeof fulfillmentPriceData[item.id] === 'number'
                                    ? fulfillmentPriceData[item.id]
                                    : (((fulfillmentPriceData[item.id] as any) === '' ? 0 : ((item.priceAtPurchase || item.product.priceCents) / 100)) as number);
                                const itemActualCost = itemUnitPriceEuro * itemActualQty;
                                
                                return (
                                    <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-gray-900">{item.product.name}</span>
                                                    {item.product.isVariableWeight && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Peso Variabile</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                                                    Catalogo: € {(item.product.priceCents / 100).toFixed(2)} / {isPieceVariableWeight ? 'kg' : item.product.unitType.toLowerCase()}
                                                    {isPieceVariableWeight && <span className="inline-block ml-1 text-amber-600">(circa {item.product.stepAmount} kg/pz)</span>}
                                                </p>
                                            </div>

                                            {/* Weights info */}
                                            <div className="text-xs text-right">
                                                <p className="text-gray-500 font-medium">Richiesto: <span className="font-bold text-gray-700">{item.quantityOrdered} {item.product.unitType.toLowerCase()}{isPieceVariableWeight ? ` (circa ${itemEstQtyKg.toFixed(1)} kg)` : ''}</span></p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">Costo stimato: € {itemEstCost.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* Controls Row */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-gray-200/60">
                                            {/* Unit price edit control */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-600">Prezzo unitario:</span>
                                                <div className="flex items-center gap-1 bg-blue-50 px-2 py-1.5 rounded-xl border border-blue-200 focus-within:ring-2 focus-within:ring-blue-400 shadow-sm">
                                                    <span className="text-xs font-bold text-blue-700">€</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="w-16 text-right bg-transparent font-black text-blue-900 outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        value={fulfillmentPriceData[item.id] !== undefined ? fulfillmentPriceData[item.id] : ((item.priceAtPurchase || item.product.priceCents) / 100)}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setFulfillmentPriceData({
                                                                ...fulfillmentPriceData,
                                                                [item.id]: val === '' ? '' as any : parseFloat(val)
                                                            });
                                                        }}
                                                    />
                                                    <span className="text-[11px] font-bold text-blue-700">/ {isPieceVariableWeight ? 'kg' : item.product.unitType.toLowerCase()}</span>
                                                </div>
                                            </div>

                                            {/* Quantity/Weight input control */}
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-gray-600 mr-1">{item.product.isVariableWeight ? 'Peso effettivo:' : 'Quantità:'}</span>
                                                    {item.product.isVariableWeight ? (
                                                        <div className="flex items-center gap-1.5">
                                                            {/* Minus Button */}
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const currentVal = Number(fulfillmentData[item.id] !== undefined ? fulfillmentData[item.id] : (item.quantityFulfilled || itemEstQtyKg));
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
                                                                    className="w-14 text-right bg-transparent font-black text-yellow-900 outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    value={fulfillmentData[item.id] !== undefined ? fulfillmentData[item.id] : ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setFulfillmentData({ 
                                                                            ...fulfillmentData, 
                                                                            [item.id]: val === '' ? '' as any : parseFloat(val) 
                                                                        });
                                                                    }}
                                                                />
                                                                <span className="text-xs font-bold text-yellow-700">kg</span>
                                                            </div>

                                                            {/* Plus Button */}
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const currentVal = Number(fulfillmentData[item.id] !== undefined ? fulfillmentData[item.id] : (item.quantityFulfilled || itemEstQtyKg));
                                                                    const newVal = currentVal + 0.1;
                                                                    setFulfillmentData({
                                                                        ...fulfillmentData,
                                                                        [item.id]: parseFloat(newVal.toFixed(2))
                                                                    });
                                                                }}
                                                                className="w-8 h-8 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-950 flex items-center justify-center font-black text-base select-none transition-colors border border-yellow-200 active:scale-90"
                                                                title="Aumenta peso di 0.1 kg"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold">
                                                            {item.quantityOrdered} {item.product.unitType.toLowerCase()}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-[11px] font-black text-nature-700 block">
                                                        Costo effettivo: € {itemActualCost.toFixed(2)}
                                                    </span>
                                                </div>
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
                                    const resetQtyData: Record<number, number> = {};
                                    const resetPriceData: Record<number, number> = {};
                                    selectedOrder.items.forEach(item => {
                                        const isPieceVariableWeight = item.product.isVariableWeight && (item.orderedUnit || item.product.unitType) === 'PZ';
                                        const defaultQty = isPieceVariableWeight ? Number(item.quantityOrdered) * Number(item.product.stepAmount || 1) : Number(item.quantityOrdered);
                                        resetQtyData[item.id] = Number(item.quantityFulfilled !== null && item.quantityFulfilled !== undefined ? item.quantityFulfilled : defaultQty);
                                        resetPriceData[item.id] = Number((item.priceAtPurchase || item.product.priceCents) / 100);
                                    });
                                    setFulfillmentData(resetQtyData);
                                    setFulfillmentPriceData(resetPriceData);
                                    setIsWeighingOpen(false);
                                }} className="px-4 py-2.5 text-gray-500 font-bold hover:bg-gray-200 text-sm rounded-xl transition-colors">
                                    Annulla
                                </button>
                                <button onClick={async () => {
                                    await handleFulfill();
                                    setIsWeighingOpen(false);
                                }} className="px-5 py-2.5 bg-nature-600 hover:bg-nature-700 text-white font-bold text-sm rounded-xl shadow transition-all flex items-center justify-center gap-1.5">
                                    <Scale size={16} /> Salva Pesatura & Prezzi
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

            {/* Single Product Weighing Modal */}
            {weighingItemModal.isOpen && weighingItemModal.item && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99] animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                                    {weighingItemModal.item.product.imageUrl ? (
                                        <img src={weighingItemModal.item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        '🍏'
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-base text-gray-900 leading-tight">{weighingItemModal.item.product.name}</h3>
                                    <p className="text-xs font-bold text-gray-500 mt-0.5">
                                        Richiesto: {weighingItemModal.item.quantityOrdered} {weighingItemModal.item.product.unitType.toLowerCase()}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setWeighingItemModal({ isOpen: false, item: null, tempWeight: '', tempUnitPrice: '' })} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3.5">
                            <div>
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">
                                    Peso Effettivo Pesato (kg / pz)
                                </label>
                                <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    value={weighingItemModal.tempWeight}
                                    onChange={(e) => setWeighingItemModal({ ...weighingItemModal, tempWeight: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-emerald-300 rounded-2xl text-base font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Inserisci peso..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-1">
                                    Prezzo Unitario (€ / kg o pz)
                                </label>
                                <input
                                    type="number"
                                    step="0.10"
                                    min="0"
                                    value={weighingItemModal.tempUnitPrice}
                                    onChange={(e) => setWeighingItemModal({ ...weighingItemModal, tempUnitPrice: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-blue-300 rounded-2xl text-base font-black text-blue-950 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Inserisci prezzo..."
                                />
                            </div>

                            <div className="bg-nature-950 text-white p-3.5 rounded-2xl flex items-center justify-between">
                                <span className="text-xs font-bold text-nature-300">Costo Totale Prodotto</span>
                                <span className="text-lg font-black">
                                    € {((Number(weighingItemModal.tempWeight) || 0) * (Number(weighingItemModal.tempUnitPrice) || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setWeighingItemModal({ isOpen: false, item: null, tempWeight: '', tempUnitPrice: '' })}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs rounded-2xl transition-all"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveSingleItemWeighing}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <CheckCircle size={16} /> Conferma & Blocca
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
