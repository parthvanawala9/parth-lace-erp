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
  Truck
} from 'lucide-react';
import { LOGO_BASE64 } from './LogoData';

export default function Sidebar() {
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
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col flex-shrink-0">
      <div className="flex items-center gap-3 h-16 px-6 bg-slate-950">
        <img 
          src={LOGO_BASE64} 
          alt="PARTH LACE Logo" 
          className="h-9 w-9 object-contain rounded-full flex-shrink-0"
        />
        <span className="text-lg font-bold tracking-wider text-blue-400 truncate">
          PARTH LACE
        </span>
      </div>

      <nav className="mt-6 px-4 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}