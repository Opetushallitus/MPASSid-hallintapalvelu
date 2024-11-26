import { Link } from "@mui/material";

export default function LinkValue({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      sx={{
        display: "inline-block",
        maxWidth: 600,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        verticalAlign: "top",
      }}
    >
      {href}
    </Link>
  );
}
