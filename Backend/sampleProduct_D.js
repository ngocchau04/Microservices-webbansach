const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/7b/23/67/7f1754406c2a8370a8ceae26c68c7f0f.jpg.webp",
        title: "MESSI VS. RONALDO SỰ ĐỐI ĐẦU CỦA HAI CẦU THỦ VĨ ĐẠI VÀ KỶ NGUYÊN TÁI TẠO BÓNG ĐÁ THẾ GIỚI",
        author: "Joshua Robinson, Jonathan Clegg",
        translator: "Vũ Văn Thành, Nguyễn Vị Hà Linh",
        price: 170000,
        originalPrice: 200000,
        discount: 15,
        rating: 5.0,
        reviewsCount: 9,
        soldCount: 25,
        features: [],
        similarBooks: [],
        sku: "VND1",
        ageGroup: "",
        supplier: "Nhà xuất bản Trẻ",
        publisher: "Nhà xuất bản Trẻ",
        publicationYear: 2023,
        language: "Tiếng Việt",
        weight: "370g",
        dimensions: "16 x 24 cm",
        pages: 364,
        binding: "Bìa mềm tay gấp",
        description: "Joshua Robinson và Jonathan Clegg kết hợp những câu chuyện về Messi và Ronaldo thành một sử thi về kỷ nguyên hiện đại của bóng đá, trình bày chi tiết cách thức mà cuộc đua tranh giữa họ đã làm biến đổi cả bóng đá và ngành kinh doanh bóng đá quốc tế, một lần và mãi mãi. Dựa trên những tài liệu gốc và nhiều năm đưa tin trên các tờ báo, cuốn sách này tổng hợp vô số dữ kiện và câu chuyện liên quan tới hai danh thủ. Các tác giả như thể đi sâu vào phòng thay đồ và phòng họp ban lãnh đạo của các câu lạc bộ - những nơi hình thành nên các huyền thoại bóng đá thế giới, và tiết lộ cho độc giả những tình tiết hấp dẫn cả trong và ngoài sân cỏ. Từ những khởi đầu khác nhau tới những bước đi cũng vô cùng khác biệt trong sự nghiệp, hai siêu sao Argentina và Bồ Đào Nha có những cách thành công rất riêng, cùng với những chi tiết đôi khi thực sự thái quá liên quan đến mỗi người. Kết hợp cùng nhau, câu chuyện về họ chính là biểu tượng cho sự tăng trưởng chóng mặt của bóng đá thế giới. Ngoài ra, nó cũng cho thấy cái cách mà truyền thông mạng xã hội đã biến đổi triệt để quyền lực của những ngôi sao thể thao. Cuối cùng, mong muốn khai thác triệt để khoản đầu tư hàng tỷ đô la vào Messi và Ronaldo đã làm thay đổi vài câu lạc bộ hàng đầu châu Âu như Barcelona, Real Madrid và Manchester United. \n World Cup 2022 có lẽ là giải vô địch thế giới cuối cùng với cả Messi và Ronaldo. Do đó, cuốn sách này cũng dành nhiều trang đánh giá về di sản của họ cho bóng đá, cũng như phân tích những ảnh hưởng mà tài năng của họ tạo ra, cả tích cực lẫn tiêu cực. Hơn cả việc đơn thuần liệt kê những thành tích của hai siêu sao, đây thực sự là một “tiểu sử của cuộc đua tranh” vốn đã trở thành một lăng kính quan trọng để hiểu về quá khứ, hiện tại và tương lai của bóng đá thế giới.",
        type: "D"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/89/af/c3/d5a56892f820974dcc46db24d2291bc7.jpg.webp",
        title: "Đảo ngược Kim Tự Tháp: Lịch sử chiến thuật bóng đá",
        author: "Jonathan Wilson",
        translator: "Nguyễn Thanh Xuân",
        price: 251000,
        originalPrice: 386000,
        discount: 25,
        rating: 5.0,
        reviewsCount: 5,
        soldCount: 44,
        features: [],
        similarBooks: [],
        sku: "VND2",
        ageGroup: "",
        supplier: "BESTBOOKS",
        publisher: "Nhà xuất bản Dân Trí",
        publicationYear: 2022,
        language: "Tiếng Việt",
        weight: "700g",
        dimensions: "16 x 24 cm",
        pages: 680,
        binding: "Bìa mềm",
        description: "Đảo Ngược Kim Tự Tháp trước hết là cuốn sách lịch sử về bóng đá. Thông qua những chương đầu, bạn sẽ biết bóng đá ra đời ra sao? Việc hình thành nên bộ Luật Bóng đá đã trải qua những bước thay đổi thế nào? Luật việt vị đã phải liên tục chỉnh sửa sau khi chứng kiến những điều bất cập ngoài thực tế (thuở ban đầu một đội bóng có thể việt vị ngay trên phần sân nhà của mình!) cũng như công cuộc truyền bá bóng đá (theo cái cách mà chúng ta hình dung về môn chơi này như ngày nay) từ nước Anh tới muôn nơi trên thế giới: sang châu Âu lục địa, vượt Đại Tây Dương sang châu Mỹ, …thông qua các vị huấn luyện viên lang thang phiêu bạt rao giảng lý tưởng chơi bóng của mình. \n Đảo Ngược Kim Tự Tháp là cuốn tư liệu biên niên trình bày các bước biến chuyển về chiến thuật bóng đá. Cuốn sách cung cấp rất nhiều tư liệu quý về sơ đồ chiến thuật bắt đầu từ trận đấu quốc tế đầu tiên giữa Scotland gặp Anh vào ngày 30/11/1872 tới “ngày bóng đá chết đi” trong lời ai oán của Zico sau khi Brazil – đại diện cho “bóng đá vị nghệ thuật” – thất thủ trước người Ý 3-2 vào ngày 05/07/1982 cho tới đội hình Barcelona dưới thời Luis Enrique trong trận chung kết Champions League 2015. Bạn sẽ thưởng thức một thước phim tua nhanh để thấy chiến thuật bóng đá đã thay đổi như thế nào về sơ đồ và phong cách. \n Đảo Ngược Kim Tự Tháp đã giành được danh hiệu “Best Football Book” tại lễ trao giải thưởng British Sports Book Award vào năm 2009 và giải thưởng \"Premio Antonio Ghirelli\" dành cho sách bóng đá tại Ý vào năm 2013. \n Ấn bản trên tay bạn là ấn bản lần thứ tư phát hành vào ngày 08/06/2023 trên toàn cầu, sửa đổi và cập nhật trọn vẹn nhân dịp kỷ niệm 15 năm cuốn sách ra mắt. Tác phẩm phân tích các bước triển triển của bóng đá thế giới hiện đại, bao gồm cả World Cup 2022, chỉ ra tầm ảnh hưởng của những chiến lược gia vĩ đại người Tây Ban Nha, Đức và Bồ Đào Nha trong thập niên gần nhất, đồng thời xem xét quá trình toàn cầu hóa và thương mại hóa ngày càng gia tăng tác động tới bóng đá như thế nào.",
        type: "D"
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