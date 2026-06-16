import { MapPin, Phone, Facebook, Instagram, Mail } from 'lucide-react';
import { useAppState } from '../store/useAppState';

export const Footer = () => {
    const { settings } = useAppState();

    return (
        <footer className="bg-nature-900 text-nature-100 pt-12 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

                    {/* Brand Info */}
                    <div>
                        <h3 className="font-script text-3xl mb-4 text-white">{settings?.siteName || 'Chrono Stellar'}</h3>
                        <p className="text-nature-100/80 mb-6">
                            Portiamo sulla tua tavola la freschezza e la qualità della migliore frutta e verdura, selezionata con cura ogni giorno.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-white transition-colors"><Facebook /></a>
                            <a href="#" className="hover:text-white transition-colors"><Instagram /></a>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="font-sans font-bold text-lg mb-4 text-white">Contatti & Dove Siamo</h4>
                        <ul className="space-y-4">
                            {settings?.contactAddress && (
                                <li className="flex items-start gap-3">
                                    <MapPin className="shrink-0 text-fruit-500" size={20} />
                                    <span>{settings.contactAddress}</span>
                                </li>
                            )}
                            {settings?.contactPhone && (
                                <li className="flex items-center gap-3">
                                    <Phone className="shrink-0 text-fruit-500" size={20} />
                                    <span>{settings.contactPhone}</span>
                                </li>
                            )}
                            {settings?.contactEmail && (
                                <li className="flex items-center gap-3">
                                    <Mail className="shrink-0 text-fruit-500" size={20} />
                                    <span>{settings.contactEmail}</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Hours */}
                    <div>
                        <h4 className="font-sans font-bold text-lg mb-4 text-white">Orari di Apertura</h4>
                        <p className="text-nature-100/90 whitespace-pre-line leading-relaxed">
                            {settings?.openingHours || 'Lun - Sab: 08:00 - 12:30 / 15:30 - 19:30\nDomenica: Chiuso'}
                        </p>
                    </div>
                </div>

                <div className="border-t border-nature-600/30 mt-12 pt-8 text-center text-sm text-nature-100/60">
                    <p>&copy; {new Date().getFullYear()} {settings?.siteName || 'Chrono Stellar'}. Tutti i diritti riservati.</p>
                </div>
            </div>
        </footer>
    );
};
