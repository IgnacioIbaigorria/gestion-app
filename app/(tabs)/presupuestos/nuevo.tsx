import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../../../services/productService';
import { quoteService } from '../../../services/quoteService';
import { Product, QuoteItem } from '../../../models/types';
import i18n from '../../../translations';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsFocused } from '@react-navigation/native';

export default function NewQuoteScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isFocused = useIsFocused();
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Reset form when component mounts or when id changes
  useEffect(() => {
    if (id) {
      setIsEditing(true);
      loadQuote(id);
    } else {
      // Reset all form fields when no ID is provided (new quote)
      resetForm();
    }
  }, [id]);

  // Function to reset all form fields to default values
  const resetForm = () => {
    setCustomerName('');
    setNotes('');
    setValidDays('30');
    setItems([]);
    setSearchQuery('');
    setShowProductSelector(false);
    setIsEditing(false);
  };

  // Update this useEffect to reload products when screen is focused
  useEffect(() => {
    if (isFocused) {
      loadProducts();
      
      // If no ID is provided and the screen is focused, reset the form
      if (!id) {
        resetForm();
      }
    }
  }, [isFocused, id]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const loadQuote = async (quoteId: string) => {
    try {
      setInitialLoading(true);
      const quote = await quoteService.getQuoteById(quoteId);
      
      if (quote) {
        setCustomerName(quote.customer_name || '');
        setNotes(quote.notes || '');
        setItems(quote.items || []);
        
        // Calculate valid days from valid_until date if available
        if (quote.valid_until) {
          const validUntil = new Date(quote.valid_until);
          const today = new Date();
          const diffTime = validUntil.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setValidDays(diffDays > 0 ? diffDays.toString() : '30');
        }
      } else {
        Alert.alert('Error', 'No se encontró el presupuesto');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el presupuesto');
      console.error(error);
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productService.getAllProducts();
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('products.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const addItemToQuote = (product: Product) => {
    // Check if product already exists in the quote
    const existingItemIndex = items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Update quantity if product already exists
      const updatedItems = [...items];
      const item = updatedItems[existingItemIndex];
      item.quantity += 1;
      item.subtotal = item.quantity * item.unitPrice;
      setItems(updatedItems);
    } else {
      // Add new item if product doesn't exist in the quote
      const newItem: QuoteItem = {
        productId: product.id!,
        name: product.name,
        quantity: 1,
        unitPrice: product.selling_price,
        subtotal: product.selling_price
      };
      setItems([...items, newItem]);
    }
    
    setShowProductSelector(false);
  };

  const removeItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const updatedItems = [...items];
    updatedItems[index].quantity = quantity;
    updatedItems[index].subtotal = quantity * updatedItems[index].unitPrice;
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleCreateQuote = async () => {
    if (!customerName.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('quotes.customerNameRequired'));
      return;
    }

    if (items.length === 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('quotes.itemsRequired'));
      return;
    }

    try {
      setLoading(true);
      
      // Calculate valid until date
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(validDays || '30', 10));
            
      await quoteService.createQuote({
        customer_name: customerName.trim(),
        items,
        total: calculateTotal(),
        date: new Date(),
        status: 'pending',
        notes: notes.trim(),
        valid_until: validUntil
      });
      Alert.alert(
        i18n.t('common.success'),
        i18n.t('quotes.createSuccess'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating quote:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('quotes.createError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>{i18n.t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: i18n.t('quotes.new'),
          headerStyle: {
            backgroundColor: theme.primary,
          },
          headerTintColor: theme.surface,
        }} 
      />
      
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('quotes.customerInfo')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={i18n.t('quotes.customerName')}
            placeholderTextColor={theme.textLight}
            value={customerName}
            onChangeText={setCustomerName}
          />
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('quotes.items')}</Text>
            <TouchableOpacity
              style={[styles.addItemButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowProductSelector(true)}
            >
              <Ionicons name="add" size={20} color={theme.surface} />
              <Text style={[styles.addItemButtonText, { color: theme.surface }]}>{i18n.t('quotes.addItem')}</Text>
            </TouchableOpacity>
          </View>
          
          {items.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textLight }]}>{i18n.t('quotes.noItems')}</Text>
          ) : (
            <View style={styles.itemsList}>
              {items.map((item, index) => (
                <View key={index} style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Ionicons name="close-circle" size={24} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemPrice, { color: theme.textLight }]}>
                      ${item.unitPrice.toFixed(2)} {i18n.t('common.perUnit')}
                    </Text>
                    
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: theme.primary }]}
                        onPress={() => updateItemQuantity(index, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={16} color={theme.surface} />
                      </TouchableOpacity>
                      
                      <Text style={[styles.quantityText, { color: theme.text }]}>{item.quantity}</Text>
                      
                      <TouchableOpacity
                        style={[styles.quantityButton, { backgroundColor: theme.primary }]}
                        onPress={() => updateItemQuantity(index, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color={theme.surface} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.itemFooter}>
                    <Text style={[styles.subtotalLabel, { color: theme.textLight }]}>{i18n.t('common.subtotal')}:</Text>
                    <Text style={[styles.subtotalValue, { color: theme.text }]}>${item.subtotal.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('quotes.additionalInfo')}</Text>
          
          <Text style={[styles.label, { color: theme.text }]}>{i18n.t('quotes.validFor')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="30"
            placeholderTextColor={theme.textLight}
            value={validDays}
            onChangeText={setValidDays}
            keyboardType="numeric"
          />
          
          <Text style={[styles.label, { color: theme.text }]}>{i18n.t('quotes.notes')}</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={i18n.t('quotes.notesPlaceholder')}
            placeholderTextColor={theme.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>
        
        <View style={[styles.totalContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.totalLabel, { color: theme.textLight }]}>{i18n.t('common.total')}:</Text>
          <Text style={[styles.totalValue, { color: theme.primary }]}>${calculateTotal().toFixed(2)}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.primary }]}
          onPress={handleCreateQuote}
        >
          <Text style={[styles.createButtonText, { color: theme.surface }]}>{i18n.t('quotes.create')}</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {showProductSelector && (
        <View style={[styles.productSelectorOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.productSelector, { backgroundColor: theme.surface }]}>
            <View style={styles.productSelectorHeader}>
              <Text style={[styles.productSelectorTitle, { color: theme.text }]}>{i18n.t('quotes.selectProduct')}</Text>
              <TouchableOpacity onPress={() => setShowProductSelector(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder={i18n.t('common.search')}
              placeholderTextColor={theme.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            
            <ScrollView style={styles.productList}>
              {filteredProducts.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textLight }]}>{i18n.t('products.noProducts')}</Text>
              ) : (
                filteredProducts.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productItem, { borderBottomColor: theme.border }]}
                    onPress={() => addItemToQuote(product)}
                  >
                    <View>
                      <Text style={[styles.productName, { color: theme.text }]}>{product.name}</Text>
                      <Text style={[styles.productPrice, { color: theme.textLight }]}>
                        ${product.selling_price.toFixed(2)} - {i18n.t('products.stock')}: {product.quantity}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={theme.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    height: 100,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addItemButtonText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 16,
  },
  itemsList: {
    marginTop: 8,
  },
  itemCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 14,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    marginHorizontal: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: 14,
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 18,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productSelectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productSelector: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 16,
  },
  productSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  productList: {
    maxHeight: 400,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
  },
});