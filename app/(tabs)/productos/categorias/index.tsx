import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryService } from '../../../../services/categoryService';
import { Category } from '../../../../models/types';
import i18n from '../../../../translations';
import ColorPicker from '../../../../components/ColorPicker';
import { useTheme } from '@/contexts/ThemeContext';

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>('#448AFF');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await categoryService.getAllCategories();
      setCategories(categoriesData);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las categorías');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'El nombre de la categoría no puede estar vacío');
      return;
    }

    // Verificar si ya existe una categoría con el mismo nombre
    const categoryExists = categories.some(category => 
      category.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );

    if (categoryExists) {
      Alert.alert('Error', 'Ya existe una categoría con ese nombre');
      return;
    }

    try {
      setLoading(true);
      await categoryService.createCategory({
        name: newCategoryName.trim(),
        color: selectedColor
      });
      setNewCategoryName('');
      setSelectedColor('#448AFF');
      Alert.alert('Éxito', 'Categoría agregada correctamente');
      loadCategories();
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar la categoría');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setSelectedColor(category.color || '#448AFF');
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'El nombre de la categoría no puede estar vacío');
      return;
    }

    // Verificar si ya existe otra categoría con el mismo nombre
    const categoryExists = categories.some(category => 
      category.id !== editingCategory.id && 
      category.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );

    if (categoryExists) {
      Alert.alert('Error', 'Ya existe una categoría con ese nombre');
      return;
    }

    try {
      setLoading(true);
      await categoryService.updateCategory(editingCategory.id!, {
        name: newCategoryName.trim(),
        color: selectedColor
      });
      setEditingCategory(null);
      setNewCategoryName('');
      setSelectedColor('#448AFF');
      Alert.alert('Éxito', 'Categoría actualizada correctamente');
      loadCategories();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la categoría');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro que deseas eliminar esta categoría?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryService.deleteCategory(id);
              Alert.alert('Éxito', 'Categoría eliminada correctamente');
              loadCategories();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la categoría');
              console.error(error);
            }
          }
        },
      ]
    );
  };

  const handleChangeCategoryColor = (category: Category) => {
    setEditingCategory(category);
    setSelectedColor(category.color || '#448AFF');
    setShowColorPicker(true);
  };

  const handleSelectColor = async (color: string) => {
    setSelectedColor(color);
    
    // Si estamos editando una categoría, actualizar su color inmediatamente
    if (editingCategory) {
      try {
        setLoading(true);
        await categoryService.updateCategory(editingCategory.id!, {
          ...editingCategory,
          color: color
        });
        setEditingCategory(null);
        Alert.alert('Éxito', 'Categoría actualizada correctamente');
        loadCategories();
      } catch (error) {
        Alert.alert('Error', 'No se pudo actualizar la categoría');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={[styles.categoryItem, { backgroundColor: theme.surface }]}>
      <View style={styles.categoryInfo}>
        <View 
          style={[
            styles.categoryColorIndicator, 
            { backgroundColor: item.color || '#448AFF' }
          ]} 
        />
        <Text style={[styles.categoryName, { color: theme.text }]}>{item.name}</Text>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleChangeCategoryColor(item)}
        >
          <Ionicons name="color-palette" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditCategory(item)}
        >
          <Ionicons name="create" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteCategory(item.id!)}
        >
          <Ionicons name="trash" size={20} color={theme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { 
        backgroundColor: theme.surface,
        borderBottomColor: theme.border
      }]}>
        <Text style={[styles.title, { color: theme.text }]}>Categorías</Text>
      </View>

      <View style={[styles.formContainer, { 
        backgroundColor: theme.surface,
        borderBottomColor: theme.border
      }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text
            }]}
            placeholder="Nombre de la categoría"
            placeholderTextColor={theme.textLight}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
          <TouchableOpacity 
            style={[styles.colorButton, { 
              backgroundColor: theme.background,
              borderColor: theme.border
            }]}
            onPress={() => setShowColorPicker(true)}
          >
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={editingCategory ? handleUpdateCategory : handleAddCategory}
        >
          <Text style={[styles.addButtonText, { color: theme.surface }]}>
            {editingCategory ? 'Actualizar Categoría' : 'Agregar Categoría'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textLight }]}>No hay categorías registradas.</Text>
        }
      />

      <ColorPicker
        visible={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        onSelectColor={handleSelectColor}
        selectedColor={selectedColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  colorButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  addButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    flex: 1,
    flexWrap: 'wrap',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
  },
});