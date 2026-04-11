const mongoose = require('mongoose');
const Product = require('./models/Product'); // Adjust the path to your Product model

// Sample book data
const sampleBooks = [
  {
    imgSrc: "https://pos.nvncdn.com/fd5775-40602/ps/20240720_zDJPi505tp.webp",
    title: "Dẫn dắt một bầy sói hay chăn một đàn cừu",
    author: "Tiffani Bova",
    translator: "Trương Anh Tuấn",
    price: 156000,
    originalPrice: 165000,
    discount: 20,
    rating: 4.8,
    reviewsCount: 256,
    soldCount: 1500,
    features: ["Classic text on military strategy", "Insights into leadership and tactics", "Applicable to business and life challenges"],
    similarBooks: [],
    sku: "BK1",
    ageGroup: "Người lớn",
    supplier: "Ancient Wisdom Publishers",
    publisher: "Nhà xuất bản Dân trí",
    publicationYear: 2020,
    language: "Tiếng Việt",
    weight: "250g",
    dimensions: "21 x 14 x 1.5 cm",
    pages: 200,
    binding: "Bìa mềm",
    description: "Hướng dẫn toàn diện về lãnh đạo và chiến lược kinh doanh.",
    type: "K"
  },
  {
    imgSrc: "https://cdn0.fahasa.com/media/catalog/product/_/2/_2024_-thay_doi_ti_hon_hieu_qua_bat_ngo-tb8-02.jpg",
    title: "Atomic Habits",
    author: "James Clear",
    translator: "Vũ Phi Yên - Trần Như Quỳnh",
    price: 170100,
    originalPrice: 189000,
    discount: 10,
    rating: 4.9,
    reviewsCount: 500,
    soldCount: 3000,
    features: ["Proven framework for building habits", "Practical strategies for success", "Popular self-help book"],
    similarBooks: [],
    sku: "BK2",
    ageGroup: "4+",
    supplier: "Motivation Publishers",
    publisher: "Success Books",
    publicationYear: 2019,
    language: "Tiếng Việt",
    weight: "300g",
    dimensions: "22 x 14 x 2 cm",
    pages: 320,
    binding: "Bìa cứng",
    description: "Atomic Habits \n- Thay Đổi Tí Hon Hiệu Quả Bất Ngờ (Tái Bản 2023) \n Wall Street Journal Bestseller, USA Today Bestseller, Publisher's Weekly Bestseller \n Nằm trong Top 20 tựa sách thể loại non-fiction bán chạy và được tìm đọc nhiều nhất của Amazon suốt 40 tuần tính đến tháng 9/2019 \n Một thay đổi tí hon có thể biến đổi cuộc đời bạn không? Hẳn là khó đồng ý với điều đó. Nhưng nếu bạn thay đổi thêm một chút? Một chút nữa? Rồi thêm một chút nữa? Đến một lúc nào đó, bạn phải công nhận rằng cuộc sống của mình đã chuyển biến nhờ vào một thay đổi nhỏ…Và đó chính là sức mạnh của thói quen nguyên tử.",
    type: "A"
  },

  {
    imgSrc: "https://cdn0.fahasa.com/media/catalog/product/9/7/9786043775662.jpg",
    title: "Giáo trình chuẩn HSK",
    author: "Khương Lệ Bình, Vương Phương, Vương Phong, Lưu Lệ Bình",
    translator: "TS Nguyễn Thị Minh Hồng",
    price: 168300,
    originalPrice: 198000,
    discount: 15,
    rating: 4.9,
    reviewsCount: 500,
    soldCount: 7400,
    features: ["Top 100 sách tiếng Hoa phát triển nhất"],
    similarBooks: [],
    sku: "BK3",
    ageGroup: "",
    supplier: "Công ty TNHH Nhân trí Việt",
    publisher: "Nhà xuất bản tổng hợp Thành phố Hồ Chí Minh",
    publicationYear: 2024,
    language: "Tiếng Việt",
    weight: "345g",
    dimensions: "28.5 x 21 x 1 cm",
    pages: 141,
    binding: "Bìa mềm",
    description: "Kết hợp thi cử và giảng dạy: Được biên soạn phù hợp với nội dung, hình thức cũng như các cấp độ của đề thi HSK thật, bộ sách này có thể được sử dụng đồng thời cho cả hai mục đích là giảng dạy tiếng Trung Quốc và luyện thi HSK. \n Bố cục chặt chẽ và khoa học: Các điểm ngữ pháp được giải thích cặn kẽ, phần ngữ âm và chữ Hán được trình bày từ đơn giản đến phức tạp theo từng cấp độ",
    type: "G"
  },
  {
    imgSrc: "https://cdn0.fahasa.com/media/catalog/product/9/7/9786044777481.jpg",
    title: "38 Bức Thư Rockefeller Viết Cho Con Trai",
    author: "Rockerfeller",
    translator: "Thanh Hương",
    price: 67800,
    originalPrice: 113000,
    discount: 40,
    rating: 4.9,
    reviewsCount: 500,
    soldCount: 3000,
    features: ["Sách kỹ năng sống"],
    similarBooks: [],
    sku: "BK4",
    ageGroup: "",
    supplier: "SBooks",
    publisher: "Nhà xuất bản Văn học",
    publicationYear: 2023,
    language: "Tiếng Việt",
    weight: "300g",
    dimensions: "20.5 x 15 x 1.3 cm",
    pages: 268,
    binding: "Bìa Mềm",
    description: "NGƯỜI SỐNG TRÊN ĐỜI, NHƯ THẾ NÀO LÀ THIỆN, LẠI NHƯ THẾ NÀO LÀ ÁC? THẾ NÀO LÀ SỰ THIÊN LỆCH, MÀ THẾ NÀO MỚI LÀ CHÍNH ĐÍNH?",
    type: "A"
  },
  {
    imgSrc: "https://cdn0.fahasa.com/media/catalog/product/n/i/ninja-rantaro_bia_tap-41.jpg",
    title: "Ninja Rantaro - Tập 41 (Tái Bản 2024)",
    author: "Soubee Amako",
    translator: "Nguyễn Vân Anh",
    price: 180000,
    originalPrice: 200000,
    discount: 10,
    rating: 4.9,
    reviewsCount: 500,
    soldCount: 3000,
    features: [""],
    similarBooks: [],
    sku: "BK5",
    ageGroup: "4+",
    supplier: "NXB Kim Đồng",
    publisher: "NXB Kim Đồng",
    publicationYear: 2024,
    language: "Tiếng Việt",
    weight: "215g",
    dimensions: "18 x 13 x 1.2 cm",
    pages: 244,
    binding: "Bìa cứng",
    description: "“Rất vui khi được gặp lại các cháu. Bác đoán vào năm học mới chắc hẳn có nhiều bạn sẽ được bầu làm ban cán sự lớp đúng không? Ban cán sự của trường đào tạo ninja năm học mới này sẽ có nhiều hoạt động rất sôi nổi, các cháu hãy cùng chờ xem nhé! \n Ninja Rantaro tập này sẽ lấy bối cảnh là “địa ngục”, chắc các cháu cũng từng được nghe kể địa ngục là nơi như thế nào rồi nhỉ. Bác chỉ lấy ví dụ chẳng hạn nếu ai nói dối khi xuống địa ngục sẽ bị kéo mất lưỡi. Nghe sợ ghê ha! Bác dự định sẽ cho nhân vật Diêm Vương xuất hiện, Diêm Vương sẽ được vẽ dựa trên hình mẫu bức tượng trong chùa Gangoji ở Nara nên rất đẹp đấy!”",
    type: "T"
  }
];

const insertSampleData = async () => {
  try {
    await mongoose.connect('mongodb+srv://damthingocchau:admin123@cluster0.lgfxk.mongodb.net/shopbook'); // Replace with your MongoDB URI
    console.log('Connected to MongoDB');

    var count = await Product.countDocuments();
    if (count > 0) {
      console.log(`Collection is currently having ${count} entries`);
      // await Product.deleteMany();
      // console.log('Existing data cleared');
    } else {
      console.log('Collection is empty');
    }

    await Product.insertMany(sampleBooks);
    console.log('Sample data inserted successfully.');

    count = await Product.countDocuments();
    console.log(`Collection is currently having ${count} entries`);

    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error inserting sample data:', error);
    mongoose.disconnect();
  }
};

insertSampleData();