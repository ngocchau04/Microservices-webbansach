import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Rectangle

# Dữ liệu test case execution
executed = 127
passed = 107
failed = 20
blocked = 0
not_run = 0

# Tính phần trăm
total = 127
pass_rate = (passed / total) * 100
fail_rate = (failed / total) * 100

# Tạo figure với kích thước phù hợp
fig, ax = plt.subplots(figsize=(10, 8))

# Dữ liệu cho pie chart - chia theo tỷ lệ thực tế
sizes = [passed, failed]
labels = [
    f'Number of test\ncases passed\n{passed}\n({pass_rate:.1f}%)',
    f'Number of test\ncases failed\n{failed}\n({fail_rate:.1f}%)'
]

# Màu sắc giống hình gốc
colors = ['#90EE90', '#FF6B6B']  # Xanh lá cho passed, đỏ cho failed

# Vẽ pie chart
wedges, texts, autotexts = ax.pie(sizes, labels=labels, colors=colors,
                                  autopct='%1.1f%%', startangle=90,
                                  textprops={'fontsize': 9, 'fontweight': 'bold'},
                                  pctdistance=0.85)

# Ẩn autopct để tự vẽ
for autotext in autotexts:
    autotext.set_visible(False)

# Thêm tiêu đề
plt.title('Test Case Execution Summary', fontsize=14, fontweight='bold', pad=20)

# Tạo legend box giống hình gốc
legend_elements = [
    Rectangle((0, 0), 1, 1, facecolor='#DDA0DD', alpha=0.8, 
              label=f'Number of test cases executed: {executed} ({100:.1f}%)'),
    Rectangle((0, 0), 1, 1, facecolor='#90EE90', alpha=0.8,
              label=f'Number of test cases passed: {passed} ({pass_rate:.1f}%)'),
    Rectangle((0, 0), 1, 1, facecolor='#FF6B6B', alpha=0.8,
              label=f'Number of test cases failed: {failed} ({fail_rate:.1f}%)'),
    Rectangle((0, 0), 1, 1, facecolor='#FFD700', alpha=0.8,
              label=f'Number of test cases blocked: {blocked} ({0:.1f}%)'),
    Rectangle((0, 0), 1, 1, facecolor='#FFA500', alpha=0.8,
              label=f'Number of test cases not run: {not_run} ({0:.1f}%)')
]

# Đặt legend ở phía bên phải
ax.legend(handles=legend_elements, loc='center left', bbox_to_anchor=(1.05, 0.5),
          fontsize=9, frameon=True, fancybox=True, shadow=True)

# Đảm bảo pie chart là hình tròn
ax.set_aspect('equal')

# Điều chỉnh layout
plt.tight_layout()

# Lưu file với chất lượng cao
plt.savefig('test_execution_summary_v2.png', dpi=300, bbox_inches='tight',
            facecolor='white', edgecolor='none')

print("✅ Biểu đồ đã được tạo: test_execution_summary_v2.png")
print("\n=== THỐNG KÊ TEST EXECUTION ===")
print(f"📊 Tổng số test cases: {total}")
print(f"✅ Test cases passed: {passed} ({pass_rate:.1f}%)")
print(f"❌ Test cases failed: {failed} ({fail_rate:.1f}%)")
print(f"🚫 Test cases blocked: {blocked} (0%)")
print(f"⏸️ Test cases not run: {not_run} (0%)")
print(f"\n🎯 Pass Rate: {pass_rate:.1f}%")

plt.show()
