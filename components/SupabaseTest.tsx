import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../utils/supabase';

export default function SupabaseTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[] | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Try to query any table you have in your Supabase
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .limit(1);

        if (error) {
          console.error('Supabase query error:', error);
          setError(error.message);
        } else {
          console.log('Supabase connection successful:', data);
          setData(data);
        }
      } catch (err) {
        console.error('Supabase connection error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    testConnection();
  }, []);

  if (loading) {
    return (
      <View style={{ padding: 20 }}>
        <ActivityIndicator size="large" />
        <Text style={{ textAlign: 'center', marginTop: 10 }}>Testing Supabase connection...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: 'red' }}>Error connecting to Supabase:</Text>
        <Text style={{ marginTop: 10 }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ color: 'green', fontWeight: 'bold' }}>Supabase connection successful!</Text>
      <Text style={{ marginTop: 10 }}>Data received: {JSON.stringify(data)}</Text>
    </View>
  );
}