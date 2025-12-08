import * as ImageManipulator from 'expo-image-manipulator';

import { getInfoAsync } from 'expo-file-system/legacy';

const COMPRESS_OPTIONS = {
  compress: 0.6,
  format: ImageManipulator.SaveFormat.JPEG,
};

//Resmi verilen boyutlara ve kaliteye göre sıkıştırır.
export const compressImage = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], 
      COMPRESS_OPTIONS
    );
    return result.uri;
  } catch (error) {
    console.error('Resim sıkıştırma hatası:', error);
    return uri;
  }
};

export const getFileInfo = async (uri: string) => {
    try {
        const info = await getInfoAsync(uri);
        
        if (info.exists) {
            const sizeInKB = (info.size / 1024).toFixed(2);
            console.log(`📄 Dosya Bilgisi: ${sizeInKB} KB`);
        } else {
            console.warn("⚠️ Dosya bulunamadı:", uri);
        }
    } catch (error) {
        console.error("❌ Dosya bilgisi okunamadı:", error);
    }
};