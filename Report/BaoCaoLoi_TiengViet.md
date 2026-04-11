# BÁO CÁO LỖI - DỰ ÁN WEB BÁN SÁCH

| Environment | Test |
|-------------|------|
| Release Name | 20241215141605 |
| Date | 15-Dec-2024 |
| FPT QA Name | Nguyễn Văn Tester |

## BẢNG BÁO CÁO LỖI

| Defect ID | Mô tả lỗi & Các bước tái hiện | Kết quả thực tế | Kết quả mong đợi | Priority | Severity | Testcase ID |
|-----------|------------------------------|-----------------|------------------|----------|----------|-------------|
| #1 | [User Profile] Validation lỗi khi cập nhật thông tin cá nhân với email trống | | | | | |
| | 1. Đăng nhập vào hệ thống<br/>2. Truy cập trang "Thông tin cá nhân"<br/>3. Xóa nội dung email và nhấn "Cập nhật" | Test case thất bại: expected validation error nhưng hệ thống cho phép cập nhật | Hệ thống NÊN hiển thị thông báo lỗi "Email không được để trống" và không cho phép cập nhật | High | High | USER_PROF_001 |
| #2 | [User Profile] Lỗi xử lý khi upload avatar với file size quá lớn | | | | | |
| | Điều kiện tiên quyết: File ảnh > 5MB<br/>Các bước:<br/>1. Vào trang profile<br/>2. Chọn upload avatar với file lớn | Test thất bại: expected file size validation nhưng server trả về 500 error | Hệ thống NÊN hiển thị thông báo "File quá lớn, vui lòng chọn file < 5MB" | Medium | Medium | USER_PROF_002 |
| #3 | [User Profile] Không thể cập nhật số điện thoại với format không hợp lệ | | | | | |
| | 1. Truy cập trang thông tin cá nhân<br/>2. Nhập số điện thoại không đúng format (vd: "abc123")<br/>3. Nhấn cập nhật | Test case fail: expected phone validation nhưng hệ thống chấp nhận input sai | Hệ thống NÊN validate format số điện thoại và hiển thị thông báo lỗi phù hợp | Medium | Medium | USER_PROF_003 |
| #4 | [User Profile] Session timeout khi cập nhật thông tin sau thời gian dài | | | | | |
| | Điều kiện tiên quyết: Session gần hết hạn<br/>Các bước:<br/>1. Mở trang profile và chờ 30 phút<br/>2. Thay đổi thông tin và nhấn cập nhật | Test thất bại: expected session validation nhưng không có handling proper | Hệ thống NÊN kiểm tra session validity và yêu cầu đăng nhập lại nếu cần | Low | Medium | USER_PROF_004 |

## THỐNG KÊ LỖI

- **Tổng số lỗi tìm thấy:** 4
- **Phân bổ theo mức độ ưu tiên:**
  - High: 1 lỗi
  - Medium: 2 lỗi  
  - Low: 1 lỗi
- **Phân bổ theo mức độ nghiêm trọng:**
  - High: 1 lỗi
  - Medium: 3 lỗi

## GHI CHÚ

- Các lỗi còn lại tập trung ở module User Profile sau khi đã fix các module khác
- Tất cả lỗi đã được test trên môi trường development
- Đây là kết quả test sau round sửa lỗi, chỉ còn 4 test cases failed trong module userProfile
- Cần ưu tiên sửa lỗi High severity trước (validation email)
- Các modules khác (Search Controller, Cart Controller, Order Controller, Authorization Service) đã được fix và pass hết tests