import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import './Chat.css';

function Chat() {
    const handleClick = () => {
        window.open('https://www.facebook.com/tct.bo', '_blank');
    };

    return (
        <div className="chat-bubble" onClick={handleClick}>
            <IoChatbubbleEllipsesOutline className="chat-icon" />
        </div>
    )
}

export default Chat