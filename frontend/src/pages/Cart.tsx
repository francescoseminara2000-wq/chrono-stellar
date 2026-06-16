import { Link } from 'react-router-dom';
import { CartSummary } from '../components/CartSummary';

export const Cart = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
            <h1 className="font-script text-3xl md:text-5xl mb-6 md:mb-8 text-nature-900">Il Tuo Carrello</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <CartSummary />
                </div>
                <div className="bg-nature-50 p-6 rounded-2xl h-fit">
                    <h3 className="font-bold text-xl mb-4 text-nature-900">Riepilogo</h3>
                    <p className="text-gray-600 mb-6 text-sm">Procedi al checkout per scegliere tra ritiro in negozio o consegna a domicilio.</p>
                    <Link to="/checkout" className="block w-full text-center bg-nature-900 text-white font-bold py-3 rounded-xl hover:bg-nature-800 transition-colors shadow-lg">
                        Vai alla Cassa
                    </Link>
                </div>
            </div>
        </div>
    );
};
