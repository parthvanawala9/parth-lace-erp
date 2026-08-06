import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { LOGO_BASE64 } from './LogoData';

interface NavbarProps {
  onMenuClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Navbar({ onMenuClick, isCollapsed, onToggleCollapse }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger Trigger */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle sidebar collapse"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        
        <img 
          src={LOGO_BASE64} 
          alt="PARTH LACE Logo" 
          className="h-9 w-9 sm:h-12 sm:w-12 object-contain rounded-full lg:hidden"
        />
        
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-none">
            PARTH LACE
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Manufacturing ERP
          </p>
        </div>
      </div>
    </header>
  );
}