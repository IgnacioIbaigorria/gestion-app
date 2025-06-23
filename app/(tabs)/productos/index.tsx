import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import { Category, Product, Tag } from '../../../models/types'; // Make sure Tag is imported
import { categoryService } from '@/services/categoryService';
import { tagService } from '@/services/tagService';
import { useTheme } from '@/contexts/ThemeContext';
import ProductItem from '../../../components/ProductItem';
import { useIsFocused } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker'; // Importar DocumentPicker
import * as FileSystem from 'expo-file-system'; // Importar FileSystem

export default function ProductsScreen() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const PAGE_SIZE = 20;
  const ITEM_HEIGHT = 100; // ajusta esto al alto real de tu ProductItem
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]); // Add state for tags
  const [dataReady, setDataReady] = useState<boolean>(false); // Add state to track when all data is ready
  const { filter, source, updatedProductId } = useLocalSearchParams<{ 
    filter: string, 
    source: string,
    updatedProductId: string 
  }>();
  const [activeFilter, setActiveFilter] = useState(
    filter === 'lowStock' && source === 'dashboard' ? 'lowStock' : 'all'
  );
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Nuevo estado para la búsqueda activa
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const flatListRef = React.useRef<FlatList>(null);
  const isFetchingRef = useRef(false);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  
  // Infinite scroll
  const LoadingFooter = React.memo(() => {
    // Mostrar el footer si está cargando MÁS datos O si no hay más datos pero está en proceso
    if (!hasMore && !loadingMore) return null;
    
    // Mostrar loading si está cargando o si está cerca del final
    if (loadingMore || (hasMore && !isFetchingRef.current)) {
      return (
        <View style={{ padding: 16, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={{ color: theme.textLight, marginTop: 8 }}>Cargando más productos...</Text>
        </View>
      );
    }
    
    return null;
  });
    
  // Optimizar el renderItem con React.memo
  const renderProductItem = React.useCallback(({ item }: { item: Product & { tagObjects?: Tag[] } }) => (
    <ProductItem 
      product={item} 
      onDelete={handleDeleteProduct}
      highlighted={item.id === highlightedProductId}
      selected={selectedProducts.includes(item.id!)}
      selectionMode={selectionMode}
      onLongPress={() => {
        setSelectionMode(true);
        setSelectedProducts([item.id!]);
      }}
      onPress={() => {
        if (selectionMode) {
          setSelectedProducts(prev =>
            prev.includes(item.id!)
              ? prev.filter(id => id !== item.id!)
              : [...prev, item.id!]
          );
        }
      }}
    />
  ), [highlightedProductId, selectedProducts, selectionMode]);
  
  // Modificar handleLoadMore para ser más agresivo
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isFetchingRef.current || loadingMore) return;
    
    console.log('🔄 Activando carga de más productos...');
    
    // Activar loading ANTES de cualquier operación asíncrona
    setLoadingMore(true);
    isFetchingRef.current = true;
    
    // Usar setTimeout para asegurar que el estado se actualice inmediatamente
    setTimeout(() => {
      loadData(activeFilter, page + 1, false)
        .finally(() => {
          isFetchingRef.current = false;
          setLoadingMore(false);
        });
    }, 0);
  }, [hasMore, activeFilter, page, loadingMore]);
  
    // Add viewability configuration
  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 10,
    minimumViewTime: 100,
  }).current;
  
  // Add callback for viewable items changed
  const handleViewableItemsChanged = React.useCallback(({ viewableItems }: { viewableItems: Array<{ item: Product }> }) => {
    if (!pendingScroll) return;
    
    // Check if our target product is among the viewable items
    const isTargetVisible = viewableItems.some(item => item.item.id === pendingScroll);
    
    if (isTargetVisible) {
      // Highlight the product temporarily
      setHighlightedProductId(pendingScroll);
      setTimeout(() => setHighlightedProductId(null), 15000);
      setPendingScroll(null);
      return;
    }
    
    // Find the index of the product we want to scroll to
    const productIndex = filteredProducts.findIndex(p => p.id === pendingScroll);
    
    if (productIndex !== -1) {
      try {
        // First scroll to a position near the target to ensure items are rendered
        flatListRef.current?.scrollToOffset({
          offset: Math.max(0, (productIndex - 2) * 100), // Approximate item height
          animated: true
        });
        
        // Then after a short delay, scroll to the exact index
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({
              index: productIndex,
              animated: true,
              viewPosition: 0.5 // Position item closer to the top
            });
            
            // Highlight the product temporarily
            setHighlightedProductId(pendingScroll);
            setTimeout(() => setHighlightedProductId(null), 8000);
            
            // Clear the pending scroll
            setPendingScroll(null);
          } catch (error) {
            console.error("Error in second scroll attempt:", error);
          }
        }, 200);
      } catch (error) {
        console.error("Error scrolling to offset:", error);
      }
    } else {
      // If we can't find the product, clear the pending scroll
      setPendingScroll(null);
    }
  }, [pendingScroll, filteredProducts]);

  // Replace the previous scroll effect with this improved version
  useEffect(() => {
    if (updatedProductId && dataReady) {
      console.log('🔄 Producto actualizado detectado:', updatedProductId);
      
      // Recargar toda la lista desde el principio
      setPage(1);
      setHasMore(true);
      setProducts([]);
      setDataReady(false);
      
      // Cargar la primera página
      loadData(activeFilter, 1, false).then(() => {
        // Después de cargar la primera página, buscar el producto
        findAndScrollToProduct(updatedProductId);
      });
      
      // Limpiar el parámetro URL
      router.replace('/productos');
    }
  }, [updatedProductId, dataReady]);
  
  // Nueva función para buscar y hacer scroll al producto
  const findAndScrollToProduct = async (productId: string) => {
    console.log('🔍 Buscando producto:', productId);
    
    let currentPage = 1;
    let found = false;
    let allLoadedProducts: Product[] = [];
    
    // Buscar el producto cargando páginas hasta encontrarlo
    while (!found && currentPage <= 10) { // Límite de seguridad
      try {
        const productsPage = await productService.getProducts(
          currentPage,
          PAGE_SIZE,
          selectedCategory,
          searchText
        );
        
        if (productsPage.length === 0) {
          console.log('❌ No se encontraron más productos');
          break;
        }
        
        // Enriquecer con tags
        const productsWithTags = await Promise.all(
          productsPage.map(async product => {
            if (!product.id) return product;
            const productTags = Array.isArray(product.tags) ? product.tags : [];
            if (productTags.length) {
              return {
                ...product,
                tagObjects: tags.filter(t => productTags.includes(t.id!))
              };
            }
            const fetchedTags = await tagService.getTagsForProduct(product.id);
            const tagIds = fetchedTags.map(t => t.id!).filter(Boolean);
            return { ...product, tags: tagIds, tagObjects: fetchedTags };
          })
        );
        
        allLoadedProducts = [...allLoadedProducts, ...productsWithTags];
        
        // Verificar si el producto está en esta página
        const productIndex = allLoadedProducts.findIndex(p => p.id === productId);
        
        if (productIndex !== -1) {
          console.log('✅ Producto encontrado en índice:', productIndex);
          found = true;
          
          // Actualizar el estado con todos los productos cargados
          setProducts(allLoadedProducts);
          setPage(currentPage);
          setHasMore(productsWithTags.length === PAGE_SIZE);
          setDataReady(true);
          
          // Esperar a que el FlatList se renderice completamente antes del scroll
          setTimeout(() => {
            // Primero intentar scroll directo al índice
            try {
              flatListRef.current?.scrollToIndex({
                index: productIndex,
                animated: true,
                viewPosition: 0.5 // Centrar en la pantalla
              });
              
              // Resaltar el producto
              setHighlightedProductId(productId);
              setTimeout(() => setHighlightedProductId(null), 3000);
              
            } catch (error) {
              console.error('Error haciendo scroll directo:', error);
              
              // Fallback: scroll por offset primero, luego al índice
              const estimatedOffset = productIndex * 100; // Altura aproximada del item
              flatListRef.current?.scrollToOffset({
                offset: Math.max(0, estimatedOffset - 200), // Scroll un poco antes
                animated: false
              });
              
              // Después de un momento, hacer scroll al índice exacto
              setTimeout(() => {
                try {
                  flatListRef.current?.scrollToIndex({
                    index: productIndex,
                    animated: true,
                    viewPosition: 0.5
                  });
                  
                  // Resaltar el producto
                  setHighlightedProductId(productId);
                  setTimeout(() => setHighlightedProductId(null), 3000);
                  
                } catch (secondError) {
                  console.error('Error en segundo intento de scroll:', secondError);
                  // Último fallback: solo resaltar
                  setHighlightedProductId(productId);
                  setTimeout(() => setHighlightedProductId(null), 3000);
                }
              }, 500);
            }
          }, 500); // Aumentar el delay para dar más tiempo al renderizado
          
          break;
        }
        
        currentPage++;
        
      } catch (error) {
        console.error('Error cargando página:', currentPage, error);
        break;
      }
    }
    
    if (!found) {
      console.log('❌ Producto no encontrado después de cargar', currentPage - 1, 'páginas');
      // Si no se encuentra, al menos actualizar la lista
      setProducts(allLoadedProducts);
      setDataReady(true);
    }
  };
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await categoryService.getAllCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    };
    fetchCategories();
  }, []);  
  
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setProducts([]);
    loadData(filter === 'lowStock' && source === 'dashboard' ? 'lowStock' : 'all', 1, false);
  }, [filter, source]);
  
    
  
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setProducts([]);
    loadData(activeFilter, 1, false);
  }, [selectedCategory, searchQuery]);
  

  const loadData = async (
    filterType = 'all',
    pg = 1,
    isRefresh = false
  ) => {
    try {
      console.log('Página: ', page);
      console.log('Categorìa seleccionada:', selectedCategory);
      setActiveFilter(filterType);
  
      // Flags de UI
      if (pg === 1 && isRefresh) {
        setRefreshing(true);
      } else if (pg > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
  
      // Trae sólo esa página, con categoría y texto de búsqueda
      const productsPage = await productService.getProducts(
        pg,
        PAGE_SIZE,
        selectedCategory,
        searchQuery
      );
  
      // Enriquecer con tags (igual que antes)
      const productsWithTags = await Promise.all(
        productsPage.map(async product => {
          if (!product.id) return product;
          const productTags = Array.isArray(product.tags) ? product.tags : [];
          if (productTags.length) {
            return {
              ...product,
              tagObjects: tags.filter(t => productTags.includes(t.id!))
            };
          }
          const fetchedTags = await tagService.getTagsForProduct(product.id);
          const tagIds = fetchedTags.map(t => t.id!).filter(Boolean);
          productService.updateProductInCache(product.id, { ...product, tags: tagIds });
          return { ...product, tags: tagIds, tagObjects: fetchedTags };
        })
      );
  
      // Append o reset según página
      setProducts(prev =>
        pg === 1 ? productsWithTags : [...prev, ...productsWithTags]
      );
  
      setHasMore(productsWithTags.length === PAGE_SIZE);
      setPage(pg);
      if (pg === 1) setDataReady(true);
  
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };
    
  
  const loadProducts = () => {
    loadData(activeFilter);
  };
  const handleSearch = () => {
    setSearchQuery(searchText);
  };

  // Agregar función para limpiar la búsqueda
  const handleClearSearch = () => {
    setSearchText('');
    setSearchQuery('');
  };

  const handleDeleteProduct = (id: string) => {
    Alert.alert(
      'Eliminar producto',
      '¿Estás seguro de que deseas eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProduct(id);
              Alert.alert('Éxito', 'Producto eliminado correctamente');
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el producto');
              console.error(error);
            }
          }
        },
      ]
    );
  };
  const CategoryFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
      <TouchableOpacity
        style={[
          styles.categoryChip,
          !selectedCategory && styles.selectedCategoryChip,
          { backgroundColor: theme.surface, borderColor: !selectedCategory ? theme.primary : theme.border }
        ]}
        onPress={() => setSelectedCategory(null)}
      >
        <Text style={[
          styles.categoryChipText,
          { color: !selectedCategory ? theme.text : theme.text }
        ]}>
          Todas
        </Text>
      </TouchableOpacity>
      {categories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryChip,
            selectedCategory === category.id && styles.selectedCategoryChip,
            { 
              backgroundColor: theme.surface,
              borderColor: selectedCategory === category.id ? theme.primary : theme.border 
            }
          ]}
          onPress={() => setSelectedCategory(category.id || null)}
        >
          <Text style={[
            styles.categoryChipText,
            { color: theme.text }
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (refreshing || loading || !dataReady ) {

      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textLight }]}>
              Cargando productos...
          </Text>
        </View>
      );
    }

  // --- NUEVA FUNCIÓN DE EXPORTACIÓN A PDF ---
  const exportProductsToPDF = async () => {
    // Usa los productos filtrados si hay filtro, si no, todos
    const list = filteredProducts.length > 0 ? filteredProducts : products;

    // Generar fecha en formato dd/mm/aaaa
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const fecha = `${day}/${month}/${year}`;
    const fileName = `Listado de productos al ${fecha}.pdf`;

    // Incluye la fecha en el título del PDF
    let htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            h1 { 
              text-align: center; 
              font-size: 2.2em; 
              margin-top: 32px; 
              margin-bottom: 24px;
              font-weight: bold;
            }
            h2 { margin-top: 24px;
              font-size: 1.8em;
              font-weight: bold;
            }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { border: 1px solid #888; padding: 6px; text-align: left; }
            th { background: #eee; }
          </style>
        </head>
        <body>
          <h1>Listado de productos al ${fecha}</h1>
    `;

    if (list.length === 0) {
      htmlContent += `<p style="text-align:center;margin-top:40px;">No hay productos para exportar.</p>`;
    } else {
      // Si no hay filtro de categoría o se muestra todo, agrupar por categoría
      if ((activeFilter === 'all' || !activeFilter) && !selectedCategory && categories.length > 0) {
        categories.forEach(category => {
          const productosCategoria = list.filter(p => p.category_id === category.id);
          if (productosCategoria.length === 0) return;

          htmlContent += `<h2>${category.name}</h2>`;
          const tableRows = productosCategoria.map(p => {
            const sellingPrice = Number(p.selling_price) || 0;
            const cantidadPorCaja = Number(p.cantidad_por_caja) || 1;
            const pricePerUnit = (p.unit_price || 0).toLocaleString('es-ES');
            return `
              <tr>
                <td>${p.name ?? ''}</td>
                <td>${sellingPrice.toLocaleString('es-ES')}</td>
                <td>${p.cantidad_por_caja ?? ''}</td>
                <td>${pricePerUnit}</td>
              </tr>
            `;
          }).join('');
          htmlContent += `
            <table>
              <tr>
                <th>Producto</th>
                <th>Precio por caja</th>
                <th>Cantidad por caja</th>
                <th>Precio por unidad</th>
              </tr>
              ${tableRows}
            </table>
          `;
        });

        // Añadir productos sin categoría bajo el título "Varios"
        const productosSinCategoria = list.filter(p => !p.category_id);
        if (productosSinCategoria.length > 0) {
          htmlContent += `<h2>Otros</h2>`;
          const tableRowsSinCategoria = productosSinCategoria.map(p => {
            const sellingPrice = Number(p.selling_price) || 0;
            const cantidadPorCaja = Number(p.cantidad_por_caja) || 1;
            const pricePerUnit = (p.unit_price || 0).toLocaleString('es-ES');
            return `
              <tr>
                <td>${p.name ?? ''}</td>
                <td>${sellingPrice.toLocaleString('es-ES')}</td>
                <td>${p.cantidad_por_caja ?? ''}</td>
                <td>${pricePerUnit}</td>
              </tr>
            `;
          }).join('');
          htmlContent += `
            <table>
              <tr>
                <th>Producto</th>
                <th>Precio por caja</th>
                <th>Cantidad por caja</th>
                <th>Precio por unidad</th>
              </tr>
              ${tableRowsSinCategoria}
            </table>
          `;
        }

      } else {
        // Comportamiento actual (sin agrupar por categoría)
        const tableRows = list.map(p => {
          const sellingPrice = Number(p.selling_price) || 0;
          const cantidadPorCaja = Number(p.cantidad_por_caja) || 1;
          const pricePerUnit = ((sellingPrice / cantidadPorCaja) * 1.1).toLocaleString('es-ES'); // Mantener cálculo existente
          return `
            <tr>
              <td>${p.name ?? ''}</td>
              <td>${sellingPrice.toLocaleString('es-ES')}</td>
              <td>${p.cantidad_por_caja ?? ''}</td>
              <td>${pricePerUnit}</td>
            </tr>
          `;
        }).join('');
        htmlContent += `
          <table>
            <tr>
              <th>Producto</th>
              <th>Precio por caja</th>
              <th>Cantidad por caja</th>
              <th>Precio por unidad</th>
            </tr>
            ${tableRows}
          </table>
        `;
      }
    }

    htmlContent += `
        </body>
      </html>
    `;

    // Generar PDF (sin fileName)
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });

    // Compartir PDF con nombre sugerido en el diálogo
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: fileName
    });
  };

  // --- NUEVA FUNCIÓN DE IMPORTACIÓN CSV ---
  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Cambiado a *//* para permitir todos los tipos de archivo
        copyToCacheDirectory: true, // Asegura que el archivo se copie a un directorio accesible
      });

      if (result.canceled) {
        Alert.alert('Importación cancelada', 'No se seleccionó ningún archivo.');
        return;
      }

      const uri = result.assets[0].uri;
      const fileName = result.assets[0].name;

      // Validar la extensión del archivo
      const isCSV = fileName.toLowerCase().endsWith('.csv');
      const isXLSX = fileName.toLowerCase().endsWith('.xlsx');

      if (!isCSV && !isXLSX) {
        Alert.alert('Error de formato', 'Por favor, selecciona un archivo CSV (.csv) o Excel (.xlsx).');
        return;
      }

      setLoading(true);
      console.log('Iniciando importación de archivo:', fileName);
      let csvContent = '';
      try {
        if (isXLSX) {
          console.log('Leyendo archivo Excel como base64...');
          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const workbook = XLSX.read(base64, { type: 'base64' });
          console.log('Hojas disponibles:', workbook.SheetNames);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          csvContent = XLSX.utils.sheet_to_csv(sheet);
          console.log('Datos convertidos a CSV:', csvContent.slice(0, 200) + '...');
        } else {
          csvContent = await FileSystem.readAsStringAsync(uri);
        }
      } catch (innerError) {
          console.error('Error parseando CSV/XLSX:', innerError);
          throw innerError;
      }
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');

      console.log('Filas procesadas:', lines.length);
    if (lines.length === 0) {
        Alert.alert('Error', 'El archivo CSV está vacío.');
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
      console.log('Encabezados detectados:', headers);
      if (!headers.includes('PRECIO POR UNIDAD')) {
        console.error('Falta columna PRECIO POR UNIDAD en headers:', headers);
        throw new Error('Columna PRECIO POR UNIDAD es requerida');
      }
      const dataRows = lines.slice(1);

      const categoryColIndex = headers.indexOf('CATEGORIA');
      const productColIndex = headers.indexOf('PRODUCTO');
      const cantidadPorCajaColIndex = headers.indexOf('CANTIDAD POR BOLSA/CAJA');
      const precioPorUnidadColIndex = headers.indexOf('PRECIO POR UNIDAD');
      const precioPorCajaColIndex = headers.indexOf('PRECIO POR CAJA');
      const unidadesColIndex = headers.indexOf('UNIDADES')
      const precioCostoColIndex = headers.indexOf('PRECIO DE COSTO')
      const stockMinimoColIndex = headers.indexOf('STOCK BAJO')
      const stockColIndex = headers.indexOf('CAJAS')

      if (
        categoryColIndex === -1 ||
        productColIndex === -1 ||
        cantidadPorCajaColIndex === -1 ||
        precioPorUnidadColIndex === -1 ||
        precioPorCajaColIndex === -1
      ) {
        Alert.alert('Error', 'El archivo CSV debe contener las columnas: CATEGORIA, PRODUCTO, CANTIDAD POR BOLSA/CAJA, PRECIO POR UNIDAD, PRECIO POR CAJA.');
        setLoading(false);
        return;
      }

      const productsToUpdate: Product[] = [];
      const productsToCreate: Product[] = [];
      const categoriesMap = new Map<string, Category>(); // Para cachear categorías ya procesadas

      // Precargar categorías existentes para evitar múltiples llamadas a la base de datos
      categories.forEach(cat => categoriesMap.set(cat.name.toUpperCase(), cat));

      for (const row of dataRows) {
        const columns = row.split(',');
        const categoryName = columns[categoryColIndex]?.trim();
        const productName = columns[productColIndex]?.trim();
        const cantidadPorCajaStr = columns[cantidadPorCajaColIndex]?.trim();
        const precioPorUnidadStr = columns[precioPorUnidadColIndex]?.trim();
        const precioPorCajaStr = columns[precioPorCajaColIndex]?.trim();
        const stockStr = columns [stockColIndex]?.trim();
        const stockMinimoStr = columns [stockMinimoColIndex]?.trim();
        const precioCostoStr = columns [precioCostoColIndex]?.trim();
        const unidadesStr = columns [unidadesColIndex]?.trim();

        if (!productName) {
          console.warn(`Fila ignorada por nombre incompleto: ${row}`);
          continue;
        }

        let currentCategory: Category | undefined = undefined;
        if (categoryName && categoryName.trim() !== '') {
          const upperCategoryName = categoryName.trim().toUpperCase();
        
          if (categoriesMap.has(upperCategoryName)) {
            currentCategory = categoriesMap.get(upperCategoryName);
          } else {
            const found = categories.find(cat => cat.name.trim().toUpperCase() === upperCategoryName);
            if (found) {
              currentCategory = found;
              categoriesMap.set(upperCategoryName, found);
            } else {
              try {
                const newCategory = await categoryService.createCategory({
                  name: categoryName.trim(),
                  color: '#FFFFFF'
                });
                currentCategory = newCategory;
                categoriesMap.set(upperCategoryName, newCategory);
                setCategories(prev => [...prev, newCategory]);
              } catch (catError) {
                console.error(`Error creando categoría '${categoryName}':`, catError);
                Alert.alert('Error', `No se pudo crear la categoría: ${categoryName}, se creará el producto con el campo de categoría vacío`);
                // Aun así, permitir crear el producto con categoría vacía
              }
            }
          }
        }
        
        const existingProduct = products.find(p => p.name.toUpperCase() === productName.toUpperCase());

        const newCantidadPorCaja = parseInt(cantidadPorCajaStr, 10);
        const newPrecioPorUnidad = parseFloat(precioPorUnidadStr?.replace(',', '.') || '0');
        const newPrecioPorCaja = parseFloat(precioPorCajaStr?.replace(',', '.') || '0');
        const newUnidades = parseInt(unidadesStr || '10', 0)
        const newStock = parseInt(stockStr || '0', 0)
        const newStockMinimo = parseInt(stockMinimoStr || '0', 0)
        const newPrecioCosto = parseFloat(precioCostoStr?.replace(',', '.') || '0');


        if (existingProduct) {
          const updateData: Partial<Product> = {
            cantidad_por_caja: !isNaN(newCantidadPorCaja) ? newCantidadPorCaja : existingProduct.cantidad_por_caja,
            category_id: currentCategory?.id || existingProduct.category_id,
          };

          // Solo actualizar si el valor del CSV no es vacío o cero
          if (!isNaN(newPrecioPorUnidad) && newPrecioPorUnidad > 0) {
            updateData.unit_price = newPrecioPorUnidad;
          } else {
            updateData.unit_price = existingProduct.unit_price;
          }
          if (!isNaN(newPrecioPorCaja) && newPrecioPorCaja > 0) {
            updateData.selling_price = newPrecioPorCaja;
          }

          // Recalcular profit_margin si se actualizaron los precios y ambos están presentes
          if (updateData.cost_price !== undefined && updateData.selling_price !== undefined && updateData.cost_price > 0) {
            updateData.profit_margin = ((updateData.selling_price - updateData.cost_price) / updateData.cost_price) * 100;
          } else if (existingProduct.cost_price > 0 && updateData.selling_price !== undefined) {
            // Si solo se actualizó selling_price y cost_price ya existía
            updateData.profit_margin = ((updateData.selling_price - existingProduct.cost_price) / existingProduct.cost_price) * 100;
          } else if (existingProduct.selling_price > 0 && updateData.cost_price !== undefined && updateData.cost_price > 0) {
            // Si solo se actualizó cost_price y selling_price ya existía
            updateData.profit_margin = ((existingProduct.selling_price - updateData.cost_price) / updateData.cost_price) * 100;
          }


          productsToUpdate.push({ ...existingProduct, ...updateData });
        } else {
          // Crear nuevo producto
          const newProduct: Product = {
            name: productName,
            cost_price: newPrecioCosto || 0, // Valor por defecto, se actualizará si hay columna correspondiente
            selling_price: (!isNaN(newPrecioPorCaja) && newPrecioPorCaja > 0) ? newPrecioPorCaja : 0,
            unit_price: (!isNaN(newPrecioPorUnidad) && newPrecioPorUnidad > 0) ? newPrecioPorUnidad : 0,
            quantity: newStock || 0,
            profit_margin: 0, // Se calculará después si los precios son válidos
            low_stock_threshold: newStockMinimo || 2, // Valor por defecto
            units: newUnidades || 0,
            category_id: currentCategory?.id || null,
            tags: [],
            cantidad_por_caja: !isNaN(newCantidadPorCaja) ? newCantidadPorCaja : 1,
          };

          if (newProduct.cost_price > 0 && newProduct.selling_price > 0) {
            newProduct.profit_margin = ((newProduct.selling_price - newProduct.cost_price) / newProduct.cost_price) * 100;
          }
          productsToCreate.push(newProduct);
        }
      }

      // Ejecutar actualizaciones y creaciones
      await Promise.all(productsToUpdate.map(p => productService.updateProduct(p.id!, p)));
      await Promise.all(productsToCreate.map(p => productService.addProduct(p)));

      Alert.alert('Éxito', `Se importaron ${productsToCreate.length} productos nuevos y se actualizaron ${productsToUpdate.length} productos existentes.`);
      loadProducts(); // Recargar la lista de productos
    } catch (error) {
      Alert.alert('Error', 'No se pudo importar el archivo CSV. Verifique el formato.');
      console.error('Error al importar CSV:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.innerContainer}>
        <View style={styles.headerSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { 
                backgroundColor: theme.surface, 
                borderColor: theme.primaryLight,
                color: theme.text
              }]}
              placeholder="Buscar productos"
              placeholderTextColor={theme.textLight}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch} // Buscar al presionar Enter
              returnKeyType="search"
            />
            {/* Botón de búsqueda */}
            <TouchableOpacity 
              style={[styles.searchButton, { 
                backgroundColor: theme.primary
              }]}
              onPress={handleSearch}
            >
              <Ionicons name="search" size={20} color={theme.surface} />
            </TouchableOpacity>
            {/* Botón para limpiar búsqueda */}
            {searchQuery && (
              <TouchableOpacity 
                style={[styles.clearButton, { 
                  backgroundColor: theme.error
                }]}
                onPress={handleClearSearch}
              >
                <Ionicons name="close" size={20} color={theme.surface} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={exportProductsToPDF}
              style={[
                styles.filterButton, {
                backgroundColor: theme.surface,
                borderColor: theme.primaryLight 
              }]}
            >
              <Ionicons name="download-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
            {/* Nuevo botón para importar CSV */}
            <TouchableOpacity
              onPress={handleImportCSV}
              style={[
                styles.filterButton, {
                backgroundColor: theme.surface,
                borderColor: theme.primaryLight 
              }]}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <CategoryFilter />
        </View>
        <FlatList
          ref={flatListRef}
          data={products}
          refreshing={refreshing}
          onRefresh={() => loadData(activeFilter, 1, true)}
          keyExtractor={(item) => item.id!}
          initialNumToRender={15}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1} // Puedes probar con 0.2 o 0.3 para que se dispare antes
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="never"
          keyboardDismissMode='on-drag'
          onScrollBeginDrag={() => Keyboard.dismiss()}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListFooterComponent={<LoadingFooter />}
          contentContainerStyle={[
            styles.listContainer,
            filteredProducts.length === 1 && styles.singleItemList
          ]}
          renderItem={renderProductItem}
          ListEmptyComponent={
            filteredProducts.length === 0 && products.length > 0 ? (
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
                No se encontraron productos con ese filtro.
              </Text>
            ) : (
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
                No hay productos para mostrar.
              </Text>
            )
          }
          onScrollToIndexFailed={info => {  
            console.log('⚠️ ScrollToIndex falló:', info);
            
            // Calcular offset basado en el índice y altura promedio
            const offset = Math.max(0, info.averageItemLength * info.index - 200);
            
            // Scroll al offset calculado
            flatListRef.current?.scrollToOffset({
              offset,
              animated: false
            });
            
            // Después de un delay, intentar scroll al índice nuevamente
            setTimeout(() => {
              try {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.5
                });
              } catch (error) {
                console.error('Error en retry de scrollToIndex:', error);
              }
            }, 500);
          }}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/productos/nuevo')}
        >
          <Ionicons name="add" size={30} color={theme.surface} />
        </TouchableOpacity>
      {selectionMode && selectedProducts.length > 0 && (
        <View style={{
          position: 'absolute',
          bottom: 90,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 10,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              padding: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => {
              // Navegar a la pantalla de edición masiva, pasando los IDs seleccionados
              router.push({
                pathname: '/productos/bulk-edit',
                params: { ids: selectedProducts.join(',') }
              });
              setSelectionMode(false);
              setSelectedProducts([]);
            }}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 8, fontWeight: 'bold' }}>
              Modificar precio ({selectedProducts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 8 }}
            onPress={() => {
              setSelectionMode(false);
              setSelectedProducts([]);
            }}
          >
            <Text style={{ color: theme.error }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed
  },
  innerContainer: {
    flex: 1,
    padding: 16, 
  },
  headerSection: {
   zIndex: 1, 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor removed
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    // color removed
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    // color removed
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    // backgroundColor removed
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    // backgroundColor removed
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    // borderColor removed
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryFilter: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderRadius: 8,
    zIndex: 2,
  },
  categoryChip: {
    padding: 10,
    borderRadius: 20,
    marginRight: 8,
    // backgroundColor removed
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    // borderColor removed
  },
  selectedCategoryChip: {
    borderWidth: 2,
    // borderColor removed and applied dynamically
  },
  categoryChipText: {
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 8,
  },
  singleItemList: {
    flexGrow: 1,
  },
});


