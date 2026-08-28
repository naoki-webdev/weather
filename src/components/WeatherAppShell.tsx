import type { ReactNode } from "react";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import HelpTooltip from "./HelpTooltip";

type WeatherAppShellProps = {
  children: ReactNode;
  userName?: string;
  readOnly: boolean;
  onSearch: () => void;
  onPreference: () => void;
  onSignOut: () => void;
};

export default function WeatherAppShell({ children, userName, readOnly, onSearch, onPreference, onSignOut }: WeatherAppShellProps) {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="sticky" elevation={0} sx={{ color: "text.primary", backgroundColor: "#ffffff", borderBottom: "1px solid rgba(23,73,112,0.12)" }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 70 }, py: 1 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.25, md: 2.5 }} alignItems={{ xs: "stretch", md: "center" }} sx={{ width: "100%" }}>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                <Box component="img" src="/favicon.svg" alt="" sx={{ width: 40, height: 40, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h1" variant="subtitle1" fontWeight={900} noWrap sx={{ fontSize: { xs: "1rem", md: "1.08rem" } }}>{t("weather.app_title")}</Typography>
                </Box>
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 0.25, md: 1.25 }} alignItems={{ xs: "stretch", md: "center" }} sx={{ width: { xs: "100%", md: "auto" } }}>
                <Stack direction="row" spacing={0.25}>
                  <Button variant="text" size="small" onClick={onSearch} sx={{ fontWeight: 700, fontSize: { xs: "0.82rem", md: "0.9rem" } }}>{t("weather.actions.search_city")}</Button>
                  <Button variant="text" size="small" onClick={onPreference} sx={{ fontWeight: 700, fontSize: { xs: "0.82rem", md: "0.9rem" } }}>{t("weather.actions.preferences")}</Button>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={{ xs: "space-between", md: "initial" }} sx={{ pl: { md: 1.25 }, borderLeft: { md: "1px solid rgba(23,73,112,0.14)" } }}>
                  <Box sx={{ minWidth: 0, textAlign: "right", lineHeight: 1.1 }}>
                    <Typography variant="body2" fontWeight={800} noWrap sx={{ fontSize: { xs: "0.82rem", md: "0.9rem" } }}>{userName ?? "—"}</Typography>
                  </Box>
                  {readOnly && <>
                    <Typography variant="caption" color="warning.main" fontWeight={700} noWrap>{t("auth.read_only_badge")}</Typography>
                    <HelpTooltip title={t("auth.read_only_help")} label={t("auth.read_only_help_label")} />
                  </>}
                  <Button variant="text" color="inherit" size="small" onClick={onSignOut} sx={{ minWidth: 0, px: 0.5, fontWeight: 700, fontSize: { xs: "0.82rem", md: "0.9rem" } }}>{t("auth.sign_out")}</Button>
                </Stack>
              </Stack>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>
      {children}
    </Box>
  );
}
