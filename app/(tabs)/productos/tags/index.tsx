import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../../constants/Colors';
import { tagService } from '../../../../services/tagService';
import { Tag } from '../../../../models/types';
import i18n from '../../../../translations';

export default function TagsScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tagsData = await tagService.getAllTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorEmptyName'));
      return;
    }

    try {
      await tagService.createTag({ 
        name: newTagName.trim(),
        color: Colors.primary // You could add color selection later
      });
      setNewTagName('');
      loadTags();
      Alert.alert(i18n.t('common.success'), i18n.t('tags.successAdd'));
    } catch (error) {
      console.error('Error creating tag:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('tags.errorAdd'));
    }
  };

  const handleDeleteTag = async (tagId: string) => {
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
              await tagService.deleteTag(tagId);
              loadTags();
              Alert.alert(i18n.t('common.success'), i18n.t('tags.successDelete'));
            } catch (error) {
              console.error('Error deleting tag:', error);
              Alert.alert(i18n.t('common.error'), i18n.t('tags.errorDelete'));
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newTagName}
          onChangeText={setNewTagName}
          placeholder={i18n.t('tags.newTagPlaceholder')}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddTag}>
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tags}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <View style={styles.tagItem}>
            <View style={[styles.tagColor, { backgroundColor: item.color || Colors.primary }]} />
            <Text style={styles.tagName}>{item.name}</Text>
            <TouchableOpacity
              onPress={() => handleDeleteTag(item.id!)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tagColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  tagName: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  deleteButton: {
    padding: 8,
  },
});