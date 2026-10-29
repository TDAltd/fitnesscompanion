// Shrinks a meal photo in the browser before it is sent for an AI estimate.
const MAX_MEAL_PHOTO_DATA_URL_LENGTH = 2_800_000;
const MAX_MEAL_PHOTO_FILE_BYTES = 20 * 1024 * 1024;

export async function compressMealPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > MAX_MEAL_PHOTO_FILE_BYTES) {
    throw new Error("Choose a photo smaller than 20 MB.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const maxEdge = 1024;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This photo could not be prepared. Try another image.");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const imageData = canvas.toDataURL("image/jpeg", 0.78);
    if (imageData.length > MAX_MEAL_PHOTO_DATA_URL_LENGTH) {
      throw new Error("This photo is still too large. Try a smaller image.");
    }
    return imageData;
  } finally {
    bitmap.close();
  }
}

