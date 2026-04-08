import React, { useState, useEffect } from 'react';

// Custom hook to manage inventory with Google Sheets sync and `localStorage` fallback
export const useInventory = () => {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('pos_inventory');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Fetch from Google Sheets on mount
  useEffect(() => {
    const fetchInventory = async () => {
      const gasUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;
      if (!gasUrl) {
        setIsOffline(true);
        return;
      }

      setIsLoading(true);
      try {
        // GAS handles GET requests with redirects. Standard fetch will follow them.
        const response = await fetch(`${gasUrl}?action=get_inventory`);
        const data = await response.json();
        if (data.success && data.items) {
          setItems(data.items);
          try {
            localStorage.setItem('pos_inventory', JSON.stringify(data.items));
          } catch (e) {
            console.error('Storage quota exceeded during fallback sync', e);
          }
          setIsOffline(false);
        } else {
          setIsOffline(true);
        }
      } catch (error) {
        console.error('Failed to fetch inventory from cloud:', error);
        // Fallback to local storage (already loaded via useState init)
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Sync to local storage every time it changes
  useEffect(() => {
    try {
      localStorage.setItem('pos_inventory', JSON.stringify(items));
    } catch (e) {
      console.warn('Storage quota exceeded. Saving to local storage failed.', e.message);
    }
  }, [items]);

  // Helper to send actions to GAS
  const syncToCloud = async (action, payload) => {
    const gasUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;
    if (!gasUrl) return;

    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
    } catch (error) {
      console.error(`Failed to sync ${action} to cloud:`, error);
    }
  };

  const addItem = (item) => {
    const newItem = { ...item, id: Date.now().toString() };
    setItems(prev => [...prev, newItem]);
    syncToCloud('add_inventory', { item: newItem });
  };

  const updateItem = (id, updatedItem) => {
    const fullyUpdatedItem = { ...items.find(i => i.id === id), ...updatedItem };
    setItems(prev => prev.map(item => item.id === id ? fullyUpdatedItem : item));
    syncToCloud('update_inventory', { item: fullyUpdatedItem });
  };

  const deleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    syncToCloud('delete_inventory', { id });
  };

  return { items, addItem, updateItem, deleteItem, isLoading, isOffline };
};
