export default function Icon({ icon: IconComponent, className = "", size = 20 }) {
	return <IconComponent className={className} size={size} stroke={1.8} aria-hidden="true" />;
}
