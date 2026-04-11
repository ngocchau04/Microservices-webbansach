const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/7e/10/5f/ea113e330ef11f7de836e79eee4c4815.jpg.webp",
        title: "IELTS Writing Journey: Elevate To Band 8.0",
        author: "Bùi Thành Việt",
        translator: "",
        price: 180000,
        originalPrice: 239000,
        discount: 25,
        rating: 5.0,
        reviewsCount: 24,
        soldCount: 362,
        features: [],
        similarBooks: [],
        sku: "VNG1",
        ageGroup: "",
        supplier: "Zenbooks",
        publisher: "Nhà xuất bản Thế giới",
        publicationYear: 2024,
        language: "Tiếng Việt",
        weight: "320g",
        dimensions: "3 x 19 x 26.5 cm",
        pages: 260,
        binding: "Bìa mềm",
        description: "Lộ trình tự học IELTS Writing từ 6.0 lên 8.0, cuốn sách được cựu giám khảo IELTS và các chuyên gia tin tưởng giới thiệu \n Học quài quài nhưng band điểm không tăng? Làm sao để vượt qua hố sâu của Writing band 6? Một cách tự nâng band IELTS Writing vừa tiết kiệm chi phí vừa đạt hiệu quả? \n Với tác giả Bùi Thành Việt - có kinh nghiệm gần 10 lần thi, đi từ 4.0 lên 8.5 overall, xuất phát điểm không quá cao, bằng con đường tự tìm tòi, tự học hỏi - tác giả hoàn toàn hiểu được những khó khăn mà người học gặp phải trong quá trình ôn tập. Từ đó, tác giả rút ra rất nhiều công thức cần thiết và thực tiễn, đúc kết lại một cách hoàn chỉnh nhất trong cuốn sách IELTS Writing Journey: Elevate to Band 8.0.",
        type: "G"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/media/catalog/producttmp/74/27/ac/2850acdbc53e8a2b8514e69b10639503.jpg.webp",
        title: "Từ vựng IELTS 8.0 - Từ vựng đắt để đạt điểm cao 4 kỹ năng",
        author: "Lê Thu Hà",
        translator: "",
        price: 86000,
        originalPrice: 135000,
        discount: 36,
        rating: 5.0,
        reviewsCount: 533,
        soldCount: 4000,
        features: [],
        similarBooks: [],
        sku: "VNG2",
        ageGroup: "",
        supplier: "Megabooks",
        publisher: "Nhà xuất bản Hà Nội",
        publicationYear: 2022,
        language: "Tiếng Việt",
        weight: "200g",
        dimensions: "16 x 24 cm",
        pages: 204,
        binding: "Bìa mềm",
        description: "Cuốn sách tổng hợp 15 chủ đề Từ vựng đắt giá giúp bạn đạt 8.0 IELTS \n Những lưu ý, tiêu chí về Từ vựng để đạt điểm band 8.0 trong bài thi IELTS \n Với mỗi chủ đề, cuốn sách sẽ định hướng một số dạng câu hỏi chung và hàng trăm câu hỏi cụ thể thường gặp trong đề thi IELTS và gợi ý ý tưởng trả lời. \n Nhờ vào đó, cuốn sách sẽ giúp ý tưởng của người học được trau dồi thêm phong phú, đơn giản hóa những kiến thức từ vựng và tiếp nhận chúng dễ dàng hơn. \n Mỗi bài học bao gồm 2 phần:",
        type: "G"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/60/fe/60/941f4404c49bb97849fc1bfeb0f2efac.jpg.webp",
        title: "Sách Giáo trình Triết học (Dùng cho khối không chuyên ngành triết học trình độ đào tạo thạc sĩ, tiến sĩ các ngành khoa học tự nhiên, công nghệ)",
        author: "Bộ Giáo Dục Và Đào Tạo",
        translator: "",
        price: 71000,
        originalPrice: 71000,
        discount: 0,
        rating: 5.0,
        reviewsCount: 3,
        soldCount: 54,
        features: [],
        similarBooks: [],
        sku: "VNG3",
        ageGroup: "",
        supplier: "First News - Trí Việt",
        publisher: "Nhà xuất bản Chính trị Quốc gia Sự thật",
        publicationYear: 2024,
        language: "Tiếng Việt",
        weight: "250g",
        dimensions: "14.5 x 20.5 cm",
        pages: 230,
        binding: "Bìa mềm",
        description: "Giáo trình do Ban biên soạn gồm các tác giả là nhà nghiên cứu, nhà giáo dục thuộc Viện Triết học - Học viện Chính trị quốc gia Hồ Chí Minh, các học viện, trường đại học, Viện Triết học - Viện Hàn lâm Khoa học xã hội Việt Nam, tổ chức biên soạn trên cơ sở kế thừa những kết quả nghiên cứu trước đây, đồng thời bổ sung nhiều nội dung, kiến thức, kết quả nghiên cứu mới, gắn với công cuộc đổi mới ở Việt Nam, nhất là những thành tựu trong 35 năm đổi mới đất nước.",
        type: "G"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/30/d4/bf/96f183f0448d7390827be780fcfeeddb.jpg.webp",
        title: "Từ điển Tiếng Việt (Hoàng Phê)(Tái Bản)",
        author: "GS. Hoàng Phê",
        translator: "",
        price: 427000,
        originalPrice: 495000,
        discount: 14,
        rating: 4.8,
        reviewsCount: 258,
        soldCount: 1000,
        features: [],
        similarBooks: [],
        sku: "VNG4",
        ageGroup: "",
        supplier: "VanLangBooks",
        publisher: "Nhà xuất bản Hồng Đức",
        publicationYear: 2021,
        language: "Tiếng Việt",
        weight: "1400g",
        dimensions: "16 x 24 cm",
        pages: 149,
        binding: "Bìa cứng",
        description: "Trên thực tế, cuốn sách Từ điển Tiếng Việt (2021) Hoàng Phê của Viện Ngôn ngữ học đã là nguồn tra cứu, trích dẫn đáng tin cậy của hầu hết các bài viết, sách chuyên khảo, đặc biệt là các luận án tiến sĩ, luận văn thạc sĩ, khoá luận tốt nghiệp khi phân tích ý nghĩa của các đơn vị từ ngữ tiếng Việt, là cẩm nang tra cứu không thể thiếu của tất cả những người cầm bút, dù đó là nhà văn, nhà thơ, hay nhà báo, kể cả các nhà giáo giảng dạy tiếng Việt. \n Đây là cuốn từ điển giải thích tiếng Việt có chất lượng và uy tín cao nhất so với bất cứ một cuốn từ điển giải thích tiếng Việt nào khác hiện có trên thị trường sách báo ở Việt Nam. \n (GS. TS. NGUYỄN ĐỨC TỒN - Viện trưởng Viện Ngôn ngữ học, Viện KHXH VN - Tổng Biên tập Tạp chí Ngôn ngữ)",
        type: "G"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/88/16/e4/7e23bfc33f4418925eec5498bb71a717.jpg.webp",
        title: "Thần số học ứng dụng",
        author: "Joy Woodward",
        translator: "1980 Books",
        price: 119000,
        originalPrice: 169000,
        discount: 30,
        rating: 4.8,
        reviewsCount: 1720,
        soldCount: 11000,
        features: [],
        similarBooks: [],
        sku: "VNG5",
        ageGroup: "",
        supplier: "Booklife",
        publisher: "Nhà xuất bản Thanh niên",
        publicationYear: 2020,
        language: "Tiếng Việt",
        weight: "300g",
        dimensions: "13 x 20 cm",
        pages: 280,
        binding: "Bìa mềm",
        description: "Cuốn sách sẽ cung cấp mọi thứ bạn cần để mài giũa trực giác của mình, hiểu rõ hơn những người xung quanh và thậm chí có thêm tự tin khi đưa ra các quyết định lớn. \n Thần số học cũng có thể giúp bạn nhìn lại quá khứ. Khi suy ngẫm về các sự kiện của cuộc đời mình và cách chúng diễn ra trong các chu kỳ số, bạn sẽ nhìn nhận rõ ràng hơn về những gì đã xảy ra và nguyên nhân của những điều đó. \n Biết được những gì bạn sắp phải trải qua trong một năm, tháng hoặc ngày cụ thể giúp bạn điều hướng chu kỳ cuộc sống dễ dàng hơn. Bạn sẽ có thể dự đoán và chuẩn bị cho những thử thách sắp tới cũng như tận dụng các cơ hội tuyệt vời và đầy tiềm năng.",
        type: "G"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/9c/52/cb/ba8db5f3995e8124fec74184b975064e.jpg.webp",
        title: "Điều gì đó ẩn sâu, Thế giới lượng tử và Không-thời gian đột sinh",
        author: "Sean Carroll",
        translator: "Võ Ngọc Tú",
        price: 176000,
        originalPrice: 220000,
        discount: 20,
        rating: 5.0,
        reviewsCount: 7,
        soldCount: 56,
        features: [],
        similarBooks: [],
        sku: "VNG6",
        ageGroup: "",
        supplier: "Nhà xuất bản Trẻ",
        publisher: "Nhà xuất bản Trẻ",
        publicationYear: 2022,
        language: "Tiếng Việt",
        weight: "250g",
        dimensions: "14.5 x 20.5 cm",
        pages: 248,
        binding: "Bìa mềm",
        description: "Cơ học lượng tử, ngành vật lý đã giúp các nhà khoa học trả lời rất nhiều các câu hỏi về bản chất của thế giới và vũ trụ, đồng thời cũng tạo ra những cuộc tranh luận kéo dài bởi sự mâu thuẫn của nó với thuyết tương đối của Einstein. Thông qua cuốn sách này, tác giả Sean Carroll đã phần nào hòa giải các mâu thuẫn giữa hai lý thuyết, làm thay đổi cách nghĩ của chúng ta về không gian và thời gian. \n Dù là một lý thuyết mới và gặt hái được nhiều thành công, nhưng cơ học lượng tử cũng bộc lộ những khoảng trống, được vô tình hoặc cố ý bỏ qua. Các nhà khoa học nói với chúng ta rằng cơ học lượng tử khó hiểu như thế nào, không thể giải thích ra sao, cũng có những lời khuyên cho giới khoa học trẻ rằng không nên dấn thân vào đó. Tuy vậy, Sean Carroll lại táo bạo nói với độc giả rằng, cơ học lượng tử có thể giải thích được nếu chúng ta chấp nhận, chấp nhận lý thuyết đa vũ trụ.",
        type: "G"
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