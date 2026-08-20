import * as React from "react";

import CssBaseline from "@mui/material/CssBaseline";
import { jaJP } from "@mui/material/locale";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./components/LoginPage";
import PageLoader from "./components/PageLoader";
import { t } from "./i18n";

const { Suspense, lazy } = React;
const chunkReloadKey = "weather-compare-chunk-reloaded";

const WeatherPage = lazy(async () => {
  try {
    const page = await import("./pages/WeatherPage");
    window.sessionStorage.removeItem(chunkReloadKey);
    return page;
  } catch (error) {
    if (!window.sessionStorage.getItem(chunkReloadKey)) {
      window.sessionStorage.setItem(chunkReloadKey, "1");
      window.location.reload();
    }
    throw error;
  }
});

const theme = createTheme(
  {
    shape: {
      borderRadius: 6,
    },
    typography: {
      fontFamily: ['"IBM Plex Sans JP"', '"Inter"', '"BIZ UDPGothic"', '"Noto Sans JP"', '"Segoe UI"', "sans-serif"].join(","),
      button: {
        fontWeight: 700,
        letterSpacing: 0,
        textTransform: "none",
      },
      subtitle2: {
        fontWeight: 700,
      },
      h3: {
        letterSpacing: 0,
      },
      h4: {
        letterSpacing: 0,
      },
    },
    palette: {
      mode: "light",
      primary: {
        main: "#0c66e4",
        light: "#388bff",
        dark: "#09326c",
      },
      secondary: {
        main: "#44546f",
      },
      success: {
        main: "#1f845a",
      },
      warning: {
        main: "#b65c02",
      },
      error: {
        main: "#c9372c",
      },
      background: {
        default: "#f7f8fa",
        paper: "#ffffff",
      },
      text: {
        primary: "#172b4d",
        secondary: "#52607a",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            color: "#172b4d",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          outlined: {
            borderColor: "rgba(9, 30, 66, 0.12)",
            boxShadow: "0 1px 2px rgba(9, 30, 66, 0.04)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            paddingInline: 16,
          },
          contained: {
            boxShadow: "none",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 600,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: "#ffffff",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            color: "#44546f",
            fontSize: "0.78rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          },
        },
      },
      MuiTablePagination: {
        defaultProps: {
          labelRowsPerPage: t("common.pagination.rows_per_page"),
          labelDisplayedRows: ({ from, to, count }) =>
            t("common.pagination.displayed_rows", {
              from,
              to,
              count: count !== -1 ? count : t("common.pagination.more_than_rows", { to }),
            }),
          getItemAriaLabel: (type) => {
            if (type === "first") return t("common.pagination.first_page");
            if (type === "last") return t("common.pagination.last_page");
            if (type === "next") return t("common.pagination.next_page");
            return t("common.pagination.previous_page");
          },
        },
      },
    },
  },
  jaJP,
);

function AppContent() {
  const { user, loading, error, signIn } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <LoginPage error={error} onSubmit={signIn} />;

  return (
    <Suspense fallback={<PageLoader />}>
      <WeatherPage />
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
