import { Link, Paper, Typography as MUITypography } from "@mui/material";

export default function Typography() {
  return (
    <>
      <MUITypography variant="h2" gutterBottom>
        Typography
      </MUITypography>
      <Paper sx={{ marginBottom: 3, padding: 3 }}>
        <MUITypography variant="h1" gutterBottom>
          Heading 1
        </MUITypography>
        <MUITypography variant="h2" gutterBottom>
          Heading 2
        </MUITypography>
        <MUITypography variant="h3" gutterBottom>
          Heading 3
        </MUITypography>
        <MUITypography variant="body1" gutterBottom>
          Paragraph <br />
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quae autem
          ad temporibus sed natus ratione eos rem aspernatur aliquam asperiores
          quos eaque quo delectus, magnam necessitatibus, nihil in, placeat
          saepe.
        </MUITypography>
        <Link href="https://example.com">Text Link</Link>
        <br />
        <MUITypography variant="caption" gutterBottom>
          Caption
        </MUITypography>
        <ul>
          <li>Bullet point</li>
        </ul>
      </Paper>
    </>
  );
}
