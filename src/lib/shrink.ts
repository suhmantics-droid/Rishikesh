// Browser-side: makes a phone photo small enough to upload. Vercel turns away request bodies over
// 4.5 MB and a phone photo is often bigger, so anything over 4 MB is redrawn with its longest side at
// 3200 px (the size the server keeps anyway) as a JPEG. Rotation is applied; EXIF and GPS are dropped.

const LIMIT = 4 * 1024 * 1024;

export async function fitForUpload(file: File): Promise<File> {
  if (file.size <= LIMIT || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 3200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.9, 0.8, 0.7]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= LIMIT) return new File([blob], `${file.name.replace(/\.\w+$/, "")}.jpg`, { type: "image/jpeg" });
    }
  } catch {
    // A format this browser can't draw (HEIC outside Safari): send it as it is.
  }
  return file;
}
