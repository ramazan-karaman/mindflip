import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface InputWithLimitProps extends TextInputProps {
  limit: number;
  value: string;
}

export default function InputWithLimit({ limit, value, style, ...props }: InputWithLimitProps) {
  const remaining = limit - (value ? value.length : 0);
  const isNearLimit = remaining < 5; // Son 5 karakter kala kırmızı olsun

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, style]}
        maxLength={limit} // Fiziksel olarak engelle
        value={value}
        {...props}
      />
      <Text style={[styles.counter, isNearLimit && styles.warning]}>
        {value ? value.length : 0}/{limit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  counter: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginRight: 4,
  },
  warning: {
    color: 'red',
    fontWeight: 'bold',
  }
});