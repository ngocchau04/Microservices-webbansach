const mongoose = require('mongoose');
const Product = require('./models/Product');

const sampleBooks = [
    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/31/30/11/742980149e41908bfed30fcd9a5535df.jpg.webp",
        title: "Kể gì với bác sĩ",
        author: "BS Leana Wen, BS Joshua Kosowsky",
        translator: "Nguyễn Bảo Ngọc",
        price: 110900,
        originalPrice: 179000,
        discount: 38,
        rating: 4.8,
        reviewsCount: 13,
        soldCount: 66,
        features: [],
        similarBooks: [],
        sku: "VNY1",
        ageGroup: "",
        supplier: "Alphabooks",
        publisher: "Nhà xuất bản Dân Trí",
        publicationYear: 2021,
        language: "Tiếng Việt",
        weight: "450g",
        dimensions: "15 x 23 cm",
        pages: 442,
        binding: "Bìa mềm",
        description: "Quyển sách này được chia thành năm phần. Phần đầu tiên tóm tắt lịch sử y khoa qua nhiều thời kỳ cho đến Kỷ nguyên Chẩn đoán Phi Cá nhân hóa hiện nay, khi nghệ thuật chẩn đoán dần mai một và để lại những hậu quả nghiêm trọng. Phần hai minh họa những cạm bẫy của y học theo sách vở với bốn ca bệnh từ phòng cấp cứu và ý nghĩa đối với bệnh nhân, bác sĩ và hệ thống chăm sóc sức khỏe nói chung. Trong phần ba và phần bốn, các tác giả chứng minh mọi thứ có thể khác đi như thế nào, mô tả những điều cơ bản của một sự hợp tác chủ động giữa bác sĩ và bệnh nhân, và cách ứng dụng những điều đó trong thực tế. Phần năm và phần cuối xem xét chi tiết ý nghĩa lớn hơn của phương pháp này đối với chính sách chăm sóc sức khỏe và cải cách y khoa. Mỗi chương kết thúc với phần Đánh giá, một bản tổng kết những điểm quan trọng. Cuối cùng là những bài tập và bảng kiểm để giúp bạn luyện tập lại những gì đã đọc. Xuyên suốt cuốn sách, các tác giả cung cấp cho cả người bệnh và nhân viên y tế Tám Điều then chốt để Chẩn đoán tốt hơn",
        type: "Y"
    },

    {
        imgSrc: "https://salt.tikicdn.com/cache/750x750/ts/product/c6/62/e1/359cbfb80b5fa50d2fa8028db79b22b8.jpg.webp",
        title: "Sang chấn tâm lý - Hiểu để chữa lành",
        author: "Bessel Van Der Kolk, M.D",
        translator: "Lê Phan Như Quỳnh, BS Lâm Hiếu Minh",
        price: 303500,
        originalPrice: 303500,
        discount: 0,
        rating: 4.8,
        reviewsCount: 43,
        soldCount: 207,
        features: [],
        similarBooks: [],
        sku: "VNY2",
        ageGroup: "",
        supplier: "Saigon Books",
        publisher: "Nhà xuất bản Thế giới",
        publicationYear: 2020,
        language: "Tiếng Việt",
        weight: "600g",
        dimensions: "15.5 x 23.5 cm",
        pages: 572,
        binding: "Bìa mềm",
        description: "Hiện nay, chúng ta đã biết rằng sang chấn gây ra những thay đổi về sinh lý học trong cơ thể, những thứ giúp ta cảm nhận được mình đang sống. Những thay đổi này giải thích tại sao các cá nhân bị sang chấn trở nên nhạy cảm hơn đối với những hiểm họa ngay cả khi họ đang tham gia cuộc sống thường ngày. Chúng cũng giúp chúng ta hiểu được vì sao những người bị sang chấn thường liên tục lặp đi lặp lại những hành động nào đó. Chúng ta cũng đã biết những hành vi của người bị sang chấn không phải là hệ quả của việc sa sút về đạo đức, là dấu hiệu của việc mất lý trí hay nhân cách kém mà là do những thay đổi trong não bộ của họ. \n \"Sang chấn tâm lý - Hiểu để chữa lành\" là một tác phẩm kinh điển của tâm thần học hiện đại, là một công trình khoa học công phu và nghiêm túc, trải rộng trên nhiều lĩnh vực - tâm lý học thần kinh, tâm lý học phát triển, tâm bệnh học, tâm lý trị liệu - được đúc kết sau nhiều năm kinh nghiệm làm việc của chính tác giả - Tiến sĩ Y khoa Bessel Van Der Kolk, và dựa trên những câu chuyện có thật của các bệnh nhân mà tác giả có dịp tiếp xúc hoặc chữa trị.",
        type: "Y"
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