interface NovaeraLogoProps {
  collapsed?: boolean;
}

export const NovaeraLogo = ({ collapsed = false }: NovaeraLogoProps) => {
  if (collapsed) {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="2" y="22"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="600"
          fontSize="22"
          fill="#3B82C4"
        >
          N
        </text>
      </svg>
    );
  }

  return (
    <span
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: "19px",
        fontWeight: 300,
        letterSpacing: "0.03em",
        color: "#FFFFFF",
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      Novaera
      <span style={{ color: "#3B82C4", fontWeight: 500 }}>.ai</span>
    </span>
  );
};
