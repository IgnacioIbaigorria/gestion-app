import React, { useEffect, useState } from 'react';
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
  Platform,
  Touchable,
  Modal
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { salesService } from '../../../services/salesService';
import { productService } from '../../../services/productService';
import { cashService } from '../../../services/cashService';
import { receiptService } from '../../../services/receiptService';
import { Product, Sale, SaleItem } from '../../../models/types';
import ProductSearchInput from '../../../components/ProductSearchInput';
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
  const [newSaleData, setNewSaleData] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [boxes, setBoxes] = useState<string>('1');
  const [inputUnits, setInputUnits] = useState<string>('1');
  const [discount, setDiscount] = useState<string>('0');
  const [inputDiscount, setInputDiscount] = useState('0');
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    const units = parseFloat(inputUnits) || 0;
    const discount = parseFloat(inputDiscount) || 0;

    if (selectedProduct && selectedProduct.unit_price) {
      const priceWithoutDiscount = units * selectedProduct.unit_price;
      const discountAmount = priceWithoutDiscount * (discount / 100);
      const finalSubtotal = priceWithoutDiscount - discountAmount;
      setSubtotal(finalSubtotal);
    } else {
      setSubtotal(0);
    }
  }, [inputUnits, inputDiscount, selectedProduct]);


  const resetForm = () => {
    setCartItems([]);
    setSelectedProduct(null);
    setQuantity('1');
    setPaymentMethod('Efectivo');
    setNotes('');
    setNewSaleData(null);
    setDiscount('0');
    setShowReceiptModal(false);
  };

  const handleCancelSale = () => {
    Alert.alert(
      'Cancelar venta',
      '¿Estás seguro de que deseas cancelar la venta? Se perderán los cambios no guardados.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => {
            resetForm();
            router.back();
          }
        }
      ]
    );
  };

  const handleGenerateReceipt = async () => {
    console.log("Datos de venta guardados:", newSaleData);
    if (!newSaleData) return;
    
    try {
      setLoading(true);
      const filePath = await receiptService.generatePDF(newSaleData);
      await receiptService.sharePDF(filePath);
      resetForm();
      router.back();
    } catch (error) {
      console.error('Error generating receipt:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('receipt.generateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkipReceipt = () => {
    setShowReceiptModal(false);
    resetForm();
    Alert.alert('Éxito', 'Venta realizada exitosamente.')
    router.back();
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...cartItems];
    updatedItems.splice(index, 1);
    setCartItems(updatedItems);
  };

  const calculateTotal = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountValue = parseFloat(discount) || 0;
    const total = subtotal - (subtotal * discountValue / 100);
    return total;    
  };
  

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setBoxes('1');
  };


  const handleAddToCart = () => {
    if (!selectedProduct) {
      Alert.alert(i18n.t('common.error'), i18n.t('sales.errorSelectProduct'));
      return;
    }

    const newUnits = parseInt(inputUnits, 10);
    if (isNaN(newUnits) || newUnits <= 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('sales.errorValidQuantity'));
      return;
    }

    const existingIdx = cartItems.findIndex(i => i.productId === selectedProduct.id);
    const existingItem = existingIdx >= 0 ? cartItems[existingIdx] : null;
    const currentUnits = existingItem?.units || 0;
    const totalUnits = currentUnits + newUnits;

    // Verificamos stock
    if (totalUnits > (selectedProduct.units || 0)) {
      Alert.alert(i18n.t('common.error'), 'No hay suficiente stock de unidades');
      return;
    }

    const cantidadPorCaja = selectedProduct.cantidad_por_caja || 1;

    const discount = parseFloat(inputDiscount) || 0;
    const unitPrice = selectedProduct.unit_price;
    const discountedPrice = unitPrice * (1 - discount / 100);
    const subtotal = totalUnits * discountedPrice;
    
    // Modificar esta línea para usar Math.ceil cuando hay unidades parciales
    const cantidadDeCajas = totalUnits % cantidadPorCaja === 0 
      ? Math.floor(totalUnits / cantidadPorCaja) 
      : Math.ceil(totalUnits / cantidadPorCaja);
      
    console.log(totalUnits, "unidades,", cantidadDeCajas, "cajas");

    const updated = [...cartItems];

    const updatedItem: SaleItem = {
      productId: selectedProduct.id!,
      productName: selectedProduct.name,
      quantity: cantidadDeCajas,
      unitPrice,
      subtotal,
      units: totalUnits,
      discount
    };

    if (existingIdx >= 0) {
      updated[existingIdx] = updatedItem;
    } else {
      updated.push(updatedItem);
    }

    setCartItems(updated);
    setSelectedProduct(null);
    setInputUnits('1');
    setInputDiscount('0');
  };

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'El carrito está vacío');
      return;
    }
    try {
      setLoading(true);
      const saleData: Omit<Sale, 'id'> = {
        date: new Date(),
        items: cartItems,
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        notes: notes.trim(),
        discount: parseFloat(discount) || 0
      };
      const saved = await salesService.addSale(saleData);
      console.log("Saved:", saved);
      await cashService.recordTransaction({
        date: new Date(),
        type: 'sale',
        amount: saleData.total_amount,
        description: `Venta de ${cartItems.length} productos`,
        reference: saved.id
      });
      // Actualiza stock en unidades
      for (const it of cartItems) {
        const prod = await productService.getProductById(it.productId);
        if (prod) {
          if (it.quantity > 0) {
            if (prod.quantity > 0) {
              const newQuantity = prod.quantity! - it.quantity;
              const newUnits = prod.units! - it.units;
              console.log("Cantidades a actualizar:", newQuantity, "cajas y", newUnits, "unidades");
              await productService.updateProduct(it.productId, { quantity: newQuantity, units: newUnits });
            } else {
              const newQuantity = 0;
              const newUnits = prod.units! - it.units;
              console.log("Cantidades a actualizar:", newQuantity, "cajas y", newUnits, "unidades");
              await productService.updateProduct(it.productId, { quantity: newQuantity, units: newUnits });
            }
          } else {
            const newUnits = prod.units! - it.units;
            console.log("Actualización a", newUnits, "unidades");
            await productService.updateProduct(it.productId, { units: newUnits });
          }
        } else {
          Alert.alert('Error', 'Producto no encontrado');
          console.error('Producto no encontrado:', it.productId);
        }
      }
      setNewSaleData(saved);
      setShowReceiptModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo completar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      resetScrollToCoords={{ x: 0, y: 0 }}
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20} // espacio extra para que no tape el teclado
      keyboardShouldPersistTaps="handled"
    >
      <ScrollView 
        style={[styles.container, {backgroundColor: theme.background}]} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={[styles.card, {backgroundColor: theme.surface}]}>
          <Text style={[styles.title, {color: theme.text}]}>Nueva venta</Text>
          
          <View style={[styles.section, { zIndex: 1000 }]}>
            <Text style={[styles.sectionTitle, {color: theme.primary, borderBottomColor: theme.primaryLight}]}>
              Buscar producto
            </Text>
            <ProductSearchInput onSelectProduct={handleSelectProduct} />
            
            {selectedProduct && (
                <View style={[styles.selectedProductContainer, {backgroundColor: theme.background}]}>
                  <View style={styles.selectedProductInfo}>
                    <Text style={[styles.selectedProductName, {color: theme.text}]}>
                      {selectedProduct.name}
                    </Text>
                    <Text style={[styles.selectedProductPrice, {color: theme.primary}]}>
                      Precio por caja: ${selectedProduct.selling_price.toLocaleString('es-ES')}
                    </Text>
                    <Text style={[styles.selectedProductPrice, {color: theme.primary}]}>
                      Precio por unidad: ${selectedProduct.unit_price.toLocaleString('es-ES')}
                    </Text>
                    <Text style={[styles.selectedProductStock, {color: theme.textLight}]}>
                      Cajas cerradas: {selectedProduct.quantity || 0} (unidades por caja: {selectedProduct.cantidad_por_caja || 0})
                    </Text>
                    <Text style={[styles.selectedProductStock, {color: theme.textLight}]}>
                      Unidades sueltas: {selectedProduct.units % selectedProduct.cantidad_por_caja || 0}
                    </Text>
                    <Text style={[styles.selectedProductStock, {color: theme.textLight}]}>
                      Unidades totales disponibles: {selectedProduct.units || 0}
                    </Text>
                  </View>
                  
                  <View style={styles.quantityContainer}>
                    <Text style={[styles.quantityLabel, { color: theme.text, width: 125 }]}>Unidades:</Text>
                    <TextInput
                      style={[styles.quantityInput, {
                        backgroundColor: theme.surface,
                        borderColor: theme.primaryLight,
                        color: theme.text,
                        textAlign: 'center',
                        flex: 1,
                      }]}
                      value={inputUnits}
                      onChangeText={setInputUnits}
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholderTextColor={theme.textLight}
                    />
                  </View>

                  <View style={styles.quantityContainer}>
                    <Text style={[styles.quantityLabel, { color: theme.text, width: 125 }]}>Descuento %:</Text>
                    <TextInput
                      style={[styles.quantityInput, {
                        backgroundColor: theme.surface,
                        borderColor: theme.primaryLight,
                        color: theme.text,
                        textAlign: 'center',
                        flex: 1,
                      }]}
                      value={inputDiscount}
                      onChangeText={setInputDiscount}
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholder="0"
                      placeholderTextColor={theme.textLight}
                    />
                  </View>

                  <View style={styles.quantityContainer}>
                    <Text style={[styles.quantityLabel, { color: theme.text, width: 125 }]}>Subtotal:</Text>
                    <Text style={[styles.quantityInput, {
                      backgroundColor: theme.surface,
                      color: theme.text,
                      flex: 1,
                      textAlign: 'center',
                      fontWeight: 'bold',
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: theme.primaryLight,
                    }]}>
                      ${subtotal.toLocaleString('es-ES')}
                    </Text>
                  </View>

                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={[styles.addToCartButton, { backgroundColor: theme.primary }]} onPress={handleAddToCart}>
                      <Ionicons name="add-circle" size={20} color={theme.surface} />
                      <Text style={[styles.addToCartButtonText, { color: theme.surface }]}>Agregar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addToCartButton, { backgroundColor: theme.error }]} onPress={() => setSelectedProduct(null)}>
                      <Ionicons name="close-circle" size={20} color={theme.surface} />
                      <Text style={[styles.addToCartButtonText, { color: theme.surface }]}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
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
                        {item.units} x ${item.unitPrice.toLocaleString('es-ES')}
                        {item.discount > 0 && ` (-${item.discount}%)`}
                      </Text>
                    </View>
                    <Text style={[styles.cartItemSubtotal, {color: theme.accent}]}>
                      ${item.subtotal.toLocaleString('es-ES')}
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
                  Total:
                </Text>
                <Text style={[styles.totalAmount, {color: theme.accent}]}>
                  ${calculateTotal().toLocaleString('es-ES')}
                </Text>
              </View>
            )}
          </View>
          
          {cartItems.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: theme.primary, borderBottomColor: theme.primaryLight}]}>
                Método de pago
              </Text>
              
              <View style={styles.formGroup}>
                <View style={styles.paymentMethodContainer}>
                  {[i18n.t('payment.cash'), i18n.t('payment.transfer'), i18n.t('payment.debit'), i18n.t('payment.credit')].map((method) => (
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
              onPress={() => handleCancelSale()}
              disabled={loading}
            >
              <Text style={[styles.buttonText, {color: theme.surface}]}>
                Cancelar
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
                    Completar venta
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Modal
          visible={showReceiptModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowReceiptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <Ionicons name="checkmark-circle" size={60} color={theme.success} style={styles.successIcon} />
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {i18n.t('sales.successSale')}
              </Text>
              <Text style={[styles.modalText, { color: theme.textLight }]}>
                {i18n.t('receipt.generateQuestion')}
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={handleSkipReceipt}
                >
                  <Text style={{ color: theme.text }}>{i18n.t('receipt.skip')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.success }]}
                  onPress={handleGenerateReceipt}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.surface} />
                  ) : (
                    <Text style={{ color: theme.text, textAlign:'center' }}>Generar comprobante</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAwareScrollView>
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
  buttonsContainer:{
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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
    fontSize: 15,
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
    flexDirection: 'column',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
  },
});

