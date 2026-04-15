/**
 * Lightweight demo dataset for hierarchical shipping selection.
 * This is intentionally small/thesis-friendly and easy to extend.
 */
export const VN_LOCATION_DATA = [
  {
    code: "hcm",
    name: "TP. Hồ Chí Minh",
    districts: [
      {
        code: "q1",
        name: "Quận 1",
        wards: ["Phường Bến Nghé", "Phường Bến Thành", "Phường Cầu Ông Lãnh"],
      },
      {
        code: "q7",
        name: "Quận 7",
        wards: ["Phường Tân Phong", "Phường Tân Hưng", "Phường Phú Mỹ"],
      },
      {
        code: "tp-thu-duc",
        name: "TP. Thủ Đức",
        wards: ["Phường Hiệp Bình Chánh", "Phường Linh Xuân", "Phường Trường Thọ"],
      },
    ],
  },
  {
    code: "hn",
    name: "TP. Hà Nội",
    districts: [
      {
        code: "cau-giay",
        name: "Quận Cầu Giấy",
        wards: ["Phường Dịch Vọng", "Phường Nghĩa Tân", "Phường Trung Hòa"],
      },
      {
        code: "hoang-mai",
        name: "Quận Hoàng Mai",
        wards: ["Phường Đại Kim", "Phường Định Công", "Phường Hoàng Liệt"],
      },
      {
        code: "ha-dong",
        name: "Quận Hà Đông",
        wards: ["Phường Văn Quán", "Phường Mộ Lao", "Phường Dương Nội"],
      },
    ],
  },
  {
    code: "dn",
    name: "TP. Đà Nẵng",
    districts: [
      {
        code: "hai-chau",
        name: "Quận Hải Châu",
        wards: ["Phường Hải Châu I", "Phường Bình Thuận", "Phường Hòa Cường Bắc"],
      },
      {
        code: "thanh-khe",
        name: "Quận Thanh Khê",
        wards: ["Phường Thanh Khê Đông", "Phường Xuân Hà", "Phường Chính Gián"],
      },
      {
        code: "ngu-hanh-son",
        name: "Quận Ngũ Hành Sơn",
        wards: ["Phường Mỹ An", "Phường Khuê Mỹ", "Phường Hòa Quý"],
      },
    ],
  },
  {
    code: "ct",
    name: "TP. Cần Thơ",
    districts: [
      {
        code: "ninh-kieu",
        name: "Quận Ninh Kiều",
        wards: ["Phường An Khánh", "Phường An Bình", "Phường Hưng Lợi"],
      },
      {
        code: "cai-rang",
        name: "Quận Cái Răng",
        wards: ["Phường Lê Bình", "Phường Hưng Phú", "Phường Phú Thứ"],
      },
      {
        code: "binh-thuy",
        name: "Quận Bình Thủy",
        wards: ["Phường Long Hòa", "Phường Thới An Đông", "Phường Trà An"],
      },
    ],
  },
];

