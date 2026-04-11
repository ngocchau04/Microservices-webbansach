const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/17/4a/65/b4765d60127ee4cccf8fd551633fafd4.png.webp",
        title: "Chat GPT Thực Chiến",
        author: "Dịch Dương, Phan Trách Bân, Lý Thế Minh",
        translator: "Huyền Trang",
        price: 101400,
        originalPrice: 169000,
        discount: 40,
        rating: 4.7,
        reviewsCount: 33,
        soldCount: 756,
        features: [],
        similarBooks: [],
        sku: "VNK1",
        ageGroup: "",
        supplier: "1980 Books",
        publisher: "Nhà xuất bản Dân trí",
        publicationYear: 2024,
        language: "Tiếng Việt",
        weight: "300g",
        dimensions: "13 x 20.5 cm",
        pages: 263,
        binding: "Bìa mềm",
        description: "Trong thời đại hiện nay, tất cả những ai không muốn bị tụt hậu đều cần học về các công cụ AI, đặc biệt là biết cách sử dụng công cụ AI trong thực tế. Nếu nắm vững các kiến thức xoay quanh các công cụ AI, bạn có thể nhận được sự hỗ trợ đắc lực để nâng cấp đời sống của mình. \n Một trong những AI thông minh nhất hiện nay là gọi tên Chat GPT. Kể từ khi ra mắt, Chat GPT luôn được mệnh danh là một trí tuệ nhân tạo (AI) thông minh nhất thế giới. Bất kỳ ai từng sử dụng ChatGPT đều có thể cảm nhận sức hấp dẫn và khả năng tư duy “giống như con người” của nó. Nếu nắm được cách thức đặt câu lệnh chính xác, ta có thể dùng ChatGPT để hiện thực hóa vô số tiềm năng, ví dụ như tạo nội dung quảng cáo, làm bảng tính, viết bài văn, viết sách, tạo hình ảnh. Cuốn sách ChatGPT thực chiến xoay quanh việc học và sử dụng các công cụ AI, cũng như cách vận hành thực tế những ứng dụng AI trong các lĩnh vực khác nhau. \n Cuốn sách cung cấp những kiến thức cô đọng và thực tiễn nhất để nâng cao toàn diện những nhận thức, nguyên tắc sử dụng và các thao tác liên quan đến công cụ AI. Đây là thời đại mà tất cả chúng ta đều phải chạy đua, với điểm đích của cuộc đua chính là làm chủ công cụ AI. Nắm chắc nó, đồng thời sử dụng nó tạo ra thành tích là thử thách mà mỗi chúng ta đều phải đối mặt. Hãy cùng nhau bắt đầu tiến vào thời đại mới, nơi AI và con người cộng sinh!",
        type: "K"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/34/73/6b/2582628bf067160b459d9b3f425050a9.jpg.webp",
        title: "Làm Ra Làm, Chơi Ra Chơi (Tái Bản)",
        author: "Cal Newport",
        translator: "Mai Anh",
        price: 108500,
        originalPrice: 159000,
        discount: 32,
        rating: 4.7,
        reviewsCount: 212,
        soldCount: 1000,
        features: [],
        similarBooks: [],
        sku: "VNK2",
        ageGroup: "",
        supplier: "Alphabooks",
        publisher: "Nhà xuất bản Công Thương",
        publicationYear: 2021,
        language: "Tiếng Việt",
        weight: "350g",
        dimensions: "13 x 20.5 cm",
        pages: 352,
        binding: "Bìa mềm",
        description: "Đã bao giờ bạn ngồi xuống để làm việc và sau đó, không hề nhận ra mình lại kết thúc bằng việc dành một (vài) tiếng đồng hồ lướt Youtube, Facebook, tin tức? Tất cả chúng ta đều đã từng làm vậy. Có vẻ như có quá nhiều thứ lôi kéo sự chú ý của chúng ta trong thời đại này, nên rất khó để thậm chí đạt đến trạng thái tinh thần giúp hoàn thành công việc một cách tốt nhất. Trong Làm ra làm chơi ra chơi, tác giả Cal Newport nhấn mạnh chủ đề “làm việc sâu” (deep work) đang ngày càng được chú trọng. Học cách làm thế nào để làm việc sâu – khả năng tập trung vào một nhiệm vụ khó nhằn mà không hề bị sao lãng – là chìa khóa để tạo ra những kết quả tốt hơn trong thời gian ngắn hơn. \n Cuốn sách đưa ra hai mục tiêu, được chia làm hai phần. Phần 1 nhằm thuyết phục bạn rằng giả thiết về làm việc sâu là đúng. Phần 2 giới thiệu đến bạn một số cách để tận dụng làm việc sâu bằng cách rèn luyện não bộ và chuyển đổi thói quen làm việc sang hướng đặt làm việc sâu ở trung tâm sự nghiệp. Newport không hề đưa ra những lời khuyên xáo rỗng, mang tính lý thuyết hay giáo điều. Ông đề nghị chúng ta nên học cách làm quen với sự hời hợt và từ bỏ các công cụ truyền thông xã hội như Facebook, Instagram, (Thậm chí, nếu bạn không muốn làm vậy thì lỹ lẽ của ông cũng rất đáng đọc). Nếu bạn đã từng dành một ngày làm việc trong tình trạng bị sao lãng bởi đám email và thông báo hiện lên liên tục rồi băn khoăn bạn đã làm gì cả ngày thì đây chính là cuốn sách dành cho bạn.",
        type: "K"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/33/56/3e/f3bc41261a2f245ce21038c82b6bcb20.png.webp",
        title: "Khởi Nghiệp Bán Lẻ",
        author: "Trần Thanh Phong",
        translator: "",
        price: 117000,
        originalPrice: 199000,
        discount: 41,
        rating: 4.8,
        reviewsCount: 2310,
        soldCount: 4900,
        features: [],
        similarBooks: [],
        sku: "VNK3",
        ageGroup: "",
        supplier: "Công ty TNHH Truyền Thông Giver",
        publisher: "Nhà xuất bản Đà Nẵng",
        publicationYear: 2021,
        language: "Tiếng Việt",
        weight: "270g",
        dimensions: "13 x 20.5 cm",
        pages: 272,
        binding: "Bìa mềm",
        description: "Khởi Nghiệp Bán Lẻ - Bí Quyết Thành Công Và Giàu Có Bằng Những Cửa Hàng Đông Khách - Công Thức Kinh Doanh Và Quản Lý Cửa Hàng Hiệu Quả - TOP 1 SÁCH KHỞI NGHIỆP CHỨA ĐỰNG KINH NGHIỆM TRONG 10 NĂM KINH DOANH CỦA MỘT NGƯỜI TỪNG QUẢN LÝ 65 CỬA HÀNG BÁN LẺ",
        type: "K"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/b5/97/30/700ad2a7f988cbea25c49ae8ae1a37c8.png.webp",
        title: "Kế Toán Vỉa Hè - Thực Hành Báo Cáo Tài Chính Căn Bản Từ Quầy Bán Nước Chanh",
        author: "Darrell Mullis, Judith Orloff",
        translator: "Trần Thanh Phong",
        price: 169000,
        originalPrice: 199000,
        discount: 15,
        rating: 5.0,
        reviewsCount: 255,
        soldCount: 13000,
        features: [],
        similarBooks: [],
        sku: "VNK4",
        ageGroup: "",
        supplier: "Công ty TNHH Truyền Thông Giver",
        publisher: "Nhà xuất bản Thế Giới",
        publicationYear: 2023,
        language: "Tiếng Việt",
        weight: "270g",
        dimensions: "13 x 20.5 cm",
        pages: 268,
        binding: "Bìa mềm",
        description: "Đã bao lần bạn cầm trên tay bảng báo cáo tài chính doanh nghiệp của mình, nhưng chẳng thể nào hiểu nổi? Kế toán và tài chính là nỗi đau chung của rất nhiều doanh nghiệp nhỏ. Ngôn ngữ tài chính dường như là điều bí ẩn nhất của thế giới. Vô số tính toán và ý đồ được cài cắm sau các con số, mà thậm chí người kinh doanh nhiều năm cũng không thể nào bóc tách nổi. Nếu bạn vẫn cảm thấy mù mờ với bảng báo cáo tài chính của mình thì thật là đáng tiếc. Tài chính được xem như là ngôn ngữ của kinh doanh. Bảng kế toán sẽ cho bạn biết được doanh nghiệp của mình lời hay lỗ, trả lời câu hỏi vì sao trông bạn có vẻ đang ăn nên làm ra, nhưng két sắt công ty không có lấy một đồng.",
        type: "K"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/23/f8/75/5e90d6e0eabaebd068c815cf1c1f7396.jpg.webp",
        title: "Người giàu có nhất thành Babylon (Tái bản 2020)",
        author: "GEORGE SAMUEL CLASON",
        translator: "Võ Hưng Thanh",
        price: 68600,
        originalPrice: 98000,
        discount: 30,
        rating: 5.0,
        reviewsCount: 2505,
        soldCount: 17000,
        features: [],
        similarBooks: [],
        sku: "VNK5",
        ageGroup: "",
        supplier: "First News - Trí Việt",
        publisher: "Nhà xuất bản Tổng hợp TP.HCM",
        publicationYear: 2020,
        language: "Tiếng Việt",
        weight: "230g",
        dimensions: "13 x 20.5 cm",
        pages: 216,
        binding: "Bìa gập",
        description: "Người giàu có nhất thành Babylon (tiếng Anh: The Richest Man in Babylon) được xem là một trong những tác phẩm truyền cảm hứng lớn nhất về chủ đề tiết kiệm, kế hoạch tài chính và sự giàu có cá nhân. Tác phẩm được viết bởi doanh nhân, nhà văn Mỹ George Samuel Clason vào năm 1926, kể về cách tiết kiệm, buôn bán và làm giàu của người dân ở thành Babylon cổ xưa.",
        type: "K"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/1d/42/93/242e97bbff16afc192f1976e3bdf5f19.jpg.webp",
        title: "Nhà Lãnh Đạo Không Chức Danh",
        author: "Robin Sharma",
        translator: "Nguyễn Minh Thiên Kim",
        price: 74180,
        originalPrice: 105000,
        discount: 29,
        rating: 5.0,
        reviewsCount: 155,
        soldCount: 3000,
        features: [],
        similarBooks: [],
        sku: "VNK6",
        ageGroup: "",
        supplier: "Nhà xuất bản Trẻ",
        publisher: "Nhà xuất bản Trẻ",
        publicationYear: 2022,
        language: "Tiếng Việt",
        weight: "200g",
        dimensions: "10 x 14.5 cm",
        pages: 178,
        binding: "Bìa mềm",
        description: "Suốt hơn 15 năm, Robin Sharma đã thầm lặng chia sẻ với những công ty trong danh sách Fortune 500 và nhiều người siêu giàu khác một công thức thành công đã giúp ông trở thành một trong những nhà cố vấn lãnh đạo được theo đuổi nhiều nhất thế giới. Đây là lần đầu tiên Sharma công bố công thức độc quyền này với bạn, để bạn có thể đạt được những gì tốt nhất, đồng thời giúp tổ chức của bạn có thể có những bước đột phá đến một cấp độ thành công mới trong thời đại thiên biến vạn hóa như hiện nay.",
        type: "K"
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