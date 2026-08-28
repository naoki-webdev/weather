import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

import { t } from "../i18n";

export default function PageLoader() {
  return (
    <Box role="status" aria-live="polite" aria-busy="true" aria-label={t("common.loading_status")} sx={{ display: "flex", justifyContent: "center", py: 10 }}>
      <CircularProgress aria-label={t("common.loading")} />
    </Box>
  );
}
