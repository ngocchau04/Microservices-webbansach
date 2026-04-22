import './Footer.css';

function Footer() {
    return (
        <footer className="fter">
            <hr style={{ border: "1px" }} />
            <div className="footer">
                <h1>Bookie</h1>
                <br />
                <p className="footer-chu">Bookie là trang web chuyên cung cấp các sản phẩm về sách, đáp ứng nhu cầu học tập và làm việc của học sinh, sinh viên,...</p>
                <br />
            </div>
            <p className="footer-nam">&copy; {new Date().getFullYear()} Bookie</p>
        </footer>
    );
}

export default Footer