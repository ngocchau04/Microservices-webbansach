const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/2a/ec/ed/406ca9007519dddbbefde9de1ad8cc07.png.webp",
        title: "Combo 2 cuốn Truyện Dành Cho Thiếu Nhi : Tuổi Thơ Dữ Dội - Tập 1 + 2 (Tái Bản)",
        author: "Phùng Quán",
        translator: "",
        price: 122000,
        originalPrice: 160000,
        discount: 24,
        rating: 5.0,
        reviewsCount: 63,
        soldCount: 697,
        features: [],
        similarBooks: [],
        sku: "VNT1",
        ageGroup: "",
        supplier: "Nhà xuất bản Kim Đồng",
        publisher: "Nhà xuất bản Kim Đồng",
        publicationYear: 2023,
        language: "Tiếng Việt",
        weight: "420g",
        dimensions: "14 x 20 cm",
        pages: 404,
        binding: "Bìa mềm",
        description: "“Tuổi Thơ Dữ Dội” là một câu chuyện hay, cảm động viết về tuổi thơ. Sách dày 404 trang mà người đọc không bao giờ muốn ngừng lại, bị lôi cuốn vì những nhân vật ngây thơ có, khôn ranh có, anh hùng có, vì những sự việc khi thì ly kỳ, khi thì hài hước, khi thì gây xúc động đến ứa nước mắt. \n Combo 2 cuốn Truyện Dành Cho Thiếu Nhi: Tuổi Thơ Dữ Dội - Tập 1 + 2 (Tái Bản) là một lựa chọn tuyệt vời để giới thiệu cho các bạn nhỏ về một giai đoạn lịch sử hào hùng của đất nước.",
        type: "T"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/47/54/8e/30bac752bcca2beb34a3522990805aa1.jpg.webp",
        title: "Dế Mèn phiêu lưu ký",
        author: "Tô Hoài",
        translator: "",
        price: 131000,
        originalPrice: 150000,
        discount: 13,
        rating: 5.0,
        reviewsCount: 840,
        soldCount: 7000,
        features: [],
        similarBooks: [],
        sku: "VNT2",
        ageGroup: "",
        supplier: "Nhà xuất bản Kim Đồng",
        publisher: "Nhà xuất bản Kim Đồng",
        publicationYear: 2019,
        language: "Tiếng Việt",
        weight: "150g",
        dimensions: "18 x 25 cm",
        pages: 144,
        binding: "Bìa mềm",
        description: "\"Dế Mèn phiêu lưu ký\" là một tác phẩm nổi tiếng của nhà văn Tô Hoài, kể về cuộc phiêu lưu của Dế Mèn, một con dế nhỏ đầy mơ mộng và hiếu kỳ. Qua hành trình khám phá thế giới xung quanh, Dế Mèn gặp gỡ nhiều nhân vật khác nhau và trải qua nhiều thử thách, từ đó học hỏi được nhiều bài học quý giá về cuộc sống, lòng dũng cảm, và tình bạn. Câu chuyện mang đến một cái nhìn thú vị và phong phú về thế giới loài vật, đồng thời truyền tải thông điệp về sự trưởng thành và nhận thức bản thân.",
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