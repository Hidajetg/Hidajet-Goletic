/**
 * Take ownership of files while the Android/iOS picker still grants read access.
 * Store independent File objects, not short-lived content:// provider references.
 * HEIC/HEIF photographs are converted to portable JPEGs for every upload surface.
 */
export async function capturePickedFiles(
  selection: FileList | File[] | null | undefined,
): Promise<{files: File[]; errors: string[]}> {
  const originals = Array.from(selection ?? []);
  const files: File[] = [];
  const errors: string[] = [];
  for (const original of originals) {
    try {
      const bytes = await original.arrayBuffer();
      if (!bytes.byteLength) throw new Error("Empty file");
      const readable = new File([bytes], original.name, {
        type: original.type, lastModified: original.lastModified,
      });
      if (/\.hei[cf]$/i.test(readable.name) || /^image\/hei[cf](?:-sequence)?$/i.test(readable.type)) {
        const { heicTo } = await import("heic-to");
        const output = await heicTo({blob: readable, type:"image/jpeg", quality:0.9});
        if (!output.size) throw new Error("HEIC conversion returned no image");
        files.push(new File([output], readable.name.replace(/\.hei[cf]$/i,"")+".jpg", {
          type:"image/jpeg", lastModified: readable.lastModified,
        }));
      } else {
        files.push(readable);
      }
    } catch (error) {
      errors.push(original.name + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
  return {files,errors};
}

export async function capturePickedFile(
  selection: FileList | File[] | null | undefined,
): Promise<File | null> {
  const result = await capturePickedFiles(selection);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  return result.files[0] ?? null;
}
