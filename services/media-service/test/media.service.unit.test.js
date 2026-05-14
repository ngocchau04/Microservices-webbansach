const mediaService = require("../src/services/mediaService");

describe("media service unit", () => {
  test("uploadImage rejects when no file is provided", async () => {
    const result = await mediaService.uploadImage({
      file: null,
      config: { cloudinaryFolder: "bookstore/uploads" },
    });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("MEDIA_FILE_REQUIRED");
  });

  test("deleteImage rejects when publicId is missing", async () => {
    const result = await mediaService.deleteImage({ publicId: "" });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("MEDIA_PUBLIC_ID_REQUIRED");
  });
});
