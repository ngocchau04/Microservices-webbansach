import matplotlib.pyplot as plt
import numpy as np

# Dữ liệu test case execution từ dự án
data = {
    'Test Cases Executed': 127,
    'Test Cases Passed': 107, 
    'Test Cases Failed': 20,
    'Test Cases Blocked': 0,
    'Test Cases Not Run': 0
}

# Tính phần trăm
total_cases = 127
percentages = {
    'Executed': (127/127) * 100,  # 100%
    'Passed': (107/127) * 100,    # 84.3%
    'Failed': (20/127) * 100,     # 15.7%
    'Blocked': (0/127) * 100,     # 0%
    'Not Run': (0/127) * 100      # 0%
}

# Dữ liệu cho pie chart (chỉ hiển thị các phần có giá trị > 0)
labels = []
sizes = []
colors = []
explode = []

# Passed tests
labels.append(f'Test Cases Passed\n{107} ({percentages["Passed"]:.1f}%)')
sizes.append(107)
colors.append('#90EE90')  # Light green
explode.append(0.05)

# Executed but overall
labels.append(f'Test Cases Executed\n{127} ({percentages["Executed"]:.1f}%)')
sizes.append(20)  # Failed portion
colors.append('#DDA0DD')  # Plum purple
explode.append(0.05)

# Failed tests (phần nhỏ màu đỏ)
if percentages["Failed"] > 0:
    labels.append(f'Test Cases Failed\n{20} ({percentages["Failed"]:.1f}%)')
    # sizes.append(20) - đã bao gồm trong executed
    colors.append('#FF6B6B')  # Light red

# Tạo figure và axis
fig, ax = plt.subplots(figsize=(12, 8))

# Vẽ pie chart
wedges, texts, autotexts = ax.pie(sizes, labels=labels[:2], colors=colors[:2], 
                                  explode=explode[:2], autopct='%1.1f%%',
                                  shadow=True, startangle=90,
                                  textprops={'fontsize': 10, 'fontweight': 'bold'})

# Thêm tiêu đề
plt.title('Test Case Execution Summary', fontsize=16, fontweight='bold', pad=20)

# Tạo legend với thông tin chi tiết
legend_labels = [
    f'Number of test cases executed: {127} (100%)',
    f'Number of test cases passed: {107} ({percentages["Passed"]:.1f}%)', 
    f'Number of test cases failed: {20} ({percentages["Failed"]:.1f}%)',
    f'Number of test cases blocked: {0} (0%)',
    f'Number of test cases not run: {0} (0%)'
]

legend_colors = ['#DDA0DD', '#90EE90', '#FF6B6B', '#FFD700', '#FFA500']

# Vẽ legend
ax.legend(legend_labels, loc='center left', bbox_to_anchor=(1, 0.5), 
          fontsize=9, frameon=True, fancybox=True, shadow=True)

# Thêm các màu tương ứng cho legend
for i, (label, color) in enumerate(zip(legend_labels, legend_colors)):
    ax.add_patch(plt.Rectangle((0, 0), 0, 0, facecolor=color, 
                              edgecolor='black', linewidth=0.5, 
                              alpha=0.7, label=label))

# Điều chỉnh layout
plt.tight_layout()

# Lưu file
plt.savefig('test_execution_summary.png', dpi=300, bbox_inches='tight', 
            facecolor='white', edgecolor='none')

# Hiển thị biểu đồ
plt.show()

# In thống kê chi tiết
print("=== TEST EXECUTION SUMMARY ===")
print(f"Total Test Cases: {total_cases}")
print(f"Test Cases Executed: {data['Test Cases Executed']} ({percentages['Executed']:.1f}%)")
print(f"Test Cases Passed: {data['Test Cases Passed']} ({percentages['Passed']:.1f}%)")
print(f"Test Cases Failed: {data['Test Cases Failed']} ({percentages['Failed']:.1f}%)")
print(f"Test Cases Blocked: {data['Test Cases Blocked']} ({percentages['Blocked']:.1f}%)")
print(f"Test Cases Not Run: {data['Test Cases Not Run']} ({percentages['Not Run']:.1f}%)")
print(f"\nOverall Pass Rate: {percentages['Passed']:.1f}%")
print(f"Overall Failure Rate: {percentages['Failed']:.1f}%")
