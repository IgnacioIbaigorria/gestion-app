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
import { Product, Sale, SaleItem } from '../../../models/types';
import ProductSearchInput from '../../../components/ProductSearchInput';
import { Timestamp } from 'firebase/firestore';
import { FlatList } from 'react-native';
import i18n from '../../../translations';
import { useTheme } from '../../../contexts/ThemeContext';

export default function NewSaleScreen() {
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { theme } = useTheme();
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity('1');
  };

  const handleAddToCart = () => {
    if (!selectedProduct) {
      Alert.alert(i18n.t('common.error'), i18n.t('sales.errorSelectProduct'));
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('sales.errorValidQuantity'));
      return;
    }

    if (qty > (selectedProduct.quantity || 0)) {
      Alert.alert(i18n.t('common.error'), i18n.t('sales.errorInsufficientStock'));
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
        style={[styles.container, {backgroundColor: theme.background}]} 
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, {backgroundColor: theme.surface}]}>
          <Text style={[styles.title, {color: theme.text}]}>{i18n.t('sales.new')}</Text>
          
          <View style={[styles.section, { zIndex: 1000 }]}>
            <Text style={[styles.sectionTitle, {color: theme.primary, borderBottomColor: theme.primaryLight}]}>
              {i18n.t('sales.searchProduct')}
            </Text>
            <ProductSearchInput onSelectProduct={handleSelectProduct} />
            
            {selectedProduct && (
              <View style={[styles.selectedProductContainer, {backgroundColor: theme.background}]}>
                <View style={styles.selectedProductInfo}>
                  <Text style={[styles.selectedProductName, {color: theme.text}]}>
                    {selectedProduct.name}
                  </Text>
                  <Text style={[styles.selectedProductPrice, {color: theme.primary}]}>
                    {i18n.t('sales.price')}: ${selectedProduct.sellingPrice}
                  </Text>
                  <Text style={[styles.selectedProductStock, {color: theme.textLight}]}>
                    {i18n.t('sales.availableStock')}: {selectedProduct.quantity || 0}
                  </Text>
                </View>
                
                <View style={styles.quantityContainer}>
                  <Text style={[styles.quantityLabel, {color: theme.text}]}>
                    {i18n.t('sales.quantity')}:
                  </Text>
                  <TextInput
                    style={[styles.quantityInput, {
                      backgroundColor: theme.surface,
                      borderColor: theme.primaryLight,
                      color: theme.text
                    }]}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholderTextColor={theme.textLight}
                  />
                </View>
                
                <TouchableOpacity
                  style={[styles.addToCartButton, {backgroundColor: theme.primary}]}
                  onPress={handleAddToCart}
                >
                  <Ionicons name="add-circle" size={20} color={theme.surface} />
                  <Text style={[styles.addToCartButtonText, {color: theme.surface}]}>
                    {i18n.t('sales.add')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.section}>
            {cartItems.length === 0 ? (
              <Text style={[styles.emptyCartText, {color: theme.textLight}]}>
                {i18n.t('sales.emptyCart')}
              </Text>
            ) : (
              // Replace FlatList with a simple mapping of items
              <View style={styles.cartItemsContainer}>
                {cartItems.map((item, index) => (
                  <View key={index} style={[styles.cartItem, {borderBottomColor: theme.background}]}>
                    <View style={styles.cartItemInfo}>
                      <Text style={[styles.cartItemName, {color: theme.text}]}>
                        {item.productName}
                      </Text>
                      <Text style={[styles.cartItemDetails, {color: theme.textLight}]}>
                        {item.quantity} x ${item.unitPrice}
                      </Text>
                    </View>
                    <Text style={[styles.cartItemSubtotal, {color: theme.primary}]}>
                      ${item.subtotal}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(index)}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            {cartItems.length > 0 && (
              <View style={[styles.totalContainer, {borderTopColor: theme.primaryLight}]}>
                <Text style={[styles.totalLabel, {color: theme.text}]}>
                  {i18n.t('sales.total')}:
                </Text>
                <Text style={[styles.totalAmount, {color: theme.primary}]}>
                  ${calculateTotal()}
                </Text>
              </View>
            )}
          </View>
          
          {cartItems.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: theme.primary, borderBottomColor: theme.primaryLight}]}>
                {i18n.t('sales.paymentMethod')}
              </Text>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, {color: theme.text}]}>
                  {i18n.t('sales.paymentMethod')}
                </Text>
                <View style={styles.paymentMethodContainer}>
                  {[i18n.t('sales.cash'), i18n.t('sales.transfer')].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodButton,
                        {backgroundColor: theme.background},
                        paymentMethod === method && [
                          styles.paymentMethodButtonActive,
                          {backgroundColor: theme.primary}
                        ]
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text style={[
                        styles.paymentMethodButtonText,
                        {color: theme.text},
                        paymentMethod === method && [
                          styles.paymentMethodButtonTextActive,
                          {color: theme.surface}
                        ]
                      ]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, {color: theme.text}]}>
                  {i18n.t('sales.notes')}
                </Text>
                <TextInput
                  style={[styles.notesInput, {
                    backgroundColor: theme.background,
                    borderColor: theme.primaryLight,
                    color: theme.text
                  }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={i18n.t('sales.addNotes')}
                  placeholderTextColor={theme.textLight}
                  multiline
                />
              </View>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, {backgroundColor: theme.error}]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={[styles.buttonText, {color: theme.surface}]}>
                {i18n.t('common.cancel')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.completeButton, 
                {backgroundColor: theme.success},
                cartItems.length === 0 && [
                  styles.disabledButton,
                  {backgroundColor: theme.textLight}
                ]
              ]}
              onPress={handleCompleteSale}
              disabled={loading || cartItems.length === 0}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.surface} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={theme.surface} />
                  <Text style={[styles.buttonText, {color: theme.surface}]}>
                    {i18n.t('sales.complete')}
                  </Text>
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
  },
  cartItemsContainer: {
    width: '100%',
    marginVertical: 8,
  },
  card: {
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
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 5,
  },
  selectedProductContainer: {
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
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 14,
    marginBottom: 2,
  },
  selectedProductStock: {
    fontSize: 14,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityLabel: {
    fontSize: 16,
    marginRight: 12,
  },
  quantityInput: {
    borderRadius: 8,
    padding: 8,
    width: 80,
    fontSize: 16,
    borderWidth: 1,
  },
  addToCartButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  addToCartButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyCartText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  cartItemDetails: {
    fontSize: 14,
  },
  cartItemSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethodButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  paymentMethodButtonActive: {
    // backgroundColor applied dynamically
  },
  paymentMethodButtonText: {
    fontWeight: '500',
  },
  paymentMethodButtonTextActive: {
    // color applied dynamically
  },
  notesInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  completeButton: {
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
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 20,
    flex: 1,
  },
});