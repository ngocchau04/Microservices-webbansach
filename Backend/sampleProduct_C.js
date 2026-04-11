const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/95/6b/03/17339640f5ba57eaee56e2b605130f48.jpg.webp",
        title: "Hồ sơ mật Lầu 5 Góc và Hồi ức về Chiến tranh Việt Nam ",
        author: "Daniel Ellsberg",
        translator: "Vũ Văn Thành, Nguyễn Vị Hà Linh",
        price: 261000,
        originalPrice: 290000,
        discount: 10,
        rating: 4.8,
        reviewsCount: 94,
        soldCount: 527,
        features: [],
        similarBooks: [],
        sku: "VNC1",
        ageGroup: "",
        supplier: "Nhà xuất bản Chính trị Quốc gia",
        publisher: "Nhà xuất bản Chính trị Quốc gia",
        publicationYear: 2017,
        language: "Tiếng Việt",
        weight: "700g",
        dimensions: "16 x 24 cm",
        pages: 687,
        binding: "Bìa cứng",
        description: "Tối ngày 1 tháng Mười năm 1969, tôi rảo bước qua dãy bàn dành cho nhân viên bảo vệ của Rand Corporation (RAND) ở Santa Monica, xách theo một vali đầy tài liệu tối mật mà tôi dự định sẽ sao chụp vào đêm hôm đó. Số tài liệu này là một phần trong công trình nghiên cứu tối mật gồm 7000 trang liên quan tới những quyết sách của Mỹ ở Việt Nam, sau này được biết đến dưới tên gọi Hồ sơ Lầu Năm Góc. Phần còn lại của công trình nằm trong két đựng tài liệu trong văn phòng của tôi. Tôi quyết định sao chụp và đưa ra công chúng toàn bộ nghiên cứu này, hoặc là thông qua các cuộc điều trấn tại Thượng viện, hoặc là thông qua báo chí, nếu cần thiết. Tôi tin rằng tôi có thể sẽ phải ngồi tù suốt đời vì những việc này, nhất là việc đưa ra công chúng bộ Hồ sơ Lầu Năm Góc. Quá trình dẫn dắt tôi đi đến hành động nói trên chính là nội dung trọng tâm của hồi ký này.",
        type: "C"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/0a/32/5c/a13655ab987c303130385bb90238d106.jpg.webp",
        title: "Bàn cờ lớn",
        author: "Zbigniew Brzezinski",
        translator: "Nguyễn Thanh Xuân",
        price: 103300,
        originalPrice: 159000,
        discount: 35,
        rating: 5.0,
        reviewsCount: 4,
        soldCount: 210,
        features: [],
        similarBooks: [],
        sku: "VNC2",
        ageGroup: "",
        supplier: "Alphabooks",
        publisher: "Nhà xuất bản Hà Nội",
        publicationYear: 2022,
        language: "Tiếng Việt",
        weight: "350g",
        dimensions: "14 x 20.5 cm",
        pages: 360,
        binding: "Bìa mềm",
        description: "\"Bàn cờ lớn\" thể hiện tầm nhìn địa chiến lược táo bạo và khiêu khích của Brzezinski dành cho sự ưu việt của nước Mỹ trong thế kỷ 21. Điểm trọng tâm trong phân tích của ông là việc thực thi quyền lực trên lục địa Á-Âu, nơi tập trung phần lớn dân số, tài nguyên thiên nhiên và hoạt động kinh tế của toàn cầu. Trải dài từ Bồ Đào Nha đến Eo biển Bering, từ Lapland đến Malaysia, lục địa Á-Âu chính là một bàn cờ vĩ đại, nơi mà quyền lực tối cao của nước Mỹ sẽ được phê chuẩn và thách thức trong một tầm nhìn dài hạn của những năm sau này. Từ đó, nhiệm vụ mà nước Mỹ phải đối mặt là hiểu về những thay đổi địa chính trị mới trong khu vực này, nhằm đề phòng những đối thủ cạnh tranh mới, quản lý các cuộc xung đột và mối quan hệ ở châu Âu, châu Á và Trung Đông sau sự sụp đổ của Liên Xô để không có siêu cường đối thủ nào phát sinh có thể đe dọa lợi ích sống còn, sự thịnh vượng hay sức mạnh toàn cầu dành riêng cho nước Mỹ. \n Tại sao Pháp và Đức sẽ đóng vai trò địa chiến lược quan trọng, trong khi Anh và Nhật Bản thì không? Tại sao việc mở rộng NATO mang lại cho Nga cơ hội để xóa bỏ những sai lầm trong quá khứ và tại sao Nga không thể bỏ qua cơ hội này sang một bên? Tại sao số phận của Ukraine và Azerbaijan rất quan trọng đối với Mỹ? Tại sao Trung Quốc có khả năng trở thành một mối đe dọa? Tại sao nước Mỹ không chỉ là siêu cường thực sự toàn cầu đầu tiên mà còn là cuối cùng - và ý nghĩa của di sản Mỹ là gì? \n Những kết luận ban đầu và đáng ngạc nhiên của Brzezinski đã thay đổi những hiểu biết khôn ngoan thông thường khi ông đặt nền tảng cho một tầm nhìn mới và hấp dẫn về lợi ích sống còn của nước Mỹ. Một lần nữa, Zbigniew Brzezinski đã cung cấp một hướng dẫn triết học và thực tiễn để duy trì và quản lý sức mạnh toàn cầu của Mỹ.",
        type: "C"
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