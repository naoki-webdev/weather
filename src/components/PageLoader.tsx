import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

import { t } from "../i18n";

export default function PageLoader() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
      <CircularProgress aria-label={t("common.loading")} />
    </Box>
  );
}
