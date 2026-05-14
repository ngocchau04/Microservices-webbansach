jest.mock("../src/config/cloudinary", () => ({
  cloudinary: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

const { cloudinary } = require("../src/config/cloudinary");
const mediaService = require("../src/services/mediaService");

describe("media service unit", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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

  test("uploadImage với file hợp lệ trả về imageUrl và publicId", async () => {
    cloudinary.uploader.upload_stream.mockImplementationOnce((options, callback) => ({
      end: () =>
        callback(null, {
          secure_url: "https://res.cloudinary.com/test/image/upload/v1/test.jpg",
          public_id: "bookstore/uploads/test",
          width: 800,
          height: 600,
          format: "jpg",
          bytes: 12345,
        }),
    }));

    const result = await mediaService.uploadImage({
      file: { buffer: Buffer.from("fake-image"), originalname: "test.jpg" },
      config: { cloudinaryFolder: "bookstore/uploads" },
    });

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.data.imageUrl).toBe("https://res.cloudinary.com/test/image/upload/v1/test.jpg");
    expect(result.data.publicId).toBe("bookstore/uploads/test");
  });

  test("deleteImage với publicId hợp lệ xóa thành công", async () => {
    cloudinary.uploader.destroy.mockResolvedValueOnce({ result: "ok" });

    const result = await mediaService.deleteImage({ publicId: "bookstore/uploads/test" });

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.data.deleted).toBe(true);
    expect(result.data.publicId).toBe("bookstore/uploads/test");
  });
});
