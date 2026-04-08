import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { useCart } from '../hooks/useCart';
import { useReports } from '../hooks/useReports';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { Camera, Search, ShoppingCart, Plus, Minus, Trash2, LayoutGrid, List, Edit2, Check, ChevronDown, ChevronRight, Store, Loader2 } from 'lucide-react';

const Checkout = () => {
  const { items } = useInventory();
  const { cart, addToCart, updateQuantity, clearCart, cartTotal, cartItemCount } = useCart();
  const { storeName, setStoreName } = useStoreSettings();
  const { addReport, updateReportStatus } = useReports();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  const [isEditingStoreName, setIsEditingStoreName] = useState(false);
  const [tempStoreName, setTempStoreName] = useState('');
  
  // Track collapsed state for categories
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group items by category (default to '未分類' if no category)
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || '未分類';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSaveStoreName = () => {
    if (tempStoreName.trim()) {
      setStoreName(tempStoreName.trim());
    }
    setIsEditingStoreName(false);
  };

  const handleCheckout = async () => {
    // ... (unchanged)
    if (cart.length === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    
    const orderData = {
      orderId: `ORD-${Date.now()}`,
      items: cart,
      totalQuantity: cartItemCount,
      totalAmount: cartTotal
    };

    // 1. Add to local reports immediately (Optimistic UI)
    const report = addReport(orderData);

    try {
      // 2. Send to Google Apps Script
      const gasUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;
      
      if (gasUrl) {
         await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors', // Because Google Sheets API redirects
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData)
        });
        
        // Since we use no-cors, we can't read the response properly, but if fetch doesn't throw, we assume success
        updateReportStatus(report.id, 'synced');
      } else {
        console.warn('VITE_GOOGLE_APP_SCRIPT_URL is not set. Data not sent to Google Sheets.');
        updateReportStatus(report.id, 'error (no config)');
      }

      alert(`結帳成功！總金額：$${cartTotal}`);
      clearCart();
      setIsCartOpen(false);
      navigate('/reports');
    } catch (error) {
      console.error('Checkout error:', error);
      updateReportStatus(report.id, 'error');
      alert('結帳發生錯誤，請稍後再試！');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 relative pb-16">
      {/* Header & Search */}
      <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 flex-1 mr-2">
            <Store className="w-6 h-6 text-green-500" />
            {isEditingStoreName ? (
              <div className="flex items-center gap-1 flex-1">
                <input 
                  type="text"
                  value={tempStoreName}
                  onChange={(e) => setTempStoreName(e.target.value)}
                  className="text-2xl font-bold text-gray-800 border-b border-blue-500 outline-none w-full bg-transparent"
                  autoFocus
                  onBlur={handleSaveStoreName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveStoreName()}
                />
                <button onMouseDown={handleSaveStoreName} className="p-1 text-green-500 hover:bg-green-50 rounded">
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {
                setTempStoreName(storeName);
                setIsEditingStoreName(true);
              }}>
                <h1 className="text-2xl font-bold text-gray-800">{storeName}</h1>
                <Edit2 className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
            )}
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3 text-gray-400 text-sm">
          <ShoppingCart className="w-4 h-4" /> 商品
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="搜尋商品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Product Display by Category */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const isCollapsed = collapsedCategories[category];
          
          return (
            <div key={category}>
              {/* Category Header */}
              <div 
                className="flex items-center gap-2 mb-3 cursor-pointer group select-none"
                onClick={() => toggleCategory(category)}
              >
                <div className="w-1 bg-green-200 h-5 rounded-full"></div>
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
                <h2 className="text-lg font-bold text-gray-700 tracking-wide">{category}</h2>
                <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                  {categoryItems.length}
                </span>
              </div>

              {/* Category Content */}
              {!isCollapsed && (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-4 gap-2">
                    {categoryItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => addToCart(item)}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-95 transition-transform hover:shadow-md flex flex-col relative"
                      >
                        <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-8 h-8 text-gray-300" />
                          )}
                          {item.stock <= 0 && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[1px]">
                              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">售完</span>
                            </div>
                          )}
                        </div>
                        <div className="p-1.5 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800 text-[10px] line-clamp-2 leading-tight mb-0.5">{item.name}</h3>
                            {item.discounts && item.discounts.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 mb-1">
                                {item.discounts.map((rule, idx) => (
                                  <span key={idx} className="bg-pink-100 text-red-500 text-[8px] font-bold px-1 py-px rounded-[2px] flex items-center">
                                    {rule.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <div className="text-green-600 font-bold text-xs">${item.price}</div>
                            <div className="text-[8px] text-green-700 font-medium bg-green-100 px-1 py-0.5 rounded-sm inline-block self-start">
                              剩:{item.stock}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {categoryItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => addToCart(item)}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md"
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-gray-100" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-50 flex items-center justify-center rounded-lg flex-shrink-0 border border-gray-100">
                            <Camera className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-base truncate">{item.name}</h3>
                          {item.discounts && item.discounts.length > 0 && (
                             <div className="flex flex-wrap gap-1 mt-1">
                               {item.discounts.map((rule, idx) => (
                                 <span key={idx} className="bg-pink-100 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                   🏷️ {rule.label}
                                 </span>
                               ))}
                             </div>
                          )}
                          <div className="text-green-600 font-bold mt-1">${item.price}</div>
                        </div>

                        <div className="flex flex-col items-end justify-center h-full gap-1 py-1">
                          {item.stock <= 0 && (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">售完</span>
                          )}
                          <div className="text-[10px] text-green-700 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                            剩: {item.stock}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          );
        })}
        
        {Object.keys(groupedItems).length === 0 && (
          <div className="text-center py-10 text-gray-400">
            找不到商品
          </div>
        )}
      </div>

      {/* Cart Floating Button (Visible when cart has items) */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-gray-900/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900">
                  {cartItemCount}
                </span>
              </div>
              <span className="font-medium">查看購物車</span>
            </div>
            <span className="font-bold text-lg">${cartTotal}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col justify-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-500" />
                購物車 ({cartItemCount})
              </h2>
              <button 
                onClick={clearCart}
                className="text-xs text-red-500 font-medium px-3 py-1.5 bg-red-50 rounded-lg active:bg-red-100 transition"
              >
                清空
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 py-2 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 bg-gray-50 p-3 rounded-2xl items-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-xl" />
                  ) : (
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-gray-300">
                       <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm">{item.name}</h4>
                    <div className="text-blue-600 font-bold text-sm">${item.price}</div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 active:bg-gray-100 rounded-md"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4" />}
                    </button>
                    <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 active:bg-gray-100 rounded-md"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  購物車是空的
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] pb-8 relative">
              <div className="flex justify-between items-end mb-4 px-2">
                <span className="text-gray-500 font-medium">總計</span>
                <span className="text-3xl font-bold text-gray-900">${cartTotal}</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsCartOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-600 bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition"
                >
                  繼續購物
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isSubmitting}
                  className="w-2/3 py-4 flex items-center justify-center rounded-2xl font-bold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-70 disabled:active:bg-blue-600 transition shadow-lg shadow-blue-500/30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 結帳處理中...
                    </>
                  ) : '結帳'}
                </button>
              </div>
              
              {/* Overlay while submitting */}
              {isSubmitting && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 bottom-8 rounded-b-2xl">
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
