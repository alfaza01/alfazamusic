import { Song } from '../types';
import { saveSong } from './db';
import { useMenuStore } from '../store/useMenuStore';

export async function downloadSongAsMp3(song: Song, onProgress?: (status: 'loading' | 'completed' | 'failed') => void): Promise<void> {
  const videoId = song.id.split('_')[0];
  const downloadUrl = (song.id.startsWith('local_') || song.url?.startsWith('blob:'))
    ? song.url
    : import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/proxy-download?id=${videoId}` : `/api/proxy-download?id=${videoId}`;

  if (!downloadUrl) {
    onProgress?.('failed');
    throw new Error('Lagu ini tidak memiliki URL audio.');
  }

  try {
    onProgress?.('loading');
    
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const blob = await response.blob();
    
    // 1. Save permanently inside client IndexedDB for offline playing inside app
    await saveSong(song, blob, false);

    // 2. Trigger standard browser download for physical .mp3 saving to device folder
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${song.title} - ${song.artist}.mp3`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);

    onProgress?.('completed');
  } catch (error) {
    console.error('Error downloading song, falling back to Premium Converter:', error);
    onProgress?.('failed');
    
    // Graceful Recovery: Trigger the premium converter interactive modal automatically!
    setTimeout(() => {
      useMenuStore.getState().openConverter(song);
    }, 500);
    
    throw error;
  }
}
