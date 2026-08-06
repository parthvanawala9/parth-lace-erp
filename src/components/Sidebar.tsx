import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Clock, 
  Users, 
  Palette, 
  Droplet, 
  Cpu, 
  PlusCircle, 
  ShoppingBag, 
  Layers,
  Truck,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { LOGO_BASE64 } from './LogoData';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const navItems = [
    { name: 'Production Dashboard', path: '/production-dashboard', icon: Clock },
    { name: 'Parties Master', path: '/parties', icon: Users },
    { name: 'Design Master', path: '/designs', icon: Palette },
    { name: 'Colour Master', path: '/colours', icon: Droplet },
    { name: 'Machine Master', path: '/machines', icon: Cpu },
    { name: 'New Order', path: '/orders/new', icon: PlusCircle },
    { name: 'Orders List', path: '/orders', icon: ShoppingBag },
    { name: 'Production Planning', path: '/production-planning', icon: Clock },
    { name: 'Party Program Layout', path: '/party-program-layout', icon: Layers },
    { name: 'Dispatch', path: '/dispatch', icon: Truck },
  ];

  return (
    <>
      {/* Mobile Dark Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:min-h-screen
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64 w-[280px]'}
      `}>
        {/* Header Logo */}
        <div className="flex items-center justify-between h-16 px-4 bg-slate-950 border-b border-slate-800 lg:border-none">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <img 
              src={LOGO_BASE64} 
              alt="PARTH LACE Logo" 
              className="h-9 w-9 object-contain rounded-full flex-shrink-0"
            />
            <span className={`text-lg font-bold tracking-wider text-blue-400 truncate ${isCollapsed ? 'lg:hidden' : ''}`}>
              PARTH LACE
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 px-3 space-y-1 flex-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.path} className="relative group">
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                      isCollapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? 'lg:mr-0 mr-3' : 'mr-3'}`} />
                  <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>
                    {item.name}
                  </span>
                </NavLink>

                {/* Tooltip on Desktop Collapsed Hover */}
                {isCollapsed && (
                  <div className="hidden lg:group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none">
                    {item.name}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Desktop Collapse / Expand Toggle Button */}
        <div className="hidden lg:flex p-3 border-t border-slate-800">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle collapse sidebar"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            <span className={`ml-3 text-sm font-medium ${isCollapsed ? 'hidden' : 'block'}`}>
              Collapse Sidebar
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}