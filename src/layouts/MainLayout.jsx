import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Package, FileText, Store } from 'lucide-react';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <main className="flex-grow flex flex-col pt-4 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 mt-auto sticky bottom-0 z-50">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">商品</span>
          </NavLink>

          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <Package className="w-5 h-5" />
            <span className="text-xs font-medium">倉庫</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <Store className="w-5 h-5" />
            <span className="text-xs font-medium">收銀</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
