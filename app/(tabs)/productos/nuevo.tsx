import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import Colors from '../../../constants/Colors';
import { Product } from '../../../models/types';
import { Tag } from '../../../models/types';
import { tagService } from '../../../services/tagService';

export default function AddEditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('0');
  const [costPrice, setCostPrice] = useState<string>('0');
  const [sellingPrice, setSellingPrice] = useState<string>('0');
  const [profitMargin, setProfitMargin] = useState<string>('0');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      loadProduct(id);
    }
  }, [id]);
  useEffect(() => {
    loadTags();
  }, []);
  const loadTags = async () => {
    try {
      const tagsData = await tagService.getAllTags();
      setAvailableTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };
  

  const loadProduct = async (productId: string) => {
    try {
      setInitialLoading(true);
      const product = await productService.getProductById(productId);
      
      if (product) {
        setName(product.name);
        setQuantity(product.quantity?.toString() || '0');
        setCostPrice(product.costPrice?.toString() || '0');
        setSellingPrice(product.sellingPrice?.toString() || '0');
        setProfitMargin(product.profitMargin?.toString() || '0');
        setSelectedTags(product.tags || []);
        setLowStockThreshold(product.lowStockThreshold?.toString() || '5');
      } else {
        Alert.alert('Error', 'No se encontró el producto');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el producto');
      console.error(error);
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  // Fix the profit margin calculation
  const calculateProfitMargin = () => {
    const cost = parseFloat(costPrice) || 0;
    const selling = parseFloat(sellingPrice) || 0;
    
    console.log('Calculating profit margin:', { cost, selling });
    
    if (cost > 0 && selling > 0) {
      // Check if selling price is less than cost price
      if (selling < cost) {
        Alert.alert('Advertencia', 'El precio de venta es menor que el precio de costo');
      }
      
      const margin = ((selling - cost) / cost) * 100;
      console.log('Calculated margin:', margin);
      setProfitMargin(margin.toFixed(2));
    }
  };

  const calculateSellingPrice = () => {
    const cost = parseFloat(costPrice) || 0;
    const margin = parseFloat(profitMargin) || 0;
    
    if (cost > 0 && margin >= 0) {
      const selling = cost * (1 + margin / 100);
      setSellingPrice(selling.toFixed(2));
    }
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Por favor ingresa el nombre del producto');
      return;
    }

    if (parseFloat(costPrice) <= 0) {
      Alert.alert('Error', 'El precio de costo debe ser mayor a 0');
      return;
    }

    if (parseFloat(sellingPrice) <= 0) {
      Alert.alert('Error', 'El precio de venta debe ser mayor a 0');
      return;
    }

    // Add validation for negative profit margin
    if (parseFloat(sellingPrice) < parseFloat(costPrice)) {
      Alert.alert(
        'Advertencia', 
        'El precio de venta es menor que el precio de costo. ¿Desea continuar?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Continuar',
            onPress: () => saveProduct()
          }
        ]
      );
      return;
    }

    // If all validations pass, save the product
    saveProduct();
  };

  // Extract the save logic to a separate function
  const saveProduct = async () => {
    try {
      setLoading(true);
      
      const productData: Omit<Product, 'id'> = {
        name,
        quantity: parseInt(quantity, 10) || 0,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        profitMargin: parseFloat(profitMargin) || 0,
        tags: selectedTags,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 5
      };
      
      if (isEditing && id) {
        await productService.updateProduct(id, productData);
        Alert.alert('Éxito', 'Producto actualizado correctamente');
      } else {
        await productService.addProduct(productData);
        Alert.alert('Éxito', 'Producto agregado correctamente');
      }
      
      router.back();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el producto');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando producto...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre del Producto</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ingresa el nombre del producto"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Cantidad</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Precio de Costo</Text>
            <TextInput
              style={styles.input}
              value={costPrice}
              onChangeText={setCostPrice}
              onEndEditing={() => {
                // Recalcular margen o precio de venta cuando termina de editar el costo
                if (parseFloat(sellingPrice) > 0) {
                  calculateProfitMargin();
                } else if (parseFloat(profitMargin) > 0) {
                  calculateSellingPrice();
                }
              }}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Precio de Venta</Text>
            <TextInput
              style={styles.input}
              value={sellingPrice}
              onChangeText={setSellingPrice}
              onEndEditing={() => {
                // Recalcular margen cuando termina de editar el precio de venta
                calculateProfitMargin();
              }}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Margen de Ganancia (%)</Text>
            <TextInput
              style={styles.input}
              value={profitMargin}
              onChangeText={setProfitMargin}
              onEndEditing={() => {
                // Recalcular precio de venta cuando termina de editar el margen
                calculateSellingPrice();
              }}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Stock Bajo</Text>
            <View style={styles.thresholdContainer}>
              <TextInput
                style={styles.input}
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                keyboardType="numeric"
                placeholder="5"
              />
              <Text style={styles.thresholdHelperText}>
                Alertar cuando el stock sea menor a esta cantidad
              </Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Etiquetas</Text>
            <View style={styles.tagsContainer}>
              {availableTags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagButton,
                    selectedTags.includes(tag.id!) && styles.tagButtonSelected
                  ]}
                  onPress={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag.id!)
                        ? prev.filter(t => t !== tag.id)
                        : [...prev, tag.id!]
                    );
                  }}
                >
                  <Text style={[
                    styles.tagButtonText,
                    selectedTags.includes(tag.id!) && styles.tagButtonTextSelected
                  ]}>
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.manageTags}
              onPress={() => router.push('/productos/tags')}
            >
              <Text style={styles.manageTagsText}>Gestionar Etiquetas</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Guardar</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },
  formContainer: {
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.text,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: Colors.textLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
    marginRight: 10,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagButton: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tagButtonSelected: {
    backgroundColor: Colors.primary,
  },
  tagButtonText: {
    color: Colors.primary,
    fontSize: 14,
  },
  tagButtonTextSelected: {
    color: Colors.surface,
  },
  manageTags: {
    marginTop: 8,
  },
  manageTagsText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  thresholdContainer: {
    marginBottom: 8,
  },
  thresholdHelperText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    marginLeft: 4,
  },
});

