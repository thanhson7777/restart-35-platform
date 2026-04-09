import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [], // { productId, name, price, image, size, quantity, stockQuantity }
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { productId, size, quantity } = action.payload;
      const existingItemIndex = state.items.findIndex(
        (item) => item.productId === productId && item.size === size
      );

      if (existingItemIndex >= 0) {
        state.items[existingItemIndex].quantity += quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    removeFromCart: (state, action) => {
      const { productId, size } = action.payload;
      state.items = state.items.filter(
        (item) => !(item.productId === productId && item.size === size)
      );
    },
    updateQuantity: (state, action) => {
      const { productId, size, quantity } = action.payload;
      const item = state.items.find(
        (item) => item.productId === productId && item.size === size
      );
      if (item) {
        item.quantity = quantity;
      }
    },
    clearCart: (state) => {
      state.items = [];
    }
  }
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartTotalCount = (state) => state.cart.items.length;
export const cartReducer = cartSlice.reducer;
