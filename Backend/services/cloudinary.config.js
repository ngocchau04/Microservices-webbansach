const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: "dvueri7f1",
    api_key: "441644399133261",
    api_secret: "j9_1HKdUXlfflYzLDCbNP8Q6_r8",
});

// Khởi tạo CloudinaryStorage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary, // Truyền đối tượng cloudinary đã cấu hình
  params: {
    folder: 'uploads', // Tên thư mục lưu trên Cloudinary
    allowed_formats: ['jpeg', 'png', 'jpg'], // Các định dạng được phép
    public_id: (req, file) => file.originalname, // Đặt tên file
  },
});

module.exports = storage;
