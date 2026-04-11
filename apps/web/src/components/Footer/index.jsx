import { FaCircle } from "react-icons/fa";
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
                {/* <p className="footer-mxh">Bởi: Bookie Việt Nam <FaCircle style={{ fontSize: '5px' }} /> Instagram: @bookie.ig <FaCircle style={{ fontSize: '5px' }} /> Tiktok: @bookie.vn</p> */}
                <p className="footer-mxh">
                    Bởi:
                    <a href="https://www.facebook.com/tct.bo" target="_blank"> anh.tct </a>
                    <FaCircle style={{ fontSize: '5px' }} />
                    <a href="https://www.facebook.com/tdhanh03" target="_blank"> anh.tdh </a>
                    <FaCircle style={{ fontSize: '5px' }} />
                    <a href="https://www.facebook.com/hai.anh.722695" id="profile-link" target="_blank"> anh.tmh </a>
                    <FaCircle style={{ fontSize: '5px' }} />
                    <a href="https://www.facebook.com/mouvodoihihi/" id="profile-link" target="_blank"> anh.th </a>
                </p>
                <br />
            </div>
            <p className="footer-nam">&copy; {new Date().getFullYear()} Bookie</p>
        </footer>
    );
}

export default Footer