const { removeDebugProducts } = require("../scripts/debugProductCleanup");

describe("debugProductCleanup", () => {
  test("removes only known debug titles via deleteMany", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ deletedCount: 2 });
    const Product = { deleteMany };

    const deleted = await removeDebugProducts(Product);

    expect(deleted).toBe(2);
    expect(deleteMany).toHaveBeenCalledWith({
      title: { $in: ["Debug Cart Stock", "Debug Cart Stock 2"] },
    });
  });
});
