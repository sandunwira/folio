export default function Icon({ icon: IconComponent, className = "", size = 20, stroke = 1.8 }) {
	return <IconComponent className={className} size={size} stroke={stroke} aria-hidden="true" />;
}
