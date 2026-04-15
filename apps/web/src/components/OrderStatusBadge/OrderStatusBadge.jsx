import "../../styles/orderStatusBadges.css";
import {
  getOrderStatusBadgeModifier,
  getOrderStatusLabel,
} from "../../utils/orderStatusLabel";

/**
 * @param {{ status?: string | null }} props
 */
export default function OrderStatusBadge({ status }) {
  const raw = status ?? "";
  const mod = getOrderStatusBadgeModifier(raw);
  const label = getOrderStatusLabel(raw) || "—";

  return (
    <span className={`order-status-badge order-status-badge--${mod}`}>{label}</span>
  );
}
