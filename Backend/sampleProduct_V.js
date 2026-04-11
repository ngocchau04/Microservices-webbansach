const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/eb/86/43/35c8f27383890468d72b29a67add11a9.jpg.webp",
        title: "Thép đã tôi thế đấy (Bản dịch đầy đủ nhất)",
        author: "Nikolai A.Ostrovsky",
        translator: "Vũ Văn Thành, Nguyễn Vị Hà Linh",
        price: 87500,
        originalPrice: 125000,
        discount: 30,
        rating: 4.6,
        reviewsCount: 83,
        soldCount: 702,
        features: [],
        similarBooks: [],
        sku: "VNV1",
        ageGroup: "",
        supplier: "Nhà sách Minh Thắng",
        publisher: "Nhà xuất bản Đại học Quốc gia Hà Nội",
        publicationYear: 2022,
        language: "Tiếng Việt",
        weight: "750g",
        dimensions: "14,5 x 20,5 cm",
        pages: 780,
        binding: "Bìa mềm",
        description: "Thép Đã Tôi Thế Đấy của N.A.Ostrovsky sẽ trả lời cho chúng ta: \"Thế nào là thép đã tôi?\"Trong tác phẩm, nhà văn đã tập trung miêu tả sự trưởng thành của Pavel như quá trình tôi luyện một thanh thép thật sự. \n Nhiều người trong chúng ta, chắc lẽ đều nghe đến câu nói nổi tiếng của Paven: \"Cái quý nhất của con người ta là sự sống. Đời người chỉ sống có một lần. Phải sống sao cho khỏi xót xa ân hận vì những năm tháng đã sống hoài sống phí, cho khỏi hổ thẹn vì dĩ vãng ti tiện và hèn đớn của mình để khi nhắm mắt xuôi tay có thể nói rằng: Tất cả đời ta, tất cả sức ta, ta đã hiến dâng cho sự nghiệp cao đẹp nhất trên đời, sự nghiệp đấu tranh giải phóng loài người\". Câu nói này đến nay vẫn được rất nhiều người yêu thích. \n Tác phẩm kiệt xuất này là một phần hành trang ta mang theo khi bước vào đời. Có lúc ta vấp ngã, ta đau đớn, thất vọng…nhưng ta luôn nhớ \"Hãy biết sống cả khi cuộc đời trở nên là không thể chịu đựng\", bởi lẽ \"cuộc sống luôn thử thách một cách khắc nghiệt những người mà nó chọn\". \n Tác phẩm là khúc ca tươi đẹp của cuộc sống. Mỗi trang sách như lấm láp gió bụi cuộc đời, ấm hơi thở cuộc sống, như cuốn thêm máu trong người đọc, nâng cao ý thức sống, nhiệt tình sống, học tập, lao động bằng những đam mê cháy bỏng. Pavel đã sống, sống một cách khẩn trương và gấp gáp, đầy lý tường vì anh biết \"đời người chỉ sống có một lần\"'.",
        type: "V"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/57/9c/20/35220dfdd9a9cd68823acc1a052a3c1c.jpg.webp",
        title: "Tiếng Việt ân tình - Tập 1",
        author: "Lê Trọng Nghĩa",
        translator: "",
        price: 109850,
        originalPrice: 169000,
        discount: 35,
        rating: 5.0,
        reviewsCount: 4,
        soldCount: 210,
        features: [],
        similarBooks: [],
        sku: "VNV2",
        ageGroup: "",
        supplier: "Thái Hà",
        publisher: "Nhà xuất bản Thế giới",
        publicationYear: 2024,
        language: "Tiếng Việt",
        weight: "320g",
        dimensions: "14.5 x 20.5cm",
        pages: 344,
        binding: "Bìa mềm",
        description: "Khi nhắc tới “ngôn ngữ học”, chúng ta dễ hình dung đến những khái niệm hàn lâm như “hình thái học”, “tu từ”, “âm vị”, “phân tích diễn ngôn” Có lẽ vì thế mà ngoại trừ giới chuyên môn hoặc những ai có đam mê mãnh liệt, thường người ta sẽ khá ngần ngại khi đọc các bài luận về ngôn ngữ dù nội dung có hay cách mấy. Điều này vô tình trở thành rào cản đối với việc truyền bá những cái hay cái đẹp của tiếng Việt. \n Nhắc đến sự giàu đẹp của tiếng Việt, đa số chúng ta thường chỉ nghĩ đến sáu thanh: sắc, huyền, ngang, hỏi, ngã, nặng - chất liệu khiến “nói nghe như hát”. Thế nhưng khi tìm hiểu sâu hơn, ta mới thấy tiếng Việt còn đẹp vô cùng bởi cách dùng từ, bởi sự vận dụng linh hoạt những từ mượn; bởi các câu tục ngữ, ca dao; bởi tên địa danh, tên món ăn, đồ uố Đó là những tinh hoa đã được ông cha đúc kết lại trong suốt mấy ngàn năm lịch sử mà chỉ cần lần dở lại những trang sách ngày xưa, ta sẽ thấy ngay cả một kho tàng. Tiếc rằng vì nhiều lý do khách quan mà với đa số mọi người, kho tàng vô giá kia vẫn còn ẩn hiện sau lớp sương mờ, chỉ những ai hữu duyên mới có cơ may khám phá. Song song với đó là sự phổ biến của mạng xã hội và nhu cầu học ngoại ngữ, tuy có nhiều tác động tích cực nhưng cũng kèm theo nhiều mặt trái, khiến một bộ phận các bạn trẻ yêu thích và ưa chuộng tiếng nước ngoài hơn khi chưa kịp hiểu rõ cái hay, cái đẹp của ngôn ngữ quê nhà. Đây là một hệ quả tất yếu của quá trình hội nhập , và mọi chỉ trích, lên án đều không phải là giải pháp hữu ích, dài lâu. \n Với mong muốn mang cái hay, cái đẹp của tiếng mẹ đẻ đến với cộng đồng một cách thiết thực và hiệu quả nhất, trang Tiếng Việt giàu đẹp đã được ra đời cùng cách tiếp cận mới mẻ, gần gũi, cho mọi người thấy tiếng Việt cũng hay, cũng hấp dẫn không kém bất kỳ ngôn ngữ nào trên thế giới. Cuốn sách này không khai thác quá sâu về một đề tài cũng cũng không đi vào chi tiết với những lý luận chặt chẽ, khô khan, mà chỉ cố gắng trình bày ngắn gọn, súc tích nhất có thể, đủ cho người đọc cảm thấy hứng thú và nếu cần, họ sẽ tự tìm hiểu thêm. May mắn là lối tiếp cận này đã được đông đảo độc giả đón nhận, đưa trang Tiếng Việt giàu đẹp ngày càng phát triển.",
        type: "V"
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