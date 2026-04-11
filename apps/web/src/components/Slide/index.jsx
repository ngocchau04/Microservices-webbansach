import React, { useRef } from "react";
import Slider from "react-slick";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./styles.css";

const Slide = ({ children, numToShow }) => {
    const sliderRef = useRef(null);

    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: numToShow || 5,
        slidesToScroll: 1,
        nextArrow: <SampleNextArrow />,
        prevArrow: <SamplePrevArrow />,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    infinite: true,
                    dots: true
                }
            },
            {
                breakpoint: 600,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    initialSlide: 1
                }
            }
        ]
    };

    return (
        <div className="slide-wrapper">
            <button className="slide-button prev" onClick={() => sliderRef.current.slickPrev()}>
                <FaChevronLeft />
            </button>
            <Slider ref={sliderRef} {...settings} className="slide-container products-container">
                {children}
            </Slider>
            <button className="slide-button next" onClick={() => sliderRef.current.slickNext()}>
                <FaChevronRight />
            </button>
        </div>
    );
};

const SampleNextArrow = (props) => {
    const { className, style, onClick } = props;
    return (
        <div
            className={className}
            style={{ ...style, display: "none" }} // Ẩn nút điều hướng mặc định
            onClick={onClick}
        />
    );
};

const SamplePrevArrow = (props) => {
    const { className, style, onClick } = props;
    return (
        <div
            className={className}
            style={{ ...style, display: "none" }} // Ẩn nút điều hướng mặc định
            onClick={onClick}
        />
    );
};

export default Slide;