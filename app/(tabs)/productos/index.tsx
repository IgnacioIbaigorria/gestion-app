import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import { Category, Product, Tag } from '../../../models/types'; // Make sure Tag is imported
import { categoryService } from '@/services/categoryService';
import { tagService } from '@/services/tagService';
import { useTheme } from '@/contexts/ThemeContext';
import ProductItem from '../../../components/ProductItem';
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
  const [tags, setTags] = useState<Tag[]>([]); // State for all tags
  const [allTags, setAllTags] = useState<Tag[]>([]); // All tags pre-loaded
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
  const flatListRef = React.useRef<any>(null);
  const isFetchingRef = useRef(false);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(null);
  const loadDataRequestIdRef = useRef(0);


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

  // Enriquecer productos con metadata para evitar llamadas async en ProductItem
  const enrichedProducts = useMemo(() => {
    if (!allTags.length || !categories.length) return products;

    return products.map(p => ({
      ...p,
      categoryObject: categories.find(c => c.id === p.category_id),
      tagObjects: allTags.filter(t => p.tags?.includes(t.id!))
    }));
  }, [products, categories, allTags]);

  // Modificar handleLoadMore para ser más agresivo
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isFetchingRef.current || loadingMore) return;

    // Activar loading ANTES de cualquier operación asíncrona
    setLoadingMore(true);
    isFetchingRef.current = true;

    // Calcular la próxima página basada en la cantidad de productos ya cargados
    const nextPage = Math.floor(products.length / PAGE_SIZE) + 1;

    // Usar setTimeout para asegurar que el estado se actualice inmediatamente
    setTimeout(() => {
      loadData(activeFilter, nextPage, false)
        .finally(() => {
          isFetchingRef.current = false;
          setLoadingMore(false);
        });
    }, 0);
  }, [hasMore, activeFilter, products.length, loadingMore]);

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
    const productIndex = products.findIndex(p => p.id === pendingScroll);

    if (productIndex !== -1) {
      try {
        // First scroll to a position near the target to ensure items are rendered
        flatListRef.current?.scrollToOffset({
          offset: Math.max(0, (productIndex - 2) * 100), // Approximate item height
          animated: true
        });

      } catch (error) {
        console.error("Error scrolling to offset:", error);
      }
    } else {
      // If we can't find the product, clear the pending scroll
      setPendingScroll(null);
    }
  }, [pendingScroll, products]);

  useEffect(() => {
    if (pendingScrollIndex !== null && products.length > 0) {
      if (pendingScrollIndex < products.length) {
        setTimeout(() => {
          scrollToPendingIndex(pendingScrollIndex, pendingScroll || undefined);
        }, 300); // delay para que FlatList renderice
      } else {
        console.warn(`pendingScrollIndex ${pendingScrollIndex} fuera de rango para products.length=${products.length}`);
        // Opcional: podés recargar más páginas o resetear scroll
        // setPendingScrollIndex(null);
      }
    }
  }, [pendingScrollIndex, products]);

  const loadUntilIndexById = async (productId: string) => {
    // Primero intentar obtener el producto directamente
    try {
      const product = await productService.getProductById(productId);
      if (!product) {
        console.warn('Producto no encontrado');
        setDataReady(true);
        return;
      }

      // Cargar la primera página
      const firstPage = await loadData(activeFilter, 1, false);
      let foundIndex = firstPage?.findIndex(p => p.id === productId) ?? -1;

      if (foundIndex !== -1) {
        // Producto encontrado en la primera página
        setPendingScrollIndex(foundIndex);
        setPendingScroll(productId);
        setDataReady(true);
        return;
      }

      // Si no está en la primera página, cargar más páginas con un tamaño mayor
      const BATCH_SIZE = 3; // Cargar 3 páginas a la vez
      let currentPage = 2;

      while (true) {
        // Cargar varias páginas a la vez
        const promises = [];
        for (let i = 0; i < BATCH_SIZE; i++) {
          promises.push(loadData(activeFilter, currentPage + i, false));
        }

        const results = await Promise.all(promises);
        const newProducts = results.flat().filter(Boolean);

        if (newProducts.length === 0) {
          break;
        }

        // Combinar y deduplicar
        const allProducts = [...products, ...newProducts];
        const deduplicationMap = new Map<string, Product>();

        // Solo agregar productos con ID válido
        allProducts.forEach(p => {
          if (p && p.id) {
            deduplicationMap.set(p.id, p);
          }
        });

        const deduplicated = Array.from(deduplicationMap.values());
        setProducts(deduplicated);

        foundIndex = deduplicated.findIndex(p => p.id === productId);

        if (foundIndex !== -1) {
          setPendingScrollIndex(foundIndex);
          setPendingScroll(productId);
          setDataReady(true);
          setPage(currentPage + BATCH_SIZE - 1);
          setHasMore(newProducts.length === PAGE_SIZE * BATCH_SIZE);
          break;
        }

        currentPage += BATCH_SIZE;
      }

      if (foundIndex === -1) {
        console.warn('Producto no encontrado después de cargar páginas.');
        setDataReady(true);
      }
    } catch (error) {
      console.error('Error al cargar producto:', error);
      setDataReady(true);
    }
  };

  useEffect(() => {
    if (updatedProductId && dataReady) {

      setPage(1);
      setHasMore(true);
      setProducts([]);
      setDataReady(false);

      // Cargar la primera página
      loadData(activeFilter, 1, false).then(loadedProducts => {
        const updatedIndex = loadedProducts?.findIndex(p => p.id === updatedProductId) ?? -1;

        if (updatedIndex === -1) {
          // Producto no está en la página 1, cargás páginas hasta encontrarlo
          loadUntilIndexById(updatedProductId);
        } else {
          // Está en la página 1, scroll directo
          setPendingScrollIndex(updatedIndex);
          setPendingScroll(updatedProductId);
        }
      });

      // Limpiar el parámetro URL
      router.replace('/productos');
    }
  }, [updatedProductId, dataReady]);

  const scrollToPendingIndex = (index: number, productId?: string) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.0
    });
    setPendingScrollIndex(null);
    productId && setHighlightedProductId(productId);

    setTimeout(() => {
      setHighlightedProductId(null);
    }, 10000);
  };


  // Pre-cargar metadata (categorías y tags) al inicio
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [cats, fetchedTags] = await Promise.all([
          categoryService.getAllCategories(),
          tagService.getAllTags()
        ]);
        setCategories(cats);
        setAllTags(fetchedTags);
      } catch (error) {
        console.error('Error cargando metadata:', error);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    const initialFilter = filter === 'lowStock' && source === 'dashboard' ? 'lowStock' : 'all';
    setPage(1);
    setHasMore(true);
    setProducts([]);
    loadData(initialFilter, 1, false);
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
    isRefresh = false,
    categoryOverride?: string | null
  ): Promise<Product[] | undefined> => {
    const requestId = ++loadDataRequestIdRef.current; // id para esta llamada
    try {
      setActiveFilter(filterType);

      // Flags UI
      if (pg === 1 && isRefresh) {
        setRefreshing(true);
      } else if (pg > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Determinar categoría a usar (override si se pasa)
      const categoryToUse = categoryOverride ?? selectedCategory ?? null;

      // Llamada al servicio (RPC o lista normal)
      let productsPage: Product[] = [];
      if (filterType === 'lowStock') {
        productsPage = await productService.getLowStockProducts(
          pg,
          PAGE_SIZE,
          categoryToUse,
          searchQuery || null
        );
      } else {
        productsPage = await productService.getProducts(
          pg,
          PAGE_SIZE,
          categoryToUse,
          searchQuery || undefined
        );
      }

      // Si la respuesta llegó pero es stale (otra llamada posterior ya empezó), ignorarla.
      if (loadDataRequestIdRef.current !== requestId) {
        // no hacemos nada con esta respuesta
        return undefined;
      }

      // Agregar índice local para UI (opcional)
      const indexedProducts = productsPage.map((p, i) => ({
        ...p,
        index: (pg - 1) * PAGE_SIZE + i + 1
      }));

      // Aplicar resultados al estado (append o reset) con deduplicación por id
      setProducts(prev => {
        if (pg === 1) {
          return indexedProducts;
        } else {
          const all = [...prev, ...indexedProducts];
          // dedupe manteniendo la última ocurrencia de cada id
          const map = new Map<string, Product>();
          for (const item of all) {
            if (item && item.id) map.set(item.id, item);
          }
          return Array.from(map.values());
        }
      });

      // Actualizaciones de paginación
      setHasMore(productsPage.length === PAGE_SIZE);
      setPage(pg);
      if (pg === 1) setDataReady(true);

      // --- Fetch de tags en background (no bloquear UI) ---
      // Solo para productos que no tengan tagObjects (o tags)
      (async () => {
        // guardar lista de ids a consultar
        const idsToFetch = indexedProducts
          .filter(p => p && p.id && !(p as any).tagObjects && (!Array.isArray(p.tags) || p.tags.length === 0))
          .map(p => p.id!) as string[];

        if (idsToFetch.length === 0) return;

        try {
          // Hacemos fetch paralelo de tags por producto.
          // Si tienes una RPC para tags por muchos ids sería mejor usarla aquí.
          const promises = idsToFetch.map(async (pid) => {
            try {
              const fetched = await tagService.getTagsForProduct(pid);
              return { pid, fetched };
            } catch (err) {
              console.warn('tag fetch failed for', pid, err);
              return { pid, fetched: [] as Tag[] };
            }
          });

          const results = await Promise.all(promises);

          // Si entre tanto se lanzó otra carga, no aplicamos estos tags (evitar race)
          if (loadDataRequestIdRef.current !== requestId) return;

          // Actualizar estado por lotes: mantener inmutabilidad
          setProducts(prev => {
            // si ha cambiado radicalmente el listado (p. ej. pagina 1 reemplazó), igual hacemos merge por id
            const map = new Map<string, Product>();
            for (const p of prev) {
              map.set(p.id!, { ...p });
            }
            for (const { pid, fetched } of results) {
              const existing = map.get(pid);
              if (existing) {
                const tagIds = fetched.map(t => t.id).filter(Boolean);
                map.set(pid, { ...existing, tags: tagIds.filter((id): id is string => id !== undefined) } as Product);
              }
            }
            return Array.from(map.values());
          });

        } catch (err) {
          console.warn('Error fetching tags in background', err);
        }
      })();

      // Retornar los productos indexados (útil para llamadas que esperan el resultado)
      return indexedProducts;
    } catch (error) {
      console.error('loadData error', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
      return undefined;
    } finally {
      // Solo limpiar los flags si sigue siendo la última petición lanzada
      if (loadDataRequestIdRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
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

  const handleDeleteProduct = useCallback((id: string) => {
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
  }, [activeFilter]);
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

  if (refreshing || loading || !dataReady) {

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
    const listProducts = await productService.getAllProducts();
    const filteredListProducts = listProducts.filter(p => p.category_id === selectedCategory || !selectedCategory);
    const list = filteredListProducts.length > 0 ? filteredListProducts : listProducts;
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
      const fetchedAllProducts = await productService.getAllProducts();
      setAllProducts(fetchedAllProducts);
      let csvContent = '';
      try {
        if (isXLSX) {
          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
          const workbook = XLSX.read(base64, { type: 'base64' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          csvContent = XLSX.utils.sheet_to_csv(sheet);
        } else {
          csvContent = await FileSystem.readAsStringAsync(uri);
        }
      } catch (innerError) {
        console.error('Error parseando CSV/XLSX:', innerError);
        throw innerError;
      }
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');

      if (lines.length === 0) {
        Alert.alert('Error', 'El archivo CSV está vacío.');
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
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
        const stockStr = columns[stockColIndex]?.trim();
        const stockMinimoStr = columns[stockMinimoColIndex]?.trim();
        const precioCostoStr = columns[precioCostoColIndex]?.trim();
        const unidadesStr = columns[unidadesColIndex]?.trim();

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

        const existingProduct = allProducts.find(p => p.name.toUpperCase() === productName.toUpperCase());

        const newCantidadPorCaja = parseInt(cantidadPorCajaStr, 10);
        const newPrecioPorUnidad = parseFloat(precioPorUnidadStr?.replace(',', '.') || '0');
        const newPrecioPorCaja = parseFloat(precioPorCajaStr?.replace(',', '.') || (precioPorUnidadStr && cantidadPorCajaStr ? (parseFloat(precioPorUnidadStr?.replace(',', '.') || '0') * newCantidadPorCaja).toString() : '0'));
        const unidades = unidadesStr && unidadesStr !== '' ? unidadesStr : stockStr ? (parseInt(stockStr, 10) * newCantidadPorCaja).toString() : '0';
        const newStock = parseInt(stockStr || '0', 10)
        const newUnidades = parseInt(unidades || '0', 10)
        const newStockMinimo = parseInt(stockMinimoStr || '1', 10)
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
            updateData.profit_margin = ((updateData.unit_price - updateData.cost_price) / updateData.cost_price) * 100;
          } else if (existingProduct.cost_price > 0 && updateData.unit_price !== undefined) {
            // Si solo se actualizó selling_price y cost_price ya existía
            updateData.profit_margin = ((updateData.unit_price - existingProduct.cost_price) / existingProduct.cost_price) * 100;
          } else if (existingProduct.selling_price > 0 && updateData.cost_price !== undefined && updateData.cost_price > 0) {
            // Si solo se actualizó cost_price y selling_price ya existía
            updateData.profit_margin = ((existingProduct.unit_price - updateData.cost_price) / updateData.cost_price) * 100;
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

          if (newProduct.cost_price > 0 && newProduct.unit_price > 0) {
            newProduct.profit_margin = ((newProduct.unit_price - newProduct.cost_price) / newProduct.cost_price) * 100;
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
        <FlashList
          ref={flatListRef}
          data={enrichedProducts}
          refreshing={refreshing}
          onRefresh={() => {
            loadData(activeFilter, 1, true);
          }}
          keyExtractor={(item) => item.id!}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          keyboardShouldPersistTaps="never"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          ListFooterComponent={<LoadingFooter />}
          renderItem={renderProductItem}
          ListEmptyComponent={
            enrichedProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textLight }]}>
                No hay productos para mostrar.
              </Text>
            ) : null
          }
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/productos/nuevo')}
        >
          <Ionicons name="add" size={30} color={theme.surface} />
        </TouchableOpacity>
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


