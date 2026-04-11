const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/8a/b6/ba/1d95b88597f28e42d8ca91e3b3ff600f.jpg.webp",
        title: "Lý thyết trò chơi",
        author: "Trần Phách Hàm",
        translator: "Vu Vũ",
        price: 126000,
        originalPrice: 179000,
        discount: 30,
        rating: 4.7,
        reviewsCount: 422,
        soldCount: 8000,
        features: [],
        similarBooks: [],
        sku: "VNA1",
        ageGroup: "",
        supplier: "1980 Books",
        publisher: "Nhà xuất bản Dân trí",
        publicationYear: 2023,
        language: "Tiếng Việt",
        weight: "350g",
        dimensions: "13 x 20.5 cm",
        pages: 320,
        binding: "Bìa mềm",
        description: "Đời người giống như trò chơi, mỗi bước đều phải cân nhắc xem đi như thế nào, đi về đâu, phải kết hợp nhiều yếu tố lại chúng ta mới có thể đưa ra được lựa chọn. Mà trong quá trình chọn lựa này các yếu tố khiến ta phải cân nhắc và những đường đi khác nhau sẽ ảnh hưởng trực tiếp đến kết quả. \n Cuốn sách Lý thuyết trò chơi là bách khoa toàn thư về tâm lý học, về tẩy não và chống lại tẩy não, thao túng và chống lại thao túng, thống trị và chống lại thống trị. Cuốn sách giới thiệu công thức chiến thắng cho những “trò chơi” đấu trí giữa người với người trong cuộc sống hằng ngày; phân tách các khái niệm lý thuyết trò chơi vốn mơ hồ trở thành ngôn ngữ dễ hiểu và kết nối liền mạch với nghệ thuật tâm lý học; cho phép bạn nắm vững những bí ẩn của trò chơi tâm lý trong thời gian ngắn nhất. \n Những kỹ năng trong Lý thuyết trò chơi có thể giúp chúng ta đọc thấu hoạt động tâm lý người khác, và từ đó chiếm thế chủ động trong trò chơi đấu trí giữa những người xung quanh.",
        type: "A"
    },

    {
        imgSrc: "https://cdn0.fahasa.com/media/catalog/product/t/r/tr_-ch_i-c_a-nh_ng-k_-hi_u-lu_t---b_a-1.jpg",
        title: "Trò chơi của những kẻ hiểu luật",
        author: "Dan Nicholson",
        translator: "Thuỳ Linh",
        price: 120000,
        originalPrice: 179000,
        discount: 33,
        rating: 4.7,
        reviewsCount: 5,
        soldCount: 17,
        features: [],
        similarBooks: [],
        sku: "VNA2",
        ageGroup: "",
        supplier: "1980 Books",
        publisher: "Nhà xuất bản Công Thương",
        publicationYear: 2024,
        language: "Tiếng Việt",
        weight: "320g",
        dimensions: "13 x 20.5 cm",
        pages: 303,
        binding: "Bìa mềm",
        description: "Trong thế giới kinh doanh và cuộc sống hiện đại, những người thành công không chỉ là những người chăm chỉ hay tài năng mà còn là những kẻ hiểu luật và biết cách vận dụng nó để đạt được lợi thế. \n Cuốn sách Trò chơi của những kẻ hiểu luật mang đến cho người đọc một cái nhìn sâu sắc về cách mà những người thông minh và am hiểu về hệ thống có thể lách luật và biến nó thành lợi thế cho mình. Tác giả không chỉ giải thích cách các quy tắc và luật lệ có thể được sử dụng một cách sáng tạo mà còn chỉ ra những mánh khóe, chiến thuật mà những người chơi thông minh áp dụng để thao túng cuộc chơi theo hướng có lợi cho mình. \n Cuốn sách giúp người đọc nhận ra rằng thế giới kinh doanh và cuộc sống thường ngày không chỉ là một sân chơi công bằng mà còn là nơi mà sự hiểu biết về luật chơi và cách vận dụng nó đóng vai trò quyết định. Bằng việc nắm vững những nguyên tắc cơ bản và tinh tế của trò chơi, những người chơi có thể biến những bất lợi thành lợi thế, kiểm soát tình hình và đạt được mục tiêu của mình một cách hiệu quả. \n Sách cũng nhấn mạnh tầm quan trọng của việc tư duy chiến lược và sáng tạo trong việc giải quyết vấn đề, đồng thời cung cấp những bài học thực tiễn từ các ví dụ thực tế, giúp người đọc áp dụng kiến thức vào cuộc sống và công việc. Những chiến lược trong sách sẽ giúp bạn thay đổi tư duy, làm chủ tình thế và kiểm soát rủi ro để hiện thực hóa những mục tiêu về tài chính.",
        type: "A"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/c7/a2/3a/c9e6eaa17656191e9fdd8febea6dd87c.jpg.webp",
        title: "Thiên nga đen (Tái bản 2020)",
        author: "Nassim Nicholas Taleb",
        translator: "Cam Thảo, Hoàng Trung, Huyền Anh Tú",
        price: 221000,
        originalPrice: 299000,
        discount: 26,
        rating: 4.8,
        reviewsCount: 638,
        soldCount: 5000,
        features: [],
        similarBooks: [],
        sku: "VNA3",
        ageGroup: "",
        supplier: "Alphabooks",
        publisher: "Nhà xuất bản Thế giới",
        publicationYear: 2020,
        language: "Tiếng Việt",
        weight: "650g",
        dimensions: "16 x 24 cm",
        pages: 628,
        binding: "Bìa mềm",
        description: "Trước khi khám phá ra thiên nga đen tồn tại trên đời (ở Úc), người ta vẫn tin rằng tất cả chim thiên nga trên đời đều có màu trắng. Phát hiện bất ngờ này đã thay đổi toàn bộ thế giới quan của nhân loại (về thiên nga). \n Chúng ta không biết rất nhiều thứ nhưng lại hành động như thể mình có khả năng dự đoán được mọi điều. Và trong cuốn sách này, tác giả Nassim Nicholas Taleb đã đi sâu vào khai thác những sai lầm của tư tưởng cố hữu ấy. Theo ông, “thiên nga đen” là một biến cố tưởng chừng như không thể xảy ra với ba đặc điểm chính: không thể dự đoán, có tác động nặng nề và sau khi nó xảy ra, người ta lại dựng lên một lời giải thích để khiến nó trở nên ít ngẫu nhiên hơn, dễ dự đoán hơn so với bản chất thật của nó. Thành công đáng kinh ngạc của Facebook có thể được coi là một “thiên nga đen”, việc nước Anh rời khỏi Liên minh châu u cũng là một “thiên nga đen”. Thiên nga đen luôn ẩn hiện trong mọi mặt của cuộc sống với những tác động khó lường, theo cả hướng tiêu cực và tích cực. \n Tinh tế, táo bạo nhưng không kém phần thú vị, Thiên Nga Đen chắc chắn là cuốn sách không thể bỏ qua cho những ai đam mê hiểu biết. Và cuốn sách này, bản thân nó cũng chính là một thiên nga đen…",
        type: "A"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/18/33/57/05e0509a45969e8aecbbdc5ded11af81.jpeg.webp",
        title: "Sách Combo 2 Cuốn : Tư Duy Ngược + Tư Duy Mở",
        author: "Darrell Mullis, Judith Orloff",
        translator: "Trần Thanh Phong",
        price: 124000,
        originalPrice: 276000,
        discount: 55,
        rating: 4.7,
        reviewsCount: 190,
        soldCount: 3000,
        features: [],
        similarBooks: [],
        sku: "VNA4",
        ageGroup: "",
        supplier: "SBOOKS",
        publisher: "Nhà xuất bản Văn học",
        publicationYear: 2024,
        language: "Tiếng Việt",
        weight: "400g",
        dimensions: "13 x 20 cm",
        pages: 452,
        binding: "Bìa mềm",
        description: "Làm thế nào để có được tư duy mở? \n Và tư duy mở góp phần vào cuộc sống của chúng ta thế nào? \n Khi bạn đặt ra những câu hỏi đó thì cuốn sách này sinh ra để dành cho bạn. Cuốn sách được biên soạn dựa trên sự học tập và nghiên cứu tài liệu trong và ngoài nước cũng như từ những trải nghiệm của bản thân tác giả sẽ mang lại cho bạn những giá trị hữu ích của tư duy mở, giúp bạn tự tin chinh phục ước mơ, sẵn sàng đón nhận mọi chướng ngại và luôn nở nụ cười hạnh phúc.",
        type: "A"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/2e/eb/ad/3e776fea882655620441ec9f6eba9a04.jpg.webp",
        title: "Đắc nhân tâm (Tái bản 2016)",
        author: "Dale Carnegie",
        translator: "Nguyễn Văn Phước",
        price: 75600,
        originalPrice: 108000,
        discount: 30,
        rating: 4.8,
        reviewsCount: 1933,
        soldCount: 16000,
        features: [],
        similarBooks: [],
        sku: "VNA5",
        ageGroup: "",
        supplier: "First News - Trí Việt",
        publisher: "Nhà xuất bản Tổng hợp TP.HCM",
        publicationYear: 2020,
        language: "Tiếng Việt",
        weight: "330g",
        dimensions: "13 x 20.5 cm",
        pages: 352,
        binding: "Bìa cứng",
        description: "Đắc nhân tâm của Dale Carnegie là quyển sách duy nhất về thể loại self-help liên tục đứng đầu danh mục sách bán chạy nhất (best-selling Books) do báo The New York Times bình chọn suốt 10 năm liền. Được xuất bản năm 1936, với số lượng bán ra hơn 15 triệu bản, tính đến nay, sách đã được dịch ra ở hầu hết các ngôn ngữ, trong đó có cả Việt Nam, và đã nhận được sự đón tiếp nhiệt tình của đọc giả ở hầu hết các quốc gia. \n Là quyển sách đầu tiên có ảnh hưởng làm thay đổi cuộc đời của hàng triệu người trên thế giới, Đắc Nhân Tâm là cuốn sách đem lại những giá trị tuyệt vời cho người đọc, bao gồm những lời khuyên cực kì bổ ích về cách ứng xử trong cuộc sống hàng ngày. Sức lan toả của quyển sách vô cùng rộng lớn – với nhiều tầng lớp, đối tượng.",
        type: "A"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/0a/f6/38/bc10734989977da424642a1c4750eee2.jpg.webp",
        title: "Đàn ông Sao Hoả, đàn bà Sao Kim",
        author: "John Gray",
        translator: "Nguyễn Thanh Nhàn",
        price: 138000,
        originalPrice: 188000,
        discount: 27,
        rating: 4.8,
        reviewsCount: 4181,
        soldCount: 52000,
        features: [],
        similarBooks: [],
        sku: "VNA6",
        ageGroup: "",
        supplier: "KNBooks",
        publisher: "Nhà xuất bản Phụ nữ Việt Nam",
        publicationYear: 2022,
        language: "Tiếng Việt",
        weight: "200g",
        dimensions: "14.5 x 20.5 cm",
        pages: 178,
        binding: "Bìa mềm",
        description: "Ngày xửa ngày xưa, những người sao Hỏa và sao Kim đã gặp gỡ, yêu nhau và sống hạnh phúc bởi họ tôn trọng và chấp nhận mọi điều khác biệt. Rồi họ đến Trái Đất và chứng lãng quên đã xảy ra: Họ quên rằng họ đến từ những hành tinh khác \n Hiểu biết về giới tính giúp chúng ta thêm khoan dung và biết tha thứ khi ai đó không đáp lại theo cách mà ta mong đợi \n Tình chỉ đẹp khi còn dang dở \n Cưới nhau về nham nhở lắm em ơ \n Bởi kết hôn không phải là kết thúc một cuộc tình, mà nó mới là mở đầu cho rất nhiều những giai đoạn khó khăn mà cặp vợ chồng nào cũng phải trải qua. Bạn phải biết cách thích ứng và đối phó với nó để không rơi vào tình cảnh hôn nhân đổ vỡ.",
        type: "A"
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