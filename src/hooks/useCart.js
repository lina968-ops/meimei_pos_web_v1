import React, { useState } from 'react';

export const useCart = () => {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart(prevCart => {
      const existing = prevCart.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prevCart.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 } 
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => item.id === id ? { ...item, quantity: newQuantity } : item)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateItemTotal = (item) => {
    let quantity = item.quantity;
    let total = 0;
    
    // Default to base price if no rules
    if (!item.discounts || item.discounts.length === 0) {
      return quantity * item.price;
    }

    // Sort discounts by highest quantity first to apply best bulk rules greedily
    const sortedRules = [...item.discounts].sort((a, b) => b.qty - a.qty);

    for (const rule of sortedRules) {
      if (quantity >= rule.qty) {
        const bundles = Math.floor(quantity / rule.qty);
        total += bundles * rule.price;
        quantity -= bundles * rule.qty;
      }
    }

    // Add remaining items at base price
    total += quantity * item.price;
    return total;
  };

  const cartTotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return { cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartItemCount, calculateItemTotal };
};
