const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/45/a4/20/f9a37f4361ac4f53c98de2f1cc209cad.jpg.webp",
        title: "Hành Trình Nuôi Con: Chăm con 0-12 tháng",
        author: "Heidi Murkoff",
        translator: "Phương Anh",
        price: 505000,
        originalPrice: 699000,
        discount: 28,
        rating: 5.0,
        reviewsCount: 3,
        soldCount: 62,
        features: [],
        similarBooks: [],
        sku: "VNN1",
        ageGroup: "",
        supplier: "Alphabooks",
        publisher: "Nhà xuất bản Dân trí",
        publicationYear: 2024,
        language: "Tiếng Việt",
        weight: "670g",
        dimensions: "22 x 27 cm",
        pages: 664,
        binding: "Bìa mềm",
        description: "Sau sự thành công vượt bậc của \"Hành Trình Nuôi Con: Mang Thai\" (What to Expect When You're Expecting) Heidi Murkoff nhận thấy rằng nhiều bậc cha mẹ không chỉ cần hướng dẫn về thời kỳ mang thai mà còn cần sự hỗ trợ và kiến thức chi tiết về chăm sóc trẻ sơ sinh trong năm đầu đời. Các bậc cha mẹ, đặc biệt là những người lần đầu nuôi con, thường cảm thấy lo lắng và thiếu tự tin trong việc chăm sóc trẻ sơ sinh. Họ muốn có một tài liệu chi tiết, cung cấp các hướng dẫn cụ thể và thực tế về cách chăm sóc, nuôi dưỡng và theo dõi sự phát triển của trẻ sơ sinh. Bởi lẽ đó, nhiều độc giả của cuốn sách đầu tiên đã yêu cầu tác giả viết thêm một cuốn sách hướng dẫn về việc chăm sóc trẻ trong năm đầu tiên. \n Bằng việc kết hợp kinh nghiệm cá nhân của mình với nghiên cứu khoa học và ý kiến từ các chuyên gia y tế Heidi Murkoff đã viết tiếp cuốn sách thứ 2 mang tên “Hành Trình Nuôi Con: Chăm Con 0-12 Tháng” (What to expect: The 1st year) - một cẩm nang toàn diện dành cho các bậc cha mẹ mới, cung cấp hướng dẫn chi tiết từ khi chuẩn bị đón con chào đời đến khi bé tròn một tuổi. \n Cuốn sách được viết với một cấu trúc rõ ràng, nhằm cung cấp hướng dẫn chi tiết cho cha mẹ trong việc nuôi dưỡng trẻ từ sơ sinh đến 12 tháng tuổi. Sách được chia thành các chương theo từng tháng và các chủ đề đặc biệt, giúp người đọc dễ dàng tìm kiếm và theo dõi thông tin cần thiết. Mỗi chương đều cung cấp các thông tin về những thay đổi phát triển của trẻ, từ sự phát triển thể chất đến sự phát triển nhận thức và cảm xúc.",
        type: "N"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/32/3d/a5/69a6c74574f882fec47557ddb90a2e65.jpg.webp",
        title: "Nuôi con không phải là cuộc chiến 2 (Trọn bộ 3 tập)",
        author: "Hachun Lyonnet (Hà Chũn), Hương Đỗ (Mẹ Ong Bông)",
        translator: "",
        price: 320250,
        originalPrice: 320250,
        discount: 0,
        rating: 4.8,
        reviewsCount: 354,
        soldCount: 3000,
        features: [],
        similarBooks: [],
        sku: "VNN2",
        ageGroup: "",
        supplier: "Thái Hà",
        publisher: "Nhà xuất bản Lao động",
        publicationYear: 2018,
        language: "Tiếng Việt",
        weight: "750g",
        dimensions: "16 x 24 cm",
        pages: 750,
        binding: "Bìa mềm",
        description: "Mốc thai kì 40 tuần đến gần, lúc này cũng là lúc mà bản năng \"làm tổ\" của mẹ trỗi dậy. Nhiều cha mẹ, đặc biệt là các cha mẹ chờ đợi đứa con đầu lòng chắc hẳn không tránh khỏi cảm thấy lo lắng, bồn chồn hoặc tất bật mua sắm đồ dùng, giặt là quần áo và chuẩn bị tươm tất, chờ ngày được gặp mặt con yêu. \n Đây cũng là lúc mà câu chuyện của chúng ta bắt đầu… \n Bên cạnh những vật chất cơ bản như quần áo, tã, bình… thì những kiến thức khoa học về ăn, ngủ và an toàn cho bé cũng là những yếu tố hết sức cần thiết mà cha mẹ cần trang bị cho mình từ trƣớc khi con chào đời. Khoa học về dinh dưỡng trẻ sơ sinh, về sữa non và dự trữ dinh dưỡng nơi cuống rốn, khoa học về giấc ngủ của trẻ và những điều kiện an toàn ăn và an toàn ngủ của bé sơ sinh là những thông tin thiết yếu mà cha mẹ thực sự cần trang bị đầy đủ để đón chào bé thơ. \n Thời khắc Bé chào đời cũng là lúc mà nhịp sinh hoạt của gia đình xáo trộn, và lúc đó sự phục hồi sức khoẻ của ngƣời mẹ phụ thuộc rất nhiều vào cách tổ chức nếp sống, sinh hoạt cũng như bố trí việc ăn ngủ dành cho bé sơ sinh. \n Bộ sách này là sự giải đáp cho những câu hỏi mà chúng tôi nhận được từ các bậc cha mẹ trẻ trong 5 năm qua về những vấn đề của các em bé từ sơ sinh cho đến chập chững biết đi: con ăn ra sao, con ngủ bao nhiêu là đủ… Và bí quyết là gì để nuôi con khoẻ mạnh và khoa học nhất, để tăng thêm thành viên mới là tăng thêm niềm vui chứ không phải gánh nặng vất vả cho mọi người? Làm thế nào để con ngủ đủ theo nhu cầu lứa tuổi và có nền tảng tốt nhất cho sự phát triển thể chất và trí tuệ? Làm thế nào để bé thơ có thể tự học cách đưa mình vào giấc ngủ mà không cần phải chờ đến ti mẹ, không phải phụ thuộc vào cánh tay bế hay từ sự đung đưa của những chiếc võng và những lời ru đến lạc giọng của người lớn? \n Song hành cùng bạn, qua bộ sách này, chúng tôi cố gắng cung cấp đầy đủ và chi tiết hơn theo những mốc phát triển của bé cũng như lý giải những khúc mắc và giảm bớt những lo lắng, hoang mang không cần thiết cho những bậc ông bà, cha mẹ khi nuôi con trong những năm đầu đời. Chúng tôi mong rằng bộ sách này sẽ mang đến cho gia đình bạn sự an tâm, thư giãn và phong thái bình tĩnh khi nuôi và dạy bé thơ. Bởi, suy cho cùng, nuôi con không bao giờ là cuộc chiến cả. Kỷ niệm của bạn về những ngày thơ ấu cùng con sẽ là những chuỗi ngày ngập tràn niềm vui, cùng con lớn lên từ bò trườn cho đến chập chững biết đi, từ niềm vui khi ngắm con bú từng giọt sữa cho đến sự phấn khích khi con bỏm bẻm nhai trong từng bữa ăn. Tất cả bí quyết đó nằm ở sự thông thái, tinh thần bình tĩnh, kiên trì mà quyết đoán, cộng với rất nhiều tình yêu.",
        type: "N"
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