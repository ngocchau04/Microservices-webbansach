import matplotlib.pyplot as plt
import numpy as np

# Biểu đồ 1: Defect Distribution by Severity
def create_defect_chart():
    # Dữ liệu defects thực tế từ dự án
    categories = ['Critical', 'High', 'Medium', 'Low']
    fixed = [0, 0, 0, 0]  # Chưa fix defect nào
    open_defects = [4, 8, 6, 2]  # 20 defects đang mở
    
    x = np.arange(len(categories))
    width = 0.6
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Vẽ stacked bar chart
    p1 = ax.bar(x, fixed, width, label='Number of defects fixed', color='#5B9BD5')
    p2 = ax.bar(x, open_defects, width, bottom=fixed, label='Number of defects remain open', color='#C55454')
    
    # Customize chart
    ax.set_ylabel('Number of defects')
    ax.set_xlabel('Severity') 
    ax.set_title('Defect Distribution by Severity\nTotal: 20 Defects (0 Fixed, 20 Open)')
    ax.set_xticks(x)
    ax.set_xticklabels(categories)
    ax.legend()
    
    # Thêm labels trên bars
    totals = [f + o for f, o in zip(fixed, open_defects)]
    for i, total in enumerate(totals):
        ax.text(i, total + 0.5, f'Total: {total}', ha='center', va='bottom', fontweight='bold')
        if open_defects[i] > 0:
            ax.text(i, open_defects[i]/2, str(open_defects[i]), ha='center', va='center', 
                   color='white', fontweight='bold')
    
    ax.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    plt.savefig('defect_distribution.png', dpi=300, bbox_inches='tight')
    plt.show()

# Biểu đồ 2: Test Coverage by Module  
def create_coverage_chart():
    # Dữ liệu pass rate theo module
    modules = ['Authorization Service', 'Cart Controller', 'Search Controller', 
               'E2E Bookstore', 'Order Controller', 'User Profile']
    pass_rates = [90.6, 89.7, 87.5, 87.5, 84.6, 46.2]
    
    # Định màu theo performance
    colors = []
    for rate in pass_rates:
        if rate >= 90:
            colors.append('#92D050')  # Excellent - Green
        elif rate >= 80: 
            colors.append('#FFC000')  # Good - Yellow
        elif rate >= 70:
            colors.append('#F79646')  # Acceptable - Orange  
        else:
            colors.append('#FF6B6B')  # Needs improvement - Red
    
    fig, ax = plt.subplots(figsize=(12, 7))
    
    # Horizontal bar chart
    y_pos = np.arange(len(modules))
    bars = ax.barh(y_pos, pass_rates, color=colors, edgecolor='black', linewidth=0.8)
    
    # Overall pass rate line
    overall = 84.3
    ax.axvline(x=overall, color='red', linestyle='--', linewidth=2)
    ax.text(overall+1, len(modules)-0.3, f'{overall}%', rotation=90, va='top', color='red', fontweight='bold')
    
    # Labels
    ax.set_yticks(y_pos)
    ax.set_yticklabels(modules)
    ax.set_xlabel('Pass Rate (%)')
    ax.set_ylabel('Module')
    ax.set_title('Test Coverage by Module - Pass Rate\nOverall Pass Rate: 84.3%')
    
    # Thêm phần trăm
    for i, (bar, rate) in enumerate(zip(bars, pass_rates)):
        width = bar.get_width()
        ax.text(width-3, bar.get_y() + bar.get_height()/2, f'{rate}%', 
               ha='right', va='center', fontweight='bold', 
               color='white' if rate < 60 else 'black')
    
    # Legend cho performance levels
    from matplotlib.patches import Patch
    legend = [
        Patch(facecolor='#92D050', label='Excellent (≥90%)'),
        Patch(facecolor='#FFC000', label='Good (80-89%)'),  
        Patch(facecolor='#F79646', label='Acceptable (70-79%)'),
        Patch(facecolor='#FF6B6B', label='Needs Improvement (<70%)')
    ]
    ax.legend(handles=legend, loc='lower right')
    
    ax.set_xlim(0, 100)
    ax.grid(True, alpha=0.3, axis='x')
    plt.tight_layout()
    plt.savefig('test_coverage_modules.png', dpi=300, bbox_inches='tight')
    plt.show()

# Chạy cả 2 biểu đồ
if __name__ == "__main__":
    print("📊 Tạo biểu đồ Defect Distribution...")
    create_defect_chart()
    
    print("📈 Tạo biểu đồ Test Coverage by Module...")
    create_coverage_chart()
    
    print("✅ Hoàn thành! Đã tạo 2 file:")
    print("  - defect_distribution.png")
    print("  - test_coverage_modules.png")
