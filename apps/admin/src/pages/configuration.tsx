import React from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Avatar,
  Snackbar,
  Alert,
} from "@mui/material";
import { Save, Image } from "lucide-react";

type ConfigSchema = {
  schoolName: string;
  siteUrl: string;
  timezone: string;
  defaultTerm: string;
  maintenanceMode: boolean;
  enableEmailNotifications: boolean;
  defaultLanguage: string;
  dateFormat: string;
  primaryColor: string;
  storageDriver: string;
  logo?: string | null;
};

const STORAGE_KEY = "sma-admin-config";

const DEFAULTS: ConfigSchema = {
  schoolName: "SMA Harapan Nusantara",
  siteUrl: "https://example.sch.id",
  timezone: "Asia/Jakarta",
  defaultTerm: "2025/2026 - Semester 1",
  maintenanceMode: false,
  enableEmailNotifications: true,
  defaultLanguage: "id",
  dateFormat: "DD/MM/YYYY",
  primaryColor: "#0ea5e9",
  storageDriver: "supabase",
  logo: null,
};

export const ConfigurationPage: React.FC = () => {
  const [values, setValues] = React.useState<ConfigSchema>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ConfigSchema;
    } catch {
      // ignore
    }
    return DEFAULTS;
  });

  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(values.logo ?? null);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity?: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  React.useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [logoFile]);

  const handleChange =
    (field: keyof ConfigSchema) =>
    (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      const value =
        (e.target as HTMLInputElement).type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : (e.target as HTMLInputElement).value;
      setValues(
        (v) =>
          ({
            ...v,
            [field]: value,
          }) as ConfigSchema
      );
    };

  const handleSave = () => {
    // very light validation
    if (!values.schoolName.trim()) {
      setSnackbar({ open: true, message: "Nama sekolah harus diisi.", severity: "error" });
      return;
    }
    try {
      const toSave = { ...values, logo: logoPreview };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setSnackbar({ open: true, message: "Pengaturan berhasil disimpan.", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Gagal menyimpan pengaturan.", severity: "error" });
    }
  };

  const handleReset = () => {
    setValues(DEFAULTS);
    setLogoFile(null);
    setLogoPreview(DEFAULTS.logo ?? null);
    setSnackbar({ open: true, message: "Form di-reset ke default.", severity: "success" });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }} elevation={0}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Konfigurasi Sistem
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Atur pengaturan global aplikasi. Perubahan disimpan ke penyimpanan lokal (demo).
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
            <Stack spacing={2} sx={{ flex: 1 }}>
              <TextField
                label="Nama Sekolah"
                value={values.schoolName}
                onChange={handleChange("schoolName")}
                fullWidth
              />
              <TextField
                label="Site URL"
                value={values.siteUrl}
                onChange={handleChange("siteUrl")}
                fullWidth
              />
              <TextField
                label="Default Term"
                value={values.defaultTerm}
                onChange={handleChange("defaultTerm")}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel id="timezone-label">Timezone</InputLabel>
                <Select
                  labelId="timezone-label"
                  label="Timezone"
                  value={values.timezone}
                  onChange={(e) => setValues((v) => ({ ...v, timezone: e.target.value as string }))}
                >
                  <MenuItem value="Asia/Jakarta">Asia/Jakarta</MenuItem>
                  <MenuItem value="Asia/Makassar">Asia/Makassar</MenuItem>
                  <MenuItem value="UTC">UTC</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="language-label">Bahasa Default</InputLabel>
                <Select
                  labelId="language-label"
                  label="Bahasa Default"
                  value={values.defaultLanguage}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, defaultLanguage: e.target.value as string }))
                  }
                >
                  <MenuItem value="id">Bahasa Indonesia</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="dateformat-label">Format Tanggal</InputLabel>
                <Select
                  labelId="dateformat-label"
                  label="Format Tanggal"
                  value={values.dateFormat}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, dateFormat: e.target.value as string }))
                  }
                >
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Primary Color"
                type="color"
                value={values.primaryColor}
                onChange={(e) => setValues((v) => ({ ...v, primaryColor: e.target.value }))}
                sx={{ width: 120 }}
              />

              <FormControl fullWidth>
                <InputLabel id="storage-label">Storage Driver</InputLabel>
                <Select
                  labelId="storage-label"
                  label="Storage Driver"
                  value={values.storageDriver}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, storageDriver: e.target.value as string }))
                  }
                >
                  <MenuItem value="supabase">Supabase</MenuItem>
                  <MenuItem value="r2">Cloudflare R2</MenuItem>
                  <MenuItem value="local">Local</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack spacing={2} sx={{ width: 280 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Logo & Status
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={logoPreview ?? undefined} sx={{ width: 72, height: 72 }}>
                  <Image />
                </Avatar>
                <Stack>
                  <Button variant="outlined" component="label" startIcon={<Image size={16} />}>
                    Unggah Logo
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setLogoFile(f);
                      }}
                    />
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                  >
                    Hapus
                  </Button>
                </Stack>
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={values.maintenanceMode}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, maintenanceMode: e.target.checked }))
                    }
                  />
                }
                label="Maintenance Mode"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={values.enableEmailNotifications}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, enableEmailNotifications: e.target.checked }))
                    }
                  />
                }
                label="Enable Email Notifications"
              />

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Simpan perubahan setelah selesai mengatur.
                </Typography>
              </Box>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSave}>
              Simpan
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity ?? "success"} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ConfigurationPage;
