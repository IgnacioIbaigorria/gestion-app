import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { salesService } from '../../../services/salesService';
import { productService } from '../../../services/productService';
import { cashService } from '../../../services/cashService';
import Colors from '../../../constants/Colors';
import { Product, Sale, SaleItem } from '../../../models/types';
import ProductSearchInput from '../../../components/ProductSearchInput';
import { Timestamp } from 'firebase/firestore';
import { FlatList } from 'react-native';

export default function NewSaleScreen() {
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity('1');
  };

  const handleAddToCart = () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Por favor selecciona un producto');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Por favor ingresa una cantidad válida');
      return;
    }

    if (qty > (selectedProduct.quantity || 0)) {
      Alert.alert('Error', 'No hay suficiente stock disponible');
      return;
    }

    const existingItemIndex = cartItems.findIndex(
      item => item.productId === selectedProduct.id
    );

    if (existingItemIndex >= 0) {
      // Actualizar cantidad si el producto ya está en el carrito
      const updatedItems = [...cartItems];
      const newQuantity = updatedItems[existingItemIndex].quantity + qty;
      
      if (newQuantity > (selectedProduct.quantity || 0)) {
        Alert.alert('Error', 'No hay suficiente stock disponible');
        return;
      }
      
      updatedItems[existingItemIndex].quantity = newQuantity;
      updatedItems[existingItemIndex].subtotal = 
        newQuantity * updatedItems[existingItemIndex].unitPrice;
      
      setCartItems(updatedItems);
    } else {
      // Agregar nuevo producto al carrito
      const newItem: SaleItem = {
        productId: selectedProduct.id!,
        productName: selectedProduct.name,
        quantity: qty,
        unitPrice: selectedProduct.sellingPrice,
        subtotal: qty * selectedProduct.sellingPrice
      };
      
      setCartItems([...cartItems, newItem]);
    }

    // Limpiar selección
    setSelectedProduct(null);
    setQuantity('1');
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...cartItems];
    updatedItems.splice(index, 1);
    setCartItems(updatedItems);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'El carrito está vacío');
      return;
    }

    try {
      setLoading(true);
      
      // Crear objeto de venta
      const sale: Omit<Sale, 'id'> = {
        date: Timestamp.now(),
        items: cartItems,
        totalAmount: calculateTotal(),
        paymentMethod,
        // Fix: Don't set to undefined, use empty string or omit the field
        notes: notes.trim() || ""
      };
      
      // Registrar la venta
      const newSale = await salesService.addSale(sale);
      
      // Registrar transacción en caja
      await cashService.recordTransaction({
        date: Timestamp.now(),
        type: 'sale',
        amount: sale.totalAmount,
        description: `Venta de ${cartItems.length} productos`,
        reference: newSale.id
      });
      
      // Actualizar stock de productos
      for (const item of cartItems) {
        const product = await productService.getProductById(item.productId);
        if (product) {
          const newQuantity = (product.quantity || 0) - item.quantity;
          await productService.updateProduct(item.productId, { quantity: newQuantity });
        }
      }
      
      Alert.alert(
        'Éxito',
        'Venta registrada correctamente',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo completar la venta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        style={styles.container} 
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Nueva Venta</Text>
          
          <View style={[styles.section, { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>Buscar Producto</Text>
            <ProductSearchInput onSelectProduct={handleSelectProduct} />
            
            {selectedProduct && (
              <View style={styles.selectedProductContainer}>
                <View style={styles.selectedProductInfo}>
                  <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                  <Text style={styles.selectedProductPrice}>
                    Precio: ${selectedProduct.sellingPrice.toFixed(2)}
                  </Text>
                  <Text style={styles.selectedProductStock}>
                    Stock disponible: {selectedProduct.quantity || 0}
                  </Text>
                </View>
                
                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Cantidad:</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.addToCartButton}
                  onPress={handleAddToCart}
                >
                  <Ionicons name="add-circle" size={20} color={Colors.surface} />
                  <Text style={styles.addToCartButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.section}>
            {cartItems.length === 0 ? (
              <Text style={styles.emptyCartText}>
                No hay productos en el carrito
              </Text>
            ) : (
              // Replace FlatList with a simple mapping of items
              <View style={{ maxHeight: 200 }}>
                {cartItems.map((item, index) => (
                  <View key={index} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.productName}</Text>
                      <Text style={styles.cartItemDetails}>
                        {item.quantity} x ${item.unitPrice.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.cartItemSubtotal}>
                      ${item.subtotal.toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(index)}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            {cartItems.length > 0 && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>
                  ${calculateTotal().toFixed(2)}
                </Text>
              </View>
            )}
          </View>
          
          {cartItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detalles de Pago</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Método de Pago</Text>
                <View style={styles.paymentMethodContainer}>
                  {['Efectivo', 'Tarjeta', 'Transferencia'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodButton,
                        paymentMethod === method && styles.paymentMethodButtonActive
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text
                        style={[
                          styles.paymentMethodButtonText,
                          paymentMethod === method && styles.paymentMethodButtonTextActive
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Notas (opcional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Agregar notas sobre la venta..."
                  multiline
                />
              </View>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.completeButton, cartItems.length === 0 && styles.disabledButton]}
              onPress={handleCompleteSale}
              disabled={loading || cartItems.length === 0}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.surface} />
                  <Text style={styles.buttonText}>Completar Venta</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
    paddingBottom: 5,
  },
  selectedProductContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  selectedProductInfo: {
    marginBottom: 12,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 2,
  },
  selectedProductStock: {
    fontSize: 14,
    color: Colors.textLight,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityLabel: {
    fontSize: 16,
    color: Colors.text,
    marginRight: 12,
  },
  quantityInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
    width: 80,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  addToCartButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  addToCartButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyCartText: {
    textAlign: 'center',
    padding: 20,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  cartItemDetails: {
    fontSize: 14,
    color: Colors.textLight,
  },
  cartItemSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 12,
  },
  removeButton: {
    padding: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryLight,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.text,
    fontWeight: '500',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethodButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  paymentMethodButtonActive: {
    backgroundColor: Colors.primary,
  },
  paymentMethodButtonText: {
    color: Colors.text,
    fontWeight: '500',
  },
  paymentMethodButtonTextActive: {
    color: Colors.surface,
  },
  notesInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: Colors.textLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 2,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.textLight,
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});