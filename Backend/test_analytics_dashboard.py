"""
Script tổng hợp để tạo tất cả biểu đồ thống kê test cho dự án ktpm-webbansach
Bao gồm:
1. Test Case Execution Summary (Pie Chart)
2. Defect Distribution by Severity (Bar Chart)  
3. Test Coverage by Module (Horizontal Bar Chart)
"""

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Patch, Rectangle

class TestAnalyticsCharts:
    def __init__(self):
        # Dữ liệu thực tế từ dự án
        self.total_tests = 127
        self.passed_tests = 107
        self.failed_tests = 20
        self.pass_rate = 84.3
        
        # Defect data
        self.defects_by_severity = {
            'Critical': {'fixed': 0, 'open': 4},
            'High': {'fixed': 0, 'open': 8},
            'Medium': {'fixed': 0, 'open': 6}, 
            'Low': {'fixed': 0, 'open': 2}
        }
        
        # Module performance data
        self.module_data = {
            'Authorization Service': 90.6,
            'Cart Controller': 89.7,
            'Search Controller': 87.5,
            'E2E Bookstore': 87.5,
            'Order Controller': 84.6,
            'User Profile': 46.2
        }
    
    def create_pie_chart(self):
        """Biểu đồ tròn - Test Case Execution Summary"""
        fig, ax = plt.subplots(figsize=(10, 8))
        
        sizes = [self.passed_tests, self.failed_tests]
        labels = [f'Passed\n{self.passed_tests}\n({self.passed_tests/self.total_tests*100:.1f}%)',
                 f'Failed\n{self.failed_tests}\n({self.failed_tests/self.total_tests*100:.1f}%)']
        colors = ['#90EE90', '#FF6B6B']
        explode = (0.05, 0.05)
        
        wedges, texts, autotexts = ax.pie(sizes, labels=labels, colors=colors, explode=explode,
                                         autopct='%1.1f%%', shadow=True, startangle=90,
                                         textprops={'fontsize': 11, 'fontweight': 'bold'})
        
        ax.set_title('Test Case Execution Summary', fontsize=14, fontweight='bold', pad=20)
        
        # Legend
        legend_elements = [
            Rectangle((0, 0), 1, 1, facecolor='#DDA0DD', label=f'Test cases executed: {self.total_tests} (100%)'),
            Rectangle((0, 0), 1, 1, facecolor='#90EE90', label=f'Test cases passed: {self.passed_tests} ({self.passed_tests/self.total_tests*100:.1f}%)'),
            Rectangle((0, 0), 1, 1, facecolor='#FF6B6B', label=f'Test cases failed: {self.failed_tests} ({self.failed_tests/self.total_tests*100:.1f}%)'),
            Rectangle((0, 0), 1, 1, facecolor='#FFD700', label='Test cases blocked: 0 (0%)'),
            Rectangle((0, 0), 1, 1, facecolor='#FFA500', label='Test cases not run: 0 (0%)')
        ]
        
        ax.legend(handles=legend_elements, loc='center left', bbox_to_anchor=(1.05, 0.5))
        plt.tight_layout()
        plt.savefig('test_execution_pie_chart.png', dpi=300, bbox_inches='tight')
        return fig
    
    def create_defect_bar_chart(self):
        """Biểu đồ cột - Defect Distribution by Severity"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        categories = list(self.defects_by_severity.keys())
        fixed_counts = [self.defects_by_severity[cat]['fixed'] for cat in categories]
        open_counts = [self.defects_by_severity[cat]['open'] for cat in categories]
        
        x = np.arange(len(categories))
        width = 0.6
        
        bars_fixed = ax.bar(x, fixed_counts, width, label='Number of defects fixed', color='#5B9BD5')
        bars_open = ax.bar(x, open_counts, width, bottom=fixed_counts,
                          label='Number of defects remain open', color='#C55454')
        
        # Labels và formatting
        ax.set_ylabel('Number of defects', fontweight='bold')
        ax.set_xlabel('Severity', fontweight='bold')
        ax.set_title('Defect Distribution by Severity\nTotal: 20 Defects (0 Fixed, 20 Open)', fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(categories)
        ax.legend()
        
        # Thêm labels trên bars
        for i, cat in enumerate(categories):
            total = fixed_counts[i] + open_counts[i]
            ax.text(i, total + 0.3, f'Total: {total}', ha='center', va='bottom', fontweight='bold')
            if open_counts[i] > 0:
                ax.text(i, open_counts[i]/2, str(open_counts[i]), ha='center', va='center', 
                       color='white', fontweight='bold', fontsize=12)
        
        ax.grid(True, alpha=0.3, axis='y')
        ax.set_ylim(0, max(open_counts) + 3)
        plt.tight_layout()
        plt.savefig('defect_distribution_bar_chart.png', dpi=300, bbox_inches='tight')
        return fig
    
    def create_module_coverage_chart(self):
        """Biểu đồ ngang - Test Coverage by Module"""
        fig, ax = plt.subplots(figsize=(12, 8))
        
        modules = list(self.module_data.keys())
        pass_rates = list(self.module_data.values())
        
        # Định màu theo performance
        colors = []
        for rate in pass_rates:
            if rate >= 90:
                colors.append('#92D050')    # Excellent
            elif rate >= 80:
                colors.append('#FFC000')    # Good  
            elif rate >= 70:
                colors.append('#F79646')    # Acceptable
            else:
                colors.append('#FF6B6B')    # Needs improvement
        
        y_pos = np.arange(len(modules))
        bars = ax.barh(y_pos, pass_rates, color=colors, edgecolor='black', linewidth=0.8, height=0.7)
        
        # Overall pass rate line
        ax.axvline(x=self.pass_rate, color='red', linestyle='--', linewidth=2, alpha=0.8)
        ax.text(self.pass_rate + 1, len(modules) - 0.3, f'{self.pass_rate}%', 
               rotation=90, va='top', ha='left', color='red', fontweight='bold')
        
        # Labels
        ax.set_yticks(y_pos)
        ax.set_yticklabels(modules)
        ax.set_xlabel('Pass Rate (%)', fontweight='bold')
        ax.set_ylabel('Module', fontweight='bold')
        ax.set_title(f'Test Coverage by Module - Pass Rate\nOverall Pass Rate: {self.pass_rate}%', fontweight='bold')
        
        # Thêm phần trăm trên bars
        for i, (bar, rate) in enumerate(zip(bars, pass_rates)):
            width = bar.get_width()
            ax.text(width - 3, bar.get_y() + bar.get_height()/2, f'{rate}%',
                   ha='right', va='center', fontweight='bold',
                   color='white' if rate < 60 else 'black')
        
        # Performance legend
        legend_elements = [
            Patch(facecolor='#92D050', label='Excellent (≥90%)'),
            Patch(facecolor='#FFC000', label='Good (80-89%)'),
            Patch(facecolor='#F79646', label='Acceptable (70-79%)'),
            Patch(facecolor='#FF6B6B', label='Needs Improvement (<70%)')
        ]
        ax.legend(handles=legend_elements, loc='lower right')
        
        ax.set_xlim(0, 100)
        ax.grid(True, alpha=0.3, axis='x')
        plt.tight_layout()
        plt.savefig('module_coverage_horizontal_chart.png', dpi=300, bbox_inches='tight')
        return fig
    
    def generate_all_charts(self):
        """Tạo tất cả biểu đồ"""
        print("🎨 Đang tạo tất cả biểu đồ thống kê...")
        print("=" * 50)
        
        print("📊 1. Test Case Execution Summary (Pie Chart)...")
        fig1 = self.create_pie_chart()
        print("   ✅ Đã lưu: test_execution_pie_chart.png")
        
        print("\n📊 2. Defect Distribution by Severity (Bar Chart)...")  
        fig2 = self.create_defect_bar_chart()
        print("   ✅ Đã lưu: defect_distribution_bar_chart.png")
        
        print("\n📊 3. Test Coverage by Module (Horizontal Bar Chart)...")
        fig3 = self.create_module_coverage_chart()
        print("   ✅ Đã lưu: module_coverage_horizontal_chart.png")
        
        print("\n🎉 Hoàn thành! Đã tạo 3 biểu đồ thống kê test.")
        print("\n📈 SUMMARY REPORT:")
        print(f"   • Total Tests: {self.total_tests}")
        print(f"   • Pass Rate: {self.pass_rate}%")
        print(f"   • Total Defects: {sum([data['open'] for data in self.defects_by_severity.values()])}")
        print(f"   • Best Module: {max(self.module_data, key=self.module_data.get)} ({max(self.module_data.values())}%)")
        print(f"   • Worst Module: {min(self.module_data, key=self.module_data.get)} ({min(self.module_data.values())}%)")
        
        # Hiển thị tất cả biểu đồ
        plt.show()

def main():
    """Hàm chính"""
    analytics = TestAnalyticsCharts()
    analytics.generate_all_charts()

if __name__ == "__main__":
    main()
