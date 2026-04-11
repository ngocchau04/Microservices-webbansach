const mongoose = require('mongoose');
const Voucher = require('./models/Voucher');

const generateVoucherCode = () => {
    const prefix = 'BOOKIE';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    for (let i = 0; i < 10; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
};

const generateVoucherCodeSet = (count) => {
    const tmpSet = new Set();
    while (tmpSet.size < count) {
        tmpSet.add(generateVoucherCode());
    }
    return Array.from(tmpSet);
}

const voucherCodeSet = generateVoucherCodeSet(10);

const sampleVouchers = [
    {
        voucherCode: voucherCodeSet[0],
        voucherValue: 8,
        maxDiscountValue: 100000,
        minOrderValue: 50000,
        voucherType: 2,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 10
    },
    {
        voucherCode: voucherCodeSet[1],
        voucherValue: 10,
        maxDiscountValue: 100000,
        minOrderValue: 100000,
        voucherType: 2,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 5
    },
    {
        voucherCode: voucherCodeSet[2],
        voucherValue: 12,
        maxDiscountValue: 100000,
        minOrderValue: 200000,
        voucherType: 2,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 11
    },
    {
        voucherCode: voucherCodeSet[3],
        voucherValue: 20,
        maxDiscountValue: 200000,
        minOrderValue: 200000,
        voucherType: 2,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 6
    },
    {
        voucherCode: voucherCodeSet[4],
        voucherValue: 30,
        maxDiscountValue: 300000,
        minOrderValue: 200000,
        voucherType: 2,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 10
    },
    {
        voucherCode: voucherCodeSet[5],
        voucherValue: 50,
        maxDiscountValue: 200000,
        minOrderValue: 500000,
        voucherType: 2,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 5
    },
    {
        voucherCode: voucherCodeSet[6],
        voucherValue: 10000,
        // maxDiscountValue: ,
        minOrderValue: 50000,
        voucherType: 1,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 20
    },
    {
        voucherCode: voucherCodeSet[7],
        voucherValue: 20000,
        // maxDiscountValue: ,
        minOrderValue: 100000,
        voucherType: 1,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 10
    },
    {
        voucherCode: voucherCodeSet[8],
        voucherValue: 30000,
        // maxDiscountValue: ,
        minOrderValue: 100000,
        voucherType: 1,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 5
    },
    {
        voucherCode: voucherCodeSet[9],
        voucherValue: 50000,
        // maxDiscountValue: ,
        minOrderValue: 120000,
        voucherType: 1,
        // voucherDescription: ,
        voucherExpiration: new Date("2024-12-31"),
        usedCount: 20
    }
];

const insertSampleData = async () => {
    try {
        await mongoose.connect('mongodb+srv://damthingocchau:admin123@cluster0.lgfxk.mongodb.net/shopbook'); // Replace with your MongoDB URI
        console.log('Connected to MongoDB');

        const count = await Voucher.countDocuments();
        if (count > 0) {
            console.log('Collection is currently having ${count} entries');
            await Voucher.deleteMany();
            console.log('Existing data cleared');
        } else {
            console.log('Collection is empty');
        }

        try {
            await Voucher.insertMany(sampleVouchers);
            console.log("Vouchers inserted successfully");
        } catch (error) {
            if (error.code === 11000) {
                console.error("Duplicate voucher code detected:", error.keyValue);
            } else {
                console.error("Error inserting vouchers:", error);
            }
        }

        mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        if (error.code === 11000) {
            console.error("Duplicate voucher code detected:", error.keyValue);
        } else
            console.error('Error inserting vouchers:', error);
        mongoose.disconnect();
    }
};

insertSampleData();
