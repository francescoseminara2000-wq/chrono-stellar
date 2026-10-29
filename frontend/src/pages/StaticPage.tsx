import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { BlockRenderer } from '../components/cms/BlockRenderer';

const API_URL = '';

export const StaticPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchPage = async () => {
            try {
                const res = await fetch(`${API_URL}/api/pages/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setPage(data);
                } else {
                    setError('Pagina non trovata');
                }
            } catch (err) {
                console.error("Failed to fetch page", err);
                setError('Errore di connessione');
            } finally {
                setIsLoading(false);
            }
        };

        if (slug) {
            fetchPage();
        }
    }, [slug]);

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nature-600"></div>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="container mx-auto px-4 py-20 text-center min-h-[60vh] flex flex-col justify-center items-center">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">404 - Pagina non trovata</h1>
                <p className="text-gray-600 mb-8">La pagina che cerchi non esiste o è stata rimossa.</p>
                <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-nature-600 text-white rounded-xl font-medium hover:bg-nature-700 transition-colors">
                    <ArrowLeft size={20} />
                    Torna alla Home
                </Link>
            </div>
        );
    }

    const isFirstBlockHero = (() => {
        try {
            const blocks = JSON.parse(page?.content);
            return Array.isArray(blocks) && blocks.length > 0 && blocks[0].type === 'hero';
        } catch {
            return false;
        }
    })();

    return (
        <div className="bg-white min-h-screen pb-16 flex flex-col">
            {!isFirstBlockHero && (
                <div className="container mx-auto px-4 max-w-7xl pt-6 pb-2">
                    <Link to="/" className="inline-flex items-center gap-2 text-nature-700 hover:text-nature-900 transition-colors font-medium bg-nature-50/70 hover:bg-nature-100/70 px-4 py-2 rounded-full border border-nature-200/60 text-sm">
                        <ArrowLeft size={16} />
                        <span>Torna alla Home</span>
                    </Link>
                </div>
            )}

            {/* BlockRenderer handles its own sections/containers */}
            <BlockRenderer content={page.content} />
        </div>
    );
};
