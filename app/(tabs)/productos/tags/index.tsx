import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tagService } from '@/services/tagService';
import i18n from '@/translations';
import { Tag } from '../../../../models/types';
import ColorPicker from '../../../../components/ColorPicker';
import { useTheme } from '@/contexts/ThemeContext';

export default function TagsScreen() {
  const { theme } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newTagName, setNewTagName] = useState<string>('');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>('#FF5252');

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const tagsData = await tagService.getAllTags();
      setTags(tagsData);
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorAddTag'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorEmptyTagName'));
      return;
    }

    if (newTagName.trim().length < 3) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorTagNameLength'));
      return;
    }

    // Verificar si ya existe una etiqueta con el mismo nombre
    const tagExists = tags.some(tag => 
      tag.name.toLowerCase() === newTagName.trim().toLowerCase()
    );

    if (tagExists) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorTagNameExists'));
      return;
    }

    try {
      setLoading(true);
      await tagService.createTag({
        name: newTagName.trim(),
        color: selectedColor
      });
      setNewTagName('');
      setSelectedColor('#FF5252');
      Alert.alert(i18n.t('common.success'), i18n.t('tags.successAddTag'));
      loadTags();
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorAddTag'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setSelectedColor(tag.color || '#FF5252');
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;
    
    if (!newTagName.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorEmptyTagName'));
      return;
    }

    if (newTagName.trim().length < 3) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorTagNameLength'));
      return;
    }

    // Verificar si ya existe otra etiqueta con el mismo nombre
    const tagExists = tags.some(tag => 
      tag.id !== editingTag.id && 
      tag.name.toLowerCase() === newTagName.trim().toLowerCase()
    );

    if (tagExists) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorTagNameExists'));
      return;
    }

    try {
      setLoading(true);
      await tagService.updateTag(editingTag.id!, {
        name: newTagName.trim(),
        color: selectedColor
      });
      setEditingTag(null);
      setNewTagName('');
      setSelectedColor('#FF5252');
      Alert.alert(i18n.t('common.success'), i18n.t('tags.successUpdateTag'));
      loadTags();
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorUpdateTag'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = (id: string) => {
    Alert.alert(
      i18n.t('tags.confirmDelete'),
      i18n.t('tags.confirmDeleteMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        { 
          text: i18n.t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await tagService.deleteTag(id);
              Alert.alert(i18n.t('common.success'), i18n.t('tags.successDeleteTag'));
              loadTags();
            } catch (error) {
              Alert.alert(i18n.t('common.error'), i18n.t('tags.errorDeleteTag'));
              console.error(error);
            }
          }
        },
      ]
    );
  };

  const handleChangeTagColor = (tag: Tag) => {
    setEditingTag(tag);
    setSelectedColor(tag.color || '#FF5252');
    setShowColorPicker(true);
  };

  const handleSelectColor = async (color: string) => {
    setSelectedColor(color);
    
    // Si estamos editando una etiqueta, actualizar su color inmediatamente
    if (editingTag) {
      try {
        setLoading(true);
        await tagService.updateTag(editingTag.id!, {
          ...editingTag,
          color: color
        });
        setEditingTag(null);
        Alert.alert(i18n.t('common.success'), i18n.t('tags.successUpdateTag'));
        loadTags();
      } catch (error) {
        Alert.alert(i18n.t('common.error'), i18n.t('tags.errorUpdateTag'));
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderTagItem = ({ item }: { item: Tag }) => (
    <View style={[styles.tagItem, { backgroundColor: theme.surface }]}>
      <View style={styles.tagInfo}>
        <View 
          style={[
            styles.tagColorIndicator, 
            { backgroundColor: item.color || '#FF5252' }
          ]} 
        />
        <Text style={[styles.tagName, { color: theme.text }]}>{item.name}</Text>
      </View>
      <View style={styles.tagActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleChangeTagColor(item)}
        >
          <Ionicons name="color-palette" size={20} color={theme.primaryLight} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditTag(item)}
        >
          <Ionicons name="create" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteTag(item.id!)}
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
        <Text style={[styles.title, { color: theme.text }]}>{i18n.t('tags.title')}</Text>
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
            placeholder={i18n.t('tags.newTagPlaceholder')}
            placeholderTextColor={theme.textLight}
            value={newTagName}
            onChangeText={setNewTagName}
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
          onPress={editingTag ? handleUpdateTag : handleAddTag}
        >
          <Text style={[styles.addButtonText, { color: theme.surface }]}>
            {editingTag ? i18n.t('tags.editTag') : i18n.t('tags.addTag')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tags}
        renderItem={renderTagItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textLight }]}>No hay etiquetas registradas.</Text>
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
  tagItem: {
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
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagColorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  tagName: {
    fontSize: 16,
    flex: 1,
    flexWrap: 'wrap',
  },
  tagActions: {
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