import matplotlib.pyplot as plt
import numpy as np

# Script để vẽ 2 biểu đồ: Defect Distribution by Severity và Test Coverage by Module

def create_defect_distribution_chart():
    """Tạo biểu đồ Defect Distribution by Severity"""
    
    # Dữ liệu defects theo severity (dựa trên phân tích trước)
    severities = ['Critical', 'High', 'Medium', 'Low']
    defects_fixed = [0, 0, 0, 0]  # Chưa fix defect nào
    defects_open = [4, 8, 6, 2]   # Defects đang mở
    total_defects = [4, 8, 6, 2]
    
    # Thiết lập vị trí bars
    x = np.arange(len(severities))
    width = 0.6
    
    # Tạo figure
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Vẽ bars
    bars_fixed = ax.bar(x, defects_fixed, width, label='Number of defects fixed', 
                       color='#6495ED', alpha=0.8)
    bars_open = ax.bar(x, defects_open, width, bottom=defects_fixed,
                      label='Number of defects remain open', 
                      color='#DC143C', alpha=0.8)
    
    # Thêm labels và title
    ax.set_xlabel('Severity', fontweight='bold')
    ax.set_ylabel('Number of defects', fontweight='bold')
    ax.set_title('Defect Distribution by Severity\nTotal: 20 Defects (0 Fixed, 20 Open)', 
                fontweight='bold', fontsize=12)
    ax.set_xticks(x)
    ax.set_xticklabels(severities)
    
    # Thêm legend
    ax.legend(loc='upper right')
    
    # Thêm số liệu trên bars
    for i, (fixed, open_def, total) in enumerate(zip(defects_fixed, defects_open, total_defects)):
        ax.text(i, total + 0.5, f'Total: {total}', ha='center', va='bottom', 
               fontweight='bold', fontsize=10)
        if open_def > 0:
            ax.text(i, open_def/2, str(open_def), ha='center', va='center', 
                   fontweight='bold', color='white')
    
    # Grid để dễ đọc
    ax.grid(True, alpha=0.3, axis='y')
    ax.set_axisbelow(True)
    
    plt.tight_layout()
    plt.savefig('defect_distribution_chart.png', dpi=300, bbox_inches='tight')
    return fig

def create_test_coverage_chart():
    """Tạo biểu đồ Test Coverage by Module - Pass Rate"""
    
    # Dữ liệu modules và pass rates (dựa trên dữ liệu thực)
    modules = [
        'Authorization Service',
        'Cart Controller', 
        'Search Controller',
        'E2E Bookstore',
        'Order Controller',
        'User Profile'
    ]
    
    pass_rates = [90.6, 89.7, 87.5, 87.5, 84.6, 46.2]
    overall_pass_rate = 84.3
    
    # Định màu sắc theo performance
    colors = []
    for rate in pass_rates:
        if rate >= 90:
            colors.append('#90EE90')  # Excellent (>90%) - Green
        elif rate >= 80:
            colors.append('#FFD700')  # Good (80-90%) - Yellow
        elif rate >= 70:
            colors.append('#FFA500')  # Acceptable (70-80%) - Orange
        else:
            colors.append('#FF6B6B')  # Needs Improvement (<70%) - Red
    
    # Tạo figure
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # Tạo horizontal bar chart
    y_pos = np.arange(len(modules))
    bars = ax.barh(y_pos, pass_rates, color=colors, alpha=0.8, edgecolor='black', linewidth=0.5)
    
    # Thêm line cho overall pass rate
    ax.axvline(x=overall_pass_rate, color='red', linestyle='--', linewidth=2, alpha=0.8)
    ax.text(overall_pass_rate + 1, len(modules) - 0.5, f'Overall: {overall_pass_rate}%', 
           rotation=90, va='top', ha='left', color='red', fontweight='bold')
    
    # Labels và title
    ax.set_yticks(y_pos)
    ax.set_yticklabels(modules)
    ax.set_xlabel('Pass Rate (%)', fontweight='bold')
    ax.set_ylabel('Module', fontweight='bold')
    ax.set_title('Test Coverage by Module - Pass Rate\nOverall Pass Rate: 84.3%', 
                fontweight='bold', fontsize=14)
    
    # Thêm phần trăm trên bars
    for i, (bar, rate) in enumerate(zip(bars, pass_rates)):
        width = bar.get_width()
        ax.text(width - 2, bar.get_y() + bar.get_height()/2, 
               f'{rate}%', ha='right', va='center', 
               fontweight='bold', color='black' if rate > 50 else 'white')
    
    # Tạo legend cho performance levels
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='#90EE90', label='Excellent (≥90%)'),
        Patch(facecolor='#FFD700', label='Good (80-89%)'),
        Patch(facecolor='#FFA500', label='Acceptable (70-79%)'),
        Patch(facecolor='#FF6B6B', label='Needs Improvement (<70%)')
    ]
    ax.legend(handles=legend_elements, loc='lower right')
    
    # Thiết lập grid và limits
    ax.grid(True, alpha=0.3, axis='x')
    ax.set_xlim(0, 100)
    ax.set_axisbelow(True)
    
    plt.tight_layout()
    plt.savefig('test_coverage_by_module.png', dpi=300, bbox_inches='tight')
    return fig

def main():
    """Tạo cả 2 biểu đồ"""
    print("🎨 Đang tạo biểu đồ Defect Distribution by Severity...")
    fig1 = create_defect_distribution_chart()
    print("✅ Đã tạo: defect_distribution_chart.png")
    
    print("\n🎨 Đang tạo biểu đồ Test Coverage by Module...")
    fig2 = create_test_coverage_chart()
    print("✅ Đã tạo: test_coverage_by_module.png")
    
    # Hiển thị cả 2 biểu đồ
    plt.show()
    
    print("\n📊 THỐNG KÊ TÓM TẮT:")
    print("=" * 40)
    print("DEFECT DISTRIBUTION:")
    print("  Critical: 4 defects (20%)")
    print("  High: 8 defects (40%)")  
    print("  Medium: 6 defects (30%)")
    print("  Low: 2 defects (10%)")
    print("  Total: 20 defects (0 fixed, 20 open)")
    
    print("\nMODULE PERFORMANCE:")
    print("  🥇 Authorization Service: 90.6%")
    print("  🥈 Cart Controller: 89.7%")
    print("  🥉 Search Controller: 87.5%")
    print("  📊 Overall Pass Rate: 84.3%")
    print("  ⚠️ User Profile cần cải thiện: 46.2%")

if __name__ == "__main__":
    main()
