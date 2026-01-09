import { Injectable } from '@angular/core';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  async uploadFile(base64OrUrl: string, folder: string): Promise<string> {
    // Se è vuoto o già un link, non fare nulla.
    if (!base64OrUrl || !base64OrUrl.startsWith('data:')) {
      return base64OrUrl || '';
    }

    try {
      const blob = this.dataURLtoBlob(base64OrUrl);
      const mime = blob.type;
      const ext = mime.split('/')[1] || 'png';
      const fileName = `${folder}/${Date.now()}.${ext}`;

      const storage = getStorage();
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      console.log(`Upload completato in ${folder}:`, downloadUrl);
      return downloadUrl;
    } catch (e) {
      console.error('Errore Upload Storage:', e);
      throw new Error('Impossibile caricare il file. Riprova.');
    }
  }

  async uploadPrivacyPdf(pdfFile: File): Promise<string> {
    const fileName = `privacy_${Date.now()}.pdf`;
    const filePath = `privacy_files/${fileName}`;
    const storageRef = ref(getStorage(), filePath);

    console.log('Caricamento PDF su Storage...');
    await uploadBytes(storageRef, pdfFile);
    const downloadUrl = await getDownloadURL(storageRef);
    console.log('PDF caricato:', downloadUrl);
    return downloadUrl;
  }

  base64ToBlob(base64: string): Blob {
    try {
      const base64Clean = base64.split(',')[1] || base64;
      const byteCharacters = atob(base64Clean);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: 'application/pdf' });
    } catch (e) {
      console.error('Errore conversione PDF', e);
      return new Blob([], { type: 'application/pdf' });
    }
  }

  async imageUrlToBase64(url: string): Promise<string> {
    try {
      if (url.startsWith('data:')) return url;
      console.log('Converting image URL to Base64:', url);

      const response = await fetch(url);
      const blob = await response.blob();

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Errore conversione immagine:', error);
      return '';
    }
  }

  private dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
