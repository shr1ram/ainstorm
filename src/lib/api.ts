// API helper functions

export async function uploadImage(nodeId: string, file: File): Promise<{ filename: string; path: string }> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('nodeId', nodeId);

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
