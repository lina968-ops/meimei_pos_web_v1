import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { Camera, X, Plus, ChevronDown, ChevronRight, Edit, Lock, Unlock, Loader2, CloudOff } from 'lucide-react';

const Inventory = () => {
  const { items, addItem, updateItem, deleteItem, isLoading, isOffline } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', category: '', price: '', stock: '', image: '', discounts: [] });
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [isAdmin, setIsAdmin] = useState(() => {
    const expire = localStorage.getItem('pos_admin_expire');
    if (expire && Date.now() < parseInt(expire, 10)) {
      return true;
    }
    return false;
  });
  
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '', keepLoggedIn: false });

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || '未分類';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginCreds.username === 'applesheep' && loginCreds.password === 'meimei') {
      setIsAdmin(true);
      if (loginCreds.keepLoggedIn) {
        // Set expiration to 24 hours from now
        localStorage.setItem('pos_admin_expire', Date.now() + 24 * 60 * 60 * 1000);
      }
      setIsLoginOpen(false);
      setLoginCreds({ username: '', password: '', keepLoggedIn: false });
    } else {
      alert('帳號或密碼錯誤！');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('pos_admin_expire');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; // Resize to max 400px width
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Compress to JPEG with 0.7 quality to save space
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setNewItem({ ...newItem, image: compressedBase64 });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItem.name && newItem.price) {
      // Process discounts
      const processedDiscounts = (newItem.discounts || [])
        .filter(rule => rule.qty && rule.price)
        .map(rule => ({
          qty: parseInt(rule.qty, 10),
          price: parseFloat(rule.price),
          label: `${rule.qty}件$${rule.price}`
        }));

      const finalItem = {
        ...newItem,
        category: newItem.category || '未分類',
        price: Number(newItem.price),
        stock: Number(newItem.stock) || 0,
        discounts: processedDiscounts
      };

      if (editItemId) {
        updateItem(editItemId, finalItem);
      } else {
        addItem(finalItem);
      }

      setNewItem({ name: '', category: '', price: '', stock: '', image: '', discounts: [] });
      setEditItemId(null);
      setIsModalOpen(false);
    }
  };

  const openAddModal = () => {
    setEditItemId(null);
    setNewItem({ name: '', category: '', price: '', stock: '', image: '', discounts: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditItemId(item.id);
    setNewItem({ 
      ...item, 
      category: item.category === '未分類' ? '' : item.category,
      discounts: item.discounts ? [...item.discounts] : []
    });
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 p-4 max-w-md mx-auto w-full relative h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">倉庫庫存</h1>
          {isLoading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
          {isOffline && !isLoading && (
            <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-200">
              <CloudOff className="w-3 h-3" /> 本機模式
            </span>
          )}
        </div>
        
        {/* Admin Login / Add Item Button */}
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="text-xs font-bold text-gray-400 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <Unlock className="w-3 h-3" /> 登出
            </button>
            <button 
              onClick={openAddModal}
              className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-95 transition"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="bg-gray-800 text-white px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Lock className="w-4 h-4" /> 管理者登入
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-20 space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const isCollapsed = collapsedCategories[category];
          
          return (
            <div key={category}>
              {/* Category Header */}
              <div 
                className="flex items-center gap-2 mb-3 cursor-pointer group select-none"
                onClick={() => toggleCategory(category)}
              >
                <div className="w-1 bg-blue-200 h-5 rounded-full"></div>
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

              {/* Category Items */}
              {!isCollapsed && (
                <div className="grid gap-3">
                  {categoryItems.map(item => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border border-gray-100">
                      <div className="flex items-center gap-4">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                            <Camera className="w-5 h-5 opacity-50" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          {item.discounts && item.discounts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.discounts.map((rule, idx) => (
                                <span key={idx} className="bg-pink-100 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  {rule.label}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-sm text-gray-500 mt-1">
                            庫存: <span className={item.stock > 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>{item.stock}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-between h-full items-end">
                        <span className="font-bold text-blue-600">${item.price}</span>
                        {isAdmin && (
                          <div className="flex gap-3 mt-2">
                            <button 
                              onClick={() => openEditModal(item)}
                              className="text-xs text-gray-500 hover:text-blue-500 font-medium flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />編輯
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('確定要刪除這筆商品嗎？')) {
                                  deleteItem(item.id);
                                }
                              }}
                              className="text-xs text-red-500 hover:text-red-600 font-medium"
                            >
                              刪除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
           <div className="text-center text-gray-400 mt-10">尚無商品，請點擊右上角新增</div>
        )}
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-1">
              <h2 className="text-xl font-bold text-gray-800">{editItemId ? '編輯商品' : '新增商品'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Image Upload Area */}
              <div className="flex flex-col items-center justify-center mb-6 gap-3">
                <div className={`w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${newItem.image ? 'border-transparent' : 'border-gray-300 bg-gray-50'}`}>
                  {newItem.image ? (
                    <img src={newItem.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center flex flex-col items-center">
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">輸入圖片網址</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full mt-3">
                  <input 
                    type="url" 
                    value={newItem.image && newItem.image.startsWith('http') ? newItem.image : ''}
                    onChange={(e) => setNewItem({...newItem, image: e.target.value})}
                    placeholder="貼上圖片網址 (https://...)"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                  />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-gray-500">或</span>
                    </div>
                  </div>
                  <label className="w-full flex items-center justify-center p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer transition">
                    <Camera className="w-4 h-4 mr-2" />
                    從本機上傳圖片
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名稱</label>
                <input 
                  type="text" 
                  required
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="例如：手工皮夾"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                <input 
                  type="text" 
                  value={newItem.category}
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="例如：周邊、紙品"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">價格</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="$"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">庫存數量</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newItem.stock}
                    onChange={e => setNewItem({...newItem, stock: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Discount Rules */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">優惠規則 (選填)</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const rules = newItem.discounts || [];
                      setNewItem({...newItem, discounts: [...rules, { qty: '', price: '' }]});
                    }}
                    className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700"
                  >
                    <Plus className="w-3 h-3" /> 新增規則
                  </button>
                </div>
                
                {(newItem.discounts || []).map((rule, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <input 
                        type="number" 
                        min="2"
                        value={rule.qty}
                        onChange={e => {
                          const newRules = [...newItem.discounts];
                          newRules[index].qty = e.target.value;
                          setNewItem({...newItem, discounts: newRules});
                        }}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="數量 (如: 5)"
                      />
                    </div>
                    <span className="text-gray-400">件</span>
                    <div className="flex-1">
                      <input 
                        type="number" 
                        min="0"
                        value={rule.price}
                        onChange={e => {
                          const newRules = [...newItem.discounts];
                          newRules[index].price = e.target.value;
                          setNewItem({...newItem, discounts: newRules});
                        }}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="特價 (如: 200)"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const newRules = [...newItem.discounts].filter((_, i) => i !== index);
                        setNewItem({...newItem, discounts: newRules});
                      }}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-blue-600 text-white font-medium py-3.5 rounded-xl shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  {editItemId ? '儲存修改' : '確認新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm mx-auto rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-600" />
                管理者登入
              </h2>
              <button onClick={() => setIsLoginOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
                <input 
                  type="text" 
                  value={loginCreds.username}
                  onChange={(e) => setLoginCreds({...loginCreds, username: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-800 outline-none"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
                <input 
                  type="password" 
                  value={loginCreds.password}
                  onChange={(e) => setLoginCreds({...loginCreds, password: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-800 outline-none"
                  required
                />
              </div>

              <div className="flex items-center mt-2">
                <input
                  id="keepLoggedIn"
                  type="checkbox"
                  checked={loginCreds.keepLoggedIn}
                  onChange={(e) => setLoginCreds({...loginCreds, keepLoggedIn: e.target.checked})}
                  className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
                />
                <label htmlFor="keepLoggedIn" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                  保持登入 (24小時)
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition hover:bg-black mt-4"
              >
                登入
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
