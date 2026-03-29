/**
 * Read a File as a base64 data URL.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract pasted image files from a ClipboardEvent.
 */
export function getImagesFromClipboard(e: React.ClipboardEvent): File[] {
  const files: File[] = [];
  const items = e.clipboardData?.items;
  if (!items) return files;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}
