import React, { useState, useEffect } from 'react';

export const useStoreSettings = () => {
  const [storeName, setStoreName] = useState(() => {
    return localStorage.getItem('pos_store_name') || '我的 POS';
  });

  useEffect(() => {
    localStorage.setItem('pos_store_name', storeName);
  }, [storeName]);

  return { storeName, setStoreName };
};
