import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import { useTheme } from '@/contexts/ThemeContext';

export default function BulkEditProductsScreen() {
  const { theme } = useTheme();
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [productCount, setProductCount] = useState<number>(0);

  // Opciones de actualización
  const [updateCostPrice, setUpdateCostPrice] = useState<boolean>(false);
  const [updateSellingPrice, setUpdateSellingPrice] = useState<boolean>(false);
  const [updateProfitMargin, setUpdateProfitMargin] = useState<boolean>(false);

  // Valores de porcentaje
  const [costPricePercentage, setCostPricePercentage] = useState<string>('0');
  const [sellingPricePercentage, setSellingPricePercentage] = useState<string>('0');
  const [profitMarginPercentage, setProfitMarginPercentage] = useState<string>('0');

  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!ids) {
      Alert.alert('Error', 'No se seleccionaron productos');
      router.back();
      return;
    }
    setProductCount(ids.split(',').length);
    setLoading(false);
  }, [ids]);

  const handleBulkUpdate = async () => {
    if (!updateCostPrice && !updateSellingPrice && !updateProfitMargin) {
      Alert.alert('Error', 'Seleccione al menos un tipo de actualización');
      return;
    }
    if (updateCostPrice && (isNaN(parseFloat(costPricePercentage)) || parseFloat(costPricePercentage) === 0)) {
      Alert.alert('Error', 'Ingrese un porcentaje válido para el precio de costo');
      return;
    }
    if (updateSellingPrice && (isNaN(parseFloat(sellingPricePercentage)) || parseFloat(sellingPricePercentage) === 0)) {
      Alert.alert('Error', 'Ingrese un porcentaje válido para el precio de venta');
      return;
    }
    if (updateProfitMargin && (isNaN(parseFloat(profitMarginPercentage)) || parseFloat(profitMarginPercentage) === 0)) {
      Alert.alert('Error', 'Ingrese un porcentaje válido para el margen de ganancia');
      return;
    }
  
    Alert.alert(
      'Confirmar actualización',
      `¿Está seguro que desea actualizar ${productCount} productos seleccionados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async () => {
            try {
              setProcessing(true);
  
              // Obtén los productos seleccionados
              const selectedProducts = await productService.getProductsByIds(ids.split(','));
  
              // Calcula los nuevos valores para cada producto
              const updatePromises = selectedProducts.map(async (product) => {
                let newCost = product.cost_price || 0;
                let newMargin = product.profit_margin || 0;
                let newSell = product.selling_price || 0;
  
                // Si se modifica el precio de costo
                if (updateCostPrice) {
                  const pct = parseFloat(costPricePercentage) / 100;
                  newCost = newCost * (1 + pct);
  
                  // Si NO se modifica el precio de venta ni el margen, el precio de venta debe aumentar igual para mantener el margen
                  if (!updateSellingPrice && !updateProfitMargin) {
                    newSell = newCost * (1 + (product.profit_margin || 0) / 100);
                  }
                }
  
                // Si se modifica el margen de ganancia
                if (updateProfitMargin) {
                  newMargin = (product.profit_margin || 0) + parseFloat(profitMarginPercentage);
  
                  // Si no se modifica el precio de venta, recalcularlo para reflejar el nuevo margen
                  if (!updateSellingPrice) {
                    newSell = newCost * (1 + newMargin / 100);
                  }
                }
  
                // Si se modifica el precio de venta explícitamente
                if (updateSellingPrice) {
                  const pct = parseFloat(sellingPricePercentage) / 100;
                  newSell = newSell * (1 + pct);
  
                  // Si no se modifica el margen, recalcular el margen según el nuevo precio de venta
                  if (!updateProfitMargin) {
                    newMargin = ((newSell - newCost) / newCost) * 100;
                  }
                }
  
                // Redondear a dos decimales
                newCost = Math.round(newCost * 100) / 100;
                newSell = Math.round(newSell * 100) / 100;
                newMargin = Math.round(newMargin * 100) / 100;
  
                await productService.updateProduct(product.id!, {
                  cost_price: updateCostPrice ? newCost : product.cost_price,
                  selling_price: (updateSellingPrice || updateCostPrice || updateProfitMargin) ? newSell : product.selling_price,
                  profit_margin: (updateProfitMargin || updateSellingPrice) ? newMargin : product.profit_margin,
                });
              });
  
              await Promise.all(updatePromises);
  
              Alert.alert(
                'Actualización completada',
                `Se actualizaron ${selectedProducts.length} productos seleccionados.`,
                [
                  {
                    text: 'OK',
                    onPress: () => router.push('/productos')
                  }
                ]
              );
            } catch (error) {
              console.error('Error updating products:', error);
              Alert.alert('Error', 'No se pudieron actualizar los productos');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {productCount} productos seleccionados
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>Modificar precio de costo</Text>
          <Switch
            value={updateCostPrice}
            onValueChange={setUpdateCostPrice}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={updateCostPrice ? theme.primary : theme.surface}
          />
        </View>
        {updateCostPrice && (
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.primary }]}
            keyboardType="numeric"
            placeholder="Ej: 10 para aumentar 10%"
            placeholderTextColor={theme.textLight}
            value={costPricePercentage}
            onChangeText={setCostPricePercentage}
          />
        )}

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>Modificar precio de venta (%)</Text>
          <Switch
            value={updateSellingPrice}
            onValueChange={setUpdateSellingPrice}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={updateSellingPrice ? theme.primary : theme.surface}
          />
        </View>
        {updateSellingPrice && (
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.primary }]}
            keyboardType="numeric"
            placeholder="Ej: 10 para aumentar 10%"
            placeholderTextColor={theme.textLight}
            value={sellingPricePercentage}
            onChangeText={setSellingPricePercentage}
          />
        )}

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>Modificar margen de ganancia (%)</Text>
          <Switch
            value={updateProfitMargin}
            onValueChange={setUpdateProfitMargin}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={updateProfitMargin ? theme.primary : theme.surface}
          />
        </View>
        {updateProfitMargin && (
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.primary }]}
            keyboardType="numeric"
            placeholder="Ej: 5 para aumentar 5 puntos"
            placeholderTextColor={theme.textLight}
            value={profitMarginPercentage}
            onChangeText={setProfitMarginPercentage}
          />
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: processing ? theme.primaryLight : theme.primary }
          ]}
          onPress={handleBulkUpdate}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Actualizar productos</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  button: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});