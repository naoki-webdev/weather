import { FormEvent, useState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";

const viteEnv = (import.meta as {
  env?: { VITE_DEMO_EMAIL?: string; VITE_DEMO_PASSWORD?: string };
}).env;
const DEMO_EMAIL = viteEnv?.VITE_DEMO_EMAIL ?? "demo@example.com";
const DEMO_PASSWORD = viteEnv?.VITE_DEMO_PASSWORD ?? "password";

type LoginPageProps = {
  error: string | null;
  onSubmit: (email: string, password: string) => Promise<boolean>;
};

export default function LoginPage({ error, onSubmit }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "").trim();
    const submittedPassword = String(formData.get("password") ?? "");

    try {
      await onSubmit(submittedEmail, submittedPassword);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoSubmitting(true);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);

    try {
      await onSubmit(DEMO_EMAIL, DEMO_PASSWORD);
    } finally {
      setDemoSubmitting(false);
    }
  };

  const disabled = submitting || demoSubmitting;

  return (
    <Container maxWidth="sm" sx={{ minHeight: "100vh", display: "grid", placeItems: "center", py: 4 }}>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        variant="outlined"
        sx={{
          width: "100%",
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.98)",
        }}
      >
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {t("auth.title")}
            </Typography>
          </Box>

          {error && <Alert severity="error" role="alert" aria-live="assertive">{error}</Alert>}

          <Stack spacing={1}>
            <Button
              type="button"
              variant="contained"
              size="large"
              color="secondary"
              onClick={handleDemoLogin}
              disabled={disabled}
            >
              {demoSubmitting ? t("auth.signing_in") : t("auth.demo_login")}
            </Button>
            <Typography variant="caption" color="text.secondary">{t("auth.read_only_badge")}</Typography>
          </Stack>

          <Divider>OR</Divider>

          <TextField
            name="email"
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            fullWidth
          />
          <TextField
            name="password"
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            fullWidth
          />

          <Button type="submit" variant="outlined" size="large" disabled={disabled}>
            {submitting ? t("auth.signing_in") : t("auth.sign_in")}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
